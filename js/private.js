(() => {
  'use strict';

  const VAULT_KEY = 'chengc_private_v1';
  const AUTH_API = 'https://auth.chenc.com.cn'; // 邮箱验证码服务（Cloudflare Worker 自定义域，免代理）
  const ITERATIONS = 310000;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const $ = id => document.getElementById(id);
  const overlay = $('privateOverlay');
  const gateOne = $('privateGateOne');
  const gateTwo = $('privateGateTwo');
  const vaultPanel = $('privateVault');
  let verifiedEmail = '';
  let vaultKey = null;
  let saveTimer = null;

  function bytesToBase64(bytes) {
    let value = '';
    bytes.forEach(byte => { value += String.fromCharCode(byte); });
    return btoa(value);
  }

  function base64ToBytes(value) {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
  }

  // 邮箱验证通过后，用邮箱地址作为密钥材料（稳定、不需要再记密码）
  async function deriveKey(email, salt) {
    const materialBytes = encoder.encode('chenc-private:' + email.toLowerCase());
    const material = await crypto.subtle.importKey('raw', materialBytes, 'PBKDF2', false, ['deriveKey']);
    materialBytes.fill(0);
    return crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITERATIONS },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function encryptText(text, key, salt) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(text));
    return { version: 1, iterations: ITERATIONS, salt: bytesToBase64(salt), iv: bytesToBase64(iv), data: bytesToBase64(new Uint8Array(encrypted)) };
  }

  async function decryptVault(record, key) {
    const plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: base64ToBytes(record.iv) },
      key,
      base64ToBytes(record.data)
    );
    return decoder.decode(plain);
  }

  function storedVault() {
    try {
      const parsed = JSON.parse(localStorage.getItem(VAULT_KEY));
      return parsed && parsed.version === 1 && parsed.salt && parsed.iv && parsed.data ? parsed : null;
    } catch {
      return null;
    }
  }

  function clearCredentials() {
    verifiedEmail = '';
    $('privateFirstCode').value = '';
    $('privateSecondCode').value = '';
  }

  function showStep(step) {
    [gateOne, gateTwo, vaultPanel].forEach(panel => panel.classList.toggle('hidden', panel !== step));
  }

  function openPrivate() {
    lockVault(false);
    overlay.classList.remove('hidden');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
    document.querySelector('main').inert = true;
    document.querySelector('.site-header').inert = true;
    requestAnimationFrame(() => $('privateFirstCode').focus());
  }

  async function closePrivate() {
    if (vaultKey) await saveVault();
    lockVault(false);
    overlay.classList.add('hidden');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');
    document.querySelector('main').inert = false;
    document.querySelector('.site-header').inert = false;
    $('privateBtn').focus();
  }

  function lockVault(focus = true) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = null;
    vaultKey = null;
    $('privateNotes').value = '';
    clearCredentials();
    $('privateFirstError').textContent = '';
    $('privateSecondError').textContent = '';
    const firstBtn = $('privateFirstForm').querySelector('button');
    firstBtn.disabled = false;
    firstBtn.textContent = '获取验证码';
    const secondBtn = $('privateSecondForm').querySelector('button');
    secondBtn.disabled = false;
    secondBtn.textContent = '验证并解锁';
    showStep(gateOne);
    if (focus) $('privateFirstCode').focus();
  }

  async function saveVault() {
    if (!vaultKey) return;
    const record = storedVault();
    if (!record) return;
    $('privateSaveStatus').textContent = '正在加密…';
    try {
      const next = await encryptText($('privateNotes').value, vaultKey, base64ToBytes(record.salt));
      localStorage.setItem(VAULT_KEY, JSON.stringify(next));
      $('privateSaveStatus').textContent = '已加密保存 · ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      $('privateSaveStatus').textContent = '保存失败，请重试';
    }
  }

  $('privateBtn').addEventListener('click', openPrivate);
  $('privateClose').addEventListener('click', closePrivate);
  $('privateLock').addEventListener('click', async () => {
    await saveVault();
    lockVault();
  });
  overlay.addEventListener('click', event => { if (event.target === overlay) closePrivate(); });
  document.addEventListener('keydown', event => {
    if (overlay.classList.contains('hidden')) return;
    if (event.key === 'Escape') { event.preventDefault(); closePrivate(); return; }
    if (event.key === 'Tab') {
      const controls = [...overlay.querySelectorAll('button,input,textarea,a[href],[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  });

  // 第一步：发送邮箱验证码
  $('privateFirstForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = $('privateFirstCode');
    const email = input.value.trim().toLowerCase();
    $('privateFirstError').textContent = '';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      input.focus();
      $('privateFirstError').textContent = '请输入正确的邮箱地址。';
      return;
    }
    const btn = $('privateFirstForm').querySelector('button');
    btn.disabled = true;
    btn.textContent = '发送中…';
    try {
      const r = await fetch(AUTH_API + '/api/cd-auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        verifiedEmail = email;
        input.value = '';
        $('privateSecondHeading').textContent = '第二步 · 输入验证码';
        $('privateSecondHint').textContent = '验证码已发送到 ' + email + '，5 分钟内有效。';
        showStep(gateTwo);
        requestAnimationFrame(() => $('privateSecondCode').focus());
        cooldown(btn);
      } else {
        $('privateFirstError').textContent = d.error || '发送失败，请重试';
        btn.disabled = false;
        btn.textContent = '获取验证码';
      }
    } catch {
      $('privateFirstError').textContent = '网络错误，请重试';
      btn.disabled = false;
      btn.textContent = '获取验证码';
    }
  });

  function cooldown(btn) {
    let left = 60;
    btn.disabled = true;
    const timer = setInterval(() => {
      left--;
      btn.textContent = '重新获取(' + left + 's)';
      if (left <= 0) {
        clearInterval(timer);
        btn.disabled = false;
        btn.textContent = '获取验证码';
      }
    }, 1000);
  }

  // 第二步：校验验证码并解锁
  $('privateSecondForm').addEventListener('submit', async event => {
    event.preventDefault();
    const codeInput = $('privateSecondCode');
    const code = codeInput.value.trim();
    $('privateSecondError').textContent = '';
    if (!verifiedEmail) {
      showStep(gateOne);
      return;
    }
    if (!/^\d{6}$/.test(code)) {
      $('privateSecondError').textContent = '请输入 6 位数字验证码。';
      return;
    }
    const btn = $('privateSecondForm').querySelector('button');
    btn.disabled = true;
    btn.textContent = '验证中…';
    try {
      const r = await fetch(AUTH_API + '/api/cd-auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: verifiedEmail, code, mode: 'json' })
      });
      const d = await r.json();
      if (!r.ok || !d.ok) {
        $('privateSecondError').textContent = d.error || '验证失败';
        codeInput.value = '';
        codeInput.focus();
        btn.disabled = false;
        btn.textContent = '验证并解锁';
        return;
      }
      codeInput.value = '';
      const existing = storedVault();
      try {
        const salt = existing ? base64ToBytes(existing.salt) : crypto.getRandomValues(new Uint8Array(16));
        const key = await deriveKey(d.email, salt);
        let content = '';
        if (existing) {
          content = await decryptVault(existing, key);
        } else {
          localStorage.setItem(VAULT_KEY, JSON.stringify(await encryptText('', key, salt)));
        }
        vaultKey = key;
        $('privateNotes').value = content;
        $('privateSaveStatus').textContent = '更改将自动加密保存';
        showStep(vaultPanel);
        clearCredentials();
        requestAnimationFrame(() => $('privateNotes').focus());
      } catch {
        clearCredentials();
        showStep(gateOne);
        $('privateFirstError').textContent = '本机保存的加密资料无法用当前邮箱密钥解开（旧版数据）。如需重新开始，请清除浏览器中本站数据后重试。';
        $('privateFirstCode').focus();
      }
    } catch {
      $('privateSecondError').textContent = '网络错误，请重试';
      btn.disabled = false;
      btn.textContent = '验证并解锁';
    }
  });

  $('privateNotes').addEventListener('input', () => {
    $('privateSaveStatus').textContent = '等待保存…';
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveVault, 650);
  });
  $('privateSave').addEventListener('click', saveVault);
  window.addEventListener('pagehide', () => {
    vaultKey = null;
    clearCredentials();
  });
})();
