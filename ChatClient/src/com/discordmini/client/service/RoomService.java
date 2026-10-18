package com.discordmini.client.service;

import com.discordmini.client.model.Room;
import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Consumer;

/**
 * Dịch vụ quản lý Phòng chat phía Client (Danh sách, Tạo, Vào phòng, Rời phòng).
 *
 * Tiêu chí AN-06:
 * 1. Giữ đúng định dạng room ID số nguyên theo protocol (JOIN_ROOM|<id>), không mã hóa Base64 ID số.
 * 2. Chỉ cập nhật phòng hiện tại (currentRoom) sau phản hồi OK|JOIN_ROOM thành công của Server.
 * 3. Ghi nhớ phòng vào thành công gần nhất (lastSuccessfulRoomId) phục vụ tính năng AN-10.
 * 4. Xử lý tạo phòng lỗi, phòng không tồn tại, chuyển phòng thất bại và rớt mạng.
 * 5. Cơ chế thế hệ phòng (roomEpoch) để tránh phản hồi hoặc lịch sử đến trễ của phòng cũ ghi đè phòng mới.
 * 6. Sau khi leave thành công, khóa thao tác gửi tin vào phòng đã rời (currentRoom = null).
 * 7. Giữ logic giao thức mạng trong service, không rải rác trong UI.
 */
public class RoomService {
    private final SocketClient client;
    private final ChatService chatService;

    private volatile Room currentRoom = null;
    private volatile com.discordmini.client.model.Channel currentChannel = null;
    private volatile Integer pendingJoinRoomId = null;
    private volatile int pendingJoinEpoch = 0;
    private volatile int lastLeaveEpoch = 0;
    private volatile Integer lastSuccessfulRoomId = null;

    // Quản lý danh sách kênh theo từng phòng: roomId -> List<Channel>
    private final java.util.concurrent.ConcurrentMap<Integer, List<com.discordmini.client.model.Channel>> cachedChannels = new java.util.concurrent.ConcurrentHashMap<>();

    // Thế hệ phòng nhằm ngăn chặn dữ liệu phòng cũ đến trễ
    private final AtomicInteger roomEpoch = new AtomicInteger(0);

    private final List<Room> cachedRooms = Collections.synchronizedList(new ArrayList<>());
    private final List<RoomEventListener> listeners = new CopyOnWriteArrayList<>();

    public RoomService(SocketClient client) {
        this(client, null);
    }

    public RoomService(SocketClient client, ChatService chatService) {
        this.client = Objects.requireNonNull(client, "SocketClient không được null");
        this.chatService = chatService;
        registerPacketListeners();
    }

    private void registerPacketListeners() {
        client.addMessageListener(this::handleServerPacket);
        client.addConnectionListener(this::handleConnectionEvent);
    }

    public SocketClient getClient() {
        return client;
    }

    public void addListener(RoomEventListener listener) {
        if (listener != null) {
            listeners.add(listener);
        }
    }

    public void removeListener(RoomEventListener listener) {
        if (listener != null) {
            listeners.remove(listener);
        }
    }

    public Room getCurrentRoom() {
        return currentRoom;
    }

    public boolean isInRoom() {
        return currentRoom != null;
    }

    public Integer getLastSuccessfulRoomId() {
        return lastSuccessfulRoomId;
    }

    public Integer getPendingJoinRoomId() {
        return pendingJoinRoomId;
    }

    public List<Room> getCachedRooms() {
        synchronized (cachedRooms) {
            return new ArrayList<>(cachedRooms);
        }
    }

    public com.discordmini.client.model.Channel getCurrentChannel() {
        return currentChannel;
    }

    public List<com.discordmini.client.model.Channel> getCachedChannels(int roomId) {
        List<com.discordmini.client.model.Channel> list = cachedChannels.get(roomId);
        return list != null ? new ArrayList<>(list) : Collections.emptyList();
    }

    public String createChannel(int roomId, String channelName) {
        if (channelName == null || channelName.isBlank() || !client.isConnected() || roomId <= 0) {
            notifyListeners(l -> l.onRoomError("Tên kênh không hợp lệ."));
            return null;
        }
        return client.sendCommandWithId("CREATE_CHANNEL", String.valueOf(roomId), channelName.trim());
    }

