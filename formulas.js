// ========================================================
// SỔ TAY CÔNG THỨC ĐÁNH GIÁ & KIỂM ĐỊNH CLPM & PHÒNG LUYỆN 3D
// (Chuẩn giao diện Wayground / Quizizz từ dự án tham chiếu)
// ========================================================
const FORMULA_CATEGORIES = [
  { id: 'all', label: 'Tất cả', shortLabel: 'Tất cả' },
  { id: 'whitebox', label: '🕸️ McCabe V(G) & Độ phủ C0/C1/C2', shortLabel: '🕸️ Hộp trắng' },
  { id: 'blackbox', label: '🎯 Giá trị Biên (BVA) & Tương đương (EP)', shortLabel: '🎯 BVA & EP' },
  { id: 'models', label: '🏛️ Mô hình McCall, ISO & V-Model', shortLabel: '🏛️ McCall & ISO' },
  { id: 'metrics', label: '📊 Đo lường DRE, MTBF & Cấu trúc Đề', shortLabel: '📊 Đo lường & Đề' }
];

let activeFormulaCategory = 'all';
let formulaSearchTerm = '';

// Live QA Simulator State (McCabe V(G), BVA Test Cases & DRE)
let simState = {
  edges: 11,
  nodes: 9,
  preds: 3,
  bvaVars: 2,
  defectsBefore: 92,
  defectsAfter: 8
};

function resetQaSimulator() {
  simState = {
    edges: 11,
    nodes: 9,
    preds: 3,
    bvaVars: 2,
    defectsBefore: 92,
    defectsAfter: 8
  };
  if ($('#simEdges')) $('#simEdges').value = simState.edges;
  if ($('#simNodes')) $('#simNodes').value = simState.nodes;
  if ($('#simPreds')) $('#simPreds').value = simState.preds;
  if ($('#simBvaVars')) $('#simBvaVars').value = simState.bvaVars;
  if ($('#simDefBefore')) $('#simDefBefore').value = simState.defectsBefore;
  if ($('#simDefAfter')) $('#simDefAfter').value = simState.defectsAfter;
  updateQaSimulator();
  if (typeof showToast === 'function') showToast('✓ Đã khôi phục thông số mẫu Đề cương');
}

function updateQaSimulator() {
  const E = Math.max(1, parseInt($('#simEdges')?.value, 10) || 0);
  const N = Math.max(1, parseInt($('#simNodes')?.value, 10) || 0);
  const P = Math.max(0, parseInt($('#simPreds')?.value, 10) || 0);
  const nVars = Math.max(1, Math.min(8, parseInt($('#simBvaVars')?.value, 10) || 2));
  const defE = Math.max(0, parseInt($('#simDefBefore')?.value, 10) || 0);
  const defD = Math.max(0, parseInt($('#simDefAfter')?.value, 10) || 0);

  const vgEN = Math.max(1, E - N + 2);
  const vgP = Math.max(1, P + 1);
  const bva4n1 = 4 * nVars + 1;
  const bva6n1 = 6 * nVars + 1;
  const bva5pow = Math.pow(5, nVars);
  const bva7pow = Math.pow(7, nVars);
  const totalDef = defE + defD;
  const dre = totalDef > 0 ? (defE / totalDef) * 100 : 0;

  if ($('#resVgEN')) $('#resVgEN').textContent = vgEN + ' đường';
  if ($('#resVgP')) $('#resVgP').textContent = vgP + ' đường';
  if ($('#resBva4n1')) $('#resBva4n1').textContent = bva4n1 + ' ca';
  if ($('#resBva6n1')) $('#resBva6n1').textContent = bva6n1 + ' ca';
  if ($('#resBva5pow')) $('#resBva5pow').textContent = bva5pow.toLocaleString('vi-VN') + ' ca';
  if ($('#resBva7pow')) $('#resBva7pow').textContent = bva7pow.toLocaleString('vi-VN') + ' ca';
  if ($('#resDre')) $('#resDre').textContent = dre.toFixed(1) + '%';
  if ($('#resTotalDef')) $('#resTotalDef').textContent = totalDef + ' lỗi';

  const vBox = $('#simVerdictBox');
  if (vBox) {
    if (vgEN <= 10 && dre >= 85) {
      vBox.className = 'calc-verdict-box profit';
      vBox.innerHTML = '<div>🎉 <strong>ĐÁNH GIÁ CHẤT LƯỢNG: TỐT (ĐẠT CHUẨN)</strong><div style="font-size:12.5px;font-weight:500;margin-top:2px;">Độ phức tạp McCabe V(G) = ' + vgEN + ' (≤ 10: Mô-đun đơn giản, dễ kiểm thử) · DRE = ' + dre.toFixed(1) + '%</div></div>' +
        '<div style="font-size:13px;font-weight:800;">Tối đa ' + vgEN + ' ca kiểm thử đường cơ sở</div>';
    } else {
      vBox.className = 'calc-verdict-box breakeven';
      vBox.innerHTML = '<div>⚖️ <strong>ĐÁNH GIÁ: CẦN CHÚ Ý KIỂM THỬ SÂU</strong><div style="font-size:12.5px;font-weight:500;margin-top:2px;">V(G) theo E−N+2 = ' + vgEN + ' | Theo P+1 = ' + vgP + ' · Với n = ' + nVars + ' biến cần ' + bva4n1 + ' ca BVA chuẩn (hoặc ' + bva7pow + ' ca Worst-case mạnh)</div></div>';
    }
  }
}

