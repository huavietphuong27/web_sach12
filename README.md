# 📚 BookMind AI — Hệ Thống Gợi Ý & Cố Vấn Sách Thông Minh

> Ứng dụng web gợi ý sách chuẩn xác, thấu hiểu tâm lý và hoàn cảnh người đọc được xây dựng trên nền tảng **React 19**, **TypeScript**, **Tailwind CSS** và mô hình AI tiên tiến **Google Gemini 2.0 Flash**.

---

## 🌟 Tính Năng Nổi Bật

### 1. 🤖 AI Bong Bóng Chat (Floating Chat)
* **Gợi ý sách chuẩn xác bám sát lời chat:** Bóc tách trực tiếp hoàn cảnh, chi tiết và cảm xúc trong tin nhắn của bạn (không chọn sách chung chung, sáo rỗng).
* **Cấu trúc phản hồi 3 cuốn sách:**
  * **Cuốn 1:** Cốt truyện/nhân vật/hoàn cảnh tương đồng nhất với câu chuyện của bạn.
  * **Cuốn 2:** Phân tích và tháo gỡ trực diện vấn đề bạn đang đối mặt.
  * **Cuốn 3:** Mở ra góc nhìn mới hoặc lối thoát tích cực.
* **Nút gợi ý năng động (Dynamic Suggestions):** Sau mỗi lần hỏi đáp, hệ thống tự động sinh 3 gợi ý đào sâu mới theo ngữ cảnh thay vì các nút cố định.

### 2. 🧭 AI Cố Vấn Sách Chuyên Sâu (Advisor View)
* Phân tích nút thắt cốt lõi (Core Root Problem), không bị đánh lừa bởi từ khóa bề mặt.
* Kết nối trực tiếp với **Google Books API** toàn cầu để tìm kiếm tác phẩm phù hợp nhất.
* Đưa ra **Lý do nên đọc** và **Lời khuyên thực tế** chi tiết như một người bạn thân tình giới thiệu sách.

### 3. 📖 Khám Phá & Bộ Lọc Đa Chiều (Library & Goal Finder)
* Phân loại sách theo mục tiêu: *Kỷ luật & Thói quen*, *Kinh doanh & Tài chính*, *Chữa lành & Giảm stress*, *Công nghệ & AI*, *Giao tiếp & Lãnh đạo*, *Tư duy phản biện*.
* Bộ lọc theo tác giả, thể loại, độ dài trang sách, nhà xuất bản và năm phát hành.
* Xem chi tiết sách: trích dẫn đắt giá, màu bìa nhận diện, thời gian đọc ước tính và các tác phẩm cùng chủ đề.

### 4. 🛡️ Cơ Chế Dự Phòng 3 Tầng (Fault-Tolerant)
* Tự động chuyển đổi mượt mà giữa Google Books API có key $\rightarrow$ gọi công khai không key $\rightarrow$ kho sách kinh điển chọn lọc cục bộ nếu mất mạng hoặc hết quota.

---

## 🛠️ Công Nghệ Sử Dụng (Tech Stack)

* **Frontend:** React 19, TypeScript, Vite
* **Styling:** Tailwind CSS (Modern Slate & Indigo palette)
* **Icons:** Lucide React
* **AI & Dữ liệu:** Google Gemini 2.0 Flash API, Google Books API

---

## 🚀 Hướng Dẫn Cài Đặt & Chạy Trên Máy Tính (Local)

### Cách 1: Nhanh nhất (Không cần gõ lệnh)
Chỉ cần mở thư mục dự án và **bấm đúp chuột vào file**:
```
chay-web.bat
```
Trình duyệt sẽ tự động khởi động và mở website tại địa chỉ: `http://localhost:3000`.

---

### Cách 2: Dùng dòng lệnh (Terminal / Command Prompt)

1. **Mở terminal tại thư mục dự án:**
   ```bash
   cd "web_sach/Web_goi_y_sach"
   ```

2. **Cài đặt thư viện:**
   ```bash
   npm install
   ```

3. **Chạy máy chủ phát triển:**
   ```bash
   npm run dev
   ```

4. **Kiểm tra mã nguồn (Type Check):**
   ```bash
   npm run lint
   ```

5. **Đóng gói phiên bản phát hành (Build):**
   ```bash
   npm run build
   ```

---

## ⚙️ Cấu Hình Biến Môi Trường (.env)

Tạo file `.env` tại thư mục gốc của dự án với nội dung:

```env
# API Key của Google Gemini (Lấy miễn phí tại https://aistudio.google.com/)
VITE_GEMINI_API_KEY=your_gemini_api_key_here

# (Tùy chọn) API Key của Google Books
VITE_GOOGLE_BOOKS_API_KEY=your_google_books_api_key_here
```

> **Mẹo:** Nếu chưa nhập key, hệ thống vẫn hoạt động bình thường với kho sách kinh điển dự phòng có sẵn trong hệ thống.

---



## 📁 Cấu Trúc Thư Mục Dự Án

```
Web_goi_y_sach/
├── public/                 # Tài nguyên tĩnh & file cấu hình redirect (_redirects)
├── src/
│   ├── components/         # Các thành phần UI (Navbar, Footer, FloatingChat, BookCard...)
│   ├── data/               # Dữ liệu sách mẫu & mục tiêu đọc (content.ts)
│   ├── services/           # Kết nối API (aiAdvisor.ts - Gemini, googleBooks.ts)
│   ├── types/              # Định nghĩa kiểu dữ liệu TypeScript (book.ts)
│   ├── utils/              # Thuật toán tính điểm & lọc sách (bookRecommender.ts)
│   ├── views/              # Các trang giao diện chính (Home, Library, Goals, Advisor...)
│   ├── App.tsx             # Component điều hướng chính của ứng dụng
│   ├── index.css           # Cấu hình giao diện Tailwind CSS
│   └── main.tsx            # Điểm khởi chạy React
├── chay-web.bat            # File chạy nhanh web trên Windows chỉ với 1 click
├── vercel.json             # Cấu hình rewrite URL cho Vercel SPA
├── vite.config.ts          # Cấu hình Vite & Tailwind
└── package.json            # Thông tin dự án & danh sách thư viện
```

---

## 📄 Bản Quyền
Dự án được xây dựng phục vụ mục đích học tập, nghiên cứu và chia sẻ tri thức văn hóa đọc cộng đồng.
