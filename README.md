# 🎓 Góc ôn tập Đánh giá và Kiểm định chất lượng phần mềm (Phenikaa University)

Ứng dụng web ôn tập học phần **Đánh giá và Kiểm định chất lượng phần mềm**, trích xuất và đối chiếu 100% từ **Đề cương gốc 54 trang (299 câu trắc nghiệm · 6 Group theo CĐR 1.1 & CĐR 2.1)**.

## 🏗️ Kiến trúc Module hóa (Modular Architecture)

Dự án được tách thành các module độc lập giúp dễ quản trị, bảo trì và kiểm thử tự động:

```
onCuoiKi/
├── index.html             # Giao diện chính (Light/Dark mode, Responsive Mobile/PC)
├── style.css              # Hệ thống Design Tokens & Styling (bao gồm .question-diagram-box)
├── data.js                # Ngân hàng 299 câu trắc nghiệm (6 Group), 15 sơ đồ CFG/DFG/Code base64 & 10 chủ đề tổng hợp
├── formulas.js            # 8 bảng công thức (V(G), BVA, EP, C0/C1/C2, McCall/ISO, DRE) & 10 thẻ Flashcard 3D
├── js/
│   ├── state.js           # Quản lý State, LocalStorage, Bộ sinh Đề chuẩn 50 câu (10/15/3/5/12/5) & 10 Đề mẫu cố định
│   ├── effects.js         # Hiệu ứng âm thanh Web Audio API, Pháo giấy Confetti, Giao diện Sáng/Tối & Toast
│   ├── render-formula.js  # Render Sổ tay Công thức, Flashcard 3D & Máy tính công thức trực tiếp (V(G), BVA, DRE)
│   ├── render-quiz.js     # Render Trắc nghiệm (kèm hình CFG/DFG/Code), Flashcard, Tổng hợp lý thuyết & Bản đồ câu
│   ├── sync.js            # Đồng bộ tiến độ Đa thiết bị (PC ⇆ Điện thoại) qua QR Code, Mã ngắn 8 ký tự & JSON Backup
│   └── main.js            # Khởi tạo ứng dụng, Lightbox phóng to ảnh, Phím tắt bàn phím & Sự kiện toàn cục
├── api/
│   └── sync.js            # Serverless API tạo/đọc mã đồng bộ ngắn 8 ký tự
├── answers/               # 299 ảnh cắt từng câu hỏi & đáp án dấu * từ PDF gốc (q_1.png .. q_299.png)
├── pages/                 # 54 ảnh chụp toàn trang đề cương PDF gốc ở độ phân giải cao (page_1.png .. page_54.png)
├── de-cuong-goc.pdf       # File đề cương PDF gốc 54 trang
└── kiem-tra-du-lieu.json  # Báo cáo kiểm định độc lập dữ liệu
```

## ✨ Tính năng nổi bật

1. **299/299 câu trắc nghiệm chuẩn 100% đáp án dấu `*` trong PDF**:
   - Đầy đủ giải thích chi tiết từng câu + ảnh cắt trực tiếp từ PDF gốc (`answers/q_1.png` .. `q_299.png`) + xem nguyên trang PDF (`pages/page_1.png` .. `page_54.png`).
2. **Hiển thị trực tiếp 15 sơ đồ CFG/DFG & đoạn code C ngay trong đề bài**:
   - Các câu có hình vẽ/đồ thị luồng điều khiển/code (`104, 039, 042, 122, 199, 123, 129, 154, 164, 165, 193, 247, 261, 262, 263`) đều được nhúng ảnh sắc nét ngay dưới câu hỏi, hỗ trợ nhấn phóng to.
3. **Chế độ Thi thử 50 câu chuẩn ma trận CĐR + 10 Đề mẫu cố định**:
   - Tự động phân bổ đúng cấu trúc đề thi: **Group 1 (10 câu) · Group 2 (15 câu) · Group 3 (3 câu) · Group 4 (5 câu) · Group 5 (12 câu) · Group 6 (5 câu)**.
4. **Sổ tay Công thức & Máy tính Kiểm thử trực tiếp**:
   - Tính tự động Độ phức tạp McCabe $V(G) = E - N + 2 = P + 1 = R$, số ca kiểm thử Biên BVA ($4n+1, 6n+1, 5^n, 7^n$) và Hiệu quả khử lỗi $DRE$.
5. **Đồng bộ tiến độ Máy tính ⇆ Điện thoại**:
   - Quét mã QR, nhập mã ngắn 8 ký tự, gửi Link 1 chạm hoặc tải file `.json`.
