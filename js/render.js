'use strict';
// ========================================================
// MODULE 2: UI RENDERER (SIDEBAR, STATS, QUIZ, 3D FLASHCARD, ESSAY & KEYBOARD)
// ========================================================

function activateFormulaMode() {
  if (mode === 'formula') {
    mode = 'quiz';
  } else {
    mode = 'formula';
    if (typeof setupFormulaQuizList === 'function') setupFormulaQuizList();
  }
  shuffled = false;
  try { closeDrawer(); } catch (e) {}
  rebuild();
  setTimeout(scrollToCard, 10);
}

// Render inline diagrams (CFG, DFG, C code snippets) directly inside the question prompt area
function renderQuestionDiagrams(q) {
  if (!q || !q.images || !Array.isArray(q.images) || q.images.length === 0) {
    return '';
  }
  return q.images.map((imgSrc, idx) => {
    const caption = 'Sơ đồ CFG/DFG / Đoạn mã Câu ' + q.id + (q.sourceId ? ' (Mã ' + q.sourceId + ')' : '') + ' · Trang ' + q.page + ' Đề cương gốc';
    return '<div class="question-diagram-box">' +
      '<span class="question-diagram-label">📊 Hình minh họa / Đồ thị CFG-DFG / Đoạn mã (Nhấn vào ảnh để phóng to) ' + (q.images.length > 1 ? '#' + (idx + 1) : '') + '</span>' +
      '<img src="' + imgSrc + '" alt="' + esc(caption) + '" class="question-diagram-img" data-zoom-img="' + imgSrc + '" data-zoom-title="' + esc(caption) + '">' +
    '</div>';
  }).join('');
}

function rebuild() {
  if (mode === 'formula') {
    list = [];
    index = 0;
    render();
    return;
  }
  const all = base();
  const term = ($('#search') ? $('#search').value : '').trim().toLocaleLowerCase('vi');
  const filter = $('#filter') ? $('#filter').value : 'all';

  list = all.filter(q => {
    const r = (mode === 'flash') ? (state.flash[q.id] || state.quiz[q.id]) : state[mode][q.id];
    const matchTerm = !term ||
      String(q.id) === term ||
      (q.sourceId && String(q.sourceId).toLocaleLowerCase('vi') === term) ||
      (q.prompt + ' ' + (q.options || []).join(' ')).toLocaleLowerCase('vi').includes(term);
    const matchFilter = filter === 'all' ||
      (filter === 'star' && state.star[key(q)]) ||
      (filter === 'unseen' && !r) ||
      (filter === 'wrong' && r && !r.correct);
    return matchTerm && matchFilter;
  });

  if (shuffled) {
    const rank = new Map(order.map((id, i) => [id, i]));
    list.sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  }

  index = 0;
  flipped = false;
  revealed = false;
  render();
}

