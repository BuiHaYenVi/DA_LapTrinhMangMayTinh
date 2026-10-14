# Discord Mini - IV.1 Group Chat

MVP desktop Java/Swing dùng TCP Socket và Multithreading.

## Môi trường
- Apache NetBeans 24
- JDK 23 (đã biên dịch thử)
- Không cần thư viện ngoài cho bản MVP này

## Project
- ChatServer: server TCP port 5000
- ChatClient: client Swing

## Cách đưa vào NetBeans
1. Tạo 2 Java Application project tên `ChatServer` và `ChatClient`.
2. Server main class: `com.discordmini.server.ServerApplication`.
3. Client main class: `com.discordmini.client.ClientApplication`.
4. Xóa package/class mẫu nếu có.
5. Copy toàn bộ thư mục `src/com/...` tương ứng vào `Source Packages` của từng project.

## Chạy
1. Run `ChatServer` trước.
2. Run `ChatClient`.
3. Có thể Run nhiều lần `ChatClient` để mô phỏng nhiều người dùng.
4. Đăng ký tài khoản, đăng nhập, chọn/tạo phòng và chat.

## Lưu dữ liệu
Server tự tạo thư mục `data` trong thư mục chạy server:
- users.txt
- rooms.txt
- messages.txt

Đây là bản MVP để chạy ổn định trước. Sau khi phần TCP/chat hoàn chỉnh, có thể thay DataStore bằng PostgreSQL/JDBC mà không cần thay đổi phần GUI.


## Application Protocol & Reliability

The Client–Server wire contract, request IDs, ACK/error format, heartbeat, timeout policy and protocol test instructions are documented in [`docs/PROTOCOL.md`](docs/PROTOCOL.md). Vi's implementation summary is in [`docs/VI_WORKLOG.md`](docs/VI_WORKLOG.md).