const FORMULA_LIBRARY = [
  {
    id: 'f_mccabe_vg',
    category: 'whitebox',
    title: 'Độ phức tạp Cyclomatic McCabe V(G) · Kiểm thử đường cơ sở',
    equation: 'V(G) = E − N + 2P = P_đơn + 1 = R (Số miền)',
    vars: [
      '<b>E (Edges)</b>: Tổng số cung (mũi tên chuyển tiếp) trên đồ thị dòng điều khiển CFG',
      '<b>N (Nodes)</b>: Tổng số đỉnh (khối lệnh / nút quyết định) trên đồ thị CFG',
      '<b>P</b>: Số thành phần liên thông (với 1 chương trình/hàm đơn lẻ thì P = 1 ⇒ <b>V(G) = E − N + 2</b>)',
      '<b>P_đơn (Predicate nodes)</b>: Số nút điều kiện đơn (if, while, for, case). Nếu điều kiện ghép <code>A && B</code> phải tách thành 2 nút đơn'
    ],
    tip: '⭐ <b>TRỌNG TÂM ĐỀ THI (Group 2, 5, 6):</b><br>• <b>V(G)</b> cho biết <b>cận trên (số lượng tối đa)</b> các đường dẫn độc lập tuyến tính cần thiết để đạt 100% độ phủ nhánh.<br>• Nếu V(G) ≤ 10: Mã nguồn đơn giản, rủi ro thấp. Nếu V(G) > 10: Cần tách nhỏ hàm.',
    example: '<b>Câu 154, 164, 165, 247 Đề cương:</b> Đồ thị CFG có E = 11 cung, N = 9 đỉnh (hoặc 3 nút điều kiện đơn) ⇒ V(G) = 11 − 9 + 2 = <b>4 đường cơ sở độc lập</b>.'
  },
  {
    id: 'f_coverage_c0_c1_c2',
    category: 'whitebox',
    title: 'Hệ thống Độ phủ Kiểm thử Hộp trắng (C0, C1, C2 & MC/DC)',
    equation: 'Statement (C0) ⊂ Decision/Branch (C1) ⊂ Condition + Branch (C2) ⊂ Path Coverage',
    vars: [
      '<b>Độ phủ câu lệnh (C0 - Statement)</b>: (Số câu lệnh đã thực thi ÷ Tổng số câu lệnh) × 100%',
      '<b>Độ phủ nhánh / quyết định (C1 - Branch/Decision)</b>: Mọi nhánh True VÀ False của mỗi nút quyết định đều được đi qua ít nhất 1 lần',
      '<b>Độ phủ điều kiện (Condition)</b>: Mỗi điều kiện con (A, B) đều nhận cả giá trị True và False',
      '<b>Quan hệ bao hàm chuẩn</b>: <b>Đạt 100% Độ phủ Nhánh (C1) CHẮC CHẮN đạt 100% Độ phủ Câu lệnh (C0)</b>, nhưng ngược lại KHÔNG đúng!'
    ],
    tip: '⚠️ <b>BẪY ĐỀ THI HAY HỎI:</b><br>• Câu lệnh <code>if (x > 0) y = 10;</code> (không có <code>else</code>): Chỉ cần 1 ca <code>x = 5</code> là đạt <b>100% C0 (Statement)</b>, nhưng mới đạt <b>50% C1 (Branch)</b> vì chưa đi qua nhánh False!<br>• Với biểu thức nối tiếp <code>K</code> lệnh <code>if..else</code> độc lập: Số đường đi = <b>2^K</b>.',
    example: '<b>Câu 039, 042, 122, 129 Đề cương:</b> Luôn tìm tập ca kiểm thử nhỏ nhất đi qua tất cả các câu lệnh (C0) trước, sau đó kiểm tra xem có nút thoi nào chưa đi đủ cả 2 nhánh Đúng/Sai (C1) không.'
  },
  {
    id: 'f_dataflow_dfg',
    category: 'whitebox',
    title: 'Kiểm thử Dòng dữ liệu (Data Flow Testing · du-path & dc-path)',
    equation: 'def(v): Gán giá trị cho biến v  |  use(v): c-use (tính toán) hoặc p-use (điều kiện)',
    vars: [
      '<b>def(v) (Definition)</b>: Đỉnh mà biến <code>v</code> được gán giá trị mới (nhập input, phép gán <code>v = ...</code>)',
      '<b>c-use (Computation use)</b>: Sử dụng biến <code>v</code> trong biểu thức tính toán hoặc in ra màn hình',
      '<b>p-use (Predicate use)</b>: Sử dụng biến <code>v</code> trong biểu thức điều kiện rẽ nhánh (<code>if, while</code>)',
      '<b>dc-path (Definition-clear path)</b>: Đường đi từ đỉnh <code>def(v)</code> đến đỉnh <code>use(v)</code> mà biến <code>v</code> <b>KHÔNG bị gán lại</b> ở các đỉnh trung gian'
    ],
    tip: '⭐ <b>MẸO GIẢI NHANH CÂU 123, 193, 261, 262, 263 (Group 6):</b><br>• Nhìn vào đỉnh bắt đầu: Biến được gán ở đâu? (VD: đỉnh 1 hoặc 2).<br>• Nhìn các đỉnh tiếp theo: Nếu đi qua đỉnh nào gán lại biến đó thì đường đi bị "vỡ" (không còn là dc-path của lần gán đầu).',
    example: '<b>Câu 261–263 Đề cương:</b> Xác định cặp (def, use) của từng biến và đối chiếu trên đồ thị DFG để chọn đường đi không bị định nghĩa lại (definition-clear).'
  },
  {
    id: 'f_bva_formulas',
    category: 'blackbox',
    title: 'Phân tích Giá trị Biên (Boundary Value Analysis - BVA) cho n biến độc lập',
    equation: 'Chuẩn: 4n + 1  |  Mạnh (Robust): 6n + 1  |  Worst-Case: 5ⁿ  |  Robust Worst-Case: 7ⁿ',
    vars: [
      '<b>5 giá trị biên hợp lệ của 1 biến [min, max]</b>: <code>min, min+, nom (trung bình), max−, max</code>',
      '<b>2 giá trị biên không hợp lệ (Robust)</b>: <code>min− (ngay dưới biên dưới), max+ (ngay trên biên trên)</code> ⇒ Tổng cộng 7 mốc/biến',
      '<b>Giả định lỗi đơn (Single-fault assumption)</b>: Giữ (n−1) biến ở giá trị <code>nom</code>, cho 1 biến chạy qua các biên ⇒ <b>4n + 1</b> (chuẩn) hoặc <b>6n + 1</b> (mạnh)',
      '<b>Tổ hợp trường hợp xấu nhất (Worst-case - bỏ giả định lỗi đơn)</b>: Lấy tích Đề-các mọi biến ⇒ <b>5ⁿ</b> (chuẩn) hoặc <b>7ⁿ</b> (mạnh)'
    ],
    tip: '⭐ <b>MẸO NHẬN DIỆN TRONG ĐỀ CƯƠNG (Group 5 & Group 6):</b><br>• Đề bài có chữ <b>"phân tích giá trị biên cho bài toán n biến"</b> và đáp án có các số mũ của 7 (VD: 49, 343, 2401) hoặc 5 (25, 125) ⇒ Đề cương dùng công thức <b>7ⁿ</b> (khi xét cả ngoài biên) hoặc <b>5ⁿ</b>!<br>• Với n = 2 biến: 4n+1 = 9; 6n+1 = 13; 5² = 25; <b>7² = 49</b>.<br>• Với n = 3 biến: 4n+1 = 13; 6n+1 = 19; 5³ = 125; <b>7³ = 343</b>.',
    example: '<b>Bài toán Tam giác / Ngày tháng (3 biến):</b> Theo BVA chuẩn = 4(3)+1 = 13 ca; theo Robust Worst-Case (kể cả giá trị không hợp lệ) = 7³ = <b>343 ca kiểm thử</b>.'
  },
  {
    id: 'f_ep_decision',
    category: 'blackbox',
    title: 'Phân hoạch Tương đương (EP) & Bảng Quyết định (Decision Table)',
    equation: 'Số quy tắc Bảng quyết định = 2^(Số điều kiện Boolean)  |  EP = Miền Hợp lệ + Miền Không hợp lệ',
    vars: [
      '<b>Lớp tương đương (Equivalence Partitioning - EP)</b>: Chia miền đầu vào thành các lớp sao cho mọi giá trị trong cùng 1 lớp đều cho hành vi xử lý như nhau',
      '<b>Nguyên tắc chọn đại diện EP</b>: Mỗi lớp tương đương hợp lệ lấy 1 giá trị đại diện; mỗi lớp không hợp lệ phải kiểm thử riêng rẽ từng điều kiện',
      '<b>Bảng quyết định (Decision Table)</b>: Với <code>k</code> điều kiện Có/Không (T/F) độc lập ⇒ Có tối đa <b>2^k</b> cột quy tắc (Rules)'
    ],
    tip: '💡 <b>Khi nào ưu tiên dùng kỹ thuật nào?</b><br>• Các biến đầu vào <b>độc lập</b>, có miền giá trị liên tục [a, b] ⇒ Dùng <b>BVA + EP</b>.<br>• Các biến đầu vào có <b>ràng buộc logic phức tạp</b> (Nếu ĐK1 và ĐK2 thì làm X) ⇒ Dùng <b>Bảng quyết định (Decision Table)</b>.',
    example: '<b>Bài toán Đăng nhập / Giảm giá:</b> Có 3 điều kiện Boolean (Khách VIP, Đơn > 1 triệu, Ngày lễ) ⇒ Bảng quyết định đầy đủ có 2³ = <b>8 quy tắc</b>.'
  },
  {
    id: 'f_mccall_iso',
    category: 'models',
    title: 'Mô hình Chất lượng McCall (11 yếu tố) & ISO/IEC 9126 (6 đặc tính)',
    equation: 'McCall = Vận hành (5) + Sửa đổi (3) + Chuyển giao (3)  |  ISO 9126 = 6 đặc tính chuẩn',
    vars: [
      '<b>1. McCall - Vận hành sản phẩm (Product Operation - 5 yếu tố)</b>: Tính đúng đắn (Correctness), Độ tin cậy (Reliability), Tính hiệu quả (Efficiency), Tính toàn vẹn/Bảo mật (Integrity), Tính khả dụng (Usability)',
      '<b>2. McCall - Sửa đổi sản phẩm (Product Revision - 3 yếu tố)</b>: Tính dễ bảo trì (Maintainability), Tính linh hoạt (Flexibility), Tính dễ kiểm thử (Testability)',
      '<b>3. McCall - Chuyển giao sản phẩm (Product Transition - 3 yếu tố)</b>: Tính khả chuyển (Portability), Tính tái sử dụng (Reusability), Tính tương tác (Interoperability)',
      '<b>ISO/IEC 9126 (6 đặc tính)</b>: Functionality, Reliability, Usability, Efficiency, Maintainability, Portability'
    ],
    tip: '⭐ <b>MẸO NHỚ NHANH 3 NHÓM MCCALL (Hỏi rất nhiều ở Group 1 & Group 2):</b><br>• <b>Chuyển giao (Transition)</b> có chữ <b>P-R-I</b>: <i>Portability (Khả chuyển) - Reusability (Tái sử dụng) - Interoperability (Tương tác)</i>.<br>• <b>Sửa đổi (Revision)</b> có 3 chữ <b>-bility về sửa/test</b>: <i>Maintainability (Bảo trì) - Flexibility (Linh hoạt) - Testability (Dễ kiểm thử)</i>.<br>• Còn lại 5 yếu tố thuộc <b>Vận hành (Operation)</b>!',
    example: '<b>Câu 007, 012, 015 Đề cương:</b> Hỏi "Tính toàn vẹn (Integrity) thuộc nhóm nào của McCall?" ⇒ Thuộc nhóm <b>Vận hành sản phẩm (Product Operation)</b>.'
  },
  {
    id: 'f_v_and_v_levels',
    category: 'models',
    title: 'Xác minh (Verification) vs Thẩm định (Validation) & 4 Cấp độ Kiểm thử (V-Model)',
    equation: 'Verification: "Are we building the product right?"  |  Validation: "Are we building the right product?"',
    vars: [
      '<b>Verification (Xác minh - Tĩnh)</b>: Kiểm tra sản phẩm có tuân thủ đặc tả kỹ thuật của giai đoạn trước không (Review tài liệu, Inspection, Walkthrough, Phân tích tĩnh — <b>KHÔNG chạy code</b>)',
      '<b>Validation (Thẩm định - Động)</b>: Kiểm tra phần mềm thực tế có đáp ứng đúng nhu cầu/mong đợi của khách hàng không (<b>CÓ thực thi chương trình</b>)',
      '<b>4 cấp độ kiểm thử theo mô hình chữ V (Từ thấp lên cao)</b>: (1) Unit Test (Đơn vị) → (2) Integration Test (Tích hợp: Big Bang, Top-down dùng <b>Stub</b>, Bottom-up dùng <b>Driver</b>) → (3) System Test (Hệ thống) → (4) Acceptance Test (Chấp nhận: Alpha & Beta)'
    ],
    tip: '⭐ <b>PHÂN BIỆT STUB VÀ DRIVER & ALPHA VÀ BETA:</b><br>• <b>Top-down (Từ trên xuống)</b>: Mô-đun chính đã có, mô-đun con cấp dưới chưa xong ⇒ Dùng <b>Stub</b> (mô-đun giả cấp dưới).<br>• <b>Bottom-up (Từ dưới lên)</b>: Mô-đun cấp thấp đã xong, mô-đun điều khiển cấp trên chưa có ⇒ Dùng <b>Driver</b> (trình điều khiển giả cấp trên).<br>• <b>Alpha test</b>: Thực hiện tại môi trường của nhà phát triển. <b>Beta test</b>: Thực hiện bởi khách hàng thực tế tại môi trường của khách hàng.',
    example: '<b>Phân biệt chuỗi lỗi (Fault Chain):</b> Con người mắc sai sót (<b>Error/Mistake</b>) → Tạo ra khiếm khuyết trong mã nguồn/tài liệu (<b>Fault/Defect/Bug</b>) → Khi chạy chương trình gây ra sự cố sai lệch bên ngoài (<b>Failure</b>).'
  },
  {
    id: 'f_metrics_exam50',
    category: 'metrics',
    title: 'Hiệu quả Khử lỗi (DRE), Độ tin cậy (MTBF) & Ma trận Đề thi chuẩn 50 câu',
    equation: 'DRE = [E ÷ (E + D)] × 100%  |  MTBF = MTTF + MTTR  |  Đề thi = 10 + 15 + 3 + 5 + 12 + 5 = 50 câu',
    vars: [
      '<b>DRE (Defect Removal Efficiency)</b>: <code>E</code> là số lỗi tìm thấy trước khi bàn giao, <code>D</code> là số lỗi khách hàng phát hiện sau khi bàn giao. DRE càng gần 100% thì kiểm thử càng hiệu quả',
      '<b>MTBF (Mean Time Between Failures)</b>: Thời gian trung bình giữa 2 lần hỏng = <b>MTTF</b> (Thời gian trung bình đến khi hỏng) + <b>MTTR</b> (Thời gian trung bình để sửa chữa)',
      '<b>Độ sẵn sàng (Availability)</b>: <code>A = MTTF ÷ (MTTF + MTTR) = MTTF ÷ MTBF</code>',
      '<b>Ma trận Đề thi chuẩn 50 câu (10 điểm)</b>: CĐR 1.1 (28 câu = 5.6đ: G1 lấy 10/49, G2 lấy 15/97, G3 lấy 3/19) + CĐR 2.1 (22 câu = 4.4đ: G4 lấy 5/20, G5 lấy 12/74, G6 lấy 5/40)'
    ],
    tip: '⭐ <b>CHIẾN LƯỢC PHÂN BỔ THỜI GIAN THI:</b><br>• <b>28 câu CĐR 1.1 (Group 1, 2, 3)</b> là lý thuyết và khái niệm: Làm nhanh trong 15–20 phút.<br>• <b>22 câu CĐR 2.1 (Group 4, 5, 6)</b> có các bài toán đếm ca kiểm thử BVA/EP và đọc đồ thị CFG/DFG: Dành 30–35 phút để tính cẩn thận.',
    example: '<b>Ví dụ tính DRE:</b> Nhóm kiểm thử tìm được E = 92 lỗi trước khi phát hành; sau khi phát hành khách hàng báo thêm D = 8 lỗi ⇒ DRE = 92 ÷ (92 + 8) = <b>92%</b>.'
  }
];