// Navigation & Session List (Wayground / Quizizz Sidebar)
function nav() {
  const labels = [
    ['all', 'Tất cả 6 Group (Đề cương)', D.quiz.length + ' trắc nghiệm · ' + D.essay.length + ' tổng hợp'],
    ...D.sessions.map(s => [String(s.id), s.title, s.count + ' câu trắc nghiệm · Thi lấy ' + (s.examQuota || 5) + ' câu'])
  ];

  const html = labels.map(([id, title, count]) => {
    const isActive = id === session && mode !== 'formula';
    const sItems = (mode === 'essay' ? D.essay : D.quiz).filter(q => id === 'all' || String(q.session) === id);
    const targetMode = mode === 'formula' ? 'quiz' : mode;
    const mState = state[targetMode] || {};
    const doneCount = sItems.filter(q => mState[q.id]).length;
    const pct = sItems.length ? Math.round((doneCount / sItems.length) * 100) : 0;
    const isCompleted = sItems.length > 0 && doneCount === sItems.length;

    return '<button data-session="' + id + '" class="nav-item ' + (isActive ? 'active' : '') + '" ' + (isActive ? 'aria-current="true"' : '') + ' title="' + esc(title) + '">' +
      '<div class="nav-num">' + (id === 'all' ? '∞' : 'G' + id) + '</div>' +
      '<div class="nav-content">' +
        '<span class="nav-title">' + esc(title) + '</span>' +
        '<div class="nav-meta">' +
          '<span>' + count + '</span>' +
          '<span>' + (isCompleted ? '<strong style="color:var(--green)">✓ Xong</strong> ' : '') + doneCount + '/' + sItems.length + '</span>' +
        '</div>' +
        '<div class="nav-prog-bar"><div class="nav-prog-fill" style="width:' + pct + '%;"></div></div>' +
      '</div>' +
    '</button>';
  }).join('');

  const formulaNavHtml = '<button class="nav-item ' + (mode === 'formula' ? 'active' : '') + '" id="sidebarFormulaBtn" style="margin-bottom:10px;border:1.5px solid #8b5cf6;">' +
    '<div class="nav-num" style="background:linear-gradient(135deg, #6366f1, #8b5cf6);color:#fff;">📐</div>' +
    '<div class="nav-content">' +
      '<div class="nav-title" style="color:var(--primary);font-weight:800;">Công thức V(G), BVA &amp; Mẹo thi</div>' +
      '<div class="nav-meta">' +
        '<span>8 chủ đề &amp; 10 thẻ 3D</span>' +
        '<span style="background:var(--green);color:#fff;padding:1px 6px;border-radius:4px;font-size:10.5px;font-weight:700;">HOT</span>' +
      '</div>' +
    '</div>' +
  '</button>';

  if (!exam50Questions.length) generateExam50(activeSampleNum || 0);
  const exam50Done = exam50Questions.filter(q => (state.quiz || {})[q.id]).length;
  const exam50Pct = exam50Questions.length ? Math.round((exam50Done / exam50Questions.length) * 100) : 0;
  const isExam50Active = session === 'exam50' && mode !== 'formula';
  const exam50Title = activeSampleNum > 0
    ? 'Đề mẫu cố định số ' + activeSampleNum + ' (50 câu)'
    : 'Thi thử 50 câu chuẩn CĐR';

  const sampleButtonsHtml = '<div class="sample-exam-strip" style="margin:-4px 0 10px;padding:6px 8px;background:var(--surface-subtle);border:1px solid var(--border);border-radius:12px;">' +
    '<div style="width:100%;font-size:11px;font-weight:700;color:var(--muted);margin-bottom:4px;">Chọn Đề mẫu 50 câu (10/15/3/5/12/5):</div>' +
    '<button type="button" class="sample-exam-chip ' + (isExam50Active && activeSampleNum === 0 ? 'active' : '') + '" data-sample-num="0" title="Bốc 50 câu ngẫu nhiên mới">🎲 Mới</button>' +
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n =>
      '<button type="button" class="sample-exam-chip ' + (isExam50Active && activeSampleNum === n ? 'active' : '') + '" data-sample-num="' + n + '" title="Đề mẫu cố định số ' + n + '">Đề ' + n + '</button>'
    ).join('') +
  '</div>';

  const exam50NavHtml = '<button data-session="exam50" class="nav-item ' + (isExam50Active ? 'active' : '') + '" style="margin-bottom:6px;border:1.5px solid #10b981;">' +
    '<div class="nav-num" style="background:linear-gradient(135deg, #0d9488, #10b981);color:#fff;">🎯</div>' +
    '<div class="nav-content">' +
      '<div class="nav-title" style="color:#059669;font-weight:800;">' + esc(exam50Title) + '</div>' +
      '<div class="nav-meta">' +
        '<span>Ma trận 10/15/3/5/12/5</span>' +
        '<span>' + exam50Done + '/50</span>' +
      '</div>' +
      '<div class="nav-prog-bar"><div class="nav-prog-fill" style="width:' + exam50Pct + '%;background:linear-gradient(90deg, #0d9488, #10b981);"></div></div>' +
    '</div>' +
  '</button>' + sampleButtonsHtml;

  const randomDone = random30Questions.filter(q => (state.quiz || {})[q.id]).length;
  const randomPct = random30Questions.length ? Math.round((randomDone / random30Questions.length) * 100) : 0;
  const isRandomCompleted = random30Questions.length > 0 && randomDone === random30Questions.length;
  const randomNavHtml = '<button data-session="random30" class="nav-item ' + (session === 'random30' && mode !== 'formula' ? 'active' : '') + '" style="margin-bottom:10px;border:1.5px solid #ec4899;">' +
    '<div class="nav-num" style="background:linear-gradient(135deg, #ec4899, #f43f5e);color:#fff;">🎲</div>' +
    '<div class="nav-content">' +
      '<div class="nav-title" style="color:#db2777;font-weight:800;">Luyện phản xạ 30 câu</div>' +
      '<div class="nav-meta">' +
        '<span>Random 30 câu trắc nghiệm</span>' +
        '<span>' + (isRandomCompleted ? '<strong style="color:var(--green)">✓ Xong</strong> ' : '') + randomDone + '/30</span>' +
      '</div>' +
      '<div class="nav-prog-bar"><div class="nav-prog-fill" style="width:' + randomPct + '%;background:linear-gradient(90deg, #ec4899, #f43f5e);"></div></div>' +
    '</div>' +
  '</button>';

  if ($('#sessions')) {
    $('#sessions').innerHTML = formulaNavHtml + exam50NavHtml + randomNavHtml + html;
  }

  const sideFormBtn = $('#sidebarFormulaBtn');
  if (sideFormBtn) sideFormBtn.onclick = activateFormulaMode;

  $$('[data-sample-num]').forEach(chip => {
    chip.onclick = e => {
      e.stopPropagation();
      const num = parseInt(chip.dataset.sampleNum, 10) || 0;
      startExam50Mode(num, true);
    };
  });

  $$('[data-session]').forEach(b => {
    b.onclick = () => {
      session = b.dataset.session;
      if (mode === 'formula') mode = 'quiz';
      if (session === 'exam50') {
        mode = 'quiz';
        if (!exam50Questions.length) generateExam50(activeSampleNum || 0);
      }
      if (session === 'random30') {
        mode = 'quiz';
        if (!random30Questions.length) generateRandom30();
      }
      shuffled = false;
      if ($('#search')) $('#search').value = '';
      if ($('#filter')) $('#filter').value = 'all';
      closeDrawer();
      rebuild();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
  });

  const curS = D.sessions.find(s => String(s.id) === session);
  const mTitle = curS
    ? curS.title
    : session === 'exam50'
    ? '🎯 ' + exam50Title
    : session === 'random30'
    ? '🎲 30 câu ngẫu nhiên'
    : 'Tất cả 6 Group (299 câu)';
  if ($('#mobileSessionText')) $('#mobileSessionText').textContent = '📍 ' + mTitle;
}

if ($('#headerFormulaBtn')) {
  $('#headerFormulaBtn').onclick = activateFormulaMode;
}

function startExam50Mode(sampleNum = 0, regenerate = false) {
  session = 'exam50';
  mode = 'quiz';
  if (regenerate || !exam50Questions.length || activeSampleNum !== sampleNum) {
    generateExam50(sampleNum);
    showToast(sampleNum > 0
      ? '🎯 Đã nạp Đề mẫu cố định số ' + sampleNum + ' (50 câu chuẩn CĐR 10/15/3/5/12/5)!'
      : '🎯 Đã bốc Đề thi chuẩn 50 câu mới theo đúng ma trận CĐR (10/15/3/5/12/5)!');
  }
  shuffled = false;
  if ($('#search')) $('#search').value = '';
  if ($('#filter')) $('#filter').value = 'all';
  closeDrawer();
  rebuild();
  setTimeout(scrollToCard, 10);
}

function startRandom30Mode(regenerate = false) {
  if (session === 'random30' && !regenerate) regenerate = true;
  session = 'random30';
  mode = 'quiz';
  if (regenerate || !random30Questions.length) {
    generateRandom30();
    showToast('🎲 Đã bốc 30 câu ngẫu nhiên mới từ 299 câu!');
  }
  shuffled = false;
  if ($('#search')) $('#search').value = '';
  if ($('#filter')) $('#filter').value = 'all';
  closeDrawer();
  rebuild();
  setTimeout(scrollToCard, 10);
}

if ($('#headerExam50Btn')) {
  $('#headerExam50Btn').onclick = () => startExam50Mode(0, true);
}
if ($('#exam50Btn')) {
  $('#exam50Btn').onclick = () => startExam50Mode(0, true);
}
if ($('#headerRandom30Btn')) {
  $('#headerRandom30Btn').onclick = () => startRandom30Mode(session === 'random30');
}
if ($('#random30Btn')) {
  $('#random30Btn').onclick = () => startRandom30Mode(session === 'random30');
}

function openDrawer() {
  if ($('#sidebar')) $('#sidebar').classList.add('open');
  if ($('#drawerBackdrop')) $('#drawerBackdrop').classList.add('open');
}