    public void listChannels(int roomId) {
        if (client.isConnected() && roomId > 0) {
            client.sendCommand("LIST_CHANNELS", String.valueOf(roomId));
        }
    }

    public String joinChannel(int roomId, int channelId) {
        if (!client.isConnected()) {
            notifyListeners(l -> l.onRoomError("Chưa kết nối đến máy chủ."));
            return null;
        }
        if (chatService != null) {
            chatService.clearRoomState();
        }
        return client.sendCommandWithId("JOIN_CHANNEL", String.valueOf(roomId), String.valueOf(channelId));
    }

    public String renameChannel(int roomId, int channelId, String newName) {
        if (newName == null || newName.isBlank() || !client.isConnected() || roomId <= 0 || channelId <= 0) {
            notifyListeners(l -> l.onRoomError("Tên kênh không hợp lệ."));
            return null;
        }
        return client.sendCommandWithId("RENAME_CHANNEL", String.valueOf(roomId), String.valueOf(channelId), newName.trim());
    }

    public String deleteChannel(int roomId, int channelId) {
        if (!client.isConnected() || roomId <= 0 || channelId <= 0) {
            notifyListeners(l -> l.onRoomError("Kênh không hợp lệ."));
            return null;
        }
        return client.sendCommandWithId("DELETE_CHANNEL", String.valueOf(roomId), String.valueOf(channelId));
    }

    public int getRoomEpoch() {
        return roomEpoch.get();
    }

    /**
     * Yêu cầu Server gửi danh sách tất cả các phòng hiện có.
     */
    public void listRooms() {
        if (client.isConnected()) {
            client.sendCommand("LIST_ROOMS");
        }
    }

    /**
     * Tạo phòng chat mới với tên phòng đã cho.
     * Tên phòng được mã hóa Base64 theo chuẩn giao thức.
     */
    public String createRoom(String name) {
        if (name == null || name.isBlank() || !client.isConnected()) {
            notifyListeners(l -> l.onRoomError("Tên phòng không được để trống."));
            return null;
        }
        return client.sendCommandWithId("CREATE_ROOM", name.trim());
    }

    /**
     * Tham gia vào phòng chat bằng roomId.
     * ĐẢM BẢO roomId LÀ SỐ NGUYÊN (không mã hóa Base64 cho ID số).
     */
    public String joinRoom(int roomId) {
        if (!client.isConnected()) {
            notifyListeners(l -> l.onRoomError("Chưa kết nối đến máy chủ. Vui lòng kết nối lại."));
            return null;
        }
        if (roomId <= 0) {
            notifyListeners(l -> l.onRoomError("ID phòng không hợp lệ."));
            return null;
        }

        // Tăng epoch để hủy bỏ mọi dữ liệu đến trễ của phòng trước đó
        int epoch = roomEpoch.incrementAndGet();
        this.pendingJoinRoomId = roomId;
        this.pendingJoinEpoch = epoch;

        if (chatService != null) {
            chatService.clearRoomState();
        }

        // Giữ nguyên định dạng: JOIN_ROOM|<id> (số nguyên trực tiếp)
        return client.sendWithId("JOIN_ROOM|" + roomId);
    }

    /**
     * Rời khỏi phòng chat hiện tại.
     * Cập nhật currentRoom = null để UI không còn cho phép gửi tin vào phòng đã rời.
     */
    public void leaveRoom() {
        leaveRoom(0);
    }

    public void leaveRoom(int targetRoomId) {
        int currentId = (this.currentRoom != null) ? this.currentRoom.id() : 0;
        if (targetRoomId <= 0 || currentId == targetRoomId) {
            int epoch = roomEpoch.incrementAndGet();
            this.lastLeaveEpoch = epoch;
            this.currentRoom = null;
            this.currentChannel = null;
            this.pendingJoinRoomId = null;
            this.lastSuccessfulRoomId = null;

            if (chatService != null) {
                chatService.clearRoomState();
            }
        }

        if (client.isConnected()) {
            if (targetRoomId > 0) {
                client.sendWithId("LEAVE_ROOM|" + targetRoomId);
            } else {
                client.sendCommand("LEAVE_ROOM");
            }
        }
        if (targetRoomId <= 0 || currentId == targetRoomId) {
            notifyListeners(RoomEventListener::onRoomLeft);
        }
    }