const FORMULA_FLASHCARDS = [
  {
    id: 'fc_1',
    category: 'whitebox',
    categoryLabel: '🕸️ Hộp trắng · McCabe V(G)',
    prompt: 'Công thức tính <b>Độ phức tạp Cyclomatic McCabe V(G)</b> của đồ thị dòng điều khiển CFG có <b>E cung</b>, <b>N đỉnh</b> và <b>P nút điều kiện đơn</b> là gì?',
    options: [
      'V(G) = E − N + 2 = P + 1 = Số miền (R)',
      'V(G) = N − E + 2 = P − 1',
      'V(G) = E + N − 2 = 2P',
      'V(G) = E − N + 1 = P + 2'
    ],
    answer: 'A',
    explanation: '<b>V(G) = E − N + 2 = P + 1 = R (Số miền)</b>.<br>Cho biết số lượng tối đa các đường dẫn độc lập tuyến tính cần thiết trong kiểm thử đường cơ sở (Basis Path Testing).',
    equation: 'V(G) = E − N + 2 = P + 1 = R',
    vars: [
      '<b>E (Edges)</b>: Số cung có hướng trong CFG',
      '<b>N (Nodes)</b>: Số đỉnh trong CFG',
      '<b>P (Predicate nodes)</b>: Số nút điều kiện đơn (if, while, for, case)'
    ],
    tip: '💡 Nếu gặp điều kiện kép <code>if (A && B)</code> thì phải tính là <b>2 nút điều kiện đơn (P = 2)</b>!',
    example: 'Đồ thị CFG có E = 11 cung, N = 9 đỉnh (3 nút điều kiện đơn) ⇒ V(G) = 11 − 9 + 2 = 3 + 1 = <b>4 đường cơ sở</b>.'
  },
  {
    id: 'fc_2',
    category: 'whitebox',
    categoryLabel: '🕸️ Hộp trắng · Độ phủ C0 & C1',
    prompt: 'Khẳng định nào sau đây là <b>ĐÚNG</b> về mối quan hệ giữa <b>Độ phủ câu lệnh (C0 - Statement)</b> và <b>Độ phủ nhánh (C1 - Branch/Decision)</b>?',
    options: [
      'Đạt 100% độ phủ câu lệnh (C0) thì chắc chắn đạt 100% độ phủ nhánh (C1)',
      'Đạt 100% độ phủ nhánh (C1) thì chắc chắn đạt 100% độ phủ câu lệnh (C0)',
      'Độ phủ câu lệnh (C0) mạnh hơn độ phủ nhánh (C1)',
      'Hai độ phủ C0 và C1 hoàn toàn độc lập, không bao hàm nhau'
    ],
    answer: 'B',
    explanation: '<b>100% Độ phủ nhánh (C1) ⇒ 100% Độ phủ câu lệnh (C0)</b>.<br>Chiều ngược lại KHÔNG đúng (ví dụ câu lệnh <code>if (x > 0) a = 1;</code> không có <code>else</code> thì 1 ca <code>x = 5</code> đạt 100% C0 nhưng chỉ đạt 50% C1).',
    equation: '100% Branch Coverage (C1)  ⇒  100% Statement Coverage (C0)',
    vars: [
      '<b>C0 (Statement Coverage)</b>: Mọi câu lệnh thực thi ít nhất 1 lần',
      '<b>C1 (Branch/Decision Coverage)</b>: Mọi nhánh True và False của mọi điều kiện đều thực thi ít nhất 1 lần'
    ],
    tip: '⭐ Đây là câu hỏi kinh điển xuất hiện nhiều lần trong cả Group 2 và Group 5!',
    example: 'Để đạt C1 cho <code>if (x > 0) a = 1;</code> cần tối thiểu 2 ca kiểm thử: <code>x = 5</code> (True) và <code>x = -1</code> (False).'
  },
  {
    id: 'fc_3',
    category: 'blackbox',
    categoryLabel: '🎯 Hộp đen · Giá trị biên BVA',
    prompt: 'Trong kiểm thử <b>Phân tích Giá trị Biên (BVA)</b> cho hàm có <b>n biến đầu vào độc lập</b>, số lượng ca kiểm thử theo 4 mức (Chuẩn, Mạnh, Worst-Case, Robust Worst-Case) lần lượt là:',
    options: [
      '2n + 1  |  4n + 1  |  4ⁿ  |  6ⁿ',
      '4n + 1  |  6n + 1  |  5ⁿ  |  7ⁿ',
      '4n  |  6n  |  5n  |  7n',
      '3n + 1  |  5n + 1  |  3ⁿ  |  5ⁿ'
    ],
    answer: 'B',
    explanation: '<b>Chuẩn: 4n + 1 | Mạnh (Robust): 6n + 1 | Worst-Case: 5ⁿ | Robust Worst-Case: 7ⁿ</b>.<br>Mỗi biến có 5 mốc hợp lệ (min, min+, nom, max−, max) và 2 mốc không hợp lệ (min−, max+).',
    equation: 'BVA Chuẩn = 4n + 1  |  Robust = 6n + 1  |  Worst-Case = 5ⁿ  |  Robust Worst-Case = 7ⁿ',
    vars: [
      '<b>n</b>: Số biến đầu vào độc lập của chương trình',
      '<b>5 mốc hợp lệ</b>: min, min+, nom, max−, max',
      '<b>7 mốc (kể cả ngoài biên)</b>: min−, min, min+, nom, max−, max, max+'
    ],
    tip: '⭐ Khi đề cương hỏi tổng số ca kiểm thử biên tổ hợp (có xét ngoài biên) cho n = 2, 3, 4 biến: Nhớ ngay <b>7² = 49, 7³ = 343, 7⁴ = 2401</b>!',
    example: 'Bài toán 2 biến độc lập: 4(2)+1 = 9 ca (BVA chuẩn); 7² = 49 ca (Robust Worst-case).'
  },
  {
    id: 'fc_4',
    category: 'models',
    categoryLabel: '🏛️ Mô hình McCall (11 yếu tố)',
    prompt: 'Trong mô hình chất lượng <b>McCall</b>, 3 yếu tố nào sau đây thuộc nhóm <b>Sửa đổi sản phẩm (Product Revision)</b>?',
    options: [
      'Tính khả chuyển (Portability), Tính tái sử dụng (Reusability), Tính tương tác (Interoperability)',
      'Tính đúng đắn (Correctness), Độ tin cậy (Reliability), Tính hiệu quả (Efficiency)',
      'Tính dễ bảo trì (Maintainability), Tính linh hoạt (Flexibility), Tính dễ kiểm thử (Testability)',
      'Tính toàn vẹn (Integrity), Tính khả dụng (Usability), Tính dễ bảo trì (Maintainability)'
    ],
    answer: 'C',
    explanation: '<b>Product Revision (Sửa đổi sản phẩm)</b> gồm 3 yếu tố: <b>Maintainability (Dễ bảo trì), Flexibility (Linh hoạt), Testability (Dễ kiểm thử)</b>.',
    equation: 'Product Revision = Maintainability + Flexibility + Testability',
    vars: [
      '<b>Product Operation (Vận hành - 5)</b>: Correctness, Reliability, Efficiency, Integrity, Usability',
      '<b>Product Revision (Sửa đổi - 3)</b>: Maintainability, Flexibility, Testability',
      '<b>Product Transition (Chuyển giao - 3)</b>: Portability, Reusability, Interoperability'
    ],
    tip: '💡 Mẹo nhớ: Sửa đổi code (Revision) thì cần <b>Bảo trì (Maintain)</b>, <b>Sửa linh hoạt (Flex)</b> và <b>Kiểm thử lại (Test)</b>!',
    example: 'Nếu đề hỏi Portability / Reusability / Interoperability ⇒ Chọn ngay nhóm <b>Chuyển giao sản phẩm (Product Transition)</b>.'
  },
  {
    id: 'fc_5',
    category: 'models',
    categoryLabel: '🏛️ Verification vs Validation',
    prompt: 'Sự khác biệt cốt lõi giữa <b>Xác minh (Verification)</b> và <b>Thẩm định (Validation)</b> theo chuẩn IEEE/ISTQB là gì?',
    options: [
      'Verification trả lời "Chúng ta có xây dựng sản phẩm ĐÚNG CÁCH không?" (theo đặc tả); Validation trả lời "Chúng ta có xây dựng ĐÚNG SẢN PHẨM mà người dùng cần không?"',
      'Verification luôn phải chạy mã nguồn; Validation chỉ đọc tài liệu tĩnh',
      'Verification do khách hàng thực hiện; Validation do lập trình viên thực hiện',
      'Verification chỉ làm sau khi bàn giao; Validation chỉ làm khi viết đặc tả'
    ],
    answer: 'A',
    explanation: '<b>Verification</b>: "Are we building the product right?" (Đối chiếu với đặc tả, thường là kiểm thử tĩnh như Review, Inspection).<br><b>Validation</b>: "Are we building the right product?" (Đối chiếu với nhu cầu thực tế của người dùng, kiểm thử động).',
    equation: 'Verification = Building the product RIGHT  |  Validation = Building the RIGHT product',
    vars: [
      '<b>Verification (Xác minh)</b>: Review, Walkthrough, Inspection, Phân tích tĩnh (Static)',
      '<b>Validation (Thẩm định)</b>: Unit, Integration, System, Acceptance Testing (Dynamic)'
    ],
    tip: '⭐ Nhớ câu thần chú của Boehm: <b>Veri = Right way (Đúng đặc tả)</b>; <b>Vali = Right product (Đúng thứ khách cần)</b>.',
    example: 'Họp duyệt tài liệu SRS (Inspection) là <b>Verification</b>; chạy thử nghiệm chấp nhận người dùng (UAT) là <b>Validation</b>.'
  },
  {
    id: 'fc_6',
    category: 'models',
    categoryLabel: '🏛️ Kiểm thử Tích hợp (Stub & Driver)',
    prompt: 'Trong <b>Kiểm thử Tích hợp (Integration Testing)</b>, khi nào ta sử dụng <b>Stub</b> và khi nào sử dụng <b>Driver</b>?',
    options: [
      'Top-down dùng Driver; Bottom-up dùng Stub',
      'Top-down (tích hợp từ trên xuống) dùng Stub giả lập mô-đun cấp dưới; Bottom-up (tích hợp từ dưới lên) dùng Driver giả lập mô-đun điều khiển cấp trên',
      'Cả Top-down và Bottom-up đều chỉ dùng Stub',
      'Stub và Driver chỉ dùng trong Kiểm thử Chấp nhận (Acceptance Test)'
    ],
    answer: 'B',
    explanation: '<b>Top-down</b>: Kiểm thử từ mô-đun chính trên cùng xuống ⇒ Cần <b>Stub</b> đóng vai các mô-đun con chưa viết xong.<br><b>Bottom-up</b>: Kiểm thử từ các mô-đun lá dưới cùng lên ⇒ Cần <b>Driver</b> đóng vai hàm gọi (caller) cấp trên.',
    equation: 'Top-down ⇒ Dùng STUB (Cấp dưới giả)  |  Bottom-up ⇒ Dùng DRIVER (Hàm gọi cấp trên giả)',
    vars: [
      '<b>Stub (Cuống giả)</b>: Mô-đun giả lập cấp thấp (被 gọi - Callee)',
      '<b>Driver (Trình điều khiển)</b>: Mô-đun giả lập cấp cao (Hàm gọi - Caller)'
    ],
    tip: '💡 Mẹo nhớ: <b>Top-down</b> thiếu chân ở dưới nên phải kê <b>Stub (gốc cây/cuống dưới)</b>; <b>Bottom-up</b> thiếu đầu điều khiển ở trên nên cần <b>Driver (tài xế lái ở trên)</b>!',
    example: 'Khi viết xong hàm tính thuế (cấp thấp) nhưng chưa có giao diện thanh toán (cấp cao), ta viết 1 <b>Driver</b> truyền dữ liệu vào để test hàm tính thuế.'
  },
  {
    id: 'fc_7',
    category: 'models',
    categoryLabel: '🏛️ Chuỗi lỗi: Error → Fault → Failure',
    prompt: 'Theo thuật ngữ chuẩn IEEE/ISTQB, trình tự nhân quả đúng giữa <b>Error (Sai sót)</b>, <b>Fault/Defect (Khiếm khuyết/Lỗi mã)</b> và <b>Failure (Sự cố/Hỏng hóc)</b> là gì?',
    options: [
      'Failure → Fault → Error',
      'Fault → Error → Failure',
      'Con người mắc Error (Mistake) → tạo ra Fault (Defect/Bug) trong mã nguồn → khi thực thi gây ra Failure (Sự cố sai lệch so với kỳ vọng)',
      'Ba thuật ngữ hoàn toàn đồng nghĩa trong mọi ngữ cảnh'
    ],
    answer: 'C',
    explanation: '<b>Error (Mistake)</b> là hành động nhầm lẫn của con người → dẫn đến <b>Fault (Defect/Bug)</b> nằm trong mã nguồn/tài liệu → khi chương trình chạy chạm vào Fault đó thì biểu hiện thành <b>Failure (Sự cố)</b>.',
    equation: 'Human Error (Mistake)  ➔  Software Fault (Defect / Bug)  ➔  System Failure',
    vars: [
      '<b>Error / Mistake</b>: Sai lầm trong tư duy/thao tác của lập trình viên hoặc phân tích viên',
      '<b>Fault / Defect / Bug</b>: Khiếm khuyết tĩnh nằm bên trong mã nguồn hoặc thiết kế',
      '<b>Failure</b>: Hành vi sai lệch quan sát được khi chạy phần mềm so với yêu cầu'
    ],
    tip: '⚠️ Lưu ý: Một <b>Fault</b> nằm trong nhánh code không bao giờ chạy tới sẽ <b>không bao giờ gây ra Failure</b>!',
    example: 'Lập trình viên nhầm công thức (Error) → gõ dấu <code>+</code> thay vì <code>-</code> trong code (Fault) → khi khách rút tiền số dư lại tăng lên (Failure).'
  },
  {
    id: 'fc_8',
    category: 'whitebox',
    categoryLabel: '🕸️ Dòng dữ liệu (Data Flow · du-path)',
    prompt: 'Trong <b>Kiểm thử dòng dữ liệu (Data Flow Testing)</b>, một đường đi <b>dc-path (definition-clear path)</b> đối với biến <code>x</code> là gì?',
    options: [
      'Đường đi từ điểm định nghĩa (gán giá trị) biến x đến điểm sử dụng biến x mà trên đó biến x KHÔNG bị gán lại giá trị mới ở bất kỳ đỉnh trung gian nào',
      'Đường đi không chứa bất kỳ biến x nào',
      'Đường đi mà biến x bị xóa khỏi bộ nhớ',
      'Đường đi chứa ít nhất 3 lần gán lại biến x'
    ],
    answer: 'A',
    explanation: '<b>dc-path (definition-clear path)</b> của biến <code>x</code> từ đỉnh <code>i</code> (def) đến đỉnh <code>j</code> (use) là đường đi không có đỉnh trung gian nào gán lại (re-define) biến <code>x</code>.',
    equation: 'dc-path(x, i → j):  def(x) tại i  ➔  [Không có def(x) trung gian]  ➔  use(x) tại j',
    vars: [
      '<b>def(x)</b>: Đỉnh gán giá trị cho biến x (ví dụ <code>x = ...</code> hoặc <code>read(x)</code>)',
      '<b>use(x)</b>: Đỉnh đọc giá trị của biến x (c-use trong tính toán hoặc p-use trong điều kiện)',
      '<b>Definition-clear</b>: "Sạch định nghĩa" — giá trị gán tại đỉnh đầu được giữ nguyên tới tận đỉnh sử dụng'
    ],
    tip: '⭐ Áp dụng trực tiếp để giải các câu 123, 193, 261, 262, 263 trong Group 6!',
    example: 'Nếu đỉnh 1 gán <code>x = 5</code>, đỉnh 3 gán lại <code>x = 10</code>, đỉnh 4 dùng <code>y = x + 1</code> thì đường <code>1 → 2 → 4</code> là dc-path, còn <code>1 → 3 → 4</code> KHÔNG phải là dc-path từ 1.'
  },
  {
    id: 'fc_9',
    category: 'metrics',
    categoryLabel: '📊 Đo lường Chất lượng (DRE & MTBF)',
    prompt: 'Công thức tính <b>Hiệu quả khử lỗi DRE (Defect Removal Efficiency)</b> là gì?',
    options: [
      'DRE = [D ÷ (E + D)] × 100%',
      'DRE = [E ÷ (E + D)] × 100%  (với E là lỗi tìm thấy trước bàn giao, D là lỗi khách hàng phát hiện sau bàn giao)',
      'DRE = (E − D) ÷ E × 100%',
      'DRE = E × D ÷ 100%'
    ],
    answer: 'B',
    explanation: '<b>DRE = E / (E + D) × 100%</b>.<br>Đo lường năng lực lọc lỗi của nhóm QA/Testing trước khi sản phẩm đến tay người dùng cuối.',
    equation: 'DRE = [ E ÷ (E + D) ] × 100%',
    vars: [
      '<b>E (Errors/Defects before delivery)</b>: Số lỗi phát hiện nội bộ trước khi phát hành',
      '<b>D (Defects after delivery)</b>: Số lỗi lọt ra ngoài do khách hàng phát hiện sau phát hành'
    ],
    tip: '💡 DRE lý tưởng tiến gần tới 100% (tức D ≈ 0). Nếu DRE thấp chứng tỏ quy trình kiểm thử trước bàn giao bỏ sót nhiều lỗi.',
    example: 'Tìm được E = 90 lỗi khi test nội bộ, khách hàng báo thêm D = 10 lỗi ⇒ DRE = 90 ÷ (90 + 10) = <b>90%</b>.'
  },
  {
    id: 'fc_10',
    category: 'metrics',
    categoryLabel: '📊 Cấu trúc Đề thi 50 câu',
    prompt: 'Đề thi kết thúc học phần <b>Đánh giá và Kiểm định chất lượng phần mềm</b> gồm <b>50 câu trắc nghiệm (10 điểm)</b> được phân bổ từ 6 Group theo tỷ lệ nào?',
    options: [
      'Mỗi Group lấy đều 8–9 câu bất kể mức độ',
      'CĐR 1.1 (28 câu = 5.6đ): G1 lấy 10, G2 lấy 15, G3 lấy 3  |  CĐR 2.1 (22 câu = 4.4đ): G4 lấy 5, G5 lấy 12, G6 lấy 5',
      'Chỉ lấy câu hỏi ở Group 1, 2, 3',
      'CĐR 1.1 lấy 20 câu; CĐR 2.1 lấy 30 câu'
    ],
    answer: 'B',
    explanation: 'Theo trang 1 Đề cương gốc:<br>• <b>CĐR 1.1 (5.6 điểm - 28 câu)</b>: Group 1 (Dễ: 10/49), Group 2 (TB: 15/97), Group 3 (Khó: 3/19).<br>• <b>CĐR 2.1 (4.4 điểm - 22 câu)</b>: Group 4 (Dễ: 5/20), Group 5 (TB: 12/74), Group 6 (Khó: 5/40).',
    equation: 'Tổng 50 câu = [G1: 10 + G2: 15 + G3: 3] (CĐR 1.1) + [G4: 5 + G5: 12 + G6: 5] (CĐR 2.1)',
    vars: [
      '<b>Mức Dễ (15 câu = 3.0đ)</b>: Group 1 (10 câu) + Group 4 (5 câu)',
      '<b>Mức Trung bình (27 câu = 5.4đ)</b>: Group 2 (15 câu) + Group 5 (12 câu)',
      '<b>Mức Khó (8 câu = 1.6đ)</b>: Group 3 (3 câu) + Group 6 (5 câu)'
    ],
    tip: '🎯 Bấm nút <b>"Thi thử 50 câu"</b> trên thanh công cụ để hệ thống tự động bốc đề đúng chuẩn ma trận 10/15/3/5/12/5 này!',
    example: 'Nắm chắc Group 1, 2, 4, 5 (42/50 câu = 8.4 điểm) giúp bạn cầm chắc điểm A trước khi xử lý 8 câu Khó ở Group 3 & Group 6.'
  }
];