function closeDrawer() {
  if ($('#sidebar')) $('#sidebar').classList.remove('open');
  if ($('#drawerBackdrop')) $('#drawerBackdrop').classList.remove('open');
}

if ($('#menuToggle')) $('#menuToggle').onclick = openDrawer;
if ($('#closeDrawer')) $('#closeDrawer').onclick = closeDrawer;
if ($('#drawerBackdrop')) $('#drawerBackdrop').onclick = closeDrawer;
if ($('#mobileSessionBtn')) $('#mobileSessionBtn').onclick = openDrawer;

// Stats Calculation
function stats() {
  if (mode === 'formula') {
    const listF = window.FORMULA_FLASHCARDS || [];
    const answered = listF.filter(q => formulaQuizState[q.id]);
    const correctCount = answered.filter(q => formulaQuizState[q.id].correct).length;
    const pct = listF.length ? Math.round((answered.length / listF.length) * 100) : 0;
    const accPct = answered.length ? Math.round((correctCount / answered.length) * 100) : 100;

    if ($('#total')) $('#total').textContent = listF.length;
    if ($('#done')) $('#done').textContent = answered.length;
    if ($('#donePercent')) $('#donePercent').textContent = pct + '% tiến độ';
    if ($('#accuracy')) {
      $('#accuracy').textContent = answered.length ? accPct + '%' : '—';
      $('#accuracy').style.color = accPct >= 80 ? 'var(--green)' : 'var(--amber)';
    }
    if ($('#accDetail')) $('#accDetail').textContent = answered.length ? (correctCount + '/' + answered.length + ' đúng') : 'Chưa làm';
    if ($('#streakCount')) $('#streakCount').textContent = formulaQuizStreak;
    if ($('#streakBadge')) $('#streakBadge').classList.toggle('active', formulaQuizStreak > 0);
    if ($('#maxStreakVal')) $('#maxStreakVal').textContent = state.maxStreak || 0;
    return;
  }

  const all = base();
  const mState = state[mode] || {};
  const seen = all.filter(q => mState[q.id]);
  const right = seen.filter(q => state[mode][q.id].correct);
  const pct = all.length ? Math.round((seen.length / all.length) * 100) : 0;

  if ($('#total')) $('#total').textContent = all.length;
  if ($('#done')) $('#done').textContent = seen.length;
  if ($('#donePercent')) $('#donePercent').textContent = pct + '% tiến độ';

  if (seen.length > 0) {
    const acc = Math.round((right.length / seen.length) * 100);
    if ($('#accuracy')) {
      $('#accuracy').textContent = acc + '%';
      if (acc >= 80) $('#accuracy').style.color = 'var(--green)';
      else if (acc >= 50) $('#accuracy').style.color = 'var(--amber)';
      else $('#accuracy').style.color = 'var(--red)';
    }
    if ($('#accDetail')) $('#accDetail').textContent = right.length + ' / ' + seen.length + ' đúng';
  } else {
    if ($('#accuracy')) {
      $('#accuracy').textContent = '—';
      $('#accuracy').style.color = 'inherit';
    }
    if ($('#accDetail')) $('#accDetail').textContent = 'Chưa làm';
  }

  if ($('#streakCount')) $('#streakCount').textContent = currentStreak;
  if ($('#streakBadge')) $('#streakBadge').classList.toggle('active', currentStreak > 0);
  if ($('#maxStreakVal')) $('#maxStreakVal').textContent = state.maxStreak || 0;
}

function source(q, answer = false) {
  const p = answer ? (q.answerPage || q.page) : q.page;
  return '<span class="source-link" style="cursor:default;">' +
    '<span>📄</span> <span>Đề cương 54 trang · Trang ' + p + (q.sourceId ? ' · Mã câu ' + esc(q.sourceId) : '') + '</span></span>';
}

function getLevelClass(lvl) {
  if (!lvl) return 'nho';
  const l = lvl.toLowerCase();
  if (l.includes('nhớ') || l.includes('dễ') || l.includes('de')) return 'nho';
  if (l.includes('hiểu') || l.includes('tb') || l.includes('trung')) return 'hieu';
  if (l.includes('vận dụng') || l.includes('khó') || l.includes('kho')) return 'vandun';
  if (l.includes('phân tích')) return 'phantich';
  return 'mo';
}

