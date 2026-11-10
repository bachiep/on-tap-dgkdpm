'use strict';
// ========================================================
// MODULE 3: CROSS-DEVICE INSTANT SYNC, BACKUP & BOOTSTRAP
// ========================================================

const SYNC_CHOICE_MAP = { 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
const SYNC_CHOICE_REV = ['', 'A', 'B', 'C', 'D'];
let currentCloudSyncId = null;
let currentShortUrl = null;

function getExpiryDateStr(days = 3) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return day + '/' + month + '/' + year;
}

function getQuizBankAnswer(id) {
  if (typeof QUIZ_BANK !== 'undefined' && QUIZ_BANK.quiz) {
    const item = QUIZ_BANK.quiz.find(q => q.id === Number(id));
    if (item) return item.answer;
  }
  return null;
}

function getFormulaBankAnswer(id) {
  if (typeof FORMULA_FLASHCARDS !== 'undefined') {
    const item = FORMULA_FLASHCARDS.find(q => String(q.id) === String(id));
    if (item) return item.answer;
  }
  return null;
}

function utf8ToBase64(str) {
  try {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (m, p1) => String.fromCharCode(parseInt(p1, 16))));
  } catch (e) {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

function base64ToUtf8(b64) {
  try {
    return decodeURIComponent(Array.prototype.map.call(atob(b64), c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
  } catch (e) {
    return decodeURIComponent(escape(atob(b64)));
  }
}

function toBase64Url(str) {
  return utf8ToBase64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(b64url) {
  let b64 = String(b64url).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  return base64ToUtf8(b64);
}

function bytesToBase64Url(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(b64url) {
  let b64 = String(b64url).replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function packQuestionMap(map, count, prefixKey) {
  if (!map) return '';
  const entries = [];
  let maxId = 0;
  for (const [k, v] of Object.entries(map)) {
    const id = parseInt(k, 10);
    if (!isNaN(id) && v) {
      const choice = v.choice || (v.correct ? 'C' : 'A');
      entries.push(id + choice);
      if (id > maxId) maxId = id;
    }
  }
  if (entries.length === 0) return '';

  const sparseStr = prefixKey + 's.' + entries.join(',');

  let maxAligned = maxId;
  while (maxAligned % 3 !== 0) maxAligned++;
  const bytes = [];
  for (let i = 1; i <= maxAligned; i += 3) {
    const q0 = map[i];
    const q1 = map[i + 1];
    const q2 = map[i + 2];
    const v0 = q0 ? (SYNC_CHOICE_MAP[q0.choice] || (q0.correct ? 2 : 1)) : 0;
    const v1 = q1 ? (SYNC_CHOICE_MAP[q1.choice] || (q1.correct ? 2 : 1)) : 0;
    const v2 = q2 ? (SYNC_CHOICE_MAP[q2.choice] || (q2.correct ? 2 : 1)) : 0;
    bytes.push(v0 * 25 + v1 * 5 + v2);
  }
  const denseStr = prefixKey + '.' + bytesToBase64Url(bytes);

  return (sparseStr.length <= denseStr.length) ? sparseStr : denseStr;
}

function packSyncData(currState) {
  const s = currState || state;
  const parts = ['2'];

  const qStr = packQuestionMap(s.quiz, 299, 'q');
  if (qStr) parts.push(qStr);

  const fStr = packQuestionMap(s.flash, 299, 'f');
  if (fStr) parts.push(fStr);

  if (s.formula && Object.keys(s.formula).length > 0) {
    try { parts.push('m.' + toBase64Url(JSON.stringify(s.formula))); } catch (e) {}
  }

  if (s.star) {
    const active = Object.keys(s.star).filter(k => s.star[k]);
    if (active.length > 0) parts.push('s.' + active.join(','));
  }

  if (s.maxStreak) {
    parts.push('k.' + s.maxStreak);
  }

  if (s.notes && Object.keys(s.notes).length > 0) {
    try { parts.push('n.' + toBase64Url(JSON.stringify(s.notes))); } catch (e) {}
  }

  if (s.essay && Object.keys(s.essay).length > 0) {
    try { parts.push('e.' + toBase64Url(JSON.stringify(s.essay))); } catch (e) {}
  }

  return parts.join('~');
}

function decodeQuestionSection(targetObj, type, data) {
  if (type.endsWith('s.')) {
    data.split(',').forEach(item => {
      if (!item) return;
      const match = item.match(/^(\d+)([A-D1-4])$/i);
      if (match) {
        const id = parseInt(match[1], 10);
        let ch = match[2].toUpperCase();
        if (ch === '1') ch = 'A';
        else if (ch === '2') ch = 'B';
        else if (ch === '3') ch = 'C';
        else if (ch === '4') ch = 'D';
        targetObj[id] = { choice: ch };
      }
    });
  } else {
    try {
      const bytes = base64UrlToBytes(data);
      let id = 1;
      for (let i = 0; i < bytes.length; i++) {
        let byte = bytes[i];
        const v0 = Math.floor(byte / 25);
        byte %= 25;
        const v1 = Math.floor(byte / 5);
        const v2 = byte % 5;
        if (v0 > 0) targetObj[id] = { choice: SYNC_CHOICE_REV[v0] };
        if (v1 > 0) targetObj[id + 1] = { choice: SYNC_CHOICE_REV[v1] };
        if (v2 > 0) targetObj[id + 2] = { choice: SYNC_CHOICE_REV[v2] };
        id += 3;
      }
    } catch (e) {
      console.warn('Cannot decode dense section:', type, e);
    }
  }
}

function unpackSyncData(payloadStr) {
  if (!payloadStr || typeof payloadStr !== 'string') return null;
  const raw = payloadStr.trim();

  if (raw === '2' || raw.startsWith('2~') || raw.startsWith('2_') || raw.includes('~q.') || raw.includes('~qs.')) {
    const parts = raw.split('~');
    const result = { quiz: {}, flash: {}, formula: {}, star: {}, notes: {}, essay: {}, maxStreak: 0 };

    for (let pIdx = 1; pIdx < parts.length; pIdx++) {
      const part = parts[pIdx];
      if (part.startsWith('qs.')) {
        decodeQuestionSection(result.quiz, 'qs.', part.slice(3));
      } else if (part.startsWith('q.')) {
        decodeQuestionSection(result.quiz, 'q.', part.slice(2));
      } else if (part.startsWith('fs.')) {
        decodeQuestionSection(result.flash, 'fs.', part.slice(3));
      } else if (part.startsWith('f.')) {
        decodeQuestionSection(result.flash, 'f.', part.slice(2));
      } else if (part.startsWith('m.')) {
        try { result.formula = JSON.parse(fromBase64Url(part.slice(2))); } catch (e) {}
      } else if (part.startsWith('s.')) {
        part.slice(2).split(',').forEach(k => { if (k) result.star[k] = true; });
      } else if (part.startsWith('k.')) {
        result.maxStreak = parseInt(part.slice(2), 10) || 0;
      } else if (part.startsWith('n.')) {
        try { result.notes = JSON.parse(fromBase64Url(part.slice(2))); } catch (e) {}
      } else if (part.startsWith('e.')) {
        try { result.essay = JSON.parse(fromBase64Url(part.slice(2))); } catch (e) {}
      }
    }
    return result;
  }

  let parsed = null;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    try {
      const jsonStr = fromBase64Url(raw);
      parsed = JSON.parse(jsonStr);
    } catch (e2) {
      return null;
    }
  }

  if (!parsed || typeof parsed !== 'object') return null;
  if (parsed.state && typeof parsed.state === 'object') {
    parsed = parsed.state;
  }

  const result = { quiz: {}, flash: {}, formula: {}, star: {}, notes: {}, essay: {}, maxStreak: 0 };
  if (parsed.quiz && typeof parsed.quiz === 'object') Object.assign(result.quiz, parsed.quiz);
  if (parsed.flash && typeof parsed.flash === 'object') Object.assign(result.flash, parsed.flash);
  if (parsed.formula && typeof parsed.formula === 'object') Object.assign(result.formula, parsed.formula);
  if (parsed.star && typeof parsed.star === 'object') Object.assign(result.star, parsed.star);
  if (parsed.notes && typeof parsed.notes === 'object') Object.assign(result.notes, parsed.notes);
  if (parsed.essay && typeof parsed.essay === 'object') Object.assign(result.essay, parsed.essay);
  if (parsed.maxStreak) result.maxStreak = Math.max(result.maxStreak, parsed.maxStreak);

  return result;
}

function mergeSyncState(imported) {
  if (!imported) return 0;
  let count = 0;

  state.quiz = state.quiz || {};
  state.flash = state.flash || {};
  state.formula = state.formula || {};
  state.star = state.star || {};
  state.notes = state.notes || {};
  state.essay = state.essay || {};

  if (imported.quiz) {
    for (const [k, v] of Object.entries(imported.quiz)) {
      if (!v) continue;
      const qId = parseInt(k, 10);
      let isCorrect = v.correct;
      if (isCorrect === undefined && v.choice) {
        const ans = getQuizBankAnswer(qId);
        isCorrect = ans ? (ans === v.choice) : true;
      }
      state.quiz[k] = {
        choice: v.choice || '',
        correct: isCorrect !== undefined ? Boolean(isCorrect) : true
      };
      count++;
    }
  }

  if (imported.flash) {
    for (const [k, v] of Object.entries(imported.flash)) {
      if (!v) continue;
      const qId = parseInt(k, 10);
      let isCorrect = v.correct;
      if (isCorrect === undefined && v.choice) {
        const ans = getQuizBankAnswer(qId);
        isCorrect = ans ? (ans === v.choice) : true;
      }
      state.flash[k] = {
        choice: v.choice || '',
        correct: isCorrect !== undefined ? Boolean(isCorrect) : true
      };
      count++;
    }
  }

  if (imported.formula) {
    for (const [k, v] of Object.entries(imported.formula)) {
      if (!v) continue;
      let isCorrect = v.correct;
      if (isCorrect === undefined && v.choice) {
        const ans = getFormulaBankAnswer(k);
        isCorrect = ans ? (ans === v.choice) : true;
      }
      state.formula[k] = {
        choice: v.choice || '',
        correct: isCorrect !== undefined ? Boolean(isCorrect) : true
      };
      count++;
    }
  }

  if (imported.star) {
    for (const [k, v] of Object.entries(imported.star)) {
      if (v) { state.star[k] = true; count++; }
    }
  }

  if (imported.notes) {
    for (const [k, v] of Object.entries(imported.notes)) {
      if (v) { state.notes[k] = v; count++; }
    }
  }

  if (imported.essay) {
    for (const [k, v] of Object.entries(imported.essay)) {
      if (v) { state.essay[k] = v; count++; }
    }
  }

  if (imported.maxStreak) {
    state.maxStreak = Math.max(state.maxStreak || 0, imported.maxStreak);
  }

  persist();
  try { rebuild(); } catch (e) {}
  try { updateSyncStatsSummary(); } catch (e) {}

  return count;
}

function getSyncBaseUrl() {
  const isLocal = !window.location.hostname || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocal) {
    return 'https://bachiep.github.io/on-tap-dgkdpm/';
  }
  return window.location.origin + window.location.pathname;
}

function getOfflineSyncUrl() {
  const base = getSyncBaseUrl();
  const code = packSyncData();
  return base + (base.endsWith('/') ? '' : '/') + '#s=' + code;
}

function getSyncUrl() {
  if (currentShortUrl) return currentShortUrl;
  if (currentCloudSyncId) return 'https://is.gd/' + currentCloudSyncId;
  return getOfflineSyncUrl();
}

async function uploadStateToCloud() {
  const canvas = document.getElementById('syncQrCanvas');
  try {
    if (canvas && !currentShortUrl) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#4f46e5';
      ctx.font = 'bold 14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⏳ Đang tạo mã QR siêu nét...', canvas.width / 2, canvas.height / 2);
    }

    const offlineUrl = getOfflineSyncUrl();
    let shortUrl = null;
    let shortId = null;

    try {
      const resp = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: offlineUrl })
      });
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && data.shortUrl) {
          shortUrl = data.shortUrl;
          shortId = data.id || shortUrl.split('/').filter(Boolean).pop();
        }
      }
    } catch (e) {}

    if (!shortUrl) {
      try {
        const isgdResp = await fetch('https://is.gd/create.php?format=json&url=' + encodeURIComponent(offlineUrl));
        if (isgdResp && isgdResp.ok) {
          const isgdData = await isgdResp.json();
          if (isgdData && isgdData.shorturl) {
            shortUrl = isgdData.shorturl;
            shortId = shortUrl.split('/').filter(Boolean).pop();
          }
        }
      } catch (err2) {}
    }

    if (shortUrl) {
      currentShortUrl = shortUrl;
      currentCloudSyncId = shortId || shortUrl;
      renderSyncQrWithUrl(shortUrl);
      const codeArea = document.getElementById('syncExportText');
      if (codeArea) codeArea.value = shortId || shortUrl;
      return shortUrl;
    }

    throw new Error('Không thể rút gọn link');
  } catch (err) {
    renderSyncQrWithUrl(getOfflineSyncUrl());
    const codeArea = document.getElementById('syncExportText');
    if (codeArea) codeArea.value = packSyncData();
  }
}