let formulaQuizIndex = 0;
let formulaQuizShuffled = false;
let formulaQuizActiveList = [];
let formulaQuizState = (typeof state !== 'undefined' && state.formula) ? state.formula : {};
let formulaQuizStreak = 0;
let formulaCardFlipped = false;

function setupFormulaQuizList() {
  if (typeof state !== 'undefined' && state.formula) {
    formulaQuizState = state.formula;
  }
  let list = FORMULA_FLASHCARDS.filter(q => {
    if (activeFormulaCategory === 'all') return true;
    return q.category === activeFormulaCategory;
  });
  if (!list.length) list = [...FORMULA_FLASHCARDS];
  if (formulaQuizShuffled) {
    list = [...list].sort(() => Math.random() - 0.5);
  }
  formulaQuizActiveList = list;
  if (formulaQuizIndex >= formulaQuizActiveList.length) {
    formulaQuizIndex = 0;
  }
}
setupFormulaQuizList();

function findFormulaDetails(q) {
  if (!q) return null;
  if (q.equation) {
    return {
      id: q.id,
      category: q.category,
      title: q.formulaTitle || q.categoryLabel || '',
      equation: q.equation,
      vars: q.vars || [],
      tip: q.tip || '',
      example: q.example || ''
    };
  }
  const exactMatch = FORMULA_LIBRARY.find(f => f.id === (q.formulaId || q.id));
  if (exactMatch) return exactMatch;
  return null;
}

