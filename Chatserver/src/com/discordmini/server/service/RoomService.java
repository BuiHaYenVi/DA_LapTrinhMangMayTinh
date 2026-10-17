package com.discordmini.server.service;

import com.discordmini.server.dao.RoomDAO;
import com.discordmini.server.model.Room;
import com.discordmini.server.model.User;
import com.discordmini.server.session.EventBus;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class RoomService {
    private final RoomDAO roomDAO;
    private final EventBus eventBus;

    public RoomService() {
        this(new RoomDAO(), EventBus.getInstance());
    }

    public RoomService(RoomDAO roomDAO) {
        this(roomDAO, EventBus.getInstance());
    }

    public RoomService(RoomDAO roomDAO, EventBus eventBus) {
        this.roomDAO = roomDAO != null ? roomDAO : new RoomDAO();
        this.eventBus = eventBus != null ? eventBus : EventBus.getInstance();
    }

    public List<Room> listRooms() {
        try {
            return roomDAO.listRooms();
        } catch (Exception e) {
            System.err.println("Lỗi danh sách phòng Database: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public Room findRoom(int roomId) {
        try {
            return roomDAO.findRoom(roomId);
        } catch (Exception e) {
            return null;
        }
    }

    public Room createRoom(String name, int createdByUserId) throws Exception {
        return roomDAO.createRoom(name, createdByUserId);
    }

    public Room createChannel(int guildId, String name, String channelType, String topic, int position, int createdBy) {
        return roomDAO.createChannel(guildId, name, channelType, topic, position, createdBy);
    }

    public List<Room> listChannelsByGuild(int guildId, int userId) {
        try {
            return roomDAO.listChannelsByGuild(guildId, userId);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public void joinRoom(int roomId, int userId) {
        try {
            roomDAO.joinRoom(roomId, userId);
        } catch (Exception e) {
            System.err.println("Lỗi vào phòng Database: " + e.getMessage());
        }
    }

    public boolean removeMember(int roomId, int userId) {
        try {
            return roomDAO.removeMember(roomId, userId);
        } catch (Exception e) {
            System.err.println("Lỗi xóa thành viên Database: " + e.getMessage());
            return false;
        }
    }

    public List<Room> listRoomsForUser(int userId) {
        try {
            return roomDAO.listRoomsForUser(userId);
        } catch (Exception e) {
            System.err.println("Lỗi danh sách phòng Database: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public boolean isRoomOwner(int roomId, int userId) {
        try {
            return roomDAO.isRoomOwner(roomId, userId);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean isAdminOrOwner(int roomId, int userId) {
        try {
            String role = roomDAO.getMemberRole(roomId, userId);
            return "OWNER".equalsIgnoreCase(role) || "ADMIN".equalsIgnoreCase(role);
        } catch (Exception e) {
            return false;
        }
    }

    public boolean addMember(int roomId, int userId, String role) {
        try {
            return roomDAO.addMember(roomId, userId, role);
        } catch (Exception e) {
            System.err.println("Lỗi thêm thành viên Database: " + e.getMessage());
            return false;
        }
    }

    public boolean updateMemberRole(int roomId, int userId, String role) {
        try {
            boolean updated = roomDAO.updateMemberRole(roomId, userId, role);
            if (updated) {
                Map<String, Object> payload = new LinkedHashMap<>();
                payload.put("roomId", roomId);
                payload.put("userId", userId);
                payload.put("role", role != null ? role.toUpperCase() : "MEMBER");
                eventBus.publishToRoom(roomId, null, "MEMBER_ROLE_UPDATED", payload, null);
            }
            return updated;
        } catch (Exception e) {
            return false;
        }
    }

    public String getMemberRole(int roomId, int userId) {
        try {
            return roomDAO.getMemberRole(roomId, userId);
        } catch (Exception e) {
            return null;
        }
    }

    public List<User> getRoomMembers(int roomId) {
        try {
            return roomDAO.getRoomMembers(roomId);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public boolean markRead(int userId, int roomId, int lastReadMessageId) {
        try {
            boolean ok = roomDAO.markRead(userId, roomId, lastReadMessageId);
            if (ok) {
                String tcpFrame = "READ_UPDATED|" + roomId + "|" + userId + "|" + lastReadMessageId;
                Map<String, Object> wsPayload = new LinkedHashMap<>();
                wsPayload.put("roomId", roomId);
                wsPayload.put("userId", userId);
                wsPayload.put("lastMessageId", lastReadMessageId);
                eventBus.publishToRoom(roomId, tcpFrame, "READ_UPDATED", wsPayload, null);
            }
            return ok;
        } catch (Exception e) {
            return false;
        }
    }

    public RoomDAO getRoomDAO() {
        return roomDAO;
    }
}