function render() {
  nav();
  stats();

  $$('[data-mode]').forEach(b => {
    const active = b.dataset.mode === mode;
    b.classList.toggle('active', active);
    b.setAttribute('aria-selected', active);
  });

  if (mode === 'formula') {
    if ($('#title')) $('#title').textContent = '📐 Sổ tay Công thức ĐG&KĐCLPM & Máy tính Kiểm thử';
    if ($('#subtitle')) $('#subtitle').textContent = 'Tổng hợp tất cả công thức McCabe V(G), Giá trị biên BVA (4n+1 / 7ⁿ), Độ phủ C0/C1/C2, McCall/ISO và 10 thẻ Flashcard 3D.';
    if ($('#navigation')) $('#navigation').classList.add('hidden');
    if ($('.mobile-bottom-bar')) $('.mobile-bottom-bar').classList.add('hidden');
    if ($('.jump-strip-wrap')) $('.jump-strip-wrap').classList.add('hidden');
    if ($('.prog-bar-container')) $('.prog-bar-container').classList.add('hidden');
    if ($('.toolbar-wrap')) $('.toolbar-wrap').classList.add('hidden');
    if (typeof renderFormulas === 'function') renderFormulas();
    return;
  } else {
    if ($('.toolbar-wrap')) $('.toolbar-wrap').classList.remove('hidden');
    if ($('.prog-bar-container')) $('.prog-bar-container').classList.remove('hidden');
    if ($('.jump-strip-wrap')) $('.jump-strip-wrap').classList.remove('hidden');
  }

  if (session === 'exam50') {
    if ($('#title')) {
      $('#title').textContent = activeSampleNum > 0
        ? '🎯 Đề thi mẫu số ' + activeSampleNum + ' (50 câu chuẩn cấu trúc CĐR)'
        : '🎯 Đề thi thử 50 câu chuẩn ma trận CĐR (10/15/3/5/12/5)';
    }
    if ($('#subtitle')) {
      $('#subtitle').textContent = 'Phân bổ đúng ma trận đề thi: CĐR 1.1 (28 câu = 5.6đ: G1 lấy 10, G2 lấy 15, G3 lấy 3) + CĐR 2.1 (22 câu = 4.4đ: G4 lấy 5, G5 lấy 12, G6 lấy 5).';
    }
  } else if (session === 'random30') {
    if ($('#title')) $('#title').textContent = '🎲 Luyện phản xạ nhanh (30 câu ngẫu nhiên)';
    if ($('#subtitle')) $('#subtitle').textContent = 'Đề thi bốc ngẫu nhiên 30 câu từ 299 câu hỏi đề cương. Giữ nguyên 100% thứ tự đáp án A-B-C-D.';
  } else {
    const s = D.sessions.find(s => String(s.id) === session);
    if ($('#title')) $('#title').textContent = s ? s.title : 'Tất cả 6 Group (299 câu trắc nghiệm)';
    if ($('#subtitle')) {
      $('#subtitle').textContent = mode === 'essay'
        ? 'Hệ thống hóa 10 chủ đề lý thuyết & bài tập cốt lõi theo đề cương 54 trang.'
        : mode === 'flash'
        ? 'Chạm trực tiếp vào thẻ hoặc nhấn Space để lật xem đáp án đúng và giải thích 3D.'
        : 'Bấm phím A, B, C, D (hoặc 1-4) để chọn đáp án. Đáp án đúng sáng xanh, sai báo đỏ kèm giải thích chi tiết.';
    }
  }

  const r30Btn = $('#random30Btn');
  if (r30Btn) {
    if (session === 'random30') {
      r30Btn.classList.add('primary');
      r30Btn.style.borderColor = '#ec4899';
      r30Btn.style.background = 'linear-gradient(135deg, #ec4899, #f43f5e)';
      r30Btn.style.color = '#fff';
      r30Btn.innerHTML = '<span>🎲</span> <span class="hide-mobile">Đổi đề 30 câu mới</span><span class="show-mobile">Đổi đề</span>';
    } else {
      r30Btn.classList.remove('primary');
      r30Btn.style.borderColor = '#ec4899';
      r30Btn.style.background = '';
      r30Btn.style.color = '#db2777';
      r30Btn.innerHTML = '<span>🎲</span> <span class="hide-mobile">Random 30 câu</span><span class="show-mobile">30 câu</span>';
    }
  }

  const e50Btn = $('#exam50Btn');
  if (e50Btn) {
    if (session === 'exam50') {
      e50Btn.classList.add('primary');
      e50Btn.style.borderColor = '#10b981';
      e50Btn.style.background = 'linear-gradient(135deg, #0d9488, #10b981)';
      e50Btn.style.color = '#fff';
      e50Btn.innerHTML = '<span>🎯</span> <span class="hide-mobile">Đổi đề 50 câu mới</span><span class="show-mobile">Đổi 50 câu</span>';
    } else {
      e50Btn.classList.remove('primary');
      e50Btn.style.borderColor = '#10b981';
      e50Btn.style.background = '';
      e50Btn.style.color = '#059669';
      e50Btn.innerHTML = '<span>🎯</span> <span class="hide-mobile">Đề chuẩn 50 câu</span><span class="show-mobile">50 câu</span>';
    }
  }

  if ($('#shuffle')) {
    $('#shuffle').classList.toggle('primary', shuffled);
    $('#shuffle').innerHTML = shuffled
      ? '<span>✓</span> <span class="hide-mobile">Đang trộn câu</span><span class="show-mobile">Đang trộn</span>'
      : '<span>⇄</span> <span class="hide-mobile">Trộn câu</span><span class="show-mobile">Trộn</span>';
  }

  const secLabel = $('#resetSectionLabel');
  const secSub = $('#resetSectionSub');
  if (secLabel && secSub) {
    if (session === 'exam50') {
      secLabel.textContent = 'Làm lại đề 50 câu này';
      secSub.textContent = 'Xóa đáp án 50 câu trong đề thi chuẩn hiện tại';
    } else if (session === 'random30') {
      secLabel.textContent = 'Làm lại đề 30 câu này';
      secSub.textContent = 'Xóa đáp án 30 câu để kiểm tra lại phản xạ';
    } else if (session === 'all') {
      secLabel.textContent = 'Làm lại tất cả câu hỏi';
      secSub.textContent = 'Xóa đáp án toàn bộ 299 câu trắc nghiệm';
    } else {
      secLabel.textContent = 'Làm lại Group ' + session;
      secSub.textContent = 'Xóa đáp án các câu của riêng Group ' + session;
    }
  }

  if (!list.length) {
    $('#card').innerHTML = '<div class="empty-state"><h2>Không tìm thấy câu hỏi phù hợp</h2><p>Vui lòng chọn “Tất cả câu hỏi”, đổi Group hoặc xóa từ khóa tìm kiếm để tiếp tục.</p></div>';
    $('#navigation').classList.add('hidden');
    $('.mobile-bottom-bar').classList.add('hidden');
    $('#jump').innerHTML = '';
    $('#bar').style.width = '0%';
    $('#position').textContent = '0 / 0';
    return;
  }

  $('#navigation').classList.remove('hidden');
  $('.mobile-bottom-bar').classList.remove('hidden');

  const q = list[index];
  const r = state[mode][q.id];
  const star = state.star[key(q)];
  const ansPage = q.answerPage || q.page;
  const sMeta = D.sessions.find(s => s.id === q.session);

  const posLabel = (mode === 'essay' ? 'Chủ đề ' : 'Câu ') + (index + 1) + '/' + list.length +
    (q.id !== (index + 1) ? ' (Tổng #' + q.id + ')' : '') +
    (q.sourceId ? ' · Mã ĐC: ' + esc(q.sourceId) : '');

  let top = '<div class="card-top">' +
    '<div class="card-meta-wrap">' +
      '<span class="session-pill">' + esc(sMeta ? sMeta.name + ' · ' + sMeta.cdr : 'Group ' + q.session) + '</span>' +
      '<span class="level-pill ' + getLevelClass(q.level) + '">' + posLabel + ' · ' + esc(q.level) + '</span>' +
    '</div>' +
    '<button id="star" class="btn ' + (star ? 'marked' : '') + '" aria-pressed="' + !!star + '">' +
      (star ? '★ Đã lưu' : '☆ Đánh dấu') +
    '</button>' +
  '</div>';

  let body = '';

  if (mode === 'quiz') {
    body = '<h2 class="question-prompt">' + esc(q.prompt) + '</h2>' +
      renderQuestionDiagrams(q) +
      '<div class="options-grid">' +
        q.options.map((opt, i) => {
          const letter = 'ABCD'[i];
          let cls = '';
          let statusBadge = '';
          if (r) {
            if (letter === q.answer) {
              cls = ' correct';
              statusBadge = '<span class="option-status-tag">✓ Đáp án đúng (* PDF)</span>';
            } else if (letter === r.choice) {
              cls = ' wrong';
              statusBadge = '<span class="option-status-tag">✕ Bạn đã chọn</span>';
            } else {
              cls = ' dimmed';
            }
          }
          return '<button class="option-card' + cls + '" data-choice="' + letter + '" ' + (r ? 'disabled' : '') + '>' +
            '<div class="option-letter">' + letter + '</div>' +
            '<div class="option-text-wrap">' +
              '<div>' + esc(opt) + '</div>' +
              statusBadge +
            '</div>' +
          '</button>';
        }).join('') +
      '</div>';

    if (r) {
      body += '<div class="feedback-box ' + (r.correct ? 'good' : 'bad') + '" role="status">' +
        '<div class="feedback-header">' +
          '<span>' + (r.correct ? '🎉 Xuất sắc! Bạn trả lời đúng!' : '💡 Chưa chính xác! Đáp án đúng (dấu *) là: ' + q.answer) + '</span>' +
        '</div>' +
        '<div class="feedback-desc">' + esc(q.explanation) + '</div>' +
        '<div class="feedback-actions">' +
          source(q, true) +
          '<button id="retry" class="btn" style="padding:7px 10px;font-size:12px;">🔄 <span class="hide-mobile">Làm lại câu này (R)</span><span class="show-mobile">Làm lại</span></button>' +
          '<button id="nextInline" class="btn primary" style="padding:7px 12px;font-size:12px;"><span class="hide-mobile">Câu tiếp theo (Enter) </span><span class="show-mobile">Tiếp </span>→</button>' +
        '</div>' +
      '</div>';
    } else {
      body += '<div style="margin-top:18px;">' + source(q) + '</div>';
    }
  } else if (mode === 'flash') {
    let optionsHtml = '';
    if (q.options && q.options.length) {
      optionsHtml = '<div class="flash-options-grid">' +
        q.options.map((opt, i) => {
          const letter = 'ABCD'[i];
          let btnCls = 'flash-opt-card';
          let statusBadge = '';
          if (r) {
            if (letter === q.answer) {
              btnCls += ' correct';
              statusBadge = '<span class="option-status-tag" style="margin-left:auto;font-size:11.5px;font-weight:700;color:var(--green);">✓ Đáp án đúng</span>';
            } else if (letter === r.choice) {
              btnCls += ' wrong';
              statusBadge = '<span class="option-status-tag" style="margin-left:auto;font-size:11.5px;font-weight:700;color:var(--red);">✕ Bạn đã chọn</span>';
            } else {
              btnCls += ' dimmed';
            }
          }
          return '<button type="button" class="' + btnCls + '" data-flash-choice="' + letter + '" ' + (r ? 'disabled' : '') + '>' +
            '<span class="flash-opt-letter">' + letter + '</span>' +
            '<span class="flash-opt-text">' + esc(opt) + '</span>' +
            statusBadge +
          '</button>';
        }).join('') +
      '</div>';
    }

    let userResultBadge = '';
    if (r) {
      userResultBadge = r.correct
        ? '<span class="flash-user-choice-badge good">✓ Bạn đã chọn đúng: <b>' + (r.choice || q.answer) + '</b></span>'
        : '<span class="flash-user-choice-badge bad">✕ Bạn đã chọn: <b>' + (r.choice || 'Chưa đúng') + '</b> (Đáp án đúng: <b>' + q.answer + '</b>)</span>';
    }

    body = '<div id="flashcard" class="flash-container ' + (flipped ? 'is-flipped' : '') + '" role="button" tabindex="0" aria-pressed="' + flipped + '">' +
      '<div class="flash-inner">' +
        '<div class="flash-face flash-front">' +
          '<span class="eyebrow">CÂU HỎI TRẮC NGHIỆM</span>' +
          '<h2 class="flash-prompt">' + esc(q.prompt) + '</h2>' +
          renderQuestionDiagrams(q) +
          optionsHtml +
          '<div class="flash-flip-hint"><span>🔄</span> ' + (r ? 'Chạm vào thẻ hoặc nhấn Space để lật xem giải thích đáp án ↻' : 'Chọn đáp án A, B, C, D để kiểm tra & lật 3D · Hoặc bấm Space để lật ngay ↻') + '</div>' +
        '</div>' +
        '<div class="flash-face flash-back">' +
          '<div class="flash-back-top-row">' +
            '<span class="flash-answer-badge">ĐÁP ÁN ĐÚNG (* PDF) · ' + q.answer + '</span>' +
            userResultBadge +
          '</div>' +
          '<h3 class="flash-answer-title">' + esc(q.options['ABCD'.indexOf(q.answer)]) + '</h3>' +
          '<div class="flash-answer-exp">' + esc(q.explanation) + '</div>' +
          source(q, true) +
          '<div class="flash-back-footer-row">' +
            (r ? '<button type="button" id="flashRetryBtn" class="btn flash-retry-btn">🔄 Làm lại câu này (R)</button>' : '') +
            '<div class="flash-flip-hint"><span>🔄</span> Chạm để quay lại câu hỏi (Space) ↻</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="flash-actions-bar">' +
      '<span class="pos-indicator">' + (r ? (r.correct ? '✅ Đã nhớ vững' : '⚠️ Cần ôn lại') : 'Chưa đánh giá') + '</span>' +
      '<div class="grade-btn-group">' +
        '<button class="btn" data-grade="no" style="color:var(--red);">❌ <span class="hide-mobile">Cần ôn lại (1)</span><span class="show-mobile">Ôn lại</span></button>' +
        '<button class="btn primary" data-grade="yes">✅ <span class="hide-mobile">Đã nhớ (2)</span><span class="show-mobile">Đã nhớ</span></button>' +
      '</div>' +
    '</div>';
  } else {
    // Essay / Synthesis Mode
    const userNote = state.notes[q.id] || '';
    const wordCount = userNote.trim() ? userNote.trim().split(/\s+/).length : 0;
    const charCount = userNote.length;

    body = '<h2 class="question-prompt">' + esc(q.prompt) + '</h2>' +
      '<div class="essay-meta-row">' +
        '<span>Viết tóm tắt công thức và kiến thức của bạn:</span>' +
        '<span id="noteCount">' + wordCount + ' từ · ' + charCount + ' ký tự · Tự động lưu ✓</span>' +
      '</div>' +
      '<textarea id="notes" class="essay-textarea" placeholder="Gõ tóm tắt kiến thức, công thức V(G), BVA, EP hoặc phân tích của bạn…">' + esc(userNote) + '</textarea>' +
      '<div class="card-nav-row" style="margin-top:16px;">' +
        '<button id="reveal" class="btn primary">' + (revealed ? 'Ẩn hệ thống hóa kiến thức' : '<span class="hide-mobile">👁️ Xem hệ thống hóa kiến thức trọng tâm</span><span class="show-mobile">👁️ Xem hệ thống hóa</span>') + '</button>' +
        source(q) +
      '</div>';

    if (revealed) {
      body += '<div class="essay-solution-card">' +
        '<div class="essay-solution-title">' +
          '<span>💡</span> Hệ thống hóa kiến thức trọng tâm theo Đề cương 54 trang' +
        '</div>' +
        '<div class="essay-solution-body" style="white-space:pre-line;">' + esc(q.answer) + '</div>' +
        '<div style="margin-top:16px;">' + source(q, true) + '</div>' +
      '</div>' +
      '<div class="card-nav-row" style="margin-top:18px;">' +
        '<span class="pos-indicator">Đánh giá mức độ nắm bài:</span>' +
        '<div class="grade-btn-group">' +
          '<button class="btn" data-grade="no" style="color:var(--red);">❌ <span class="hide-mobile">Cần ôn lại</span><span class="show-mobile">Ôn lại</span></button>' +
          '<button class="btn primary" data-grade="yes">✅ <span class="hide-mobile">Đã nắm vững ✓</span><span class="show-mobile">Đã nhớ ✓</span></button>' +
        '</div>' +
      '</div>';
    }
  }

  $('#card').innerHTML = top + body;

  // Lightbox click bindings
  $$('[data-zoom-img]').forEach(el => {
    el.onclick = e => {
      e.stopPropagation();
      openLightbox(el.dataset.zoomImg, el.dataset.zoomTitle);
    };
  });

  // Star Toggle
  if ($('#star')) {
    $('#star').onclick = () => {
      const k = key(q);
      state.star[k] = !state.star[k];
      persist();
      showToast(state.star[k] ? '⭐ Đã thêm vào mục đánh dấu' : '☆ Đã gỡ khỏi mục đánh dấu');
      render();
    };
  }

  // Choice Selection (Quiz Mode)
  $$('[data-choice]').forEach(b => {
    b.onclick = () => answer(b.dataset.choice);
  });

  // Retry Button
  if ($('#retry')) {
    $('#retry').onclick = () => {
      delete state.quiz[q.id];
      persist();
      render();
    };
  }

  // Next Inline Button
  if ($('#nextInline')) {
    $('#nextInline').onclick = () => move(1);
  }

  // Flashcard Flip & Keyboard Control
  if ($('#flashcard')) {
    $('#flashcard').onclick = e => {
      if (e.target.closest('[data-zoom-img]')) return;
      if (e.target.closest('[data-flash-choice]')) return;
      if (e.target.closest('#flashRetryBtn') || e.target.closest('.flash-retry-btn')) return;
      flipCard();
    };
    $('#flashcard').onkeydown = e => {
      if (e.key === 'Enter' || e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
        e.preventDefault();
        e.stopPropagation();
        if (!e.repeat) flipCard();
      }
    };
  }

  // Flashcard Option Selection
  $$('[data-flash-choice]').forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      btn.blur();
      answerFlashcard(btn.dataset.flashChoice);
    };
  });

  // Flashcard Retry
  if ($('#flashRetryBtn')) {
    $('#flashRetryBtn').onclick = e => {
      e.stopPropagation();
      retryFlashcard();
    };
  }

  // Reveal Button (Essay Mode)
  if ($('#reveal')) {
    $('#reveal').onclick = () => {
      revealed = !revealed;
      render();
    };
  }

  // Notes Auto-Save (Essay Mode)
  if ($('#notes')) {
    $('#notes').oninput = e => {
      state.notes[q.id] = e.target.value;
      persist();
      const val = e.target.value;
      const wc = val.trim() ? val.trim().split(/\s+/).length : 0;
      $('#noteCount').textContent = wc + ' từ · ' + val.length + ' ký tự · Tự động lưu ✓';
    };
  }

  // Grade Buttons
  $$('[data-grade]').forEach(b => {
    b.onclick = () => {
      const isYes = b.dataset.grade === 'yes';
      state[mode][q.id] = { correct: isYes };
      persist();
      if (isYes) {
        playCorrectSound();
        showToast('✅ Đã ghi nhận: Đã nhớ vững');
      } else {
        playWrongSound();
        showToast('📌 Đã lưu: Cần ôn lại');
      }
      if (index < list.length - 1) move(1);
      else render();
    };
  });

  // Navigation Indicators
  const posText = (index + 1) + ' / ' + list.length;
  $('#position').textContent = posText + ' câu';
  $('#mobilePos').textContent = 'Câu ' + posText + ' ▾';
  $('#bar').style.width = (((index + 1) / list.length) * 100) + '%';
  $('#prev').disabled = index === 0;
  $('#next').disabled = index === list.length - 1;
  $('#mobilePrev').disabled = index === 0;
  $('#mobileNext').disabled = index === list.length - 1;

  // Jump Grid (Paging 30 items)
  const start = Math.floor(index / 30) * 30;
  $('#jump').innerHTML = list.slice(start, start + 30).map((v, j) => {
    const rr = state[mode][v.id];
    const isCur = start + j === index;
    const isSt = state.star[key(v)];
    let cls = isCur ? 'current ' : '';
    if (rr) cls += rr.correct ? 'done ' : 'miss ';
    if (isSt) cls += 'starred ';

    const label = (session === 'exam50' || session === 'random30') ? (start + j + 1) : v.id;
    return '<button data-index="' + (start + j) + '" class="jump-btn ' + cls + '" aria-label="Câu ' + v.id + '" title="Câu #' + v.id + (v.sourceId ? ' (Mã ' + v.sourceId + ')' : '') + '" ' + (isCur ? 'aria-current="step"' : '') + '>' +
      label +
    '</button>';
  }).join('');

  $$('[data-index]').forEach(b => {
    b.onclick = () => {
      index = +b.dataset.index;
      flipped = false;
      revealed = false;
      render();
      setTimeout(scrollToCard, 10);
    };
  });
}