function openFormulaModal() {
  const modal = $('#formulaModal');
  if (!modal) return;
  modal.classList.add('open');
  document.body.classList.add('modal-open');
  formulaCardFlipped = false;
  setupFormulaQuizList();
  renderFormulaModalContent();
  if (typeof playFlipSound === 'function') playFlipSound();
}

function closeFormulaModal() {
  const modal = $('#formulaModal');
  if (!modal) return;
  modal.classList.remove('open');
  document.body.classList.remove('modal-open');
  updateFormulaHeroStats();
}

function handleFormulaOverlayClick(event) {
  if (event.target && event.target.id === 'formulaModal') {
    closeFormulaModal();
  }
}

let lastFormulaFlipTime = 0;
function flipFormulaCard() {
  const now = Date.now();
  if (now - lastFormulaFlipTime < 280) return;
  lastFormulaFlipTime = now;

  const card = $('#formula3DCard');
  if (!card) return;
  formulaCardFlipped = !formulaCardFlipped;
  card.classList.toggle('is-flipped', formulaCardFlipped);
  if (typeof playFlipSound === 'function') playFlipSound();

  if (document.activeElement && typeof document.activeElement.blur === 'function') {
    document.activeElement.blur();
  }

  const flipBtns = document.querySelectorAll('.flip-toggle-btn');
  flipBtns.forEach(btn => {
    btn.innerHTML = formulaCardFlipped
      ? '<span>↩</span> <span class="hide-mobile">Lật lại câu hỏi (Space)</span><span class="show-mobile">Câu hỏi</span>'
      : '<span>🔄</span> <span class="hide-mobile">Lật thẻ 3D (Space)</span><span class="show-mobile">Lật 3D</span>';
  });
}

function updateFormulaHeroStats() {
  const correctEl = $('#fpCorrectCount');
  const streakEl = $('#fpStreakRecord');
  const total = FORMULA_FLASHCARDS.length;
  const correctCount = FORMULA_FLASHCARDS.filter(item => formulaQuizState[item.id] && formulaQuizState[item.id].correct).length;
  if (correctEl) correctEl.textContent = correctCount + '/' + total;
  if (streakEl) streakEl.textContent = ((typeof state !== 'undefined' && state.maxStreak) || formulaQuizStreak || 0) + ' 🔥';
}

