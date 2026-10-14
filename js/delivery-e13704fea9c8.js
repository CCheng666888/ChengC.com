/* js/oj-config.js */
// Only a public API address belongs here. Never put tokens, answers or test data in this file.
// After deploying the private backend on your Linux server, set apiBase to https://oj-api.chenc.com.cn.
window.OJ_CONFIG = Object.freeze({apiBase: ''});

;
/* js/oj.js */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const templates = {
    c: '#include <stdio.h>\n#include <math.h>\n\nint main(void) {\n    int T;\n    if (scanf("%d", &T) != 1) return 0;\n    while (T--) {\n        double m, k, h, v, theta, g;\n        scanf("%lf%lf%lf%lf%lf%lf", &m, &k, &h, &v, &theta, &g);\n        // TODO: 推导运动方程并计算 t、x、s\n        double t = 0, x = 0, s = 0;\n        printf("%.9f %.9f %.9f\\n", t, x, s);\n    }\n    return 0;\n}\n',
    python: 'import sys\nimport math\n\ndata = sys.stdin.buffer.read().split()\nT = int(data[0])\npos = 1\nfor _ in range(T):\n    m, k, h, v, theta, g = map(float, data[pos:pos + 6])\n    pos += 6\n    # TODO: 推导运动方程并计算 t、x、s\n    t, x, s = 0.0, 0.0, 0.0\n    print(f"{t:.9f} {x:.9f} {s:.9f}")\n',
    java: 'import java.util.Scanner;\nimport java.util.Locale;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in).useLocale(Locale.US);\n        int T = in.nextInt();\n        while (T-- > 0) {\n            double m = in.nextDouble(), k = in.nextDouble();\n            double h = in.nextDouble(), v = in.nextDouble();\n            double theta = in.nextDouble(), g = in.nextDouble();\n            // TODO: 推导运动方程并计算 t、x、s\n            double t = 0, x = 0, s = 0;\n            System.out.printf(Locale.US, "%.9f %.9f %.9f%n", t, x, s);\n        }\n    }\n}\n'
  };
  const drafts = {...templates};
  const filenames = {c: 'main.c', python: 'main.py', java: 'Main.java'};
  let language = 'c', account = null, ready = false, authBusy = false, submitBusy = false, pending = false, timer = null, revision = 0;
  let base = '';
  try {
    if (window.OJ_CONFIG?.apiBase) {
      const url = new URL(window.OJ_CONFIG.apiBase);
      const local = ['127.0.0.1', 'localhost'].includes(location.hostname) && ['127.0.0.1', 'localhost'].includes(url.hostname);
      if (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) throw new Error('HTTPS required');
      if (url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('Use API origin only');
      base = url.origin;
    }
  } catch { $('service-status').textContent = '判题服务配置无效，请联系站长。'; }

  function controls() {
    $('auth-form').hidden = !!account;
    $('logged-in').hidden = !account;
    $('account-label').textContent = account ? account.username : '未登录';
    $('login-button').disabled = !base || authBusy;
    $('register-button').disabled = !base || authBusy;
    $('submit-button').disabled = !ready || !account || submitBusy || pending;
    $('submit-button').textContent = submitBusy ? '正在提交…' : pending ? '判题中，请等待…' : !account ? '登录后提交判题' : !ready ? '判题服务暂未就绪' : '提交判题';
    $('refresh-button').disabled = !account;
    $('logout-button').disabled = submitBusy;
  }

  async function api(route, data) {
    if (!base) throw new Error('站长尚未连接判题服务器。');
    const headers = {};
    if (data !== undefined) {headers['Content-Type'] = 'application/json'; if (account) headers['X-CSRF-Token'] = account.csrf;}
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(base + route, {method: data === undefined ? 'GET' : 'POST', headers,
        body: data === undefined ? undefined : JSON.stringify(data), credentials: 'include', cache: 'no-store', signal: controller.signal});
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        const error = new Error(typeof payload.detail === 'string' ? payload.detail : `服务请求失败（${res.status}）。`);
        error.status = res.status;
        throw error;
      }
      return payload;
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('请求超时。若已提交，请刷新成绩确认状态。');
      if (error instanceof TypeError) throw new Error('无法连接判题服务，请检查网络或稍后重试。');
      throw error;
    } finally {clearTimeout(timeout);}
  }

  function clearAccount() {
    revision++;
    account = null;
    pending = false;
    clearTimeout(timer);
    $('scores').replaceChildren();
    $('scores-note').textContent = '登录后显示最近 30 次提交。';
    controls();
  }

  async function health() {
    if (!base) {
      ready = false;
      $('service-status').textContent = '题目已开放阅读。自动判题等待站长连接服务器，当前无法提交。';
    } else {
      try {
        ready = (await api('/api/health')).ready === true;
        $('service-status').textContent = ready ? '判题服务已连接 · 登录后即可提交，只有你能查看自己的分数。' : '题目可以阅读；判题服务暂未就绪，请稍后重试。';
      } catch (e) {ready = false; $('service-status').textContent = e.message;}
    }
    controls();
  }

  function render(items) {
    $('scores').replaceChildren();
    pending = items.some(item => ['queued', 'running'].includes(item.state));
    $('scores-note').textContent = items.length ? '仅显示当前账号的最近 30 次提交。' : '还没有提交，完成答案后开始第一次挑战。';
    for (const item of items) {
      const li = document.createElement('li');
      const name = document.createElement('strong'); name.textContent = {c:'C 17', python:'Python 3', java:'Java 17'}[item.language] || '提交';
      const time = document.createElement('time'); const date = new Date(item.created * 1000);
      time.dateTime = date.toISOString(); time.textContent = date.toLocaleString('zh-CN', {timeZone:'Asia/Shanghai', hour12:false});
      const score = document.createElement('span'); score.className = 'oj-score-value';
      if (item.state === 'finished' && Number.isFinite(item.score)) {
        score.textContent = String(item.score); const max = document.createElement('small'); max.textContent = ' / 100'; score.append(max);
      } else {score.textContent = {queued:'排队', running:'判题中', failed:'未计分'}[item.state] || '处理中'; score.style.fontSize = '17px';}
      const note = document.createElement('p'); note.textContent = item.feedback || (item.state === 'queued' ? '已进入队列，请耐心等待。' : '正在隔离环境中编译和判题，可能需要几分钟。');
      li.append(name, time, score, note); $('scores').append(li);
    }
    controls();
  }

  async function refresh() {
    clearTimeout(timer);
    if (!account) return;
    const current = revision;
    try {
      const payload = await api('/api/submissions');
      if (current !== revision || !account) return;
      render(payload.items);
    } catch (e) {
      if (current !== revision) return;
      if (e.status === 401) {clearAccount(); $('auth-message').textContent = '登录已过期，请重新登录。';}
      else $('scores-note').textContent = e.message;
    }
    if (account && pending && !document.hidden) timer = setTimeout(refresh, 5000);
  }

  $('source').value = drafts.c;
  $('language').addEventListener('change', () => {
    drafts[language] = $('source').value; language = $('language').value;
    $('source').value = drafts[language]; $('file-name').textContent = filenames[language];
  });
  let resetArmed = false;
  $('reset-template').addEventListener('click', () => {
    if ($('source').value !== templates[language] && !resetArmed) {
      resetArmed = true; $('reset-template').textContent = '再次点击确认重置';
      setTimeout(() => {resetArmed = false; $('reset-template').textContent = '重置框架';}, 5000); return;
    }
    $('source').value = drafts[language] = templates[language]; resetArmed = false; $('reset-template').textContent = '重置框架';
  });
  $('source-file').addEventListener('change', async () => {
    const file = $('source-file').files[0]; if (!file) return;
    const before = language;
    try {
      if (file.size > 32768) throw new Error('文件不能超过 32 KiB。');
      const text = await file.text();
      if (text.includes('\0')) throw new Error('请选择 UTF-8 文本源代码文件。');
      if (language === before) $('source').value = drafts[language] = text;
      $('submit-message').textContent = '已导入文本，请确认语言和代码后提交。';
    } catch (e) {$('submit-message').textContent = e.message;}
    $('source-file').value = '';
  });
  $('copy-sample').addEventListener('click', async () => {
    try {await navigator.clipboard.writeText($('sample-input').textContent + '\n'); $('copy-sample').textContent = '已复制';}
    catch {const range = document.createRange(); range.selectNodeContents($('sample-input')); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); $('copy-sample').textContent = '已选中，请手动复制';}
  });
  $('register-button').addEventListener('click', () => {$('password').autocomplete = 'new-password';});
  $('login-button').addEventListener('click', () => {$('password').autocomplete = 'current-password';});
  $('auth-form').addEventListener('submit', async e => {
    e.preventDefault(); if (authBusy) return;
    const mode = e.submitter?.id === 'register-button' ? 'register' : 'login';
    authBusy = true; controls(); $('auth-message').textContent = mode === 'register' ? '正在创建账号…' : '正在登录…';
    try {
      const result = await api('/api/' + mode, {username:$('username').value, password:$('password').value});
      revision++; account = result; $('password').value = ''; $('auth-message').textContent = '登录成功。'; controls(); await refresh(); await health();
    } catch (error) {$('auth-message').textContent = error.message;}
    finally {authBusy = false; controls();}
  });
  $('logout-button').addEventListener('click', async () => {
    try {
      await api('/api/logout', {}); clearAccount();
      Object.assign(drafts, templates); $('source').value = drafts[language];
      $('auth-message').textContent = '已退出登录，当前页草稿与成绩已清除。'; $('submit-message').textContent = '';
    } catch (e) {$('auth-message').textContent = e.message;}
  });
  $('submit-form').addEventListener('submit', async e => {
    e.preventDefault(); if (!ready || !account || submitBusy || pending) return;
    const source = $('source').value;
    if (new TextEncoder().encode(source).length > 32768) {$('submit-message').textContent = '源代码不能超过 32 KiB。'; return;}
    submitBusy = true; controls(); $('submit-message').textContent = '正在提交…';
    try {
      await api('/api/submissions', {language, source}); pending = true;
      $('submit-message').textContent = '提交成功。判题过程中可以继续阅读题目，成绩会自动更新。';
      await refresh();
    } catch (e) {
      $('submit-message').textContent = e.message;
      if (e.status === 401) clearAccount();
      else {await refresh(); if (e.status === 503) await health();}
    } finally {submitBusy = false; controls();}
  });
  $('refresh-button').addEventListener('click', async () => {await refresh(); await health();});
  document.addEventListener('visibilitychange', () => {clearTimeout(timer); if (!document.hidden) {health(); if (account) refresh();}});
  controls();
  (async () => {
    const initial = revision;
    await health(); if (!base || account || authBusy || initial !== revision) return;
    try {
      const restored = await api('/api/session');
      if (initial !== revision || authBusy) return;
      account = restored; revision++; controls(); await refresh();
    } catch (e) {if (e.status !== 401 && initial === revision && !authBusy) $('auth-message').textContent = e.message;}
  })();
})();