let lastFlipTime = 0;
function flipCard() {
  const now = Date.now();
  if (now - lastFlipTime < 280) return;
  lastFlipTime = now;

  const card = $('#flashcard');
  if (mode !== 'flash' || !card || !list.length) return;
  flipped = !flipped;
  card.classList.toggle('is-flipped', flipped);
  card.setAttribute('aria-pressed', String(flipped));
  playFlipSound();

  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }
}

function answerFlashcard(choice) {
  const q = list[index];
  if (mode !== 'flash' || !q) return;

  const isCorrect = choice === q.answer;
  state.flash[q.id] = { choice: choice, correct: isCorrect };
  if (!state.quiz[q.id]) {
    state.quiz[q.id] = { choice: choice, correct: isCorrect };
  }

  if (isCorrect) {
    currentStreak++;
    if (currentStreak > (state.maxStreak || 0)) state.maxStreak = currentStreak;
    playCorrectSound();
    if (currentStreak >= 5 && currentStreak % 5 === 0) {
      playStreakCelebration();
      triggerConfetti();
      showToast('🔥 Chuỗi ' + currentStreak + ' câu đúng liên tiếp! Quá đỉnh!');
    }
  } else {
    currentStreak = 0;
    playWrongSound();
  }

  persist();
  stats();

  const allBtns = document.querySelectorAll('[data-flash-choice]');
  allBtns.forEach(btn => {
    btn.disabled = true;
    const letter = btn.dataset.flashChoice;
    if (letter === q.answer) {
      btn.classList.add('correct');
      if (!btn.querySelector('.option-status-tag')) {
        btn.insertAdjacentHTML('beforeend', '<span class="option-status-tag" style="margin-left:auto;font-size:11.5px;font-weight:700;color:var(--green);">✓ Đáp án đúng</span>');
      }
    } else if (letter === choice) {
      btn.classList.add('wrong');
      if (!btn.querySelector('.option-status-tag')) {
        btn.insertAdjacentHTML('beforeend', '<span class="option-status-tag" style="margin-left:auto;font-size:11.5px;font-weight:700;color:var(--red);">✕ Bạn đã chọn</span>');
      }
    } else {
      btn.classList.add('dimmed');
    }
  });

  setTimeout(() => {
    flipped = true;
    const card = $('#flashcard');
    if (card) {
      card.classList.add('is-flipped');
      card.setAttribute('aria-pressed', 'true');
    }
    playFlipSound();
    render();
    setTimeout(scrollToCard, 10);
  }, 400);
}