function renderFormulaPracticeHero() {
  const total = FORMULA_FLASHCARDS.length;
  const correctCount = FORMULA_FLASHCARDS.filter(item => formulaQuizState[item.id] && formulaQuizState[item.id].correct).length;
  const streak = (typeof state !== 'undefined' && state.maxStreak) ? state.maxStreak : formulaQuizStreak;

  return '<div class="formula-practice-card">' +
    '<div class="formula-practice-info">' +
      '<div class="formula-practice-badge">⚡ ĐẤU TRƯỜNG CÔNG THỨC 3D · QUIZIZZ / WAYGROUND STYLE</div>' +
      '<h3 class="formula-practice-title">Ôn tập Flashcard 3D &amp; Trắc nghiệm Công thức Kiểm thử</h3>' +
      '<p class="formula-practice-desc">' +
        'Luyện phản xạ ghi nhớ toàn bộ <b>' + total + ' thẻ công thức &amp; quy tắc cốt lõi</b> (McCabe V(G), Giá trị biên BVA 4n+1 / 7ⁿ, Độ phủ C0/C1/C2, McCall, Stub/Driver, DRE). Lật thẻ 3D trực quan kèm ví dụ giải chi tiết!' +
      '</p>' +
      '<div class="formula-practice-stats-preview">' +
        '<span class="fp-stat-tag">📚 <b>' + total + '</b> Thẻ công thức</span>' +
        '<span class="fp-stat-tag">🎯 Đã đúng: <b id="fpCorrectCount">' + correctCount + '/' + total + '</b></span>' +
        '<span class="fp-stat-tag">🔥 Kỷ lục chuỗi: <b id="fpStreakRecord">' + streak + ' 🔥</b></span>' +
        '<span class="fp-stat-tag hide-mobile">⌨ Phím tắt A-D, Space, Enter</span>' +
      '</div>' +
    '</div>' +
    '<div class="formula-practice-cta">' +
      '<button class="btn-launch-flashcard" onclick="openFormulaModal()" title="Mở phòng ôn tập Flashcard 3D">' +
        '<span class="launch-icon">🚀</span>' +
        '<div class="launch-text">' +
          '<span class="launch-title">Bắt đầu ôn tập Flashcard 3D</span>' +
          '<span class="launch-sub">' + total + ' thẻ trắc nghiệm &amp; công thức</span>' +
        '</div>' +
        '<span class="launch-arrow">➔</span>' +
      '</button>' +
    '</div>' +
  '</div>';
}

