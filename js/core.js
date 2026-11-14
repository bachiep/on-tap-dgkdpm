'use strict';
// ========================================================
// MODULE 1: CORE STATE, AUDIO, CONFETTI, THEME & EXAM 50 GENERATOR
// ========================================================
const D = (typeof QUIZ_BANK !== 'undefined') ? QUIZ_BANK : {};
const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const STORAGE_KEY = 'dgkdpm-v2';
const SOUND_KEY = 'dgkdpm-sound';
const THEME_KEY = 'dgkdpm-theme';
const SIDEBAR_KEY = 'dgkdpm-sidebar-collapsed';

// Official 50-question exam quotas per Group (Page 1 of Syllabus PDF)
const EXAM_50_QUOTAS = { 1: 10, 2: 15, 3: 3, 4: 5, 5: 12, 6: 5 };

let saved = {};
try {
  saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {};
} catch (e) {
  const sn = $('#storageNotice');
  if (sn) sn.classList.remove('hidden');
}

let state = {
  quiz: {},
  flash: {},
  essay: {},
  formula: {},
  star: {},
  notes: {},
  maxStreak: 0,
  ...saved
};

let soundEnabled = localStorage.getItem(SOUND_KEY) !== 'false';
let currentTheme = localStorage.getItem(THEME_KEY) || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
let sidebarCollapsed = localStorage.getItem(SIDEBAR_KEY) === 'true';

let session = 'all';
let mode = 'quiz';
let index = 0;
let list = [];
let flipped = false;
let revealed = false;
let shuffled = false;
let order = [];
let currentStreak = 0;
let currentZoom = 1;

let random30Questions = [];
let exam50Questions = [];
let activeSampleNum = 0; // 0 = random 50, 1..10 = fixed sample exam 1..10

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    const sn = $('#storageNotice');
    if (sn) sn.classList.remove('hidden');
  }
}

// Toast notification
let toastTimer;
function showToast(msg) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
}

// Audio Synthesizer (Web Audio API - 100% Offline)
let audioCtx = null;
function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) audioCtx = new AudioContextClass();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.15, startTime = 0, gainLevel = 0.15) {
  if (!soundEnabled) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);
    gain.gain.setValueAtTime(gainLevel, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + startTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  } catch (e) {}
}

function playCorrectSound() {
  playTone(523.25, 'triangle', 0.22, 0, 0.18);
  playTone(659.25, 'triangle', 0.25, 0.08, 0.16);
  playTone(1046.50, 'sine', 0.35, 0.16, 0.2);
}

function playWrongSound() {
  playTone(220, 'sawtooth', 0.2, 0, 0.12);
  playTone(164.8, 'sawtooth', 0.25, 0.1, 0.14);
}

function playFlipSound() {
  playTone(440, 'sine', 0.08, 0, 0.08);
  playTone(660, 'sine', 0.08, 0.04, 0.08);
}

function playStreakCelebration() {
  const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
  notes.forEach((f, i) => playTone(f, 'triangle', 0.25, i * 0.08, 0.18));
}

// Confetti Effect
const confettiCanvas = document.getElementById('confettiCanvas');
const confettiCtx = confettiCanvas ? confettiCanvas.getContext('2d') : null;
let confettiParticles = [];
let confettiAnimId = null;

function resizeCanvas() {
  if (!confettiCanvas) return;
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

function triggerConfetti() {
  if (!confettiCanvas || !confettiCtx) return;
  const colors = ['#7c3aed', '#ec4899', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];
  for (let i = 0; i < 90; i++) {
    confettiParticles.push({
      x: window.innerWidth * (0.3 + Math.random() * 0.4),
      y: window.innerHeight * 0.4,
      w: Math.random() * 9 + 4,
      h: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 1.2) * 14,
      rot: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      opacity: 1
    });
  }
  if (!confettiAnimId) renderConfetti();
}