async function fetchAndApplyCloudSync(syncId) {
  try {
    showToast('⏳ Đang kết nối nạp tiến độ từ mã ' + syncId + '...');

    let resolvedUrl = null;
    let target = syncId;
    if (!target.startsWith('http://') && !target.startsWith('https://')) {
      target = 'https://is.gd/' + target;
    }

    try {
      const resp = await fetch('/api/sync?url=' + encodeURIComponent(target));
      if (resp && resp.ok) {
        const data = await resp.json();
        if (data && data.url) resolvedUrl = data.url;
      }
    } catch (e) {}

    if (!resolvedUrl && target.includes('is.gd')) {
      try {
        const fresp = await fetch('https://is.gd/forward.php?format=json&shorturl=' + encodeURIComponent(target));
        if (fresp && fresp.ok) {
          const fdata = await fresp.json();
          if (fdata && fdata.url) resolvedUrl = fdata.url;
        }
      } catch (e2) {}
    }

    const finalUrl = resolvedUrl || target;
    let payloadStr = '';
    if (finalUrl.includes('#s=')) {
      payloadStr = finalUrl.split('#s=')[1].split('&')[0];
    } else if (finalUrl.includes('#sync=')) {
      payloadStr = finalUrl.split('#sync=')[1].split('&')[0];
    } else {
      throw new Error('Mã đồng bộ không tìm thấy hoặc đã hết hạn.');
    }

    const imported = unpackSyncData(payloadStr);
    if (!imported) throw new Error('Dữ liệu đồng bộ bị lỗi.');

    const count = mergeSyncState(imported);
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', window.location.pathname);
    }

    setTimeout(() => {
      playCorrectSound();
      try { triggerConfetti(); } catch (e) {}
      showToast('🎉 Đã đồng bộ thành công ' + count + ' mục!');
    }, 300);
  } catch (err) {
    showToast('⚠️ Không thể tải dữ liệu: ' + err.message);
  }
}