    /**
     * Tham gia lại phòng vào thành công gần nhất (phục vụ AN-10 Reconnect).
     */
    public boolean rejoinLastRoom() {
        Integer lastId = this.lastSuccessfulRoomId;
        if (lastId != null && lastId > 0 && client.isConnected()) {
            joinRoom(lastId);
            return true;
        }
        return false;
    }

    public void handleServerPacket(String packet) {
        try {
            String[] parts = ProtocolHandler.split(packet);
            if (parts.length == 0) return;

            String type = parts[0];

            switch (type) {
                case "ROOMS" -> handleRoomsList(parts);
                case "CHANNELS" -> handleChannelsList(parts);
                case "OK" -> handleOkResponse(parts);
                case "ERROR" -> handleErrorResponse(parts);
                case "ROOM_MEMBERS" -> handleRoomMembers(parts);
            }
        } catch (Exception ex) {
            System.err.println("[RoomService] Lỗi xử lý gói tin: " + ex.getMessage());
        }
    }

    private void handleChannelsList(String[] parts) {
        if (parts.length < 2) return;
        try {
            int roomId = Integer.parseInt(parts[1]);
            List<com.discordmini.client.model.Channel> channels = new ArrayList<>();
            for (int i = 2; i < parts.length; i++) {
                String[] x = parts[i].split(",", 2);
                if (x.length >= 2) {
                    int chId = Integer.parseInt(x[0]);
                    String chName = ProtocolHandler.decode(x[1]);
                    channels.add(new com.discordmini.client.model.Channel(chId, roomId, chName));
                }
            }
            cachedChannels.put(roomId, channels);
            notifyListeners(l -> l.onChannelsUpdated(roomId, channels));
        } catch (Exception ex) {
            System.err.println("[RoomService] Lỗi handleChannelsList: " + ex.getMessage());
        }
    }

    private void handleRoomsList(String[] parts) {
        List<Room> newRooms = new ArrayList<>();
        for (int i = 1; i < parts.length; i++) {
            String item = parts[i];
            String[] x = item.split(",", 4);
            if (x.length >= 2) {
                try {
                    int id = Integer.parseInt(x[0]);
                    String name = ProtocolHandler.decode(x[1]);
                    newRooms.add(new Room(id, name));
                } catch (Exception ignored) {}
            }
        }

        synchronized (cachedRooms) {
            cachedRooms.clear();
            cachedRooms.addAll(newRooms);
        }

        notifyListeners(l -> l.onRoomListUpdated(newRooms));
    }