function renderFormulaModalContent() {
  const container = $('#formulaModalContent');
  if (!container) return;

  const list = formulaQuizActiveList && formulaQuizActiveList.length ? formulaQuizActiveList : FORMULA_FLASHCARDS;
  if (formulaQuizIndex >= list.length) formulaQuizIndex = 0;
  if (formulaQuizIndex < 0) formulaQuizIndex = list.length - 1;

  const q = list[formulaQuizIndex];
  const r = formulaQuizState[q.id];
  const total = list.length;
  const current = formulaQuizIndex + 1;
  const answeredCount = list.filter(item => formulaQuizState[item.id] && formulaQuizState[item.id].correct).length;
  const matchedFormula = findFormulaDetails(q);
  const correctOptionText = q.options[['A', 'B', 'C', 'D'].indexOf(q.answer)];

  const dotsHtml = '<div class="f3d-dots-bar">' +
    list.map((item, idx) => {
      const stateItem = formulaQuizState[item.id];
      let dotCls = 'f3d-dot';
      if (idx === formulaQuizIndex) dotCls += ' current';
      else if (stateItem) dotCls += stateItem.correct ? ' correct' : ' wrong';
      return '<span class="' + dotCls + '" onclick="jumpFormulaQuiz(' + idx + ')" title="Thẻ ' + (idx + 1) + '"></span>';
    }).join('') +
  '</div>';

  let optionsHtml = '<div class="f3d-options-grid">';
  ['A', 'B', 'C', 'D'].forEach((letter, i) => {
    const optText = q.options[i];
    let btnCls = 'f3d-opt-btn';
    let statusBadge = '';
    if (r) {
      if (letter === q.answer) {
        btnCls += ' correct';
        statusBadge = '<span class="f3d-opt-status-tag" style="color:#059669;">✓ Đúng</span>';
      } else if (letter === r.choice) {
        btnCls += ' wrong';
        statusBadge = '<span class="f3d-opt-status-tag" style="color:#dc2626;">✕ Đã chọn</span>';
      } else {
        btnCls += ' dimmed';
      }
    }
    optionsHtml += '<button class="' + btnCls + '" data-opt="' + letter + '" onclick="answerFormulaQuiz(\'' + letter + '\')" ' + (r ? 'disabled' : '') + '>' +
      '<span class="f3d-opt-letter">' + letter + '</span>' +
      '<span class="f3d-opt-text">' + optText + '</span>' +
      statusBadge +
    '</button>';
  });
  optionsHtml += '</div>';

  let feedbackHtml = '';
  if (r) {
    feedbackHtml = '<div class="f3d-feedback ' + (r.correct ? 'good' : 'bad') + '">' +
      '<div class="f3d-fb-title">' +
        '<span>' + (r.correct ? '🎉 Xuất sắc! Bạn đã chọn đáp án chính xác!' : '💡 Chưa chính xác! Đáp án chuẩn là: <b>' + q.answer + '</b>') + '</span>' +
      '</div>' +
      '<div class="f3d-fb-body">' + q.explanation + '</div>' +
      '<div class="f3d-fb-action">' +
        '<button class="btn btn-sm" onclick="flipFormulaCard()" style="font-size:12px;padding:6px 12px;background:rgba(99,102,241,0.12);color:#6366f1;border:1px solid rgba(99,102,241,0.3);border-radius:8px;font-weight:700;cursor:pointer;">' +
          '🔄 Lật xem công thức 3D &amp; biến số<span class="hide-mobile"> chi tiết (Space)</span> ➔' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  let varsHtml = '';
  if (matchedFormula && matchedFormula.vars && matchedFormula.vars.length) {
    varsHtml = '<div class="f3d-section-block">' +
      '<div class="f3d-section-title">🔍 Ý nghĩa các thành phần trong công thức:</div>' +
      '<ul class="f3d-vars-list">' +
        matchedFormula.vars.map(v => '<li>' + v + '</li>').join('') +
      '</ul>' +
    '</div>';
  }

  let tipHtml = '';
  if (matchedFormula && matchedFormula.tip) {
    tipHtml = '<div class="f3d-tip-callout">' + matchedFormula.tip + '</div>';
  }

  let exampleHtml = '';
  if (matchedFormula && matchedFormula.example) {
    exampleHtml = '<div class="f3d-example-callout">' +
      '<div style="font-weight:750;margin-bottom:4px;color:#4f46e5;">📝 Ví dụ áp dụng trong Đề cương:</div>' +
      matchedFormula.example +
    '</div>';
  }

  const isFirst = formulaQuizIndex === 0;
  const isLast = formulaQuizIndex === total - 1;

  const modalHtml =
    '<div class="f3d-modal-header">' +
      '<div class="f3d-header-left">' +
        '<span class="f3d-brand-badge">⚡ FLASHCARD 3D</span>' +
        '<span class="f3d-counter-pill" id="formulaModalTitle">Thẻ ' + current + ' / ' + total + '</span>' +
      '</div>' +
      '<div class="f3d-header-stats">' +
        '<span class="f3d-stat-pill score" title="Số câu đúng">🎯 ' + answeredCount + '/' + total + '</span>' +
        '<span class="f3d-stat-pill streak" title="Chuỗi đúng liên tiếp">🔥 ' + formulaQuizStreak + '</span>' +
      '</div>' +
      '<div class="f3d-header-actions">' +
        '<button class="f3d-btn-icon ' + (formulaQuizShuffled ? 'active' : '') + '" onclick="toggleFormulaQuizShuffle()" title="Trộn ngẫu nhiên">' +
          '<span>⇄</span> <span class="hide-mobile">Trộn</span>' +
        '</button>' +
        '<button class="f3d-btn-icon" onclick="resetFormulaQuiz()" title="Đặt lại toàn bộ tiến độ">' +
          '<span>🔄</span> <span class="hide-mobile">Đặt lại</span>' +
        '</button>' +
        '<button class="f3d-close-btn" onclick="closeFormulaModal()" title="Đóng phòng ôn tập (Esc)">✕</button>' +
      '</div>' +
    '</div>' +
    dotsHtml +
    '<div class="f3d-stage">' +
      '<div class="f3d-card-wrap">' +
        '<div id="formula3DCard" class="f3d-card ' + (formulaCardFlipped ? 'is-flipped' : '') + '">' +
          '<div class="f3d-face f3d-front">' +
            '<div class="f3d-top-meta">' +
              '<span class="f3d-cat-pill">' + q.categoryLabel + '</span>' +
              '<button class="f3d-flip-hint-pill" onclick="flipFormulaCard()" title="Bấm phím Space để lật thẻ">' +
                '<span>🔄 Lật xem công thức<span class="hide-mobile"> (Space)</span></span>' +
              '</button>' +
            '</div>' +
            '<div class="f3d-prompt">' + q.prompt + '</div>' +
            optionsHtml +
            feedbackHtml +
          '</div>' +
          '<div class="f3d-face f3d-back">' +
            '<div class="f3d-back-header">' +
              '<span class="f3d-back-title">📐 CHI TIẾT CÔNG THỨC &amp; MẸO THI</span>' +
              '<span class="f3d-cat-pill">' + q.categoryLabel + '</span>' +
            '</div>' +
            '<div class="f3d-eq-box">' +
              '<div class="f3d-eq-label">Công thức chuẩn:</div>' +
              '<div class="f3d-eq-math">' + (matchedFormula ? matchedFormula.equation : correctOptionText) + '</div>' +
            '</div>' +
            '<div class="f3d-section-block">' +
              '<div class="f3d-section-title">💡 Giải thích chi tiết &amp; logic ghi nhớ:</div>' +
              '<div>' + q.explanation + '</div>' +
            '</div>' +
            varsHtml +
            tipHtml +
            exampleHtml +
            '<div class="f3d-back-action-row">' +
              '<button class="btn primary" onclick="flipFormulaCard()" style="font-size:13px;padding:8px 18px;">' +
                '↩ Quay lại câu hỏi trắc nghiệm<span class="hide-mobile"> (Space)</span>' +
              '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>' +
    '<div class="f3d-modal-footer">' +
      '<div class="f3d-footer-nav">' +
        '<button class="btn" onclick="navFormulaQuiz(-1)" ' + (isFirst ? 'disabled style="opacity:0.4;"' : '') + '>' +
          '← <span class="hide-mobile">Thẻ trước (←)</span><span class="show-mobile">Trước</span>' +
        '</button>' +
        '<div class="f3d-footer-center">' +
          (r ? '<button class="btn" onclick="retryFormulaQuiz()" style="font-size:12px;padding:7px 11px;">🔄 <span class="hide-mobile">Làm lại (R)</span><span class="show-mobile">Lại</span></button>' : '') +
          '<button class="btn flip-toggle-btn" onclick="flipFormulaCard()" style="font-size:12px;padding:7px 12px;border-color:#6366f1;color:#6366f1;">' +
            '<span>🔄</span> <span class="hide-mobile">Lật thẻ 3D (Space)</span><span class="show-mobile">Lật 3D</span>' +
          '</button>' +
        '</div>' +
        '<button class="btn primary" onclick="navFormulaQuiz(1)">' +
          (isLast && r ? '🎉 Hoàn thành' : '<span class="hide-mobile">Thẻ tiếp theo (Enter)</span><span class="show-mobile">Tiếp</span> →') +
        '</button>' +
      '</div>' +
      '<div class="f3d-footer-hint hide-mobile">' +
        'Phím tắt: <b>1-4 / A-D</b> chọn đáp án • <b>Space</b> lật thẻ 3D • <b>Enter / →</b> câu tiếp • <b>←</b> câu trước • <b>R</b> làm lại • <b>Esc</b> đóng' +
      '</div>' +
    '</div>';

  container.innerHTML = modalHtml;
}

function answerFormulaQuiz(choice) {
  const list = formulaQuizActiveList && formulaQuizActiveList.length ? formulaQuizActiveList : FORMULA_FLASHCARDS;
  if (!list || !list.length) return;
  const q = list[formulaQuizIndex];
  if (!q || formulaQuizState[q.id]) return;

  const isCorrect = choice === q.answer;
  formulaQuizState[q.id] = { choice: choice, correct: isCorrect };

  if (isCorrect) {
    formulaQuizStreak++;
    if (typeof state !== 'undefined' && formulaQuizStreak > (state.maxStreak || 0)) {
      state.maxStreak = formulaQuizStreak;
    }
    if (typeof playCorrectSound === 'function') playCorrectSound();
    if (formulaQuizStreak >= 5 && formulaQuizStreak % 5 === 0) {
      if (typeof playStreakCelebration === 'function') playStreakCelebration();
      if (typeof triggerConfetti === 'function') triggerConfetti();
      if (typeof showToast === 'function') showToast('🔥 Chuỗi ' + formulaQuizStreak + ' câu đúng liên tiếp! Quá đỉnh!');
    }
  } else {
    formulaQuizStreak = 0;
    if (typeof playWrongSound === 'function') playWrongSound();
  }

  if (typeof state !== 'undefined' && state.formula) {
    state.formula[q.id] = { choice: choice, correct: isCorrect };
  }
  if (typeof persist === 'function') persist();
  if (typeof stats === 'function') stats();
  updateFormulaHeroStats();
  if ($('#formulaModal')?.classList.contains('open')) {
    renderFormulaModalContent();
  }
}

function navFormulaQuiz(dir) {
  const list = formulaQuizActiveList && formulaQuizActiveList.length ? formulaQuizActiveList : FORMULA_FLASHCARDS;
  if (!list || !list.length) return;
  formulaCardFlipped = false;
  const nextIdx = formulaQuizIndex + dir;
  if (nextIdx >= 0 && nextIdx < list.length) {
    formulaQuizIndex = nextIdx;
    if ($('#formulaModal')?.classList.contains('open')) {
      renderFormulaModalContent();
    }
    if (typeof playFlipSound === 'function') playFlipSound();
  } else if (nextIdx >= list.length) {
    if (typeof triggerConfetti === 'function') triggerConfetti();
    if (typeof showToast === 'function') showToast('🎉 Bạn đã hoàn thành toàn bộ thẻ ôn tập công thức!');
  }
}

function jumpFormulaQuiz(idx) {
  formulaCardFlipped = false;
  formulaQuizIndex = idx;
  if ($('#formulaModal')?.classList.contains('open')) {
    renderFormulaModalContent();
  }
  if (typeof playFlipSound === 'function') playFlipSound();
}

function retryFormulaQuiz() {
  const list = formulaQuizActiveList && formulaQuizActiveList.length ? formulaQuizActiveList : FORMULA_FLASHCARDS;
  const q = list[formulaQuizIndex];
  formulaCardFlipped = false;
  if (q && formulaQuizState[q.id]) {
    delete formulaQuizState[q.id];
    if (typeof state !== 'undefined' && state.formula) {
      delete state.formula[q.id];
    }
    if (typeof persist === 'function') persist();
    if (typeof stats === 'function') stats();
    updateFormulaHeroStats();
    if ($('#formulaModal')?.classList.contains('open')) {
      renderFormulaModalContent();
    }
  }
}

function resetFormulaQuiz() {
  formulaCardFlipped = false;
  formulaQuizIndex = 0;
  formulaQuizStreak = 0;
  FORMULA_FLASHCARDS.forEach(q => {
    delete formulaQuizState[q.id];
    if (typeof state !== 'undefined' && state.formula) {
      delete state.formula[q.id];
    }
  });
  if (typeof persist === 'function') persist();
  if (typeof stats === 'function') stats();
  if (typeof showToast === 'function') showToast('🔄 Đã đặt lại toàn bộ tiến độ ôn tập công thức');
  updateFormulaHeroStats();
  if ($('#formulaModal')?.classList.contains('open')) {
    renderFormulaModalContent();
  }
}

function toggleFormulaQuizShuffle() {
  formulaCardFlipped = false;
  formulaQuizShuffled = !formulaQuizShuffled;
  formulaQuizIndex = 0;
  setupFormulaQuizList();
  if (typeof showToast === 'function') {
    showToast(formulaQuizShuffled ? '⇄ Đang trộn thứ tự thẻ ôn tập' : '↩ Thứ tự chuẩn theo đề cương');
  }
  if ($('#formulaModal')?.classList.contains('open')) {
    renderFormulaModalContent();
  }
}

function renderFormulas() {
  const filteredList = FORMULA_LIBRARY.filter(f => {
    const matchCat = activeFormulaCategory === 'all' || f.category === activeFormulaCategory;
    const term = formulaSearchTerm.toLowerCase();
    const matchSearch = !term || f.title.toLowerCase().includes(term) || f.equation.toLowerCase().includes(term) || f.tip.toLowerCase().includes(term);
    return matchCat && matchSearch;
  });

  const html = '<div class="formula-hub-container">' +
    // HERO CARD
    '<div class="formula-hero-card">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:10px;">' +
        '<div class="formula-hero-badge" style="margin-bottom:0;">📐 SỔ TAY CÔNG THỨC &amp; MẸO THI ĐG&amp;KĐCLPM</div>' +
        '<button type="button" class="btn primary" onclick="window.setAppMode(\'quiz\')" style="padding:6px 16px;font-size:13px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;cursor:pointer;box-shadow:0 2px 8px rgba(79,70,229,0.3);">' +
          '<span>←</span> <span>Quay lại làm bài tập</span>' +
        '</button>' +
      '</div>' +
      '<h2 class="formula-hero-title">Tổng hợp toàn bộ công thức V(G), Giá trị biên BVA, Độ phủ C0/C1/C2 &amp; Ma trận Đề cương 54 trang</h2>' +
      '<p class="formula-hero-desc">' +
        'Bao gồm công thức độ phức tạp McCabe V(G), đếm số ca kiểm thử biên BVA (4n+1, 6n+1, 5ⁿ, 7ⁿ), kiểm thử dòng dữ liệu du-path/dc-path, mô hình McCall/ISO và máy tính kiểm thử tương tác trực tiếp.' +
      '</p>' +
      '<div class="formula-filter-row">' +
        FORMULA_CATEGORIES.map(c =>
          '<button class="formula-chip ' + (activeFormulaCategory === c.id ? 'active' : '') + '" data-cat="' + c.id + '">' +
            '<span class="hide-mobile">' + c.label + '</span>' +
            '<span class="show-mobile">' + (c.shortLabel || c.label) + '</span>' +
          '</button>'
        ).join('') +
      '</div>' +
    '</div>' +

    // SECTION 0: 3D FLASHCARD HERO
    renderFormulaPracticeHero() +

    // SECTION 1: INTERACTIVE QA CALCULATOR
    '<div class="calc-card">' +
      '<div class="calc-header">' +
        '<div>' +
          '<h3 style="font-size:18px;font-weight:800;color:var(--primary);margin:0;">⚡ MÁY TÍNH CÔNG THỨC KIỂM THỬ (MCCABE V(G), BVA &amp; DRE)</h3>' +
          '<p style="font-size:12.5px;color:var(--muted);margin:3px 0 0;">Nhập số cung E, số đỉnh N, số biến n hoặc số lỗi để tự động tính số đường cơ sở và số ca kiểm thử:</p>' +
        '</div>' +
        '<button class="btn" onclick="resetQaSimulator()" style="font-size:12px;padding:6px 12px;">🔄 Mặc định</button>' +
      '</div>' +

      '<div class="calc-inputs-grid">' +
        '<div class="calc-field">' +
          '<label>Số cung E (Edges - Đồ thị CFG)</label>' +
          '<input id="simEdges" type="number" min="1" value="' + simState.edges + '" oninput="updateQaSimulator()">' +
        '</div>' +
        '<div class="calc-field">' +
          '<label>Số đỉnh N (Nodes - Đồ thị CFG)</label>' +
          '<input id="simNodes" type="number" min="1" value="' + simState.nodes + '" oninput="updateQaSimulator()">' +
        '</div>' +
        '<div class="calc-field">' +
          '<label>Số nút điều kiện đơn P (Predicates)</label>' +
          '<input id="simPreds" type="number" min="0" value="' + simState.preds + '" oninput="updateQaSimulator()">' +
        '</div>' +
        '<div class="calc-field">' +
          '<label>Số biến độc lập n (Bài toán BVA)</label>' +
          '<input id="simBvaVars" type="number" min="1" max="8" value="' + simState.bvaVars + '" oninput="updateQaSimulator()">' +
        '</div>' +
        '<div class="calc-field">' +
          '<label>Lỗi tìm thấy trước bàn giao (E)</label>' +
          '<input id="simDefBefore" type="number" min="0" value="' + simState.defectsBefore + '" oninput="updateQaSimulator()">' +
        '</div>' +
        '<div class="calc-field">' +
          '<label>Lỗi phát hiện sau bàn giao (D)</label>' +
          '<input id="simDefAfter" type="number" min="0" value="' + simState.defectsAfter + '" oninput="updateQaSimulator()">' +
        '</div>' +
      '</div>' +

      '<div id="simVerdictBox" class="calc-verdict-box profit">' +
        '<div>🎉 <strong>ĐÁNH GIÁ CHẤT LƯỢNG: TỐT (ĐẠT CHUẨN)</strong><div style="font-size:12.5px;font-weight:500;margin-top:2px;">Độ phức tạp McCabe V(G) = 4 (≤ 10: Mô-đun đơn giản, dễ kiểm thử) · DRE = 92.0%</div></div>' +
        '<div style="font-size:13px;font-weight:800;">Tối đa 4 ca kiểm thử đường cơ sở</div>' +
      '</div>' +

      '<div class="solutions-grid">' +
        '<div class="solution-item-card">' +
          '<div class="solution-top-row"><span class="solution-code">V(G) = E−N+2</span><span id="resVgEN" class="solution-res-badge">4 đường</span></div>' +
          '<div class="solution-desc">Theo số cung &amp; đỉnh CFG</div>' +
        '</div>' +
        '<div class="solution-item-card">' +
          '<div class="solution-top-row"><span class="solution-code">V(G) = P+1</span><span id="resVgP" class="solution-res-badge">4 đường</span></div>' +
          '<div class="solution-desc">Theo nút điều kiện đơn</div>' +
        '</div>' +
        '<div class="solution-item-card">' +
          '<div class="solution-top-row"><span class="solution-code">BVA (4n+1)</span><span id="resBva4n1" class="solution-res-badge">9 ca</span></div>' +
          '<div class="solution-desc">Biên chuẩn (Lỗi đơn)</div>' +
        '</div>' +
        '<div class="solution-item-card">' +
          '<div class="solution-top-row"><span class="solution-code">BVA Mạnh (6n+1)</span><span id="resBva6n1" class="solution-res-badge">13 ca</span></div>' +
          '<div class="solution-desc">Thêm biên min− và max+</div>' +
        '</div>' +
        '<div class="solution-item-card">' +
          '<div class="solution-top-row"><span class="solution-code">Worst-Case (5ⁿ)</span><span id="resBva5pow" class="solution-res-badge">25 ca</span></div>' +
          '<div class="solution-desc">Tổ hợp 5 biên hợp lệ</div>' +
        '</div>' +
        '<div class="solution-item-card">' +
          '<div class="solution-top-row"><span class="solution-code">Worst-Case Mạnh (7ⁿ)</span><span id="resBva7pow" class="solution-res-badge">49 ca</span></div>' +
          '<div class="solution-desc">Tổ hợp 7 biên (Đề cương)</div>' +
        '</div>' +
        '<div class="solution-item-card">' +
          '<div class="solution-top-row"><span class="solution-code">Hiệu quả DRE</span><span id="resDre" class="solution-res-badge">92.0%</span></div>' +
          '<div class="solution-desc">E ÷ (E + D) × 100%</div>' +
        '</div>' +
        '<div class="solution-item-card">' +
          '<div class="solution-top-row"><span class="solution-code">Tổng lỗi (E+D)</span><span id="resTotalDef" class="solution-res-badge">100 lỗi</span></div>' +
          '<div class="solution-desc">Tổng lỗi phát hiện</div>' +
        '</div>' +
      '</div>' +
    '</div>' +

    // SECTION 2: FORMULA CARDS LIBRARY
    '<div>' +
      '<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:14px;">' +
        '<h3 style="font-size:18px;font-weight:800;color:var(--text);margin:0;">📚 THƯ VIỆN CÔNG THỨC &amp; KIẾN THỨC TRỌNG TÂM (' + filteredList.length + ' chủ đề)</h3>' +
      '</div>' +

      '<div class="formula-cards-grid">' +
        filteredList.map(item =>
          '<div class="formula-item-card">' +
            '<div class="formula-card-top">' +
              '<h4 class="formula-card-title">' + item.title + '</h4>' +
              '<span class="formula-category-tag">' + (FORMULA_CATEGORIES.find(c => c.id === item.category)?.label || item.category) + '</span>' +
            '</div>' +
            '<div class="formula-equation-box">' + item.equation + '</div>' +
            '<div>' +
              '<ul class="formula-vars-list">' +
                item.vars.map(v => '<li>' + v + '</li>').join('') +
              '</ul>' +
            '</div>' +
            '<div class="formula-tip-box">' + item.tip + '</div>' +
            (item.example ? '<div class="formula-example-box">' + item.example + '</div>' : '') +
          '</div>'
        ).join('') +
      '</div>' +
    '</div>' +

  '</div>';

  $('#card').innerHTML = html;
  updateFormulaHeroStats();
  updateQaSimulator();

  $$('[data-cat]').forEach(chip => {
    chip.onclick = () => {
      activeFormulaCategory = chip.dataset.cat;
      setupFormulaQuizList();
      renderFormulas();
      if (typeof scrollToCard === 'function') setTimeout(scrollToCard, 10);
    };
  });
}

if (typeof window !== 'undefined') {
  window.FORMULA_FLASHCARDS = FORMULA_FLASHCARDS;
  window.FORMULA_LIBRARY = FORMULA_LIBRARY;
  window.FORMULA_CATEGORIES = FORMULA_CATEGORIES;
  window.openFormulaModal = openFormulaModal;
  window.closeFormulaModal = closeFormulaModal;
  window.handleFormulaOverlayClick = handleFormulaOverlayClick;
  window.flipFormulaCard = flipFormulaCard;
  window.answerFormulaQuiz = answerFormulaQuiz;
  window.navFormulaQuiz = navFormulaQuiz;
  window.jumpFormulaQuiz = jumpFormulaQuiz;
  window.retryFormulaQuiz = retryFormulaQuiz;
  window.resetFormulaQuiz = resetFormulaQuiz;
  window.toggleFormulaQuizShuffle = toggleFormulaQuizShuffle;
  window.resetQaSimulator = resetQaSimulator;
  window.updateQaSimulator = updateQaSimulator;
}