let activeSyncTab = 'qr';

function switchSyncTab(tabId) {
  activeSyncTab = tabId;
  ['qr', 'file', 'code'].forEach(t => {
    const btn = $('#syncTabBtn' + t.charAt(0).toUpperCase() + t.slice(1));
    const panel = $('#syncTab' + t.charAt(0).toUpperCase() + t.slice(1));
    if (btn) btn.classList.toggle('active', t === tabId);
    if (panel) panel.classList.toggle('active', t === tabId);
  });

  if (tabId === 'qr') {
    generateSyncQr();
  } else if (tabId === 'code') {
    const codeArea = $('#syncExportText');
    if (codeArea) {
      if (currentCloudSyncId) {
        codeArea.value = currentCloudSyncId;
      } else {
        codeArea.value = packSyncData();
        uploadStateToCloud();
      }
    }
  }
}

function updateSyncStatsSummary() {
  const quizDone = Object.keys(state.quiz || {}).length;
  const flashDone = Object.keys(state.flash || {}).length;
  const formulaDone = Object.keys(state.formula || {}).length;
  const starDone = Object.values(state.star || {}).filter(Boolean).length;
  const streak = state.maxStreak || 0;

  if ($('#syncStatQuiz')) $('#syncStatQuiz').textContent = quizDone + '/299';
  if ($('#syncStatFlash')) $('#syncStatFlash').textContent = flashDone + '/299';
  if ($('#syncStatFormula')) $('#syncStatFormula').textContent = formulaDone + '/10';
  if ($('#syncStatStar')) $('#syncStatStar').textContent = starDone + ' câu';
  if ($('#syncStatStreak')) $('#syncStatStreak').textContent = streak + ' 🔥';

  const expEl = document.getElementById('syncExpiryDate');
  if (expEl) expEl.textContent = getExpiryDateStr(3);
}

