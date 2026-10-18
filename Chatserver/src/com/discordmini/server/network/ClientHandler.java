package com.discordmini.server.network;

import com.discordmini.server.model.Message;
import com.discordmini.server.model.Room;
import com.discordmini.server.model.User;
import com.discordmini.server.protocol.MessageType;
import com.discordmini.server.protocol.ProtocolHandler;
import com.discordmini.server.protocol.ProtocolErrorCode;

import java.io.IOException;
import java.net.Socket;
import java.sql.SQLException;
import java.util.List;

public class ClientHandler implements Runnable {
    private final ClientConnection connection;
    private final ChatServer server;
    private volatile boolean running = true;
    private User user;
    private Integer currentRoomId;
    private Integer currentChannelId;
    /** Request metadata is scoped to the single reader thread for this client. */
    private String activeRequestId;
    private boolean requestFailed;

    private static final int MAX_USERNAME_LENGTH = 50;
    private static final int MAX_DISPLAY_NAME_LENGTH = 100;
    private static final int MAX_ROOM_NAME_LENGTH = 50;
    private static final int MAX_MESSAGE_LENGTH = 5000;

    public ClientHandler(Socket socket, ChatServer server) throws IOException {
        this.connection = new ClientConnection(socket);
        this.server = server;
    }

    public User getUser() { return user; }
    public Integer getCurrentRoomId() { return currentRoomId; }
    public Integer getCurrentChannelId() { return currentChannelId; }
    public void sendPacket(String packet) { connection.send(packet); }
    public boolean isConnected() { return connection != null && connection.isConnected(); }

    @Override
    public void run() {
        try {
            connection.send("WELCOME|" + ProtocolHandler.encode("Discord Mini Chat Server"));
            String line;
            while (running && (line = connection.readLine()) != null) {
                handle(line);
            }
        } catch (IOException e) {
            System.out.println("[DISCONNECT] " + (user != null ? user.getUsername() : "unknown"));
        } finally {
            cleanup();
        }
    }

    private void handle(String line) {
        activeRequestId = null;
        requestFailed = false;
        try {
            String[] parts = ProtocolHandler.split(line);
            activeRequestId = ProtocolHandler.requestId(parts);
            MessageType type = MessageType.valueOf(parts[0]);

            switch (type) {
                case REGISTER -> handleRegister(parts);
                case LOGIN -> handleLogin(parts);
                case LOGOUT -> {
                    leaveCurrentRoom(false);
                    if (user != null) {
                        user.setOnline(false);
                        server.getClientManager().remove(user);
                        broadcastGlobal(
                                "USER_OFFLINE|"
                                        + user.getId()
                                        + "|"
                                        + ProtocolHandler.encode(user.getDisplayName())
                        );
                        user = null;
                    }
                    connection.send("OK|LOGOUT");
                }
                case LIST_ROOMS -> sendRooms();
                case CREATE_ROOM -> handleCreateRoom(parts);
                case JOIN_ROOM -> handleJoinRoom(parts);
                case LEAVE_ROOM -> handleLeaveRoom();
                case SEND_MESSAGE -> handleSendMessage(parts);
                case SEND_PRIVATE_MESSAGE -> handleSendPrivateMessage(parts);
                case GET_HISTORY -> handleHistory();
                case GET_ONLINE_USERS -> sendOnlineUsers();
                case PING -> connection.send("PONG");
                case INVITE_ROOM -> handleInviteRoom(parts);
                case KICK_ROOM -> handleKickRoom(parts);
                case FRIEND_SEARCH -> handleFriendSearch(parts);
                case FRIEND_REQUEST -> handleFriendRequest(parts);
                case FRIEND_PENDING_LIST -> handleFriendPendingList();
                case FRIEND_ACCEPT -> handleFriendAccept(parts);
                case FRIEND_REJECT -> handleFriendReject(parts);
                case FRIEND_LIST -> handleFriendList();
                case EDIT_MESSAGE -> handleEditMessage(parts);
                case DELETE_MESSAGE -> handleDeleteMessage(parts);
                case RENAME_ROOM -> handleRenameRoom(parts);
                case DELETE_ROOM -> handleDeleteRoom(parts);
                case SET_ROOM_DESC -> handleSetRoomDesc(parts);
                case TRANSFER_OWNER -> handleTransferOwner(parts);
                case SET_MEMBER_ROLE -> handleSetMemberRole(parts);
                case HISTORY_PAGE -> handleHistoryPage(parts);
                case CREATE_CHANNEL -> handleCreateChannel(parts);
                case LIST_CHANNELS -> handleListChannels(parts);
                case JOIN_CHANNEL -> handleJoinChannel(parts);
                case UPDATE_PROFILE -> handleUpdateProfile(parts);
                case CHANGE_PASSWORD -> handleChangePassword(parts);
                case FRIEND_REMOVE -> handleFriendRemove(parts);
                case GET_DM_HISTORY -> handleGetDmHistory(parts);
            }
        } catch (Exception e) {
            sendError(
                    classifyError(e),
                    e.getMessage() == null
                            ? "Unknown protocol or server error."
                            : e.getMessage()
            );
        } finally {
            // ACK means the application handler completed successfully; it is
            // not a TCP ACK and does not imply that a recipient read the data.
            if (activeRequestId != null && !requestFailed) {
                connection.send("ACK|" + activeRequestId + "|OK");
            }
            activeRequestId = null;
        }
    }

    private void handleRegister(String[] parts) throws Exception {
        requireArgs(parts, 4);

        String username = ProtocolHandler.decode(parts[1]).trim();
        String password = ProtocolHandler.decode(parts[2]);
        String displayName = ProtocolHandler.decode(parts[3]).trim();

        if (username.isBlank() || username.length() < 3 || username.length() > MAX_USERNAME_LENGTH) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Tên đăng nhập phải có từ 3 đến 50 ký tự.");
            return;
        }