function renderConfetti() {
  if (!confettiCtx || !confettiCanvas) return;
  confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  for (let i = confettiParticles.length - 1; i >= 0; i--) {
    const p = confettiParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.38;
    p.vx *= 0.98;
    p.rot += p.vRot;
    p.opacity -= 0.012;

    if (p.opacity <= 0 || p.y > window.innerHeight) {
      confettiParticles.splice(i, 1);
      continue;
    }

    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate((p.rot * Math.PI) / 180);
    confettiCtx.fillStyle = p.color;
    confettiCtx.globalAlpha = Math.max(0, p.opacity);
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  }

  if (confettiParticles.length > 0) {
    confettiAnimId = requestAnimationFrame(renderConfetti);
  } else {
    confettiAnimId = null;
    confettiCtx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

// Theme handler
function applyTheme(th) {
  currentTheme = th;
  document.documentElement.setAttribute('data-theme', th);
  localStorage.setItem(THEME_KEY, th);
  if ($('#themeIcon')) $('#themeIcon').textContent = th === 'dark' ? '☀️' : '🌙';
}
applyTheme(currentTheme);

if ($('#themeToggle')) {
  $('#themeToggle').onclick = () => {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  };
}

// Sound toggle
function updateSoundUI() {
  if ($('#soundIcon')) $('#soundIcon').textContent = soundEnabled ? '🔊' : '🔇';
  if ($('#soundToggle')) $('#soundToggle').title = soundEnabled ? 'Âm thanh: ĐANG BẬT (Bấm để tắt)' : 'Âm thanh: ĐÃ TẮT (Bấm để bật)';
}
updateSoundUI();
if ($('#soundToggle')) {
  $('#soundToggle').onclick = () => {
    soundEnabled = !soundEnabled;
    localStorage.setItem(SOUND_KEY, String(soundEnabled));
    updateSoundUI();
    showToast(soundEnabled ? '🔊 Đã bật âm thanh' : '🔇 Đã tắt âm thanh');
    if (soundEnabled) playTone(587.33, 'sine', 0.15, 0, 0.15);
  };
}

// Sidebar Collapse Handler
function applySidebarCollapsed(collapsed) {
  sidebarCollapsed = collapsed;
  if ($('#layoutContainer')) $('#layoutContainer').classList.toggle('sidebar-collapsed', collapsed);
  if ($('#sidebarCollapseBtn')) {
    $('#sidebarCollapseBtn').textContent = collapsed ? '▶' : '◀';
    $('#sidebarCollapseBtn').title = collapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar';
  }
  localStorage.setItem(SIDEBAR_KEY, String(collapsed));
}
applySidebarCollapsed(sidebarCollapsed);
if ($('#sidebarCollapseBtn')) {
  $('#sidebarCollapseBtn').onclick = () => applySidebarCollapsed(!sidebarCollapsed);
}

// Lightbox modal handler
function openLightbox(src, title) {
  document.body.style.overflow = 'hidden';
  if ($('#lightboxImg')) {
    $('#lightboxImg').src = src;
    $('#lightboxImg').style.transform = 'scale(1)';
  }
  if ($('#lightboxTitle')) $('#lightboxTitle').textContent = title || 'Ảnh trích đoạn đáp án gốc';
  currentZoom = 1;
  if ($('#zoomResetBtn')) $('#zoomResetBtn').textContent = '100%';
  if ($('#imageLightbox')) $('#imageLightbox').classList.add('open');
}

function closeLightbox() {
  if ($('#imageLightbox')) $('#imageLightbox').classList.remove('open');
  document.body.style.overflow = '';
}

if ($('#closeLightbox')) $('#closeLightbox').onclick = closeLightbox;
if ($('#imageLightbox')) {
  $('#imageLightbox').onclick = e => {
    if (e.target === $('#imageLightbox') || e.target === $('#lightboxBody')) closeLightbox();
  };
}
if ($('#zoomInBtn')) {
  $('#zoomInBtn').onclick = () => {
    currentZoom = Math.min(3, currentZoom + 0.25);
    $('#lightboxImg').style.transform = 'scale(' + currentZoom + ')';
    $('#zoomResetBtn').textContent = Math.round(currentZoom * 100) + '%';
  };
}
if ($('#zoomOutBtn')) {
  $('#zoomOutBtn').onclick = () => {
    currentZoom = Math.max(0.5, currentZoom - 0.25);
    $('#lightboxImg').style.transform = 'scale(' + currentZoom + ')';
    $('#zoomResetBtn').textContent = Math.round(currentZoom * 100) + '%';
  };
}
if ($('#zoomResetBtn')) {
  $('#zoomResetBtn').onclick = () => {
    currentZoom = 1;
    $('#lightboxImg').style.transform = 'scale(1)';
    $('#zoomResetBtn').textContent = '100%';
  };
}

function scrollToCard() {
  const card = (mode === 'formula')
    ? ($('#formulaFlashcardBox') || $('.formula-flashcard-stage') || $('.formula-flash-section') || $('#card'))
    : $('#card');
  if (!card) return;
  const header = $('header');
  const headerHeight = header ? header.offsetHeight : 60;
  const rect = card.getBoundingClientRect();
  const targetY = window.pageYOffset + rect.top - headerHeight - 12;
  window.scrollTo({
    top: Math.max(0, targetY),
    behavior: 'smooth'
  });
}

const key = q => (mode === 'essay' ? 'e' : 'q') + q.id;

// Seeded PRNG for deterministic Sample Exams 1..10
function createSeededRng(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateExam50(sampleNum = 0) {
  activeSampleNum = sampleNum;
  const rng = sampleNum > 0 ? createSeededRng(202600 + sampleNum * 97) : Math.random;
  const selected = [];
  for (let grp = 1; grp <= 6; grp++) {
    const quota = EXAM_50_QUOTAS[grp] || 0;
    const pool = [...(D.quiz || []).filter(q => q.session === grp)];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    selected.push(...pool.slice(0, quota));
  }
  exam50Questions = selected;
}

function generateRandom30() {
  const pool = [...(D.quiz || [])];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  random30Questions = pool.slice(0, 30);
}

function base() {
  if (mode === 'formula') return [];
  if (session === 'exam50') {
    if (!exam50Questions.length) generateExam50(activeSampleNum || 0);
    return exam50Questions;
  }
  if (session === 'random30') {
    if (!random30Questions.length) generateRandom30();
    return random30Questions;
  }
  return (mode === 'essay' ? D.essay : D.quiz).filter(q => session === 'all' || String(q.session) === session);
}

// ========================================================
// SECURITY PASS GATE: "Pác Hịp có đzai không?" & PASS "pachipdzai"
// ========================================================
const RICK_ROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=RDEMt6MUSQI0t_Ts2EDUDWGRhQ&start_radio=1';
const GATE_KEY = 'hiep_pass_unlocked';
const CORRECT_PASS = 'pachipdzai';

function isGateUnlocked() {
  return sessionStorage.getItem(GATE_KEY) === 'true';
}

function handleGateAnswer(isYes) {
  if (isYes) {
    // Show password step
    const step1 = document.getElementById('gateStepQuestion');
    const step2 = document.getElementById('gateStepPassword');
    const err = document.getElementById('gatePassError');
    const input = document.getElementById('gatePassInput');
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'block';
    if (err) err.style.display = 'none';
    if (input) {
      input.value = '';
      input.classList.remove('shake-error');
      setTimeout(() => input.focus(), 150);
    }
  } else {
    try { playSound('wrong'); } catch (e) {}
    // Rick roll redirect
    window.location.href = RICK_ROLL_URL;
  }
}

function submitGatePassword() {
  const input = document.getElementById('gatePassInput');
  const err = document.getElementById('gatePassError');
  const val = (input ? input.value : '').trim();

  if (val === CORRECT_PASS) {
    sessionStorage.setItem(GATE_KEY, 'true');
    const modal = document.getElementById('passGateModal');
    if (modal) {
      modal.classList.add('unlocked');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 350);
    }
    document.documentElement.classList.add('gate-passed');
    try { playSound('victory'); } catch (e) {}
    try { fireConfetti(); } catch (e) {}
    try { showToast('😎 Xác thực thành công! Chúc bạn ôn thi đạt điểm A+!'); } catch (e) {}
  } else {
    try { playSound('wrong'); } catch (e) {}
    if (err) err.style.display = 'block';
    if (input) {
      input.classList.remove('shake-error');
      void input.offsetWidth; // trigger reflow
      input.classList.add('shake-error');
      input.focus();
    }
  }
}

function backToGateQuestion() {
  const step1 = document.getElementById('gateStepQuestion');
  const step2 = document.getElementById('gateStepPassword');
  const err = document.getElementById('gatePassError');
  if (step2) step2.style.display = 'none';
  if (step1) step1.style.display = 'block';
  if (err) err.style.display = 'none';
}

function togglePassVisibility() {
  const input = document.getElementById('gatePassInput');
  if (input) {
    input.type = input.type === 'password' ? 'text' : 'password';
  }
}

function handlePassInputKeyDown(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitGatePassword();
  }
}

function lockGate() {
  sessionStorage.removeItem(GATE_KEY);
  document.documentElement.classList.remove('gate-passed');
  backToGateQuestion();
  const modal = document.getElementById('passGateModal');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.remove('unlocked');
  }
  try { showToast('🔒 Đã khóa cổng ôn tập!'); } catch (e) {}
}

window.isGateUnlocked = isGateUnlocked;
window.handleGateAnswer = handleGateAnswer;
window.submitGatePassword = submitGatePassword;
window.backToGateQuestion = backToGateQuestion;
window.togglePassVisibility = togglePassVisibility;
window.handlePassInputKeyDown = handlePassInputKeyDown;
window.lockGate = lockGate;


