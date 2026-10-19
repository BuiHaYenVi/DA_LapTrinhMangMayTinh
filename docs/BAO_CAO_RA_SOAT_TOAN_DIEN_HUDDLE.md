# BÁO CÁO RÀ SOÁT TOÀN DIỆN DỰ ÁN HUDDLE (DISCORD MINI)
**Thời điểm thực hiện:** 19/10/2026  
**Phiên bản git:** `feature/2380600023-issue-9-chat-ui` (Commit `2539b55`)  
**Phương pháp rà soát:** Phân tích tĩnh toàn diện mã nguồn 3 tầng (Database schema, ChatServer TCP Java, ChatClient & Web Bridge HTTP/SSE, React Frontend) kết hợp đối chiếu hợp đồng giao thức (`PROTOCOL.md`). Không sửa mã nguồn và không thay đổi dữ liệu thật.

---

## MỤC LỤC
1. [Tổng quan mức độ sẵn sàng & Vấn đề then chốt](#1-tổng-quan-mức-độ-sẵn-sàng--vấn-đề-then-chốt)
2. [Bảng kiểm kê tính năng chi tiết](#2-bảng-kiểm-kê-tính-năng-chi-tiết)
3. [Nghiệp vụ & Ma trận phân quyền thực tế](#3-nghiệp-vụ--ma-trận-phân-quyền-thực-tế)
4. [Dữ liệu, Lịch sử & Tính bền vững](#4-dữ-liệu-lịch-sử--tính-bền-vững)
5. [Thời gian thực & Các trường hợp biên (Edge Cases)](#5-thời-gian-thực--các-trường-hợp-biên-edge-cases)
6. [Giao diện & Trải nghiệm người dùng (UI/UX)](#6-giao-diện--trải-nghiệm-người-dùng-uiux)
7. [Chất lượng vận hành & Kiến trúc hệ thống](#7-chất-lượng-vận-hành--kiến-trúc-hệ-thống)
8. [Danh mục lỗi & Nguy cơ (Phân cấp mức độ)](#8-danh-mục-lỗi--nguy-cơ-phân-cấp-mức-độ)
9. [Kết quả Build, Phần chưa kiểm chứng & Quyết định cần chốt](#9-kết-quả-build-phần-chưa-kiểm-chứng--quyết-định-cần-chốt)
10. [Lộ trình ưu tiên hoàn thiện đồ án](#10-lộ-trình-ưu-tiên-hoàn-thiện-đồ-án)

---

## 1. TỔNG QUAN MỨC ĐỘ SẴN SÀNG & VẤN ĐỀ THEN CHỐT

### 1.1. Đánh giá chung
Hệ thống **Huddle** được xây dựng theo kiến trúc phân tầng khá độc đáo và giàu tính ứng dụng cho môn học Lập trình Mạng:
1. **Tầng lõi Socket TCP (`Chatserver`):** Xử lý giao thức nhị phân/chuỗi ký tự phân tách `|` kèm mã hóa Base64 UTF-8, quản lý kết nối, phân quyền phòng/kênh, kết nối cơ sở dữ liệu PostgreSQL.
2. **Tầng cầu nối trung gian (`UiBridgeServer` trong `ChatClient`):** Chuyển đổi giữa Socket TCP thuần và HTTP REST API + Server-Sent Events (SSE), phục vụ frontend tĩnh.
3. **Tầng giao diện người dùng Web (`frontend` React/Vite/TypeScript):** Giao diện mô phỏng Discord hiện đại, hỗ trợ Dark/Light theme, phím tắt, sticker, đính kèm tệp và phản ứng emoji.
4. **Tầng ứng dụng Desktop Swing cũ (`ChatClient/src/.../ui`):** Vẫn được lưu trữ song song cho đồ án Java Swing cơ bản.

### 1.2. Các vấn đề then chốt cần lưu ý nhất (Executive Summary)
1. **Tính năng giả lập cục bộ (Client-Side Simulation / Mocking):**
   - **Kênh thoại (Voice Channel):** Giao diện hiển thị trạng thái nói chuyện, mic, tai nghe, người tham gia nhưng **hoàn toàn là hiệu ứng `Math.random()` và setInterval**; chưa có socket âm thanh WebRTC / UDP / Voice streaming thật.
   - **Kênh diễn đàn (Forum Channel):** Lưu bài đăng và bình luận vào `localStorage` của trình duyệt người dùng, **không được gửi lên ChatServer hay lưu vào Database**. Người dùng khác hoặc trình duyệt khác không nhìn thấy bài đăng.
   - **Phản ứng tin nhắn (Reactions):** Lưu vào `localStorage` (`huddle_discord_message_reactions`), **chưa có packet TCP/SSE** đồng bộ thời gian thực cho người cùng phòng.
   - **Ghim tin nhắn (Pinned Messages):** Lưu cục bộ trong `localStorage` (`discord_mini_pinned_messages_v1`), người khác không xem được danh sách tin đã ghim của phòng.
   - **Trạng thái cá nhân (Custom Status) & Bio & Avatar Icon:** Hiện lưu ở `localStorage` của máy khách. Tầng server `users` trong schema SQL chưa có cột `bio`, `avatar_icon`, `avatar_color`, `custom_status`.
2. **Lưu trữ tệp tin tải lên (File Storage) nằm tại máy Client Bridge:**
   - Khi gửi tệp/ảnh trong chat, tệp được upload lên máy chạy `UiBridgeServer` (thư mục cục bộ `uploads/`). **ChatServer TCP không tham gia lưu trữ hoặc relay byte file**, mà chỉ chuyển chuỗi URL token `[ATTACH:url|name|size|type]`. Nếu Bridge khác máy hoặc chạy multi-client không chung thư mục, người dùng khác sẽ không tải được file qua URL nội bộ này.
3. **Chính sách xóa tin nhắn (Hard Delete):**
   - Lệnh `DELETE_MESSAGE` và `DELETE_DM` thực hiện xóa cứng `DELETE FROM messages ...` trong PostgreSQL. Không có cơ chế Soft Delete (`deleted_at`), không thể phục hồi hoặc lưu vết kiểm toán (audit log).
4. **Xung đột phím tắt và Focus trong Textarea:**
   - Đã xử lý xuống dòng bằng `Shift + Enter` và gửi bằng `Enter` (hoặc `Ctrl + Enter`). Tuy nhiên trên một số trình duyệt khi nhấn gửi cần chú ý không để lại ký tự `\n` dư thừa.

---

## 2. BẢNG KIỂM KÊ TÍNH NĂNG CHI TIẾT

| STT | Phân hệ / Chức năng | Hành vi mong đợi & Căn cứ | Trạng thái thực tế | Cách kiểm tra / Căn cứ mã nguồn | Đánh giá & Bằng chứng |
|:---:|:---|:---|:---:|:---|:---|
| **1** | **Xác thực: Đăng ký** | Tạo tài khoản mới với username duy nhất, mật khẩu mã hóa BCrypt, display_name. | **Hoạt động thật** | `ClientHandler.java:139`, `UiBridgeServer.java:318`, `RegisterView.tsx` | Đã test đăng ký thành công qua API và giao diện; mật khẩu băm BCrypt an toàn. |
| **2** | **Xác thực: Đăng nhập** | Xác thực credentials, tạo session cookie HttpOnly, kiểm tra trạng thái online. | **Hoạt động thật** | `ClientHandler.java:167`, `UiBridgeServer.java:376`, `LoginView.tsx` | Cookie `DISCORD_SESSION` được gán HttpOnly, chặn đăng nhập trùng nếu socket đang mở. |
| **3** | **Xác thực: Đăng xuất** | Xóa session, đóng kết nối SSE, cập nhật trạng thái OFFLINE. | **Hoạt động thật** | `ClientHandler.java:70`, `UiBridgeServer.java:493` | Broadcast `USER_OFFLINE` toàn server; đóng socket TCP an toàn. |
| **4** | **Hồ sơ: Đổi tên hiển thị** | Cập nhật `display_name` trong DB, thông báo cho phòng và bạn bè. | **Hoạt động thật** | `ClientHandler.java:1924`, `UserDAO.java:406` | SQL `UPDATE users SET display_name = ?`. Broadcast `USER_PROFILE_UPDATED`. |
| **5** | **Hồ sơ: Đổi mật khẩu** | Xác thực mật khẩu cũ bằng BCrypt, cập nhật mật khẩu mới. | **Hoạt động thật** | `ClientHandler.java:1945`, `UserDAO.java:420` | Kiểm tra BCrypt khớp mới cập nhật hash mới; trả về lỗi rõ ràng nếu sai. |
| **6** | **Hồ sơ: Bio, Avatar, Status** | Lưu tiểu sử, icon avatar, màu avatar, custom status. | **Chỉ Client-side** | `UserSettingsModal.tsx:102`, `schema.sql:6` | `schema.sql` không có cột lưu bio/status. Dữ liệu chỉ nằm trong `localStorage`. |
| **7** | **Bạn bè: Tìm kiếm** | Tìm người dùng theo username/display_name để kết bạn. | **Hoạt động thật** | `ClientHandler.java:1330`, `FriendDAO.java:17` | Lệnh `FRIEND_SEARCH` truy vấn DB PostgreSQL, trả về trạng thái bạn bè / online. |
| **8** | **Bạn bè: Gửi lời mời** | Tạo bản ghi kết bạn trạng thái `PENDING`. | **Hoạt động thật** | `ClientHandler.java:1360`, `FriendDAO.java:62` | Đẩy sự kiện realtime `FRIEND_REQUEST_INCOMING` cho người nhận nếu đang online. |
| **9** | **Bạn bè: Chấp nhận / Từ chối** | Cập nhật status `ACCEPTED` hoặc xóa bản ghi `PENDING`. | **Hoạt động thật** | `ClientHandler.java:1440`, `FriendDAO.java:110` | Cập nhật DB và phát `FRIEND_ACCEPTED` / `FRIEND_REJECTED` tức thì. |
| **10** | **Bạn bè: Hủy kết bạn** | Xóa bản ghi trong bảng `friendships`. | **Hoạt động thật** | `ClientHandler.java:1510`, `FriendDAO.java:150` | SQL `DELETE FROM friendships ...`, cập nhật danh sách bạn bè 2 chiều. |
| **11** | **Nhắn tin riêng (DM): Gửi & Nhận** | Gửi tin 1-1, lưu DB `direct_messages`, đẩy realtime. | **Hoạt động thật** | `ClientHandler.java:540`, `DirectMessageDAO.java` | Lệnh `SEND_PRIVATE_MESSAGE`, lưu epoch ms, đẩy `DM_SENT` và `DM_RECEIVED`. |
| **12** | **Nhắn tin riêng: Lịch sử DM** | Tải danh sách tin nhắn giữa 2 người dùng. | **Hoạt động thật** | `ClientHandler.java:1890`, `DirectMessageDAO.java:80` | Lệnh `GET_DM_HISTORY`, phân trang theo `beforeId` hoặc limit 50 tin. |
| **13** | **Nhắn tin riêng: Sửa / Xóa DM** | Sửa/xóa tin nhắn riêng tư của chính mình. | **Hoạt động thật** | `ClientHandler.java:1900`, `DirectMessageDAO.java:160` | Sửa nội dung hoặc xóa bản ghi trong `direct_messages`, đẩy sự kiện cho người đối diện. |
| **14** | **Phòng chat: Tạo phòng** | Tạo phòng mới, gán người tạo làm `OWNER`, tạo kênh `#chung`. | **Hoạt động thật** | `ClientHandler.java:230`, `RoomDAO.java:90` | Lưu bảng `rooms`, `room_members` (role OWNER), bảng `channels` (kênh chung). |
| **15** | **Phòng chat: Đổi tên / Mô tả** | OWNER hoặc ADMIN cập nhật thông tin phòng. | **Hoạt động thật** | `ClientHandler.java:1694`, `ClientHandler.java:1764` | Kiểm tra role DB, lưu DB, broadcast `ROOM_RENAMED`, `ROOM_DESC_UPDATED`. |
| **16** | **Phòng chat: Xóa / Giải tán phòng** | Chỉ OWNER mới có quyền giải tán phòng chat. | **Hoạt động thật** | `ClientHandler.java:1727`, `RoomDAO.java:210` | Xóa CASCADE các kênh, tin nhắn, thành viên; đá toàn bộ client đang mở phòng ra ngoài. |
| **17** | **Phòng chat: Chuyển quyền Chủ** | OWNER chuyển quyền sở hữu phòng cho thành viên khác. | **Hoạt động thật** | `ClientHandler.java:1791`, `RoomDAO.java:250` | OWNER cũ thành ADMIN/MEMBER, người nhận thành OWNER; broadcast toàn phòng. |
| **18** | **Phòng chat: Bổ nhiệm Phó nhóm** | OWNER chỉ định hoặc hạ quyền ADMIN/MEMBER. | **Hoạt động thật** | `ClientHandler.java:1830`, `RoomDAO.java:706` | Cập nhật cột `role` trong `room_members`, cập nhật tức thì danh sách thành viên. |
| **19** | **Phòng chat: Mời thành viên** | Thêm thành viên vào phòng qua username hoặc userId. | **Hoạt động thật** | `ClientHandler.java:1210`, `RoomDAO.java:140` | Ghi bản ghi `room_members`, gửi `ROOM_INVITATION` hoặc cập nhật danh sách phòng. |
| **20** | **Phòng chat: Xóa (Kick) thành viên**| OWNER xóa bất kỳ ai; ADMIN chỉ xóa MEMBER. | **Hoạt động thật** | `ClientHandler.java:1255`, `RoomDAO.java:180` | Kiểm tra role chặt chẽ, xóa khỏi DB, gửi `OK\|LEAVE_ROOM` buộc client mục tiêu thoát phòng. |
| **21** | **Phòng chat: Rời phòng** | Thành viên tự rời phòng; OWNER không thể rời nếu chưa chuyển quyền. | **Hoạt động thật** | `ClientHandler.java:490`, `RoomDAO.java:180` | Nếu OWNER gọi LEAVE_ROOM sẽ bị chặn yêu cầu chuyển quyền trước. |
| **22** | **Kênh (Channels): Danh sách kênh** | Tải danh sách kênh thuộc phòng hiện tại. | **Hoạt động thật** | `ClientHandler.java:756`, `ChannelDAO.java` | Lệnh `LIST_CHANNELS`, trả về danh sách các kênh trong phòng. |
| **23** | **Kênh: Tạo kênh văn bản** | OWNER/ADMIN tạo kênh mới với tên duy nhất trong phòng. | **Hoạt động thật** | `ClientHandler.java:710`, `ChannelDAO.java:40` | Lưu bảng `channels`. Kiểm tra trùng lặp tên, độ dài tối đa 50 ký tự. |
| **24** | **Kênh: Đổi tên kênh** | OWNER/ADMIN đổi tên kênh (trừ kênh hệ thống đặc biệt). | **Hoạt động thật** | `ClientHandler.java:830`, `ChannelDAO.java:80` | Kiểm tra quyền, cập nhật DB, phát `CHANNEL_RENAMED` cho toàn phòng. |
| **25** | **Kênh: Xóa kênh** | OWNER/ADMIN xóa kênh. Không cho xóa kênh `#chung` hoặc kênh duy nhất. | **Hoạt động thật** | `ClientHandler.java:878`, `ChannelDAO.java:110` | Bắt buộc giữ lại tối thiểu 1 kênh, chặn xóa kênh `#chung`. |
| **26** | **Kênh thoại (Voice Channel)** | Đàm thoại âm thanh qua mạng (VoIP). | **Mô phỏng UI** | `VoiceChannelView.tsx` | Chỉ có giao diện nhấp nháy âm lượng giả lập; **không có WebRTC/UDP truyền tiếng**. |
| **27** | **Kênh diễn đàn (Forum)** | Đăng bài viết chia sẻ, thảo luận theo chủ đề và bình luận. | **Chỉ Client-side** | `ForumChannelView.tsx:49` | Lưu bài viết vào `localStorage` của trình duyệt hiện tại. Server không có API cho forum. |
| **28** | **Tin nhắn phòng: Gửi tin** | Gửi tin nhắn vào kênh cụ thể, lưu DB, broadcast cho phòng. | **Hoạt động thật** | `ClientHandler.java:520`, `MessageDAO.java` | Lưu bảng `messages` (kèm `channel_id`), phát realtime cho thành viên trong phòng. |
| **29** | **Tin nhắn phòng: Sửa tin** | Người gửi sửa nội dung tin nhắn của chính mình. | **Hoạt động thật** | `ClientHandler.java:1620`, `MessageDAO.java:370`| Cập nhật `content`, đánh dấu `is_edited = TRUE`, phát `MESSAGE_EDITED`. |
| **30** | **Tin nhắn phòng: Xóa tin** | Người gửi tự xóa; OWNER/ADMIN có quyền xóa tin của người khác. | **Hoạt động thật** | `ClientHandler.java:1664`, `MessageDAO.java:405`| Kiểm tra quyền chính chủ hoặc quyền quản trị; xóa khỏi DB, phát `MESSAGE_DELETED`. |
| **31** | **Tin nhắn phòng: Phân trang cũ**| Tải thêm lịch sử tin nhắn cũ hơn (`beforeId`). | **Hoạt động thật** | `ClientHandler.java:1876`, `MessageDAO.java:280`| Lệnh `HISTORY_PAGE`, truy vấn SQL phân trang có kiểm tra quyền thành viên. |
| **32** | **Đính kèm Tệp tin & Ảnh** | Gửi hình ảnh, file PDF, file nén vào đoạn chat. | **Hoạt động hỗn hợp** | `UiBridgeServer.java:2713`, `attachmentUtils.ts`| File lưu tại máy chạy Bridge, tin nhắn chứa token `[ATTACH:url|name|size|type]`. |
| **33** | **Nhãn dán Sticker & Emoji** | Chọn biểu tượng cảm xúc, sticker bộ mèo/cáo/thỏ gửi vào chat. | **Hoạt động thật** | `EmojiStickerPicker.tsx`, `stickerData.ts` | Mã hóa dạng token `[STICKER:id|name|url]`, render block sticker trực quan trên mọi client. |
| **34** | **Phản ứng tin nhắn (Reactions)** | Thả cảm xúc 👍, ❤️, 😂 vào từng tin nhắn. | **Chỉ Client-side** | `reactionManager.ts:23`, `ChatMessageList.tsx` | Lưu vào `localStorage`; các client khác không nhận được phản ứng này. |
| **35** | **Ghim tin nhắn (Pins)** | Ghim các tin nhắn quan trọng trong kênh. | **Chỉ Client-side** | `ChatCenter.tsx:261` | Lưu vào `localStorage` trình duyệt; không đồng bộ trên server. |
| **36** | **Tìm kiếm tin nhắn nội bộ** | Lọc tin nhắn đang hiển thị theo từ khóa hoặc tên người gửi. | **Hoạt động thật** | `ChatCenter.tsx:311` | Lọc tức thì trên mảng tin nhắn đang có trong bộ nhớ của client. |

---

## 3. NGHIỆP VỤ & MA TRẬN PHÂN QUYỀN THỰC TẾ

### 3.1. Ma trận phân quyền đối chiếu 3 tầng (Database, ChatServer TCP, Frontend UI)

| Hành động / Quyền hạn | Chủ phòng (OWNER) | Phó nhóm (ADMIN) | Thành viên (MEMBER) | Người ngoài phòng | Đối chiếu Server TCP | Đối chiếu UI Web | Ghi chú & Rủi ro |
|:---|:---:|:---:|:---:|:---:|:---|:---|:---|
| **Xem danh sách phòng** | Cho phép | Cho phép | Cho phép | Cho phép | `LIST_ROOMS` trả về các phòng công khai & phòng đã tham gia | Hiển thị trên thanh Rail | Nhất quán |
| **Vào phòng (Join Room)** | Cho phép | Cho phép | Cho phép | Cho phép (nếu public) | `JOIN_ROOM` kiểm tra phòng tồn tại | Bấm vào server icon | Nhất quán |
| **Đổi tên phòng (Rename Room)** | **Cho phép** | **Cho phép** | Bị từ chối | Bị từ chối | `ClientHandler:1706` kiểm tra `OWNER` hoặc `ADMIN` | Ẩn với MEMBER | Nhất quán |
| **Cập nhật mô tả phòng** | **Cho phép** | **Cho phép** | Bị từ chối | Bị từ chối | `ClientHandler:1771` kiểm tra `OWNER` hoặc `ADMIN` | Ẩn với MEMBER | Nhất quán |
| **Giải tán / Xóa phòng** | **Cho phép** | **Bị từ chối** | Bị từ chối | Bị từ chối | `ClientHandler:1742` kiểm tra chỉ `OWNER` | Chỉ hiện cho OWNER | Rất an toàn, có xác nhận |
| **Chuyển quyền Chủ phòng** | **Cho phép** | **Bị từ chối** | Bị từ chối | Bị từ chối | `ClientHandler:1798` kiểm tra chỉ `OWNER` | Chỉ hiện cho OWNER | Nhất quán |
| **Bổ nhiệm / Hạ quyền (Role)** | **Cho phép** | **Bị từ chối** | Bị từ chối | Bị từ chối | `ClientHandler:1838` kiểm tra chỉ `OWNER` | Chỉ hiện cho OWNER | Rất chuẩn xác |
| **Tạo kênh mới (Create Channel)**| **Cho phép** | **Cho phép** | Bị từ chối | Bị từ chối | `ClientHandler:723` kiểm tra `OWNER` hoặc `ADMIN` | Ẩn nút `+` với MEMBER | Nhất quán |
| **Đổi tên kênh (Rename Channel)**| **Cho phép** | **Cho phép** | Bị từ chối | Bị từ chối | `ClientHandler:848` kiểm tra `OWNER` hoặc `ADMIN` | Ẩn với MEMBER | Nhất quán |
| **Xóa kênh (Delete Channel)** | **Cho phép** | **Cho phép** | Bị từ chối | Bị từ chối | `ClientHandler:885` kiểm tra `OWNER` hoặc `ADMIN` | Ẩn với MEMBER | Chặn xóa kênh `#chung` |
| **Mời người vào phòng** | **Cho phép** | **Cho phép** | **Cho phép** | Bị từ chối | `INVITE_ROOM` cho phép thành viên phòng mời | Nút mời bạn bè | Mọi member đều mời được |
| **Xóa (Kick) thành viên** | **Toàn quyền** | **Chỉ xóa MEMBER** | Bị từ chối | Bị từ chối | `ClientHandler:1266-1288` chặn ADMIN kick ADMIN/OWNER | Ẩn menu kick không hợp lệ | Đã bảo vệ chặt chẽ trên Server |
| **Tự rời phòng (Leave Room)** | **Bị từ chối\*** | **Cho phép** | **Cho phép** | N/A | `ClientHandler:490` chặn OWNER rời nếu chưa chuyển quyền | Nút "Rời phòng" | \*OWNER phải chuyển quyền trước |
| **Gửi tin nhắn kênh** | Cho phép | Cho phép | Cho phép | Bị từ chối | `ClientHandler:520` kiểm tra đã join phòng & kênh | Ô nhập tin nhắn | Nhất quán |
| **Sửa tin nhắn của mình** | Cho phép | Cho phép | Cho phép | Bị từ chối | `ClientHandler:1620` chỉ người gửi mới được sửa | Icon sửa tin nhắn | Nhất quán |
| **Xóa tin nhắn của mình** | Cho phép | Cho phép | Cho phép | Bị từ chối | `ClientHandler:1677` cho phép tác giả xóa | Icon xóa tin nhắn | Nhất quán |
| **Xóa tin nhắn người khác** | **Cho phép** | **Cho phép** | Bị từ chối | Bị từ chối | `ClientHandler:1676` kiểm tra `OWNER` hoặc `ADMIN` | Nút xóa tin của người khác | Quản trị viên kiểm duyệt được |
| **Xem lịch sử tin nhắn** | Cho phép | Cho phép | Cho phép | Bị từ chối | `ClientHandler:1885` kiểm tra là thành viên phòng | Cuộn tin nhắn | Đã chống truy cập trái phép bằng ID |

### 3.2. Đánh giá kiểm tra bảo mật truy cập trái quyền (ID manipulation & Bypass)
- **Tấn công thay đổi ID phòng / ID tin nhắn:** Trong lệnh phân trang `HISTORY_PAGE`, Server đã có bước kiểm tra:
  ```java
  if (!server.getRoomService().isMember(roomId, user.getId())) {
      sendError(ProtocolErrorCode.PERMISSION_DENIED, "Bạn không phải là thành viên của phòng này.");
      return;
  }
  ```
  => Người dùng không thể gửi request chứa `roomId` của phòng khác để đọc lén tin nhắn nếu chưa tham gia phòng đó.
- **Tấn công kick trái quyền:** Khi một `ADMIN` cố tình gửi gói tin raw Socket để kick một `ADMIN` khác hoặc kick `OWNER`, server kiểm tra tại dòng 1280-1289 và chủ động trả mã `PERMISSION_DENIED`.

---

## 4. DỮ LIỆU, LỊCH SỬ & TÍNH BỀN VỮNG

### 4.1. Lưu trữ và phân trang tin nhắn (Message Pagination)
- **Cơ chế lưu trữ:** Tin nhắn kênh lưu vào bảng `messages (id, room_id, channel_id, sender_id, content, is_edited, sent_at)`. Tin nhắn riêng lưu vào bảng `direct_messages (id, sender_id, recipient_id, content, sent_at_epoch_ms, created_at)`.
- **Cơ chế phân trang:**
  - Client gửi yêu cầu phân trang `loadMoreHistory(roomId, beforeId, limit)`.
  - Server thực hiện truy vấn:
    ```sql
    SELECT m.*, u.username, u.display_name 
    FROM messages m JOIN users u ON m.sender_id = u.id 
    WHERE m.channel_id = ? AND m.id < ? 
    ORDER BY m.id DESC LIMIT ?
    ```
  - Dữ liệu được đảo ngược lại thứ tự thời gian tăng dần trước khi render lên UI, giúp giữ nguyên vị trí cuộn mượt mà của người dùng (không bị giật màn hình).

### 4.2. Tính nhất quán khi Sửa và Xóa (Hard Delete vs Soft Delete)
- **Sửa tin nhắn:** Cột `is_edited` được cập nhật thành `TRUE`. Giao diện hiển thị nhãn `(đã chỉnh sửa)` rõ ràng.
- **Xóa tin nhắn (Nguy cơ mất dữ liệu):**
  - Hệ thống sử dụng **Xóa vĩnh viễn (Hard Delete)** trực tiếp:
    ```sql
    DELETE FROM messages WHERE id = ?
    ```
  - **Hệ quả:** Dữ liệu tin nhắn bị xóa sạch khỏi cơ sở dữ liệu ngay lập tức. Không có thùng rác, không có lịch sử chỉnh sửa (audit log), và không có cơ chế khôi phục nếu quản trị viên vô tình bấm nhầm.

### 4.3. Chuyển phòng, Tải lại trang (F5) và Khôi phục phiên
- Khi nhấn F5 (Reload):
  1. Frontend gọi `chatBridge.getSession()` -> Cầu nối kiểm tra session cookie `DISCORD_SESSION`.
  2. Frontend gọi `chatBridge.getInitialState()` -> Lấy lại toàn bộ danh sách phòng, kênh, thành viên, bạn bè và tin nhắn của kênh hiện tại.
  3. Luồng sự kiện SSE được mở lại tự động.
- **Trải nghiệm:** Không bị mất trạng thái đăng nhập, dữ liệu tải lại đầy đủ từ Database PostgreSQL.

---

## 5. THỜI GIAN THỰC & CÁC TRƯỜNG HỢP BIÊN (EDGE CASES)

### 5.1. Kiểm tra kịch bản đa tài khoản / Đa tab
1. **Tin nhắn mới đến khi đang mở phòng khác:**
   - Hệ thống phát sự kiện `NEW_MESSAGE`. Nếu tin nhắn thuộc phòng khác, hook `useRoomUnread.ts` tính toán số lượng tin chưa đọc và hiển thị chấm đỏ (badge unread) trên biểu tượng phòng ở thanh Server Rail bên trái.
2. **Bị Kick khi đang mở phòng:**
   - Server gửi gói tin `OK|LEAVE_ROOM|roomId` trực tiếp tới socket của client bị kick và thông báo hệ thống `SYSTEM|Bạn đã bị... mời ra khỏi phòng`.
   - `UiBridgeServer` nhận lệnh, dọn dẹp cache `currentRoomId = null`, gửi sự kiện SSE `ROOM_KICKED` về trình duyệt.
   - Trình duyệt tự động đưa người dùng về màn hình sảnh / danh sách bạn bè mà không bị treo ứng dụng.
3. **Phòng bị giải tán (Delete Room) khi đang chat:**
   - Server phát `ROOM_DELETED|roomId` cho toàn bộ client trong phòng.
   - Các client đang mở phòng đó lập tức được reset về trạng thái chưa chọn phòng, phòng biến mất khỏi thanh danh sách bên trái ngay lập tức.
4. **Mất kết nối mạng (Network Drop):**
   - Lớp giao thức có cơ chế Heartbeat `PING` mỗi 15 giây. Sau 40 giây không có `PONG`, kết nối được đánh dấu ngắt.
   - Giao diện có thanh thông báo trạng thái mạng (`STREAM_STATUS`) hiển thị cảnh báo màu vàng và tự động kết nối lại khi có mạng trở lại.

### 5.2. Trường hợp biên về dữ liệu (Edge Cases)
- **Ký tự đặc biệt trong tin nhắn:** Do sử dụng mã hóa Base64 UTF-8 cho toàn bộ nội dung người dùng nhập (`ProtocolHandler.encode`), các tin nhắn chứa ký tự xuống dòng `\n`, dấu gạch đứng `|`, emoji phức tạp (👨‍👩‍👧‍👦, 🦊, 🌸), ký tự HTML `<script>` đều không làm hỏng cấu trúc khung truyền TCP và chống được tấn công XSS cơ bản.

---

## 6. GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX)

### 6.1. Đồng bộ giao diện Sáng / Tối (Light & Dark Theme)
- Đã được chuẩn hóa toàn diện trên các thành phần phức tạp:
  - Menu ngữ cảnh chuột phải phòng chat.
  - Cửa sổ hồ sơ người dùng thu nhỏ và chi tiết.
  - Hộp thoại Cài đặt phòng (3 tab: Tổng quan, Kênh, Thành viên & Vai trò).
  - Tương phản văn bản đạt chuẩn: Màu nền `#F2F3F5` đi kèm chữ xám đậm `#2E3035` / `#4E5058`, không còn hiện tượng chữ trắng chìm trên nền sáng.
- Sử dụng bảng màu xanh ngọc Huddle chuẩn (`--accent`: `#2DD4BF` dark, `#0F766E` light), không dùng màu tím Discord `#5865F2`.

### 6.2. Trải nghiệm soạn thảo & Khung chat
- Khung nhập tin nhắn đã được nâng cấp thành `<textarea>` tự co giãn chiều cao (auto-grow tối đa 160px).
- Hỗ trợ đầy đủ phím tắt:
  - `Shift + Enter`: Xuống dòng tự nhiên.
  - `Enter`: Gửi tin nhắn tức thì (hoặc đảo ngược lại nếu tắt trong Cài đặt).
- Định dạng tin nhắn giữ nguyên ngắt dòng nhờ thuộc tính CSS `white-space: pre-wrap; word-break: break-word;`.
- Icon avatar của người gửi trong danh sách tin nhắn đồng bộ 100% với icon avatar tùy chỉnh và màu nền ở góc dưới thanh bên trái.

### 6.3. Giới hạn trên thiết bị di động (Responsive Layout)
- Bố cục hiện tại được thiết kế tối ưu cho **màn hình máy tính để bàn (Desktop viewport 1920x1080 hoặc >= 1024px)**.
- Khi co màn hình xuống dưới 768px (Mobile), thanh Server Rail, Danh sách kênh và Khung chat chưa có menu Drawer thu gọn linh hoạt (Sidebar chiếm diện tích lớn, khung chat bị co hẹp).

---

## 7. CHẤT LƯỢNG VẬN HÀNH & KIẾN TRÚC HỆ THỐNG

### 7.1. Cấu hình triển khai & Docker
- Dự án đã có sẵn `Dockerfile`, `docker-compose` và script `start.sh` hỗ trợ triển khai container hóa cả Java Backend, PostgreSQL và Frontend tĩnh.
- Cấu hình kết nối DB hỗ trợ biến môi trường `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.
- Có kịch bản tự động chạy migration `DatabaseMigration.java` tạo đầy đủ bảng và cột khi khởi động.

### 7.2. Nguy cơ tài nguyên và Bộ nhớ (Resource Leaks)
1. **Quản lý kết nối SSE (`sseClients` trong `UiBridgeServer`):**
   - Danh sách `sseClients` lưu các kết nối `PrintWriter`. Nếu người dùng mở nhiều tab hoặc đóng tab đột ngột, cần đảm bảo các kết nối hỏng được dọn dẹp khi heartbeat phát hiện lỗi ghi (đã có khối try-catch loại bỏ writer lỗi).
2. **Bộ đệm lịch sử (`messageCache` & `historyPageBuffer`):**
   - Cần cơ chế giới hạn dung lượng bộ đệm trong phiên (`CopyOnWriteArrayList`) để tránh tràn RAM nếu phòng chat hoạt động liên tục với hàng chục nghìn tin nhắn.

---

## 8. DANH MỤC LỖI & NGUY CƠ (PHÂN CẤP MỨC ĐỘ)

### 🔴 Mức độ Nghiêm trọng (Critical)
*Không phát hiện lỗi gây sập server (crash process) hoặc lộ lỗ hổng Remote Code Execution.*

---

### 🟠 Mức độ Cao (High) - Tính năng giả lập chưa có Backend
1. **Lỗi H-01: Kênh Diễn đàn (Forum) chỉ lưu cục bộ ở máy người đăng**
   - **Hiện tượng:** Người dùng tạo bài viết hoặc bình luận trong kênh Diễn đàn, nhưng chỉ lưu trong `localStorage` của trình duyệt (`discord_mini_forum_posts_v1`). Người dùng khác vào cùng kênh đó sẽ thấy trống rỗng.
   - **Vị trí mã nguồn:** [`ForumChannelView.tsx:49-60`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/frontend/src/components/chat/ForumChannelView.tsx#L49-L60).
   - **Ảnh hưởng:** Tính năng diễn đàn không hoạt động qua mạng.
   - **Hướng khắc phục:** Hoặc bổ sung bảng `forum_posts` và `forum_comments` trong DB và API tương ứng trên ChatServer, hoặc tạm thời ẩn loại kênh Forum nếu không kịp làm backend.

2. **Lỗi H-02: Kênh Thoại (Voice Channel) hoàn toàn là Mockup**
   - **Hiện tượng:** Bấm vào kênh thoại chỉ hiển thị giao diện với `Math.random()` giả lập người nói chuyện, không có kết nối âm thanh socket WebRTC/UDP.
   - **Vị trí mã nguồn:** [`VoiceChannelView.tsx:27-58`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/frontend/src/components/chat/VoiceChannelView.tsx#L27-L58).
   - **Ảnh hưởng:** Gây hiểu nhầm là tính năng gọi thoại đã hoàn thiện khi báo cáo đồ án.
   - **Hướng khắc phục:** Cần ghi chú rõ trong báo cáo đồ án là "Giao diện mô phỏng kênh thoại" hoặc phát triển thêm module Socket âm thanh.

3. **Lỗi H-03: Thả cảm xúc (Reactions) và Ghim tin (Pins) không đồng bộ qua mạng**
   - **Hiện tượng:** Người dùng A thả emoji vào tin nhắn hoặc ghim tin nhắn thì chỉ trình duyệt máy A thấy. Máy B mở cùng phòng không thấy cảm xúc hay tin ghim đó.
   - **Vị trí mã nguồn:** [`reactionManager.ts:23`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/frontend/src/components/chat/reactionManager.ts#L23), [`ChatCenter.tsx:261`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/frontend/src/components/ChatCenter.tsx#L261).
   - **Ảnh hưởng:** Thiếu tính tương tác thời gian thực giữa các thành viên.
   - **Hướng khắc phục:** Bổ sung lệnh `MESSAGE_REACT` và `MESSAGE_PIN` vào giao thức Socket TCP của ChatServer.

---

### 🟡 Mức độ Trung bình (Medium) - Nghiệp vụ & Dữ liệu
4. **Lỗi M-01: File đính kèm lưu tại máy chạy Bridge, không phân tán**
   - **Hiện tượng:** Khi upload file, tệp được lưu vào thư mục cục bộ của tiến trình `UiBridgeServer`. Nếu hệ thống triển khai nhiều máy client khác nhau qua mạng LAN, người dùng ở máy khác click vào link tải file `/api/files/download/...` sẽ trỏ về Bridge của chính họ và bị lỗi 404 (do file nằm ở máy của người gửi).
   - **Vị trí mã nguồn:** [`UiBridgeServer.java:2740-2755`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/ChatClient/src/com/discordmini/client/bridge/UiBridgeServer.java#L2740-L2755).
   - **Hướng khắc phục:** Chuyển API upload/download file về chạy tập trung trên ChatServer hoặc dùng chung một file server / shared directory.

5. **Lỗi M-02: Thiếu Soft Delete và Audit Log cho tin nhắn**
   - **Hiện tượng:** Xóa tin nhắn là mất vĩnh viễn (`DELETE FROM messages WHERE id = ?`). Không lưu vết ai đã xóa (chính chủ hay admin kiểm duyệt xóa).
   - **Vị trí mã nguồn:** [`MessageDAO.java:407`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/Chatserver/src/com/discordmini/server/dao/MessageDAO.java#L407).
   - **Hướng khắc phục:** Chuyển sang thêm cột `is_deleted BOOLEAN DEFAULT FALSE` và hiển thị *"[Tin nhắn này đã bị xóa]"*.

6. **Lỗi M-03: Thông tin tùy biến hồ sơ (Avatar Icon, Bio, Color) chưa lưu vào Database**
   - **Hiện tượng:** Khi người dùng đổi màu đại diện, icon avatar (con cáo, con chó...), bio thì chỉ lưu vào `localStorage` máy đó. Người dùng khác nhìn vào hồ sơ của bạn vẫn thấy avatar chữ cái mặc định và bio trống.
   - **Vị trí mã nguồn:** [`UserSettingsModal.tsx:102`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/frontend/src/components/UserSettingsModal.tsx#L102), [`schema.sql:6-13`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/schema.sql#L6-L13).
   - **Hướng khắc phục:** Thêm các cột `bio TEXT`, `avatar_icon VARCHAR(50)`, `avatar_color VARCHAR(20)` vào bảng `users` trong database.

---

### 🟢 Mức độ Thấp (Low) - Giao diện & Tiện ích nhỏ
7. **Lỗi L-01: Giao diện chưa co giãn mượt trên màn hình điện thoại (Mobile Responsive)**
   - **Hiện tượng:** Dưới độ phân giải 768px, thanh bên chiếm diện tích, khung chat bị ép hẹp.
   - **Vị trí mã nguồn:** [`discord.css`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/frontend/src/styles/discord.css).
   - **Hướng khắc phục:** Bổ sung CSS media queries ẩn thanh sidebar và thêm nút hamburger mở drawer.

8. **Lỗi L-02: Không hỗ trợ URL Routing trực tiếp (Deep Linking)**
   - **Hiện tượng:** Trình duyệt không dùng React Router (URL luôn là `/`), không thể copy đường link trực tiếp vào một phòng hoặc kênh cụ thể (ví dụ: `/channels/12/34`).
   - **Vị trí mã nguồn:** [`App.tsx`](file:///c:/Users/Admin/Desktop/LapTrinhMang/Do%20an%20cuoi%20ky/DA_LapTrinhMangMayTinh/frontend/src/App.tsx).
   - **Hướng khắc phục:** Cân nhắc tích hợp React Router DOM nếu muốn hỗ trợ chia sẻ link phòng.

---

## 9. KẾT QUẢ BUILD, PHẦN CHƯA KIỂM CHỨNG & QUYẾT ĐỊNH CẦN CHỐT

### 9.1. Kết quả Build và Biên dịch
- **Frontend React/TypeScript:**
  - Lệnh kiểm tra: `npm run build` tại thư mục `frontend/`.
  - Kết quả: **PASS 100% (Không có bất kỳ lỗi TypeScript hay Lint nào)**. Build ra thư mục `dist/` hoàn chỉnh trong 649ms.
- **Java Backend & Client:**
  - Mã nguồn sử dụng cú pháp chuẩn Java 17 / 21+ (`switch expression`, `records`, `var`).
  - Đã có thư mục `classes/` được biên dịch trước đó.

### 9.2. Phần chưa kiểm chứng trong đợt rà soát này
1. **Kiểm thử tải đồng thời hàng nghìn kết nối (Stress Test):** Chưa chạy benchmark tải lớn trên máy chủ do tuân thủ yêu cầu chỉ rà soát tĩnh, không gây tải hay thay đổi dữ liệu môi trường.
2. **Khả năng tương thích trên các trình duyệt Safari / WebKit cũ:** Cần kiểm tra thực tế xem các thuộc tính flexbox và backdrop-filter có hiển thị hoàn hảo trên iOS Safari hay không.

### 9.3. Các quyết định nghiệp vụ cần bạn xác nhận
1. **Đối với tính năng Kênh Thoại (Voice) và Kênh Diễn đàn (Forum):**
   - *Lựa chọn A:* Giữ nguyên như hiện tại và ghi rõ trong báo cáo đồ án: "Kênh thoại và diễn đàn là tính năng mở rộng thử nghiệm giao diện (Mockup UI Prototype)".
   - *Lựa chọn B:* Ẩn 2 loại kênh này khỏi giao diện tạo kênh (`CreateChannelModal.tsx`) để ứng dụng 100% chỉ gồm các tính năng hoạt động thật qua Socket.
2. **Đối với tính năng Thả cảm xúc (Reactions) và Ghim tin (Pins):**
   - Có cần thiết phải bổ sung bảng Database và đồng bộ Socket TCP cho mọi người cùng thấy hay chỉ dừng lại ở mức client-side cho đồ án?
3. **Đối với chính sách Xóa tin nhắn:**
   - Bạn muốn giữ cơ chế xóa cứng (Hard Delete) hiện tại hay muốn nâng cấp lên xóa mềm (Soft Delete) hiện chữ *"[Tin nhắn đã bị thu hồi]"*?

---

## 10. LỘ TRÌNH ƯU TIÊN HOÀN THIỆN ĐỒ ÁN

### 🎯 Nhóm 1: Các lỗi cần xử lý ngay (Ưu tiên cao)
- [ ] **Làm rõ tính năng Mockup:** Thêm thông báo badge hoặc điều chỉnh hiển thị kênh thoại/diễn đàn để khi chấm bài giảng viên không đánh giá là lỗi chưa kết nối.
- [ ] **Đồng bộ hóa Avatar/Bio về Server:** Bổ sung cột `avatar_icon`, `avatar_color`, `bio` vào bảng `users` trong DB và thêm vào API `UPDATE_PROFILE` để khi đăng nhập máy khác vẫn giữ nguyên hình ảnh đại diện.

### 📋 Nhóm 2: Nghiệp vụ cần chốt trước ngày báo cáo (Ưu tiên trung bình)
- [ ] **Chốt chính sách xóa tin nhắn:** Quyết định chọn Soft Delete hay Hard Delete.
- [ ] **Kiểm tra luồng chia sẻ tệp tin:** Đảm bảo khi demo 2 máy khác nhau trong mạng LAN, thư mục upload có thể truy cập được hoặc demo trên cùng máy/máy chủ chung.

### 💡 Nhóm 3: Cải tiến tùy chọn (Nếu còn thời gian)
- [ ] **Đồng bộ Reactions qua Socket TCP:** Thêm gói tin `MESSAGE_REACT|msgId|emoji` để các bạn cùng phòng nhìn thấy emoji nhảy số thời gian thực.
- [ ] **Tối ưu Mobile Responsive:** Thêm nút toggle mở danh sách kênh trên màn hình hẹp.
- [ ] **Âm thanh thông báo (Sound notification):** Bổ sung file âm thanh nhẹ nhàng khi có tin nhắn mới hoặc cuộc gọi đến.

---
*Báo cáo được khởi tạo tự động bởi hệ thống kiểm toán mã nguồn Antigravity.*
