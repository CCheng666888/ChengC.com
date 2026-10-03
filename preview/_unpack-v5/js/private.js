(() => {
  'use strict';

  const VAULT_KEY = 'chengc_private_v1';
  const FIRST_CODE_HASH = '8f42c10f85004b57944db95c1029139efab7d1b92a200b09a05e7c1b88f12c12';
  const ITERATIONS = 310000;
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const $ = id => document.getElementById(id);
  const overlay = $('privateOverlay');
  const gateOne = $('privateGateOne');
  const gateTwo = $('privateGateTwo');
  const vaultPanel = $('privateVault');
  let firstCode = '';
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

  async function sha256(value) {
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }

  async function deriveKey(primary, secondary, salt) {
    const materialBytes = encoder.encode(primary + '\u0000' + secondary);
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
    firstCode = '';
    $('privateFirstCode').value = '';
    $('privateSecondCode').value = '';
    $('privateSecondConfirm').value = '';
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

  $('privateFirstForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = $('privateFirstCode');
    $('privateFirstError').textContent = '';
    if (await sha256(input.value) !== FIRST_CODE_HASH) {
      input.value = '';
      $('privateFirstError').textContent = '第一道密码不正确。';
      input.focus();
      return;
    }
    firstCode = input.value;
    input.value = '';
    const isSetup = !storedVault();
    $('privateSecondHeading').textContent = isSetup ? '设置第二道验证码' : '第二道验证';
    $('privateSecondHint').textContent = isSetup ? '首次使用，请设置至少 8 位的独立验证码。忘记后无法找回。' : '请输入首次使用时设置的验证码。';
    $('privateConfirmGroup').classList.toggle('hidden', !isSetup);
    $('privateSecondForm').querySelector('button').textContent = isSetup ? '创建加密保险箱' : '解锁保险箱';
    showStep(gateTwo);
    requestAnimationFrame(() => $('privateSecondCode').focus());
  });

  $('privateSecondForm').addEventListener('submit', async event => {
    event.preventDefault();
    const codeInput = $('privateSecondCode');
    const confirmInput = $('privateSecondConfirm');
    const secondCode = codeInput.value;
    const existing = storedVault();
    $('privateSecondError').textContent = '';
    if (secondCode.length < 8) {
      $('privateSecondError').textContent = '第二道验证码至少需要 8 位。';
      return;
    }
    if (!existing && secondCode !== confirmInput.value) {
      confirmInput.value = '';
      $('privateSecondError').textContent = '两次输入的验证码不一致。';
      confirmInput.focus();
      return;
    }
    codeInput.value = '';
    confirmInput.value = '';
    try {
      const salt = existing ? base64ToBytes(existing.salt) : crypto.getRandomValues(new Uint8Array(16));
      const key = await deriveKey(firstCode, secondCode, salt);
      const content = existing ? await decryptVault(existing, key) : '';
      if (!existing) localStorage.setItem(VAULT_KEY, JSON.stringify(await encryptText('', key, salt)));
      vaultKey = key;
      $('privateNotes').value = content;
      $('privateSaveStatus').textContent = '更改将自动加密保存';
      showStep(vaultPanel);
      clearCredentials();
      requestAnimationFrame(() => $('privateNotes').focus());
    } catch {
      clearCredentials();
      showStep(gateOne);
      $('privateFirstError').textContent = '第二道验证码不正确，或加密资料已损坏。请重新完成两道验证。';
      $('privateFirstCode').focus();
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