function renderSyncQrWithUrl(targetUrl) {
  const canvas = document.getElementById('syncQrCanvas');
  if (!canvas) return;
  if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
    QRCode.toCanvas(canvas, targetUrl, {
      width: 280,
      margin: 3,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M'
    }, function () {});
  }
}

function generateSyncQr() {
  const expEl = document.getElementById('syncExpiryDate');
  if (expEl) expEl.textContent = getExpiryDateStr(3);
  if (currentShortUrl) {
    renderSyncQrWithUrl(currentShortUrl);
  } else {
    uploadStateToCloud();
  }
}

function refreshSyncQr() {
  currentCloudSyncId = null;
  currentShortUrl = null;
  generateSyncQr();
  showToast('🔄 Đang tạo mã QR rút gọn mới...');
}

function copyTextToClipboard(text, successMsg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(successMsg)).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showToast(successMsg);
  } catch (e) {
    showToast('⚠️ Không thể sao chép tự động.');
  }
  document.body.removeChild(ta);
}

function copySyncUrl() {
  copyTextToClipboard(getSyncUrl(), '📋 Đã sao chép link đồng bộ!');
}

function copySyncCode() {
  const code = currentCloudSyncId || packSyncData();
  copyTextToClipboard(code, '📋 Đã sao chép mã đồng bộ!');
}

