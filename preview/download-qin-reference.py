from pathlib import Path
import urllib.request
url='https://media.9game.cn/gamebase/ieu-gdc-pre-process/images/20220328/2/18/f5998fb87efd1f77c0935ec1e3f62a12.jpg'
req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
with urllib.request.urlopen(req,timeout=20) as r:
    Path('preview/contact-source/lisi-game.jpg').write_bytes(r.read())
print('Saved original Li Si game screenshot.')