function retryFlashcard() {
  const q = list[index];
  if (!q) return;
  delete state.flash[q.id];
  delete state.quiz[q.id];
  flipped = false;
  persist();
  stats();
  render();
  setTimeout(scrollToCard, 10);
}

function answer(letter) {
  const q = list[index];
  if (mode !== 'quiz' || !q || state.quiz[q.id]) return;

  const isCorrect = letter === q.answer;
  state.quiz[q.id] = { choice: letter, correct: isCorrect };

  if (isCorrect) {
    currentStreak++;
    if (currentStreak > (state.maxStreak || 0)) state.maxStreak = currentStreak;
    playCorrectSound();
    if (currentStreak >= 5 && currentStreak % 5 === 0) {
      playStreakCelebration();
      triggerConfetti();
      showToast('🔥 Chuỗi ' + currentStreak + ' câu đúng liên tiếp! Quá đỉnh!');
    }
  } else {
    currentStreak = 0;
    playWrongSound();
  }

  persist();
  render();

  const seenAll = list.every(item => state.quiz[item.id]);
  if (seenAll) {
    triggerConfetti();
    showToast('🏆 Chúc mừng! Bạn đã hoàn thành tất cả câu trong bộ này!');
  }
}

function move(n) {
  if (index + n < 0 || index + n >= list.length) return;
  index += n;
  flipped = false;
  revealed = false;
  render();
  setTimeout(scrollToCard, 10);
}

