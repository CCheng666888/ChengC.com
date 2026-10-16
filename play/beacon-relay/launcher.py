"""Offline Windows edition. The native JSON file is the canonical save."""
import json
import os
from pathlib import Path
import sys
import threading


def resource_path(name):
    return Path(getattr(sys, '_MEIPASS', Path(__file__).resolve().parent)) / name


def save_directory():
    if os.environ.get('BEACON_SAVE_DIR'):
        return Path(os.environ['BEACON_SAVE_DIR'])
    base = Path(sys.executable).parent if getattr(sys, 'frozen', False) else Path(__file__).resolve().parent
    candidate = base / '烽火来信存档'
    try:
        candidate.mkdir(parents=True, exist_ok=True)
        return candidate
    except OSError:
        return Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'ChenC' / 'BeaconRelay'


def valid(data):
    return (isinstance(data, dict) and data.get('v') == 3
            and isinstance(data.get('id'), str) and isinstance(data.get('started'), bool)
            and isinstance(data.get('responses'), list) and len(data['responses']) == 7
            and all(r is None or (isinstance(r, dict) and isinstance(r.get('text'), str)
                                  and len(r['text']) <= 64 and isinstance(r.get('nonce'), str))
                    for r in data['responses'])
            and isinstance(data.get('trail'), dict) and isinstance(data.get('where'), str)
            and isinstance(data.get('stamp'), (int, float)))


class SaveAPI:
    def __init__(self, folder):
        self.folder = Path(folder)
        self.path = self.folder / 'dispatch-v3.json'
        self.lock = threading.Lock()

    def load_dispatch(self):
        with self.lock:
            for file in (self.path, self.folder / 'dispatch-v3.backup.json'):
                try:
                    data = json.loads(file.read_text(encoding='utf-8'))
                    if valid(data):
                        return data
                except (OSError, ValueError):
                    continue
        return None

    def save_dispatch(self, data):
        if not valid(data):
            return {'ok': False}
        try:
            with self.lock:
                self.folder.mkdir(parents=True, exist_ok=True)
                if self.path.exists():
                    try:
                        previous = self.path.read_text(encoding='utf-8')
                        if valid(json.loads(previous)):
                            (self.folder / 'dispatch-v3.backup.json').write_text(previous, encoding='utf-8')
                    except (OSError, ValueError):
                        pass
                temp = self.folder / 'dispatch-v3.tmp'
                with temp.open('w', encoding='utf-8') as stream:
                    json.dump(data, stream, ensure_ascii=False)
                    stream.flush()
                    os.fsync(stream.fileno())
                os.replace(temp, self.path)
            return {'ok': True}
        except OSError:
            return {'ok': False}


def self_test(folder):
    api = SaveAPI(folder)
    data = {'v': 3, 'id': 'native-qa', 'started': True, 'responses': [None] * 7,
            'trail': {}, 'where': 'chat-2', 'stamp': 1}
    data['responses'][0] = {'text': '四十五', 'nonce': 'n1'}
    assert api.save_dispatch(data)['ok']
    assert SaveAPI(folder).load_dispatch() == data
    data['where'] = 'chat-3'
    assert api.save_dispatch(data)['ok']
    api.path.write_text('{broken', encoding='utf-8')
    assert SaveAPI(folder).load_dispatch()['where'] == 'chat-2'
    assert not api.save_dispatch({'bad': True})['ok']
    print('Native atomic save, restart, backup recovery and schema checks passed.')


if __name__ == '__main__':
    if '--self-test' in sys.argv:
        self_test(sys.argv[sys.argv.index('--self-test') + 1])
        sys.exit(0)
    import webview
    html_file = resource_path('game.html') if getattr(sys, 'frozen', False) else resource_path('烽火来信-单文件试玩版.html')
    html = html_file.read_text(encoding='utf-8')
    html = html.replace('<head>', '<head><script>window.BEACON_NATIVE=true;</script>', 1)
    folder = save_directory()
    api = SaveAPI(folder)
    window = webview.create_window('烽火来信', html=html, js_api=api,
                                   width=1180, height=820, min_size=(360, 600),
                                   background_color='#f7f6f1', text_select=True)
    webview.start(gui='edgechromium', private_mode=True)
