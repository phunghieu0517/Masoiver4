# MA SÓI ONLINE 2.5D — MÃ NGUỒN GAME WEB

Bộ mã nguồn chạy trên Node.js 20+, **không cần cài thêm thư viện ngoài**. Giao diện được thiết kế dựa trên bộ ảnh Ma Sói 2.5D đã duyệt: màu tím than – vàng kim – đỏ, cảnh người chơi quanh đống lửa, hiệu ứng đêm/ngày, thẻ vai và thông báo kết quả.

## 1. Chơi thử nhanh trên máy

Cài Node.js phiên bản 20 trở lên từ nodejs.org. Giải nén ZIP vào một thư mục, mở Terminal/PowerShell tại **thư mục có `server.js`** và chạy:

```bash
npm start
```

Sau đó mở `http://localhost:3000` trong trình duyệt. Nếu 3000 đã được sử dụng, trên PowerShell có thể chạy `$env:PORT=3001; npm start` hoặc trên macOS/Linux chạy `PORT=3001 npm start`.

**Để tự thử cả một ván:**

1. Trang chủ → **TẠO PHÒNG** → nhập tên → tạo phòng.
2. Trong phòng chờ, chọn **CHỌN BỘ BÀI** (hoặc tab **Bộ bài** bên phải).
3. Nhấn **+ THÊM 9 BOT**. Có thể chọn thử vai **Tiên Tri / Ma Sói / Bảo Vệ / Phù Thủy / Thợ Săn / Dân Làng**. Vai thử chỉ áp dụng khi phòng chỉ có một người thật.
4. Nhấn **BẮT ĐẦU**, quan sát nhân vật ngủ, đến lượt kỹ năng thì chọn người chơi bên phải và xác nhận. Khi ban ngày, chủ phòng có thể bấm **BẮT ĐẦU BỎ PHIẾU** để đi nhanh tới màn bỏ phiếu.
5. Sau khi ván kết thúc, chọn **CHƠI LẠI** hoặc **VỀ TRANG CHỦ**.

**Để chơi với bạn bè:** Chủ phòng tạo phòng, dùng nút sao chép mã phòng (6 ký tự), gửi cho người chơi khác; họ chọn **THAM GIA PHÒNG**, nhập mã, nhập tên và nhấn **SẴN SÀNG**. Chủ phòng có thể chỉnh đúng số lá vai tương ứng với số người rồi bắt đầu. Số người tối đa trong một phòng là 30.

## 2. Đưa lại lên GitHub và Render

Bạn đã có repository GitHub `phunghieu0517/Masoi`. Đây là cách cập nhật **chính repo cũ**:

1. Giải nén ZIP và mở thư mục `ma-soi-2p5d`.
2. Trong repo GitHub, tải lên **nội dung đã giải nén**: `server.js`, `package.json`, thư mục `game`, thư mục `public`, `tests`, và `README_VI.md`. **Không chỉ tải tệp ZIP lên repo** vì Render không chạy ứng dụng từ tệp ZIP đó.
3. Commit các tệp lên nhánh `main`, chú ý thay thế các tệp cũ có cùng tên. Nếu upload vào thư mục con, phải chỉnh **Root Directory** tương ứng trên Render.
4. Trên dịch vụ Render cũ, xác nhận:
   - **Runtime:** Node
   - **Branch:** `main`
   - **Root Directory:** để trống nếu `server.js` nằm ở gốc repo
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Vào **Manual Deploy → Deploy latest commit** nếu Render chưa tự triển khai. Mở đường link Render của bạn để tạo phòng và chơi với người khác.

Với bộ code này, không cần database hay biến môi trường để chạy thử. Render tự cấp biến `PORT` và game tự lắng nghe cổng đó.

## 3. Các màn hình và thao tác đã có

| Giai đoạn | Điều khiển | Hiệu ứng |
| --- | --- | --- |
| Trang chủ | Tạo phòng, tham gia phòng, hướng dẫn, vai trò, bật/tắt âm thanh | Khung hình đêm, tiêu đề vàng có vết cào, đốm sáng |
| Phòng chờ | Tối đa 30 người, mã phòng, sẵn sàng, chat, host chọn số lá, thêm/xóa bot | Nhân vật ngồi quanh đống lửa, hơi thở, lửa bập bùng |
| Ban đêm | Bảo Vệ → Ma Sói → Tiên Tri → Phù Thủy, kỹ năng chọn mục tiêu | Chuyển nền đêm, trăng, Zzz, đếm ngược |
| Thảo luận | Chat thời gian thực, host chuyển sang bỏ phiếu | Phông nền chiều tối, thông báo ai bị loại, bot có lời thoại thử |
| Bỏ phiếu | Mỗi người bỏ một phiếu/phiếu trắng; đổi phiếu trước giờ chốt | Nhân vật cử động cánh tay, đường chỉ mục tiêu, viền chọn |
| Thợ Săn | Chọn phát bắn cuối khi bị Sói cắn hoặc bị treo cổ | Màn chọn mục tiêu và thông báo hạ mục tiêu |
| Kết quả | Tự xác định phe thắng, mở toàn bộ vai, chơi lại | Banner chiến thắng, confetti, cử chỉ ăn mừng |

