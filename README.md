# Studocu Helper

> **Phiên bản:** 2.1  
> Tiện ích mở rộng Chrome hỗ trợ tự động mở khóa tài liệu (bypass paywall), gỡ mờ nội dung và xuất file PDF chuẩn in ấn trên Studocu.

---

## ⚡ Tính năng nổi bật

- **Tự động xóa cookie (Auto Bypass):** Chặn việc giới hạn xem trang bằng cách xóa cookie Studocu ngay trước khi request bắt đầu (`onBeforeNavigate`), chạy song song qua `Promise.all`.
- **Gỡ bỏ lớp phủ làm mờ (Anti-blur):** Vô hiệu hóa hiệu ứng `filter: blur(...)` và backdrop-filter trên toàn bộ các trang nội dung.
- **Mở khóa tương tác:** Bật lại khả năng chọn văn bản (text selection), bôi đen, sao chép và cuộn chuột tự do.
- **Tự động cuộn nạp trang (Auto Lazy-load):** Trước khi tạo PDF, tiện ích tự động cuộn qua các trang chưa tải để kích hoạt nạp toàn bộ ảnh và text layer.
- **Xuất PDF sạch & an toàn:** Tạo bản in A4 không viền đen, chia tách layer nền và layer chữ. Tự động khôi phục giao diện gốc của web ngay sau khi đóng hộp thoại in (`afterprint`).
- **Giao diện nổi linh hoạt:** Bảng điều khiển thu nhỏ ở góc trên phải, nút tròn bật/tắt nhanh ở góc dưới, hỗ trợ bật/tắt trực tiếp bằng cách bấm biểu tượng tiện ích trên thanh công cụ trình duyệt.

---

## 🚀 Hướng dẫn cài đặt

### Cách 1: Cài đặt nhanh bằng script (Khuyên dùng trên Windows)

1. Nhấp đúp chuột vào file **`cai_dat_nhanh.bat`** trong thư mục dự án.
2. File script sẽ tự động copy đường dẫn thư mục `extension` vào bộ nhớ tạm (Clipboard) và mở trang `chrome://extensions`.
3. Trên trình duyệt Chrome:
   - Bật công tắc **Chế độ cho nhà phát triển (Developer mode)** ở góc trên bên phải.
   - Bấm **Tải tiện ích đã giải nén (Load unpacked)**.
   - Nhấn `Ctrl + V` vào ô chọn thư mục rồi bấm **Select Folder / Enter**.

---

### Cách 2: Cài đặt thủ công

1. Tải file **`studocu-helper-v2.1.zip`** từ mục [Releases](https://github.com) hoặc clone repository này về máy.
2. Giải nén file `.zip` (nếu tải zip).
3. Mở trình duyệt Chrome và truy cập: `chrome://extensions`.
4. Bật **Chế độ cho nhà phát triển (Developer mode)**.
5. Bấm **Tải tiện ích đã giải nén (Load unpacked)** và trỏ tới thư mục `extension`.

---

## 📖 Hướng dẫn sử dụng

1. **Xem tài liệu:** Mở bất kỳ tài liệu nào trên `studocu.com` hoặc `studocu.vn`. Tiện ích tự động xóa giới hạn và làm rõ văn bản.
2. **Bật/Tắt bảng điều khiển:**
   - Bấm vào nút tròn màu xanh ở góc dưới cùng bên phải.
   - Hoặc bấm vào biểu tượng extension trên thanh công cụ Chrome.
3. **Xuất file PDF:**
   - Mở bảng điều khiển, bấm **Tạo file PDF**.
   - Tiện ích sẽ tự động cuộn tải các trang chưa hiển thị và dựng lại bố cục in ấn.
   - Hộp thoại in (`Ctrl + P`) xuất hiện: chọn đích đến là **Lưu dưới dạng PDF (Save as PDF)** và bấm **Lưu**.
   - Sau khi in xong hoặc bấm Hủy, trang web tự động trở về giao diện bình thường mà không cần tải lại.
4. **Bypass thủ công:**
   - Nếu gặp trang bị kẹt hạn mức cũ, bấm **Bypass & Tải lại** để xóa sạch cookie và reload trang ngay lập tức.

---

## 📁 Cấu trúc thư mục

```text
studocu/
├── extension/                  # Mã nguồn tiện ích mở rộng Chrome
│   ├── manifest.json           # Cấu hình Manifest V3
│   ├── background.js           # Service worker quản lý cookie và điều hướng
│   ├── content.js              # Script giao diện nổi và xử lý trích xuất PDF
│   ├── content.css             # CSS bảng điều khiển và định dạng trang in PDF
│   └── custom_style.css        # CSS chống làm mờ và ẩn lớp phủ paywall
├── cai_dat_nhanh.bat           # Script 1-click copy đường dẫn & mở chrome://extensions
├── studocu-helper-v2.1.zip     # Gói bản phát hành v2.1
├── test_extension.js           # Kịch bản tự kiểm tra tính hợp lệ của tiện ích
└── README.md                   # Tài liệu hướng dẫn sử dụng và cài đặt
```

---

## ⚠️ Lưu ý miễn trừ trách nhiệm
Dự án được xây dựng cho mục đích học tập và nghiên cứu cá nhân. Vui lòng tôn trọng bản quyền của tác giả tài liệu gốc.