        if (password.isBlank()) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Password không được để trống.");
            return;
        }

        if (displayName.isBlank()
                || displayName.length() > MAX_DISPLAY_NAME_LENGTH) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Tên hiển thị không hợp lệ.");
            return;
        }

        try {
            User created = server.getAuthService().register(
                    username, password, displayName
            );

            if (created == null) {
                sendError(
                        ProtocolErrorCode.USERNAME_TAKEN,
                        "Username đã tồn tại hoặc dữ liệu không hợp lệ."
                );
            } else {
                connection.send(
                        "OK|REGISTERED|"
                                + ProtocolHandler.encode("Đăng ký thành công.")
                );
            }
        } catch (SQLException e) {
            sendError(
                    ProtocolErrorCode.INTERNAL_ERROR,
                    "Lỗi cơ sở dữ liệu khi đăng ký: " + e.getMessage()
            );
        }
    }

    private void handleLogin(String[] parts) {
        requireArgs(parts, 3);

        if (user != null) {
            sendError(
                    ProtocolErrorCode.ALREADY_AUTHENTICATED,
                    "Bạn đã đăng nhập."
            );
            return;
        }

        String username = ProtocolHandler.decode(parts[1]).trim();
        String password = ProtocolHandler.decode(parts[2]);

        if (username.isBlank() || username.length() > MAX_USERNAME_LENGTH) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Username không hợp lệ.");
            return;
        }

        User found;
        try {
            found = server.getAuthService().login(username, password);
        } catch (SQLException e) {
            sendError(
                    ProtocolErrorCode.INTERNAL_ERROR,
                    "Lỗi cơ sở dữ liệu khi đăng nhập: " + e.getMessage()
            );
            return;
        } catch (Exception e) {
            sendError(
                    ProtocolErrorCode.INTERNAL_ERROR,
                    "Lỗi hệ thống khi đăng nhập: " + e.getMessage()
            );
            return;
        }

        if (found == null) {
            sendError(
                    ProtocolErrorCode.AUTH_FAILED,
                    "Sai username hoặc password."
            );
            return;
        }

        // Thao tác kiểm tra và thêm phiên nguyên tử: chỉ chấp nhận một phiên duy nhất
        if (!server.getClientManager().tryAdd(found, this)) {
            sendError(
                    ProtocolErrorCode.ALREADY_ONLINE,
                    "Tài khoản đang được đăng nhập ở nơi khác."
            );
            return;
        }

        user = found;
        user.setOnline(true);

        connection.send(
                "OK|LOGIN|"
                        + user.getId()
                        + "|"
                        + ProtocolHandler.encode(user.getDisplayName())
        );

        broadcastGlobal(
                "USER_ONLINE|"
                        + user.getId()
                        + "|"
                        + ProtocolHandler.encode(user.getDisplayName())
        );
    }

    private void handleCreateRoom(String[] parts) throws Exception {
        requireLogin();

        if (parts.length < 2 || ProtocolHandler.REQUEST_ID_MARKER.equals(parts[1])) {
            sendError(
                    ProtocolErrorCode.INVALID_ROOM_NAME,
                    "Tên phòng không được để trống."
            );
            return;
        }

        String name = ProtocolHandler.decode(parts[1]).trim();

        if (name.isBlank()) {
            sendError(
                    ProtocolErrorCode.INVALID_ROOM_NAME,
                    "Tên phòng không được để trống."
            );
            return;
        }

        if (name.length() > MAX_ROOM_NAME_LENGTH) {
            sendError(
                    ProtocolErrorCode.INVALID_ROOM_NAME,
                    "Tên phòng không được vượt quá 50 ký tự."
            );
            return;
        }

        if (server.getRoomService().existsByName(name)) {
            sendError(
                    ProtocolErrorCode.ROOM_NAME_TAKEN,
                    "Tên phòng đã tồn tại."
            );
            return;
        }

        Room room = server.getRoomService().createRoom(name, user.getId());

        if (room == null) {
            sendError(
                    ProtocolErrorCode.ROOM_NAME_TAKEN,
                    "Tên phòng đã tồn tại."
            );
        } else {
            connection.send(
                    "OK|ROOM_CREATED|"
                            + room.getId()
                            + "|"
                            + ProtocolHandler.encode(room.getName())
            );
            for (ClientHandler client : server.getClientManager().all()) {
                client.sendRooms();
            }
        }
    }

    private void handleJoinRoom(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int roomId = parseId(parts[1], "ID phòng");

        Room room = server.getRoomService().findRoom(roomId);

        if (room == null) {
            sendError(
                    ProtocolErrorCode.ROOM_NOT_FOUND,
                    "Không tìm thấy phòng."
            );
            return;
        }

        // Không thực hiện join lại nếu client đang ở chính phòng đó.
        if (currentRoomId != null && currentRoomId == roomId) {
            sendError(
                    ProtocolErrorCode.INVALID_STATE,
                    "Bạn đang ở trong phòng này."
            );
            return;
        }

        leaveCurrentRoom(false);

        currentRoomId = roomId;
        server.getRoomService().joinRoom(roomId, user.getId());
        room.getMemberIds().add(user.getId());
        server.getRoomManager().join(room, this);

        com.discordmini.server.model.Channel defCh = server.getRoomService().getDefaultChannel(roomId);
        currentChannelId = (defCh != null) ? defCh.getId() : 0;
        String defChName = (defCh != null) ? defCh.getName() : "chung";

        connection.send(
                "OK|JOIN_ROOM|"
                        + roomId
                        + "|"
                        + ProtocolHandler.encode(room.getName())
                        + "|"
                        + currentChannelId
                        + "|"
                        + ProtocolHandler.encode(defChName)
        );

        sendChannels(roomId);
        handleHistory(currentChannelId);

        broadcastRoom(
                "SYSTEM|"
                        + ProtocolHandler.encode(
                                user.getDisplayName() + " đã tham gia phòng."
                        ),
                false
        );

        sendRoomMembers();
        for (ClientHandler c : server.getRoomManager().clientsIn(roomId)) {
            if (c != this) {
                c.sendRoomMembers();
            }
        }
    }

    private void handleLeaveRoom() {
        requireLogin();
        leaveCurrentRoom(true);
    }

    private void handleSendMessage(String[] parts) throws Exception {
        requireLogin();

        if (currentRoomId == null) {
            sendError(
                    ProtocolErrorCode.NOT_IN_ROOM,
                    "Bạn chưa vào phòng."
            );
            return;
        }

        requireArgs(parts, 2);

        // Kiểm tra membership để ngăn gửi tin vào phòng không còn tham gia.
        Room room = server.getRoomService().findRoom(currentRoomId);

        if (room == null || !room.getMemberIds().contains(user.getId())) {
            sendError(
                    ProtocolErrorCode.NOT_IN_ROOM,
                    "Bạn không còn là thành viên của phòng này."
            );
            return;
        }

        int targetChannelId = (currentChannelId != null && currentChannelId > 0) ? currentChannelId : 0;
        String content;

        // Cho phép định dạng SEND_MESSAGE|<channelId>|<content> hoặc SEND_MESSAGE|<content>
        if (parts.length >= 2) {
            String decodedPart1 = ProtocolHandler.decode(parts[1]).trim();
            boolean isChannelId = false;
            try {
                int parsed = Integer.parseInt(decodedPart1);
                targetChannelId = parsed;
                isChannelId = true;
            } catch (NumberFormatException ignored) {}

            if (isChannelId) {
                if (parts.length >= 3 && !ProtocolHandler.REQUEST_ID_MARKER.equals(parts[2])) {
                    content = ProtocolHandler.decode(parts[2]).trim();
                } else {
                    content = "";
                }
            } else {
                content = decodedPart1;
            }
        } else {
            content = "";
        }

        if (content.isBlank()) {
            sendError(
                    ProtocolErrorCode.BAD_REQUEST,
                    "Nội dung tin nhắn không được để trống."
            );
            return;
        }

        if (content.length() > MAX_MESSAGE_LENGTH) {
            sendError(
                    ProtocolErrorCode.BAD_REQUEST,
                    "Tin nhắn không được vượt quá 5000 ký tự."
            );
            return;
        }

        if (targetChannelId <= 0) {
            com.discordmini.server.model.Channel def = server.getRoomService().getDefaultChannel(currentRoomId);
            if (def != null) {
                targetChannelId = def.getId();
            }
        }

        Message message = server.getChatService().save(
                currentRoomId, targetChannelId, user, content
        );

        String packet = "NEW_MESSAGE|"
                + message.getId() + "|"
                + message.getRoomId() + "|"
                + message.getChannelId() + "|"
                + ProtocolHandler.encode(message.getSender()) + "|"
                + ProtocolHandler.encode(message.getContent()) + "|"
                + ProtocolHandler.encode(message.getTimestamp());

        broadcastRoom(packet, true);
    }

    private void handleSendPrivateMessage(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        try {
            String targetParam = ProtocolHandler.decode(parts[1]).trim();
            String content = ProtocolHandler.decode(parts[2]).trim();

            if (content.isBlank()) {
                sendError(ProtocolErrorCode.BAD_REQUEST, "Nội dung tin nhắn không được để trống.");
                return;
            }

            if (content.length() > MAX_MESSAGE_LENGTH) {
                sendError(ProtocolErrorCode.BAD_REQUEST, "Tin nhắn không được vượt quá 5000 ký tự.");
                return;
            }

            User targetUser = null;
            if (targetParam.matches("\\d+")) {
                int targetUserId = Integer.parseInt(targetParam);
                targetUser = server.getUserDAO().findById(targetUserId);
            } else {
                targetUser = server.getUserDAO().findUser(targetParam);
            }

            if (targetUser == null) {
                sendError(ProtocolErrorCode.USER_NOT_FOUND, "Không tìm thấy người dùng nhận tin nhắn.");
                return;
            }

            if (targetUser.getId() == user.getId()) {
                sendError(ProtocolErrorCode.INVALID_RECIPIENT, "Không thể tự gửi tin nhắn cho chính mình.");
                return;
            }

            // 1. LƯU VÀO DATABASE (Server là nguồn sự thật)
            var saved = server.getDirectMessageDAO().saveMessage(user.getId(), targetUser.getId(), content);
            if (saved == null) {
                sendError(ProtocolErrorCode.DATABASE_ERROR, "Không thể lưu tin nhắn riêng vào cơ sở dữ liệu.");
                return;
            }

            long messageId = saved.id();
            long epochMs = saved.sentAtEpochMs();
            String senderUsername = user.getUsername() != null ? user.getUsername().trim().toLowerCase() : "";
            String targetUsername = targetUser.getUsername() != null ? targetUser.getUsername().trim().toLowerCase() : "";

            // 2. Gửi phản hồi xác nhận cho người gửi (ACK kèm messageId và epochMs)
            connection.send("DM_SENT|"
                    + messageId + "|"
                    + targetUser.getId() + "|"
                    + ProtocolHandler.encode(targetUsername) + "|"
                    + ProtocolHandler.encode(content) + "|"
                    + epochMs);
            connection.send("PRIVATE_MESSAGE_SENT|" + targetUser.getId());

            // 3. Tìm ClientHandler của đối phương theo username chuẩn hóa (chữ thường) hoặc userId
            ClientHandler recipientHandler = server.getClientManager().findClient(targetUser.getId(), targetUsername);

            // 4. Nếu đối phương online -> gửi sự kiện thời gian thực DM_RECEIVED
            if (recipientHandler != null) {
                String dmPacket = "DM_RECEIVED|"
                        + messageId + "|"
                        + user.getId() + "|"
                        + ProtocolHandler.encode(senderUsername) + "|"
                        + ProtocolHandler.encode(user.getDisplayName()) + "|"
                        + ProtocolHandler.encode(content) + "|"
                        + epochMs + "|"
                        + targetUser.getId() + "|"
                        + ProtocolHandler.encode(targetUsername);
                recipientHandler.connection.send(dmPacket);
            }
        } catch (Exception e) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Lỗi xử lý gửi tin nhắn riêng: " + e.getMessage());
        }
    }

    private void handleHistory() {
        handleHistory(currentChannelId);
    }

    private void handleHistory(Integer channelId) {
        requireLogin();

        if (currentRoomId == null) {
            sendError(
                    ProtocolErrorCode.NOT_IN_ROOM,
                    "Bạn chưa vào phòng."
            );
            return;
        }

        int targetChannelId = (channelId != null && channelId > 0) ? channelId : 0;
        if (targetChannelId <= 0) {
            com.discordmini.server.model.Channel def = server.getRoomService().getDefaultChannel(currentRoomId);
            if (def != null) {
                targetChannelId = def.getId();
            }
        }

        List<Message> history = (targetChannelId > 0)
                ? server.getChatService().channelHistory(targetChannelId, 50)
                : server.getChatService().history(currentRoomId);

        connection.send("HISTORY_BEGIN|" + currentRoomId + "|" + targetChannelId);

        for (Message m : history) {
            connection.send(
                    "HISTORY_ITEM|"
                            + m.getId()
                            + "|"
                            + (m.getChannelId() > 0 ? m.getChannelId() : targetChannelId)
                            + "|"
                            + ProtocolHandler.encode(m.getSender())
                            + "|"
                            + ProtocolHandler.encode(m.getContent())
                            + "|"
                            + ProtocolHandler.encode(m.getTimestamp())
                            + "|"
                            + (m.isEdited() ? "EDITED" : "NORMAL")
            );
        }

        connection.send("HISTORY_END");
    }

    private void handleCreateChannel(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        int roomId = parseId(parts[1], "ID phòng");
        String channelName = ProtocolHandler.decode(parts[2]).trim();

        if (channelName.isBlank()) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Tên kênh không được để trống.");
            return;
        }

        if (channelName.length() > 50) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Tên kênh không được vượt quá 50 ký tự.");
            return;
        }

        // Quyền: Chỉ OWNER hoặc ADMIN
        String role = server.getRoomService().getMemberRole(roomId, user.getId());
        if (role == null || (!"OWNER".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role))) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Chỉ chủ phòng hoặc quản trị viên mới có quyền tạo kênh.");
            return;
        }

        // Kiểm tra trùng tên trong phòng
        if (server.getRoomService().getChannelDAO().existsByName(roomId, channelName)) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Tên kênh '" + channelName + "' đã tồn tại trong phòng này.");
            return;
        }

        com.discordmini.server.model.Channel channel = server.getRoomService().createChannel(roomId, channelName, user.getId());
        if (channel == null) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Không thể tạo kênh.");
            return;
        }

        connection.send(
                "OK|CHANNEL_CREATED|"
                        + roomId
                        + "|"
                        + channel.getId()
                        + "|"
                        + ProtocolHandler.encode(channel.getName())
        );

        // Đồng bộ danh sách kênh cho tất cả client trong phòng
        for (ClientHandler c : server.getRoomManager().clientsIn(roomId)) {
            c.sendChannels(roomId);
        }
    }

    private void handleListChannels(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int roomId = parseId(parts[1], "ID phòng");
        if (!server.getRoomService().isMember(roomId, user.getId())) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Bạn không phải thành viên của phòng này.");
            return;
        }

        sendChannels(roomId);
    }

    public void sendChannels(int roomId) {
        if (user == null || roomId <= 0) return;
        List<com.discordmini.server.model.Channel> channels = server.getRoomService().listChannels(roomId, user.getId());
        StringBuilder sb = new StringBuilder("CHANNELS|").append(roomId);
        for (com.discordmini.server.model.Channel ch : channels) {
            sb.append('|')
                    .append(ch.getId())
                    .append(',')
                    .append(ProtocolHandler.encode(ch.getName()));
        }
        connection.send(sb.toString());
    }

    private void handleJoinChannel(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        int roomId = parseId(parts[1], "ID phòng");
        int channelId = parseId(parts[2], "ID kênh");

        if (!server.getRoomService().isMember(roomId, user.getId())) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Bạn không phải thành viên của phòng này.");
            return;
        }

        com.discordmini.server.model.Channel ch = server.getRoomService().findChannel(channelId);
        if (ch == null || ch.getRoomId() != roomId) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Kênh không tồn tại trong phòng này.");
            return;
        }

        Room room = server.getRoomService().findRoom(roomId);
        if (room == null) {
            sendError(ProtocolErrorCode.ROOM_NOT_FOUND, "Không tìm thấy phòng.");
            return;
        }

        // Đảm bảo client đang tham gia phòng
        if (currentRoomId == null || currentRoomId != roomId) {
            leaveCurrentRoom(false);
            currentRoomId = roomId;
            server.getRoomService().joinRoom(roomId, user.getId());
            room.getMemberIds().add(user.getId());
            server.getRoomManager().join(room, this);
            sendRoomMembers();
        }

        currentChannelId = channelId;

        connection.send(
                "OK|JOIN_CHANNEL|"
                        + roomId
                        + "|"
                        + channelId
                        + "|"
                        + ProtocolHandler.encode(ch.getName())
        );

        handleHistory(channelId);
    }

    private void sendRooms() {
        StringBuilder sb = new StringBuilder("ROOMS");
        List<Room> rooms = (user != null)
                ? server.getRoomService().listRoomsForUser(user.getId())
                : server.getRoomService().listRooms();

        for (Room r : rooms) {
            String role = (user != null) ? server.getRoomService().getMemberRole(r.getId(), user.getId()) : "MEMBER";
            if (role == null) role = "MEMBER";
            sb.append('|')
                    .append(r.getId())
                    .append(',')
                    .append(ProtocolHandler.encode(r.getName()))
                    .append(',')
                    .append(ProtocolHandler.encode(r.getDescription()))
                    .append(',')
                    .append(role);
        }

        connection.send(sb.toString());
    }

    private void sendOnlineUsers() {
        StringBuilder sb = new StringBuilder("ONLINE_USERS");

        for (User u : server.getClientManager().onlineUsers()) {
            sb.append('|')
                    .append(u.getId())
                    .append(',')
                    .append(ProtocolHandler.encode(u.getDisplayName()));
        }

        connection.send(sb.toString());
    }

    private void sendRoomMembers() {
        if (currentRoomId == null) return;

        StringBuilder sb = new StringBuilder("ROOM_MEMBERS");
        for (ClientHandler c : server.getRoomManager().clientsIn(currentRoomId)) {
            User u = c.getUser();
            if (u != null) {
                String role = server.getRoomService().getMemberRole(currentRoomId, u.getId());
                if (role == null) role = "MEMBER";

                sb.append('|')
                        .append(u.getId())
                        .append(',')
                        .append(ProtocolHandler.encode(u.getDisplayName()))
                        .append(',')
                        .append(role.toUpperCase())
                        .append(',')
                        .append("ONLINE");
            }
        }
        connection.send(sb.toString());
    }

    private void broadcastRoom(String packet, boolean includeSelf) {
        if (currentRoomId == null) return;

        for (ClientHandler c :
                server.getRoomManager().clientsIn(currentRoomId)) {
            if (includeSelf || c != this) {
                c.connection.send(packet);
            }
        }
    }

    private void broadcastGlobal(String packet) {
        for (ClientHandler c : server.getClientManager().all()) {
            c.connection.send(packet);
        }
    }

    private void leaveCurrentRoom(boolean announce) {
        if (currentRoomId == null) return;

        int oldRoomId = currentRoomId;
        server.getRoomManager().leave(oldRoomId, this);

        if (announce && user != null) {
            broadcastRoom(
                    "SYSTEM|"
                            + ProtocolHandler.encode(
                                    user.getDisplayName() + " đã rời phòng."
                            ),
                    false
            );
        }

        currentRoomId = null;
        currentChannelId = null;

        // Cập nhật danh sách thành viên cho các client còn lại trong phòng cũ
        for (ClientHandler c : server.getRoomManager().clientsIn(oldRoomId)) {
            c.sendRoomMembers();
        }

        if (user != null) {
            sendOnlineUsers();
        }
    }

    private void cleanup() {
        leaveCurrentRoom(false);

        if (user != null) {
            user.setOnline(false);
            server.getClientManager().remove(user);

            broadcastGlobal(
                    "USER_OFFLINE|"
                            + user.getId()
                            + "|"
                            + ProtocolHandler.encode(user.getDisplayName())
            );
        }

        try {
            connection.close();
        } catch (IOException ignored) {
        }
    }

    private int parseId(String value, String fieldName) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(fieldName + " không hợp lệ.");
        }
        // Thử parse trực tiếp số nguyên
        try {
            int id = Integer.parseInt(value.trim());
            if (id > 0) return id;
        } catch (NumberFormatException ignored) {}

        // Nếu client gửi dạng Base64 encode
        try {
            String decoded = ProtocolHandler.decode(value.trim());
            int id = Integer.parseInt(decoded.trim());
            if (id > 0) return id;
        } catch (Exception ignored) {}

        throw new IllegalArgumentException(fieldName + " không hợp lệ.");
    }

    private void requireLogin() {
        if (user == null) {
            throw new IllegalStateException("Bạn chưa đăng nhập.");
        }
    }

    private void requireArgs(String[] parts, int count) {
        if (parts.length < count) {
            throw new IllegalArgumentException("Thiếu tham số.");
        }
    }

    private void sendError(ProtocolErrorCode code, String message) {
        requestFailed = true;

        String requestId = activeRequestId == null
                ? ""
                : activeRequestId;

        connection.send(
                "ERROR|"
                        + ProtocolHandler.encode(message)
                        + "|"
                        + requestId
                        + "|"
                        + code.name()
        );
    }

    private ProtocolErrorCode classifyError(Exception error) {
        if (error instanceof NumberFormatException
                || error instanceof IllegalArgumentException) {
            return ProtocolErrorCode.BAD_REQUEST;
        }

        if (error instanceof IllegalStateException) {
            String message = error.getMessage();

            if (message != null && message.contains("chưa đăng nhập")) {
                return ProtocolErrorCode.AUTH_REQUIRED;
            }

            return ProtocolErrorCode.INVALID_STATE;
        }

        if (error instanceof java.sql.SQLException) {
            return ProtocolErrorCode.DATABASE_ERROR;
        }

        return ProtocolErrorCode.INTERNAL_ERROR;
    }

    /* =========================================================================
     * TÍNH NĂNG A: QUẢN LÝ NHÓM CHAT (GROUP CHAT MANAGEMENT)
     * ========================================================================= */

    private void handleInviteRoom(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        int roomId = parseId(parts[1], "ID phòng");
        int targetUserId = parseId(parts[2], "ID người được mời");

        Room room = server.getRoomService().findRoom(roomId);
        if (room == null) {
            sendError(ProtocolErrorCode.ROOM_NOT_FOUND, "Không tìm thấy phòng.");
            return;
        }

        // Kiểm tra quyền: Chỉ thành viên của phòng mới được mời, ưu tiên kiểm tra quyền
        if (!room.getMemberIds().contains(user.getId())) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Bạn không phải thành viên của phòng này để mời người khác.");
            return;
        }

        User targetUser = server.getUserDAO().findById(targetUserId);
        if (targetUser == null) {
            sendError(ProtocolErrorCode.USER_NOT_FOUND, "Không tìm thấy người dùng được mời.");
            return;
        }

        if (room.getMemberIds().contains(targetUserId)) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Người dùng này đã là thành viên của phòng.");
            return;
        }

        // Thêm vào CSDL và bộ nhớ
        server.getRoomService().addMember(roomId, targetUserId, "MEMBER");
        room.getMemberIds().add(targetUserId);

        connection.send("OK|INVITE_ROOM|" + roomId + "|" + targetUserId + "|" + ProtocolHandler.encode(targetUser.getDisplayName()));

        // Thông báo cho phòng
        broadcastRoom("SYSTEM|" + ProtocolHandler.encode(targetUser.getDisplayName() + " đã được " + user.getDisplayName() + " mời vào phòng."), true);

        // Cập nhật lại danh sách thành viên cho các client trong phòng
        sendRoomMembers();

        // Gửi thông báo và cập nhật danh sách phòng cho người được mời nếu đang online
        var targetHandler = server.getClientManager().get(targetUserId);
        if (targetHandler != null) {
            targetHandler.connection.send("ROOM_INVITATION|" + roomId + "|" + ProtocolHandler.encode(room.getName()) + "|" + ProtocolHandler.encode(user.getDisplayName()));
            targetHandler.sendRooms();
        }
    }

    private void handleKickRoom(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        int roomId = parseId(parts[1], "ID phòng");
        int targetUserId = parseId(parts[2], "ID người cần xóa");

        Room room = server.getRoomService().findRoom(roomId);
        if (room == null) {
            sendError(ProtocolErrorCode.ROOM_NOT_FOUND, "Không tìm thấy phòng.");
            return;
        }

        // Kiểm tra quyền: CHỈ TRƯỞNG NHÓM (OWNER) mới có quyền kick/xóa thành viên
        if (!server.getRoomService().isRoomOwner(roomId, user.getId())) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Chỉ Trưởng nhóm (OWNER) mới có quyền xóa thành viên khỏi phòng.");
            return;
        }

        if (targetUserId == user.getId()) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Trưởng nhóm không thể tự kick chính mình. Hãy dùng tính năng rời phòng hoặc chuyển quyền.");
            return;
        }

        if (!room.getMemberIds().contains(targetUserId)) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Người dùng này không có trong phòng.");
            return;
        }

        // Xóa khỏi database và danh sách bộ nhớ
        server.getRoomService().removeMember(roomId, targetUserId);
        room.getMemberIds().remove(targetUserId);

        User targetUser = server.getUserDAO().findById(targetUserId);
        String targetName = (targetUser != null) ? targetUser.getDisplayName() : ("User#" + targetUserId);

        connection.send("OK|KICK_ROOM|" + roomId + "|" + targetUserId);

        broadcastRoom("SYSTEM|" + ProtocolHandler.encode(targetName + " đã bị Trưởng nhóm xóa khỏi phòng."), true);

        // Xử lý client bị kick nếu đang ở trong phòng này
        var targetHandler = server.getClientManager().get(targetUserId);
        if (targetHandler != null) {
            if (targetHandler.currentRoomId != null && targetHandler.currentRoomId == roomId) {
                targetHandler.server.getRoomManager().leave(roomId, targetHandler);
                targetHandler.currentRoomId = null;
                targetHandler.connection.send("SYSTEM|" + ProtocolHandler.encode("Bạn đã bị Trưởng nhóm mời ra khỏi phòng " + room.getName() + "."));
                targetHandler.connection.send("OK|LEAVE_ROOM|" + roomId);
            }
            targetHandler.sendRooms();
        }

        sendRoomMembers();
    }

    /* =========================================================================
     * TÍNH NĂNG B: QUẢN LÝ BẠN BÈ (FRIEND MANAGEMENT)
     * ========================================================================= */

    private void handleFriendSearch(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        String query = ProtocolHandler.decode(parts[1]).trim();
        List<User> results = server.getFriendService().searchUsers(user.getId(), query);

        StringBuilder sb = new StringBuilder("FRIEND_SEARCH_RESULT");
        for (User u : results) {
            boolean isFriend = server.getFriendService().areFriends(user.getId(), u.getId());
            boolean isOnline = server.getClientManager().isOnline(u.getId());
            sb.append('|')
                    .append(u.getId())
                    .append(',')
                    .append(ProtocolHandler.encode(u.getUsername()))
                    .append(',')
                    .append(ProtocolHandler.encode(u.getDisplayName()))
                    .append(',')
                    .append(isFriend ? "FRIEND" : "NONE")
                    .append(',')
                    .append(isOnline ? "ONLINE" : "OFFLINE");
        }
        connection.send(sb.toString());
    }

    private void handleFriendRequest(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int targetUserId = parseId(parts[1], "ID người dùng");

        if (targetUserId == user.getId()) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Không thể tự gửi lời mời kết bạn cho chính mình.");
            return;
        }

        String result = server.getFriendService().sendFriendRequest(user.getId(), targetUserId);

        switch (result) {
            case "OK" -> {
                connection.send("OK|FRIEND_REQUEST|" + targetUserId);
                // Gửi thông báo thời gian thực đến người nhận nếu đang online
                User targetUser = server.getUserDAO().findById(targetUserId);
                ClientHandler targetHandler = targetUser != null
                        ? server.getClientManager().getByUsername(targetUser.getUsername())
                        : server.getClientManager().get(targetUserId);
                if (targetHandler == null) {
                    targetHandler = server.getClientManager().get(targetUserId);
                }

                if (targetHandler != null) {
                    // Sự kiện theo bảng đặc tả: FRIEND_REQUEST_RECEIVED
                    targetHandler.connection.send("FRIEND_REQUEST_RECEIVED|" + user.getId() + "|" + ProtocolHandler.encode(user.getUsername()) + "|" + ProtocolHandler.encode(user.getDisplayName()));
                    targetHandler.connection.send("INCOMING_FRIEND_REQUEST|" + user.getId() + "|" + ProtocolHandler.encode(user.getUsername()) + "|" + ProtocolHandler.encode(user.getDisplayName()));
                    targetHandler.handleFriendPendingList();
                }
            }
            case "SELF_REQUEST" -> sendError(ProtocolErrorCode.BAD_REQUEST, "Không thể tự gửi lời mời kết bạn cho chính mình.");
            case "ALREADY_FRIENDS" -> sendError(ProtocolErrorCode.BAD_REQUEST, "Hai bạn đã là bạn bè từ trước.");
            case "ALREADY_REQUESTED" -> sendError(ProtocolErrorCode.BAD_REQUEST, "Lời mời kết bạn đã được gửi trước đó và đang chờ phản hồi.");
            case "INCOMING_EXISTS" -> sendError(ProtocolErrorCode.BAD_REQUEST, "Người dùng này đã gửi lời mời cho bạn trước đó. Bạn có thể chấp nhận lời mời.");
            default -> sendError(ProtocolErrorCode.DATABASE_ERROR, "Không thể gửi lời mời kết bạn vào lúc này.");
        }
    }

    private void handleFriendPendingList() {
        requireLogin();
        var list = server.getFriendService().getPendingRequests(user.getId());

        StringBuilder sb = new StringBuilder("FRIEND_PENDING_LIST");
        for (var item : list) {
            sb.append('|')
                    .append(item.requestId())
                    .append(',')
                    .append(item.senderId())
                    .append(',')
                    .append(ProtocolHandler.encode(item.senderUsername()))
                    .append(',')
                    .append(ProtocolHandler.encode(item.senderDisplayName()))
                    .append(',')
                    .append(ProtocolHandler.encode(item.createdAt() != null ? item.createdAt().toString() : ""));
        }
        connection.send(sb.toString());
    }

    private void handleFriendAccept(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int targetId = parseId(parts[1], "ID yêu cầu hoặc người gửi");

        // Tìm chính xác người gửi lời mời (requester)
        Integer requesterId = server.getFriendService().acceptRequestAndGetRequester(targetId, user.getId());
        if (requesterId == null) {
            boolean success = server.getFriendService().acceptRequestFromUser(targetId, user.getId());
            if (success) {
                requesterId = targetId;
            }
        }

        if (requesterId != null) {
            connection.send("OK|FRIEND_ACCEPT|" + targetId);
            handleFriendList();
            handleFriendPendingList();

            // Tìm ClientHandler của đối phương theo username chuẩn hóa chữ thường
            User requesterUser = server.getUserDAO().findById(requesterId);
            ClientHandler otherHandler = requesterUser != null
                    ? server.getClientManager().getByUsername(requesterUser.getUsername())
                    : server.getClientManager().get(requesterId);
            if (otherHandler == null) {
                otherHandler = server.getClientManager().get(requesterId);
            }

            if (otherHandler != null) {
                // Gửi sự kiện thời gian thực cho người gửi lời mời: FRIEND_REQUEST_ACCEPTED
                otherHandler.connection.send("FRIEND_REQUEST_ACCEPTED|" + user.getId() + "|" + ProtocolHandler.encode(user.getUsername()) + "|" + ProtocolHandler.encode(user.getDisplayName()));
                otherHandler.connection.send("FRIEND_ACCEPTED|" + user.getId() + "|" + ProtocolHandler.encode(user.getDisplayName()));
                otherHandler.handleFriendList();
                otherHandler.handleFriendPendingList();
            }
        } else {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Lời mời kết bạn không tồn tại hoặc đã được xử lý.");
        }
    }

    private void handleFriendReject(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int targetId = parseId(parts[1], "ID yêu cầu");
        Integer requesterId = server.getFriendService().rejectRequestAndGetRequester(targetId, user.getId());

        if (requesterId != null) {
            connection.send("OK|FRIEND_REJECT|" + targetId);
            handleFriendPendingList();

            User requesterUser = server.getUserDAO().findById(requesterId);
            ClientHandler otherHandler = requesterUser != null
                    ? server.getClientManager().getByUsername(requesterUser.getUsername())
                    : server.getClientManager().get(requesterId);
            if (otherHandler != null) {
                otherHandler.connection.send("FRIEND_REQUEST_DECLINED|" + user.getId());
                otherHandler.handleFriendPendingList();
            }
        } else {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Không thể từ chối lời mời hoặc lời mời không tồn tại.");
        }
    }

    private void handleFriendRemove(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int friendId = parseId(parts[1], "ID bạn bè");
        boolean ok = server.getFriendService().removeFriend(user.getId(), friendId);

        if (ok) {
            connection.send("OK|FRIEND_REMOVE|" + friendId);
            handleFriendList();

            User friendUser = server.getUserDAO().findById(friendId);
            ClientHandler otherHandler = friendUser != null
                    ? server.getClientManager().getByUsername(friendUser.getUsername())
                    : server.getClientManager().get(friendId);
            if (otherHandler != null) {
                otherHandler.connection.send("FRIEND_REMOVED|" + user.getId());
                otherHandler.handleFriendList();
            }
        } else {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Không thể hủy kết bạn hoặc hai người chưa phải bạn bè.");
        }
    }

    private void handleGetDmHistory(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int targetUserId = parseId(parts[1], "ID người dùng");
        int limit = parts.length >= 3 ? parseId(parts[2], "Giới hạn tin nhắn") : 50;

        var history = server.getDirectMessageDAO().getHistory(user.getId(), targetUserId, limit);

        connection.send("DM_HISTORY_BEGIN|" + targetUserId);
        for (var m : history) {
            long epochMs = m.sentAtEpochMs();
            boolean isMine = (m.senderId() == user.getId());
            String sUser = m.senderUsername() != null ? m.senderUsername().trim().toLowerCase() : "";
            String sName = m.senderDisplayName() != null ? m.senderDisplayName() : "";

            connection.send("DM_HISTORY_ITEM|"
                    + m.id() + "|"
                    + m.senderId() + "|"
                    + ProtocolHandler.encode(sUser) + "|"
                    + ProtocolHandler.encode(sName) + "|"
                    + ProtocolHandler.encode(m.content()) + "|"
                    + epochMs + "|"
                    + (isMine ? "true" : "false"));
        }
        connection.send("DM_HISTORY_END|" + targetUserId);
        server.getDirectMessageDAO().markAsRead(user.getId(), targetUserId);
    }

    private void handleFriendList() {
        requireLogin();
        List<User> friends = server.getFriendService().getFriends(user.getId());

        StringBuilder sb = new StringBuilder("FRIEND_LIST");
        for (User f : friends) {
            boolean isOnline = server.getClientManager().isOnline(f.getId());
            sb.append('|')
                    .append(f.getId())
                    .append(',')
                    .append(ProtocolHandler.encode(f.getUsername()))
                    .append(',')
                    .append(ProtocolHandler.encode(f.getDisplayName()))
                    .append(',')
                    .append(isOnline ? "ONLINE" : "OFFLINE");
        }
        connection.send(sb.toString());
    }

    /* =========================================================================
     * GIAI ĐOẠN 2: QUẢN LÝ PHÒNG & TIN NHẮN (MESSAGE & ROOM MANAGEMENT)
     * ========================================================================= */

    private void handleEditMessage(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        int messageId = parseId(parts[1], "ID tin nhắn");
        String newContent = ProtocolHandler.decode(parts[2]).trim();

        if (newContent.isBlank()) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Nội dung tin nhắn không được để trống.");
            return;
        }

        if (newContent.length() > MAX_MESSAGE_LENGTH) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Tin nhắn không được vượt quá 5000 ký tự.");
            return;
        }

        Message msg = server.getChatService().getMessageById(messageId);
        if (msg == null) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Không tìm thấy tin nhắn.");
            return;
        }

        if (msg.getSenderId() != user.getId()) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Bạn chỉ có thể sửa tin nhắn của chính mình.");
            return;
        }

        boolean ok = server.getChatService().editMessage(messageId, user.getId(), newContent);
        if (ok) {
            connection.send("OK|EDIT_MESSAGE|" + messageId);
            String packet = "MESSAGE_EDITED|" + msg.getRoomId() + "|" + messageId + "|" + ProtocolHandler.encode(newContent);
            broadcastToRoom(msg.getRoomId(), packet);
        } else {
            sendError(ProtocolErrorCode.INTERNAL_ERROR, "Không thể cập nhật tin nhắn.");
        }
    }

    private void handleDeleteMessage(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int messageId = parseId(parts[1], "ID tin nhắn");
        Message msg = server.getChatService().getMessageById(messageId);
        if (msg == null) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Không tìm thấy tin nhắn.");
            return;
        }

        String userRole = server.getRoomService().getMemberRole(msg.getRoomId(), user.getId());
        boolean isAdminOrOwner = "OWNER".equalsIgnoreCase(userRole) || "ADMIN".equalsIgnoreCase(userRole);
        boolean isSender = (msg.getSenderId() == user.getId());

        if (!isSender && !isAdminOrOwner) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Bạn không có quyền xóa tin nhắn này.");
            return;
        }

        boolean ok = server.getChatService().deleteMessage(messageId, user.getId(), isAdminOrOwner);
        if (ok) {
            connection.send("OK|DELETE_MESSAGE|" + messageId);
            String packet = "MESSAGE_DELETED|" + msg.getRoomId() + "|" + messageId;
            broadcastToRoom(msg.getRoomId(), packet);
        } else {
            sendError(ProtocolErrorCode.INTERNAL_ERROR, "Không thể xóa tin nhắn.");
        }
    }

    private void handleRenameRoom(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        int roomId = parseId(parts[1], "ID phòng");
        String newName = ProtocolHandler.decode(parts[2]).trim();

        if (newName.isBlank() || newName.length() > MAX_ROOM_NAME_LENGTH) {
            sendError(ProtocolErrorCode.INVALID_ROOM_NAME, "Tên phòng không hợp lệ.");
            return;
        }

        String userRole = server.getRoomService().getMemberRole(roomId, user.getId());
        if (!"OWNER".equalsIgnoreCase(userRole) && !"ADMIN".equalsIgnoreCase(userRole)) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Chỉ Chủ phòng hoặc Quản trị viên mới được đổi tên phòng.");
            return;
        }

        boolean ok = server.getRoomService().renameRoom(roomId, newName);
        if (ok) {
            Room r = server.getRoomService().findRoom(roomId);
            if (r != null) r.setName(newName);

            connection.send("OK|RENAME_ROOM|" + roomId + "|" + ProtocolHandler.encode(newName));
            String packet = "ROOM_RENAMED|" + roomId + "|" + ProtocolHandler.encode(newName);
            broadcastGlobal(packet);
            broadcastToRoom(roomId, "SYSTEM|" + ProtocolHandler.encode("Tên phòng đã được đổi thành: " + newName));
            sendRooms();
        } else {
            sendError(ProtocolErrorCode.INTERNAL_ERROR, "Không thể đổi tên phòng.");
        }
    }

    private void handleDeleteRoom(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        int roomId = parseId(parts[1], "ID phòng");
        String userRole = server.getRoomService().getMemberRole(roomId, user.getId());
        if (!"OWNER".equalsIgnoreCase(userRole) && !"ADMIN".equalsIgnoreCase(userRole)) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Chỉ Chủ phòng hoặc Quản trị viên mới được xóa phòng.");
            return;
        }

        boolean ok = server.getRoomService().deleteRoom(roomId);
        if (ok) {
            connection.send("OK|DELETE_ROOM|" + roomId);
            String packet = "ROOM_DELETED|" + roomId;
            for (ClientHandler c : server.getRoomManager().clientsIn(roomId)) {
                c.connection.send("SYSTEM|" + ProtocolHandler.encode("Phòng chat đã bị giải tán bởi Quản trị viên."));
                c.connection.send(packet);
                c.currentRoomId = null;
            }
            broadcastGlobal(packet);
            sendRooms();
        } else {
            sendError(ProtocolErrorCode.INTERNAL_ERROR, "Không thể xóa phòng.");
        }
    }

    private void handleSetRoomDesc(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        int roomId = parseId(parts[1], "ID phòng");
        String description = ProtocolHandler.decode(parts[2]).trim();

        String userRole = server.getRoomService().getMemberRole(roomId, user.getId());
        if (!"OWNER".equalsIgnoreCase(userRole) && !"ADMIN".equalsIgnoreCase(userRole)) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Chỉ Chủ phòng hoặc Quản trị viên mới được cập nhật mô tả phòng.");
            return;
        }

        boolean ok = server.getRoomService().updateDescription(roomId, description);
        if (ok) {
            Room r = server.getRoomService().findRoom(roomId);
            if (r != null) r.setDescription(description);

            connection.send("OK|SET_ROOM_DESC|" + roomId);
            String packet = "ROOM_DESC_UPDATED|" + roomId + "|" + ProtocolHandler.encode(description);
            broadcastToRoom(roomId, packet);
            broadcastToRoom(roomId, "SYSTEM|" + ProtocolHandler.encode("Mô tả phòng đã được cập nhật."));
        } else {
            sendError(ProtocolErrorCode.INTERNAL_ERROR, "Không thể cập nhật mô tả phòng.");
        }
    }

    private void handleTransferOwner(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        int roomId = parseId(parts[1], "ID phòng");
        int targetUserId = parseId(parts[2], "ID người nhận quyền");

        if (!server.getRoomService().isRoomOwner(roomId, user.getId())) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Chỉ Chủ phòng (OWNER) hiện tại mới có quyền chuyển giao quyền Chủ phòng.");
            return;
        }

        if (targetUserId == user.getId()) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Bạn đang là Chủ phòng.");
            return;
        }

        boolean ok = server.getRoomService().transferOwnership(roomId, user.getId(), targetUserId);
        if (ok) {
            User targetUser = server.getUserDAO().findById(targetUserId);
            String targetName = (targetUser != null) ? targetUser.getDisplayName() : ("User#" + targetUserId);

            connection.send("OK|TRANSFER_OWNER|" + roomId + "|" + targetUserId);
            broadcastToRoom(roomId, "SYSTEM|" + ProtocolHandler.encode(user.getDisplayName() + " đã chuyển quyền Chủ phòng cho " + targetName + "."));

            for (ClientHandler c : server.getRoomManager().clientsIn(roomId)) {
                c.sendRoomMembers();
                c.sendRooms();
            }
        } else {
            sendError(ProtocolErrorCode.INTERNAL_ERROR, "Không thể chuyển quyền Chủ phòng.");
        }
    }

    private void handleSetMemberRole(String[] parts) {
        requireLogin();
        requireArgs(parts, 4);

        int roomId = parseId(parts[1], "ID phòng");
        int targetUserId = parseId(parts[2], "ID thành viên");
        String role = ProtocolHandler.decode(parts[3]).trim().toUpperCase();

        if (!server.getRoomService().isRoomOwner(roomId, user.getId())) {
            sendError(ProtocolErrorCode.PERMISSION_DENIED, "Chỉ Chủ phòng (OWNER) mới có quyền thiết lập vai trò thành viên.");
            return;
        }

        if (!"ADMIN".equals(role) && !"MEMBER".equals(role)) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Vai trò chỉ có thể là ADMIN hoặc MEMBER.");
            return;
        }

        boolean ok = server.getRoomService().setMemberRole(roomId, targetUserId, role);
        if (ok) {
            User targetUser = server.getUserDAO().findById(targetUserId);
            String targetName = (targetUser != null) ? targetUser.getDisplayName() : ("User#" + targetUserId);
            String roleText = "ADMIN".equals(role) ? "Quản trị viên" : "Thành viên";

            connection.send("OK|SET_MEMBER_ROLE|" + roomId + "|" + targetUserId + "|" + role);
            broadcastToRoom(roomId, "SYSTEM|" + ProtocolHandler.encode(targetName + " đã được bổ nhiệm làm " + roleText + "."));

            for (ClientHandler c : server.getRoomManager().clientsIn(roomId)) {
                c.sendRoomMembers();
                c.sendRooms();
            }
        } else {
            sendError(ProtocolErrorCode.INTERNAL_ERROR, "Không thể cập nhật vai trò.");
        }
    }

    private void handleHistoryPage(String[] parts) {
        requireLogin();
        requireArgs(parts, 4);

        int roomId = parseId(parts[1], "ID phòng");
        int beforeId = parseId(parts[2], "ID tin nhắn trước đó");
        int limit = parseId(parts[3], "Số lượng tin nhắn");

        List<Message> history = server.getChatService().historyBefore(roomId, beforeId, limit);

        connection.send("HISTORY_PAGE_BEGIN|" + roomId);
        for (Message m : history) {
            connection.send(
                    "HISTORY_PAGE_ITEM|"
                            + m.getId()
                            + "|"
                            + ProtocolHandler.encode(m.getSender())
                            + "|"
                            + ProtocolHandler.encode(m.getContent())
                            + "|"
                            + ProtocolHandler.encode(m.getTimestamp())
                            + "|"
                            + (m.isEdited() ? "EDITED" : "NORMAL")
            );
        }
        connection.send("HISTORY_PAGE_END|" + roomId);
    }

    private void broadcastToRoom(int roomId, String packet) {
        for (ClientHandler c : server.getRoomManager().clientsIn(roomId)) {
            c.connection.send(packet);
        }
    }

    private void handleUpdateProfile(String[] parts) {
        requireLogin();
        requireArgs(parts, 2);

        String newDisplayName = ProtocolHandler.decode(parts[1]).trim();
        if (newDisplayName.isBlank() || newDisplayName.length() > 32) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Tên hiển thị phải từ 1 đến 32 ký tự.");
            return;
        }

        boolean ok = server.getUserDAO().updateProfile(user.getId(), newDisplayName);
        if (ok) {
            user.setDisplayName(newDisplayName);
            connection.send("OK|UPDATE_PROFILE|" + ProtocolHandler.encode(newDisplayName));
            // Phát sóng toàn cục thông báo thay đổi tên hiển thị để danh sách thành viên cập nhật
            broadcastGlobal("USER_PROFILE_UPDATED|" + user.getId() + "|" + ProtocolHandler.encode(newDisplayName));
        } else {
            sendError(ProtocolErrorCode.INTERNAL_ERROR, "Không thể cập nhật hồ sơ người dùng.");
        }
    }

    private void handleChangePassword(String[] parts) {
        requireLogin();
        requireArgs(parts, 3);

        String oldPass = ProtocolHandler.decode(parts[1]);
        String newPass = ProtocolHandler.decode(parts[2]);

        if (newPass == null || newPass.trim().length() < 6) {
            sendError(ProtocolErrorCode.BAD_REQUEST, "Mật khẩu mới phải có tối thiểu 6 ký tự.");
            return;
        }

        boolean ok = server.getUserDAO().changePassword(user.getId(), oldPass, newPass);
        if (ok) {
            connection.send("OK|CHANGE_PASSWORD");
        } else {
            sendError(ProtocolErrorCode.AUTH_FAILED, "Mật khẩu cũ không chính xác hoặc không hợp lệ.");
        }
    }
}