function openMatrixModal() {
  const modal = $('#matrixModal');
  const grid = $('#matrixGrid');
  if (!modal || !grid) return;

  grid.innerHTML = list.map((v, i) => {
    const rr = state[mode][v.id];
    const isCur = i === index;
    const isSt = state.star[key(v)];
    let cls = isCur ? 'current ' : '';
    if (rr) cls += rr.correct ? 'done ' : 'miss ';
    if (isSt) cls += 'starred ';

    const label = (session === 'exam50' || session === 'random30') ? (i + 1) : v.id;
    return '<button data-matrix-index="' + i + '" class="jump-btn ' + cls + '" style="position:relative;">' +
      label +
    '</button>';
  }).join('');

  $$('[data-matrix-index]').forEach(b => {
    b.onclick = () => {
      index = +b.dataset.matrixIndex;
      flipped = false;
      revealed = false;
      modal.classList.remove('open');
      render();
      setTimeout(scrollToCard, 10);
    };
  });

  modal.classList.add('open');
}

function closeMatrixModal() {
  if ($('#matrixModal')) $('#matrixModal').classList.remove('open');
}

if ($('#openMatrixBtn')) $('#openMatrixBtn').onclick = openMatrixModal;
if ($('#viewAllMatrix')) $('#viewAllMatrix').onclick = openMatrixModal;
if ($('#mobilePos')) $('#mobilePos').onclick = openMatrixModal;
if ($('#closeMatrixBtn')) $('#closeMatrixBtn').onclick = closeMatrixModal;
if ($('#matrixModal')) {
  $('#matrixModal').onclick = e => {
    if (e.target === $('#matrixModal')) closeMatrixModal();
  };
}