**Vai được hỗ trợ:** Dân Làng, Ma Sói, Tiên Tri, Bảo Vệ, Phù Thủy, Thợ Săn. Chủ phòng chọn preset **Cơ bản / Huyền bí / Đầy đủ** hoặc tự chỉnh số lá của từng vai, tối đa 30 lá.

**Luật tiêu chuẩn trong phiên bản này:** Dân thắng khi không còn Sói; Sói thắng khi số Sói còn sống ít nhất bằng tổng số người phe Dân còn sống. Bảo Vệ không được bảo vệ cùng người hai đêm liên tiếp; Phù Thủy có một bình cứu và một bình độc cho mỗi trận, chỉ dùng một hành động trong mỗi đêm; Thợ Săn được bắn nếu bị Sói cắn hoặc bị bỏ phiếu loại, không bắn nếu bị bình độc.

## 4. Cấu trúc thư mục

```text
ma-soi-2p5d/
├── package.json          # Lệnh khởi động, kiểm thử
├── server.js             # HTTP, API, phòng chơi, Server-Sent Events
├── game/
│   └── engine.js         # Luật chơi, các pha, vai trò, bot, thắng thua
├── public/
│   ├── index.html        # Điểm vào website
│   ├── app.js            # Giao diện và xử lý thao tác, đồng bộ từ server
│   ├── styles.css        # Giao diện desktop/mobile và hiệu ứng
│   ├── favicon.svg
│   └── assets/
│       ├── world-home.webp
│       ├── world-day.webp
│       ├── world-night.webp
│       └── world-dusk.webp
├── tests/
│   ├── game.test.js      # Kiểm thử luật chơi
│   └── http.test.js      # Kiểm thử API + SSE
└── README_VI.md
```

`public/app.js` sinh nhân vật dưới dạng SVG; CSS điều khiển các trạng thái ngủ, ngồi, chỉ tay, ăn mừng. Đây là giải pháp ảnh động nhiều lớp kiểu **2.5D**, không phải mô hình xương 3D có thể xoay tự do. Bộ background được xử lý từ ảnh tham chiếu bạn đã cung cấp. Font giao diện dùng **Be Vietnam Pro** và font tiêu đề **Cinzel** được tải qua Google Fonts khi trình duyệt có Internet; không đóng kèm tệp font.

## 5. Kiểm thử

Trong thư mục gốc chạy:

```bash
npm test
```

Các bài test kiểm tra chia vai kín, thứ tự hành động ban đêm, bảo vệ, soi Sói, bỏ phiếu, thắng thua, giới hạn 30 người, phân quyền host, kết nối API và SSE.

## 6. Những giới hạn cần biết

- **Đây là phiên bản game web chạy được**, với đồ họa giả lập 2.5D và nhân vật SVG chuyển động; **không phải sản phẩm 3D rig hoàn chỉnh** như ảnh concept, không có sprite sheet nhân vật dựng từ 3D hoặc diễn hoạt xương có thể xoay chính xác mọi góc. Nếu nâng cấp sau, có thể thay cụm SVG bằng sprite atlas xuất từ Blender/Spine/Live2D mà giữ game engine hiện tại.
- **Chưa có voice chat/WebRTC.** Nút loa chỉ bật/tắt hiệu ứng âm thanh; chat chữ hoạt động theo thời gian thực.
- Phòng/ván nằm trong **RAM của một Node process**; khởi động lại Render sẽ làm mất trạng thái ván đang chơi. Khi dùng thật với lưu trữ bền vững cần Redis hoặc database.
- Bản này phù hợp để thử với bạn bè hoặc làm nền phát triển; chưa có kiểm thử tải thực địa 30 kết nối Internet đồng thời, hệ thống tài khoản, phân quyền admin cao cấp, giám sát lỗi, rate limiting chuẩn production.
- Để tránh bất lợi khi chết, người bị loại không gửi chat cho người sống. Người chơi rời trang giữa ván có thể quay lại phòng bằng phiên trình duyệt trước đó nếu vẫn còn dữ liệu; trang chủ có nút **Trở lại phòng**.
- Các thiết kế preview là concept; giao diện HTML/CSS này bám sát bố cục, tone màu và chức năng đã duyệt, **không phải bản sao từng pixel** của ảnh tĩnh.

## 7. Chỉnh tùy chọn

Trong `game/engine.js` có `CONFIG` để đổi thời gian cho từng pha:

```js
export const CONFIG = {
  nightStepMs: 28000,   // 28 giây mỗi lượt kỹ năng ban đêm
  discussionMs: 140000, // 2 phút 20 giây thảo luận
  votingMs: 55000,     // 55 giây bỏ phiếu
  hunterMs: 30000,     // 30 giây Thợ Săn
  interludeMs: 12000   // 12 giây chuyển giao
};
```

Màu sắc và cỡ chữ nằm trong `public/styles.css`; phần dựng SVG nhân vật nằm ở `characterSvg()` trong `public/app.js`. Các hình nền được thay trong `public/assets/`.