    private void handleOkResponse(String[] parts) {
        if (parts.length < 2) return;
        String action = parts[1];

        if ("ROOM_CREATED".equals(action) && parts.length >= 4) {
            int id = Integer.parseInt(parts[2]);
            String name = ProtocolHandler.decode(parts[3]);
            Room room = new Room(id, name);
            notifyListeners(l -> l.onRoomCreated(room));
            listRooms(); // Tự động làm mới danh sách phòng
        } else if ("CHANNEL_CREATED".equals(action) && parts.length >= 5) {
            int roomId = Integer.parseInt(parts[2]);
            int chId = Integer.parseInt(parts[3]);
            String chName = ProtocolHandler.decode(parts[4]);
            com.discordmini.client.model.Channel ch = new com.discordmini.client.model.Channel(chId, roomId, chName);
            List<com.discordmini.client.model.Channel> chList = cachedChannels.computeIfAbsent(roomId, k -> new CopyOnWriteArrayList<>());
            chList.add(ch);
            notifyListeners(l -> l.onChannelCreated(roomId, ch));
            listChannels(roomId);
        } else if ("JOIN_CHANNEL".equals(action) && parts.length >= 5) {
            int roomId = Integer.parseInt(parts[2]);
            int chId = Integer.parseInt(parts[3]);
            String chName = ProtocolHandler.decode(parts[4]);
            this.currentChannel = new com.discordmini.client.model.Channel(chId, roomId, chName);
            notifyListeners(l -> l.onChannelJoined(roomId, this.currentChannel));
        } else if ("JOIN_ROOM".equals(action) && parts.length >= 4) {
            int id = Integer.parseInt(parts[2]);
            String name = ProtocolHandler.decode(parts[3]);

            // Đối chiếu tính hợp lệ:
            // 1. Nếu đang có phòng chờ khác id -> phản hồi của phòng cũ, loại bỏ
            if (this.pendingJoinRoomId != null && this.pendingJoinRoomId != id) {
                return;
            }
            // 2. Nếu đã có thao tác leaveRoom hoặc rớt mạng sau khi phát yêu cầu join -> loại bỏ phản hồi cũ
            if (this.pendingJoinEpoch > 0 && this.lastLeaveEpoch >= this.pendingJoinEpoch) {
                return;
            }

            // Chỉ cập nhật phòng hiện tại sau khi Server xác nhận thành công
            this.currentRoom = new Room(id, name);
            this.lastSuccessfulRoomId = id;
            this.pendingJoinRoomId = null;
            this.pendingJoinEpoch = 0;

            if (parts.length >= 6) {
                try {
                    int chId = Integer.parseInt(parts[4]);
                    String chName = ProtocolHandler.decode(parts[5]);
                    this.currentChannel = new com.discordmini.client.model.Channel(chId, id, chName);
                    notifyListeners(l -> l.onChannelJoined(id, this.currentChannel));
                } catch (Exception ignored) {}
            }

            notifyListeners(l -> l.onRoomJoined(this.currentRoom));
        }
    }

    private void handleErrorResponse(String[] parts) {
        if (parts.length < 2) return;
        String errorMsg = ProtocolHandler.decode(parts[1]);

        // Chỉ thông báo lỗi phòng nếu đang có yêu cầu vào phòng hoặc lỗi liên quan tới phòng
        boolean isRoomRelated = pendingJoinRoomId != null
                || errorMsg.toLowerCase().contains("phòng")
                || errorMsg.toLowerCase().contains("room");

        this.pendingJoinRoomId = null;

        if (isRoomRelated) {
            notifyListeners(l -> l.onRoomError(errorMsg));
        }
    }

    private void handleRoomMembers(String[] parts) {
        List<String> memberNames = new ArrayList<>();
        for (int i = 1; i < parts.length; i++) {
            String item = parts[i];
            String[] x = item.split(",", 4);
            if (x.length >= 2) {
                try {
                    String name = ProtocolHandler.decode(x[1]);
                    memberNames.add(name);
                } catch (Exception ignored) {}
            }
        }

        int currentId = (currentRoom != null) ? currentRoom.id() : 0;
        notifyListeners(l -> l.onRoomMembersUpdated(currentId, memberNames));
    }

    private void handleConnectionEvent(String event) {
        if ("CLIENT_DISCONNECTED".equals(event)) {
            // Khi rớt mạng: hủy phòng hiện tại nhưng vẫn giữ lastSuccessfulRoomId để AN-10 tự động vào lại
            this.currentRoom = null;
            this.currentChannel = null;
            this.pendingJoinRoomId = null;
            int epoch = roomEpoch.incrementAndGet();
            this.lastLeaveEpoch = epoch;
            notifyListeners(RoomEventListener::onRoomLeft);
        }
    }

    private void notifyListeners(Consumer<RoomEventListener> action) {
        for (RoomEventListener listener : listeners) {
            try {
                action.accept(listener);
            } catch (Throwable t) {
                System.err.println("[RoomService] Lỗi listener callback: " + t.getMessage());
            }
        }
    }

    public void inviteMember(int roomId, int targetUserId) {
        client.sendWithId("INVITE_ROOM|" + roomId + "|" + targetUserId);
    }

    public void inviteMemberByUsername(int roomId, String targetUsername) {
        if (targetUsername == null || targetUsername.isBlank()) return;
        client.sendCommand("INVITE_ROOM", String.valueOf(roomId), targetUsername.trim());
    }

    public void kickMember(int roomId, int targetUserId) {
        client.sendWithId("KICK_ROOM|" + roomId + "|" + targetUserId);
    }
}