function downloadQrImage() {
  const canvas = document.getElementById('syncQrCanvas');
  if (!canvas) return;
  try {
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const d = new Date();
    const dateStr = d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
    a.download = 'dgkdpm_qr_dongbo_' + dateStr + '.png';
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('📥 Đã tải ảnh mã QR về máy thành công!');
  } catch (e) {
    showToast('⚠️ Không thể tải ảnh: ' + e.message);
  }
}

function handleQrImageUpload(event) {
  const file = event.target.files && event.target.files[0];
  if (!file || typeof jsQR === 'undefined') return;
  showToast('🔍 Đang phân tích mã QR từ ảnh...');
  const reader = new FileReader();
  reader.onload = function (e) {
    const img = new Image();
    img.onload = function () {
      try {
        const scanCanvas = document.createElement('canvas');
        const sctx = scanCanvas.getContext('2d');
        scanCanvas.width = img.width;
        scanCanvas.height = img.height;
        sctx.drawImage(img, 0, 0);
        const imgData = sctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height);
        const qr = jsQR(imgData.data, imgData.width, imgData.height, { inversionAttempts: 'attemptBoth' });
        if (!qr || !qr.data) throw new Error('Không nhận diện được mã QR trong ảnh.');
        closeSyncModal();
        applyExtractedSyncContent(qr.data.trim());
      } catch (err) {
        alert('⚠️ ' + err.message);
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function applyExtractedSyncContent(raw) {
  if (!raw || typeof raw !== 'string') return;
  const content = raw.trim();

  if (content.includes('#s=') || content.includes('#sync=')) {
    const payloadStr = content.includes('#s=') ? content.split('#s=')[1].split('&')[0] : content.split('#sync=')[1].split('&')[0];
    const imported = unpackSyncData(payloadStr);
    if (imported) {
      closeSyncModal();
      const count = mergeSyncState(imported);
      playCorrectSound();
      try { triggerConfetti(); } catch (e) {}
      showToast('🎉 Đã đồng bộ thành công ' + count + ' mục từ mã QR!');
      return;
    }
  }

  if (content.includes('is.gd/') || content.includes('tinyurl.com/') || /^[a-zA-Z0-9_-]{4,16}$/.test(content)) {
    closeSyncModal();
    fetchAndApplyCloudSync(content);
    return;
  }

  const imported = unpackSyncData(content);
  if (imported) {
    closeSyncModal();
    const count = mergeSyncState(imported);
    playCorrectSound();
    try { triggerConfetti(); } catch (e) {}
    showToast('🎉 Đã đồng bộ thành công ' + count + ' mục!');
    return;
  }

  alert('Mã QR hoặc chuỗi ký tự không chứa dữ liệu tiến độ hợp lệ.');
}

function exportBackupFile() {
  try {
    const backupData = {
      appName: 'Góc ôn tập ĐG&KĐCLPM',
      version: 1,
      exportedAt: new Date().toISOString(),
      state: state
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dgkdpm_tiendo.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('📥 Đã tải file sao lưu dgkdpm_tiendo.json thành công!');
  } catch (err) {
    showToast('⚠️ Không thể xuất file: ' + err.message);
  }
}

function handleImportFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const imported = unpackSyncData(e.target.result);
      if (!imported) throw new Error('Dữ liệu trong file không hợp lệ');
      const count = mergeSyncState(imported);
      closeSyncModal();
      playCorrectSound();
      try { triggerConfetti(); } catch (e) {}
      showToast('🎉 Khôi phục thành công ' + count + ' mục tiến độ từ file!');
    } catch (err) {
      alert('Không thể khôi phục từ file: ' + err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
  event.target.value = '';
}

async function pasteToSyncInput() {
  const inputEl = document.getElementById('syncImportText');
  if (!inputEl) return;
  try {
    if (navigator.clipboard && navigator.clipboard.readText) {
      const text = await navigator.clipboard.readText();
      if (text && text.trim()) {
        inputEl.value = text.trim();
        showToast('📋 Đã dán nội dung từ bộ nhớ tạm!');
        return;
      }
    }
  } catch (err) {}
  inputEl.focus();
  showToast('💡 Vui lòng nhấn Ctrl+V vào ô.');
}

function applySyncCode() {
  const inputEl = $('#syncImportText');
  if (!inputEl || !inputEl.value.trim()) {
    showToast('⚠️ Vui lòng dán mã đồng bộ vào ô.');
    return;
  }
  applyExtractedSyncContent(inputEl.value.trim());
  inputEl.value = '';
}

function openSyncModal() {
  updateSyncStatsSummary();
  switchSyncTab(activeSyncTab || 'qr');
  if ($('#syncModal')) $('#syncModal').classList.add('open');
}

function closeSyncModal() {
  if ($('#syncModal')) $('#syncModal').classList.remove('open');
}

function handleSyncOverlayClick(e) {
  if (e.target && e.target.id === 'syncModal') closeSyncModal();
}

function checkSyncUrlOnBoot() {
  try {
    let cloudCode = null;
    let payloadStr = '';

    const search = window.location.search || '';
    if (search) {
      const params = new URLSearchParams(search);
      if (params.get('c')) cloudCode = params.get('c');
      else if (params.get('code')) cloudCode = params.get('code');
    }

    const hash = window.location.hash || '';
    if (!cloudCode) {
      if (hash.startsWith('#c=')) cloudCode = hash.slice(3);
      else if (hash.startsWith('#s=')) payloadStr = hash.slice(3);
      else if (hash.startsWith('#sync=')) payloadStr = hash.slice(6);
    }

    if (cloudCode) {
      fetchAndApplyCloudSync(cloudCode);
      return;
    }

    if (payloadStr) {
      const imported = unpackSyncData(payloadStr);
      if (imported) {
        const count = mergeSyncState(imported);
        if (window.history && window.history.replaceState) {
          window.history.replaceState(null, '', window.location.pathname);
        }
        setTimeout(() => {
          playCorrectSound();
          try { triggerConfetti(); } catch (e) {}
          showToast('🎉 Đã tự động đồng bộ ' + count + ' mục từ thiết bị khác!');
        }, 400);
      }
    }
  } catch (err) {}
}

function syncHeaderHeight() {
  const hd = document.querySelector('header');
  if (hd) {
    const h = hd.getBoundingClientRect().height || hd.offsetHeight || 62;
    document.documentElement.style.setProperty('--header-h', h.toFixed(2) + 'px');
  }
}
window.addEventListener('resize', syncHeaderHeight);
syncHeaderHeight();
if (typeof ResizeObserver !== 'undefined' && document.querySelector('header')) {
  new ResizeObserver(syncHeaderHeight).observe(document.querySelector('header'));
}

// Initial boot
rebuild();
checkSyncUrlOnBoot();

if (typeof window !== 'undefined') {
  window.openSyncModal = openSyncModal;
  window.closeSyncModal = closeSyncModal;
  window.handleSyncOverlayClick = handleSyncOverlayClick;
  window.switchSyncTab = switchSyncTab;
  window.packSyncData = packSyncData;
  window.unpackSyncData = unpackSyncData;
  window.mergeSyncState = mergeSyncState;
  window.checkSyncUrlOnBoot = checkSyncUrlOnBoot;
  window.generateSyncQr = generateSyncQr;
  window.refreshSyncQr = refreshSyncQr;
  window.copySyncUrl = copySyncUrl;
  window.copySyncCode = copySyncCode;
  window.exportBackupFile = exportBackupFile;
  window.handleImportFile = handleImportFile;
  window.applySyncCode = applySyncCode;
  window.pasteToSyncInput = pasteToSyncInput;
  window.downloadQrImage = downloadQrImage;
  window.handleQrImageUpload = handleQrImageUpload;
  window.applyExtractedSyncContent = applyExtractedSyncContent;
}
