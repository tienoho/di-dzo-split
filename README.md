# 🍻 Dzô! Split - Chia Tiền Nhậu Sòng Phẳng & VietQR 1 Chạm

**Dzô! Split** là giải pháp sòng phẳng tối thượng, giữ trọn chân tình anh em. Ứng dụng giúp đơn giản hóa việc chia tiền sau mỗi cuộc nhậu, tự động quét hóa đơn bằng AI, quản lý danh bạ bạn bè nhậu, và tạo nhanh mã VietQR đòi nợ 1 chạm cực kỳ chuyên nghiệp và cá tính.

---

## 🚀 Tính Năng Nổi Bật

*   **⚡ Chia Hóa Đơn Nhóm Thông Minh:** Hỗ trợ tính thêm tiền Tip, thuế VAT, giảm giá voucher, chia đều hoặc chia theo phần trăm/số tiền tùy chỉnh cho từng thành viên.
*   **👁️ Quét Hóa Đơn AI (Vision OCR):** Tự động nhận diện tên quán, danh sách món ăn, số lượng và tổng tiền từ ảnh chụp hóa đơn bằng AI (sử dụng **Gemini 2.5 Flash** hoặc mô hình lai **DeepSeek Hybrid OCR**).
*   **🎯 Đòi Nợ 1 Chạm & Tạo Mã VietQR:** Tự động sinh mã QR ngân hàng (VietQR) chứa sẵn thông tin tài khoản ngân hàng, số tiền cần trả và nội dung chuyển khoản "sòng phẳng". Hỗ trợ gửi nhanh tin nhắn nhắc nợ kèm link QR qua **Zalo** và **Messenger**.
*   **👥 Danh Bạ Chiến Hữu (Mới):** Quản lý danh sách bạn bè đi nhậu thường xuyên (Tên, SĐT Zalo, Messenger). Đồng bộ hóa trực tiếp làm phím chọn nhanh trong Bộ chia tiền và phần Nhắc nợ.
*   **🤖 Gợi Ý Quán Nhậu AI:** Tìm kiếm và gợi ý tụ điểm ăn nhậu, quán bia hơi, lẩu nướng uy tín tại Việt Nam bằng AI có kết nối công cụ tìm kiếm thời gian thực **Google Search Grounding**.
*   **🍽️ Ăn Solo & Dự Báo Ngân Sách:** Nhật ký ghi chép chi tiêu ăn uống cá nhân, biểu đồ phân tích tần suất nhậu nhẹt và lời khuyên đề xuất ngân sách tuần tới thông minh từ AI.
*   **☁️ Đồng Bộ Đám Mây (Cloud Sync):** Đăng nhập nhanh qua Google, tự động đồng bộ hóa hóa đơn, quán tủ và danh bạ lên **Firebase Firestore** thời gian thực.

---

## 🛠️ Cấu Hình Môi Trường (.env)

Tạo tệp `.env` ở thư mục gốc của dự án dựa trên mẫu `.env.example`:

```bash
# --- CẤU HÌNH AI (GEMINI) ---
GEMINI_API_KEY="MÃ_API_KEY_GEMINI_CỦA_BẠN"
GEMINI_MODEL="gemini-2.5-flash"

# --- CẤU HÌNH FIREBASE (DÙNG CHUNG CLIENT & SERVER) ---
VITE_FIREBASE_API_KEY="firebase_api_key"
VITE_FIREBASE_AUTH_DOMAIN="dự-án.firebaseapp.com"
VITE_FIREBASE_PROJECT_ID="dự-án-id"
VITE_FIREBASE_STORAGE_BUCKET="dự-án.appspot.com"
VITE_FIREBASE_MESSAGING_SENDER_ID="sender_id"
VITE_FIREBASE_APP_ID="app_id"
VITE_FIREBASE_FIRESTORE_DATABASE_ID="(default)"

# --- THÔNG BÁO PUSH NOTIFICATION (TÙY CHỌN) ---
VITE_FCM_VAPID_KEY="mã_vapid_key_của_bạn"
PORT=3000
```

---

## 💻 Chạy Cục Bộ (Local Development)

### Yêu cầu hệ thống:
*   Đã cài đặt **Node.js** (Khuyên dùng v18 hoặc v20)

### Các bước thực hiện:

1.  **Cài đặt thư viện phụ thuộc:**
    ```bash
    npm install
    ```
2.  **Cấu hình biến môi trường:**
    Sao chép tệp `.env.example` thành `.env` và nhập các khóa API của bạn.
3.  **Khởi chạy server phát triển:**
    ```bash
    npm run dev
    ```
4.  **Truy cập ứng dụng:**
    Mở trình duyệt truy cập địa chỉ [http://localhost:3000](http://localhost:3000)

---

## ☁️ Hướng Dẫn Deploy Lên Vercel

Dự án đã được cấu hình sẵn tệp [vercel.json](vercel.json) để tối ưu hóa việc chạy cả Frontend (React SPA) và Backend (Express API Serverless) trên cùng một tên miền của Vercel.

1.  Liên kết Git Repository của bạn với dự án trên **Vercel Dashboard**.
2.  Trong phần **Settings > Environment Variables** trên Vercel, hãy điền đầy đủ các biến môi trường cấu hình như phần cấu hình bên trên.
3.  Vercel sẽ tự động build frontend tĩnh và biên dịch `/api/index.ts` thành các hàm Serverless API hoạt động độc lập.

---

## 📄 Bản Quyền & Phát Triển
Dự án được xây dựng trên nền tảng **React + TypeScript + Vite** cho Frontend và **Express + esbuild** cho Backend.
*   Bản quyền © 2026 Dzô! Split - Built for Vietnam drinking communities.
*   *Slogan:* Giải pháp sòng phẳng tối thượng, giữ trọn chân tình anh em.