function setAppMode(m) {
  mode = m;
  if (mode === 'essay' && (session === 'exam50' || session === 'random30')) {
    session = 'all';
  }
  shuffled = false;
  rebuild();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
window.setAppMode = setAppMode;

$$('[data-mode]').forEach(b => {
  b.onclick = () => setAppMode(b.dataset.mode);
});

if ($('#search')) $('#search').oninput = () => { rebuild(); setTimeout(scrollToCard, 10); };
if ($('#filter')) $('#filter').onchange = () => { rebuild(); setTimeout(scrollToCard, 10); };

if ($('#prev')) $('#prev').onclick = () => move(-1);
if ($('#next')) $('#next').onclick = () => move(1);
if ($('#mobilePrev')) $('#mobilePrev').onclick = () => move(-1);
if ($('#mobileNext')) $('#mobileNext').onclick = () => move(1);

if ($('#shuffle')) {
  $('#shuffle').onclick = () => {
    order = base().map(q => q.id);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    shuffled = !shuffled;
    rebuild();
    showToast(shuffled ? '⇄ Đã trộn ngẫu nhiên thứ tự câu' : '⇄ Đã khôi phục thứ tự chuẩn');
    setTimeout(scrollToCard, 10);
  };
}

function resetCurrentSection() {
  const currentItems = base();
  if (!currentItems || !currentItems.length) return;

  const partName = session === 'exam50'
    ? 'Đề thi chuẩn 50 câu'
    : session === 'random30'
    ? 'Đề 30 câu ngẫu nhiên'
    : session === 'all'
    ? 'Tất cả 299 câu hỏi'
    : 'Group ' + session;

  if (confirm('Bạn có chắc muốn xóa kết quả và làm lại ' + partName + ' (' + currentItems.length + ' câu)?')) {
    currentItems.forEach(q => {
      if (state.quiz) delete state.quiz[q.id];
      if (state.flash) delete state.flash[q.id];
      if (state.essay) delete state.essay[q.id];
    });
    currentStreak = 0;
    persist();
    rebuild();
    showToast('🔄 Đã làm mới ' + partName + '!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function resetAllProgress() {
  if (confirm('Bạn có chắc muốn xóa TOÀN BỘ kết quả của tất cả 6 Group (299 câu) để làm lại từ đầu?')) {
    state = { quiz: {}, flash: {}, essay: {}, formula: {}, star: {}, notes: {}, maxStreak: 0 };
    currentStreak = 0;
    persist();
    rebuild();
    showToast('🗑️ Đã xóa toàn bộ tiến độ, bạn có thể làm lại từ đầu!');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

const resetMenuBtn = $('#resetMenuBtn');
const resetDropdown = $('#resetDropdown');
const resetSectionBtn = $('#resetSectionBtn');
const resetAllBtn = $('#resetAllBtn');
const footerResetSection = $('#footerResetSection');

if (resetMenuBtn && resetDropdown) {
  resetMenuBtn.onclick = e => {
    e.stopPropagation();
    resetDropdown.classList.toggle('hidden');
  };
  document.addEventListener('click', e => {
    if (!resetDropdown.contains(e.target) && e.target !== resetMenuBtn) {
      resetDropdown.classList.add('hidden');
    }
  });
}
if (resetSectionBtn) {
  resetSectionBtn.onclick = () => {
    if (resetDropdown) resetDropdown.classList.add('hidden');
    resetCurrentSection();
  };
}
if (resetAllBtn) {
  resetAllBtn.onclick = () => {
    if (resetDropdown) resetDropdown.classList.add('hidden');
    resetAllProgress();
  };
}
if (footerResetSection) footerResetSection.onclick = resetCurrentSection;
if ($('#reset')) $('#reset').onclick = resetAllProgress;

// Global Keyboard Shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('#syncModal') && $('#syncModal').classList.contains('open')) {
      if (typeof closeSyncModal === 'function') closeSyncModal();
      return;
    }
    if ($('#formulaModal') && $('#formulaModal').classList.contains('open')) {
      if (typeof closeFormulaModal === 'function') closeFormulaModal();
      return;
    }
    if ($('#imageLightbox') && $('#imageLightbox').classList.contains('open')) {
      closeLightbox();
      return;
    }
    if ($('#matrixModal') && $('#matrixModal').classList.contains('open')) {
      closeMatrixModal();
      return;
    }
    closeDrawer();
  }

  if (/INPUT|TEXTAREA|SELECT/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;

  const keyUpper = e.key.toUpperCase();

  const formulaModalEl = $('#formulaModal');
  if (formulaModalEl && formulaModalEl.classList.contains('open')) {
    if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
      e.preventDefault();
      e.stopPropagation();
      flipFormulaCard();
      return;
    }
    if (['A', 'B', 'C', 'D'].includes(keyUpper)) {
      e.preventDefault();
      answerFormulaQuiz(keyUpper);
      return;
    }
    if (/^[1-4]$/.test(e.key)) {
      e.preventDefault();
      answerFormulaQuiz('ABCD'[+e.key - 1]);
      return;
    }
    if (keyUpper === 'R') {
      e.preventDefault();
      retryFormulaQuiz();
      return;
    }
    if (e.key === 'Enter' || e.key === 'ArrowRight') {
      e.preventDefault();
      navFormulaQuiz(1);
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      navFormulaQuiz(-1);
      return;
    }
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (mode === 'formula') navFormulaQuiz(1);
    else move(1);
    return;
  }
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (mode === 'formula') navFormulaQuiz(-1);
    else move(-1);
    return;
  }

  if (mode === 'quiz') {
    const curQ = list[index];
    if (['A', 'B', 'C', 'D'].includes(keyUpper)) {
      e.preventDefault();
      answer(keyUpper);
      return;
    }
    if (/^[1-4]$/.test(e.key)) {
      e.preventDefault();
      answer('ABCD'[+e.key - 1]);
      return;
    }
    if (e.key === 'Enter' && curQ && state.quiz[curQ.id]) {
      e.preventDefault();
      move(1);
      return;
    }
  }

  if (mode === 'flash') {
    const curQ = list[index];
    const isSpaceKey = e.code === 'Space' || e.key === ' ' || e.keyCode === 32;
    if (!flipped) {
      if (['A', 'B', 'C', 'D'].includes(keyUpper) && curQ && curQ.options) {
        e.preventDefault();
        answerFlashcard(keyUpper);
        return;
      }
      if (/^[1-4]$/.test(e.key) && curQ && curQ.options) {
        e.preventDefault();
        answerFlashcard('ABCD'[+e.key - 1]);
        return;
      }
      if (isSpaceKey) {
        e.preventDefault();
        e.stopPropagation();
        flipCard();
        return;
      }
    } else {
      if (isSpaceKey) {
        e.preventDefault();
        e.stopPropagation();
        flipCard();
        return;
      }
      if (keyUpper === 'R') {
        e.preventDefault();
        retryFlashcard();
        return;
      }
    }
  }

  if (keyUpper === 'R') {
    const q = list[index];
    if (mode === 'quiz' && q && state.quiz[q.id]) {
      delete state.quiz[q.id];
      persist();
      render();
      showToast('🔄 Đã đặt lại câu hỏi');
      setTimeout(scrollToCard, 10);
    }
  }
  if (keyUpper === 'S') {
    const q = list[index];
    if (q) {
      const k = key(q);
      state.star[k] = !state.star[k];
      persist();
      render();
      showToast(state.star[k] ? '⭐ Đã lưu' : '☆ Đã bỏ lưu');
    }
  }
});

window.answerFlashcard = answerFlashcard;
window.retryFlashcard = retryFlashcard;
window.renderQuestionDiagrams = renderQuestionDiagrams;
