package com.discordmini.server.service;

import com.discordmini.server.dao.RoomDAO;
import com.discordmini.server.model.Room;

import java.util.ArrayList;
import java.util.List;

public class RoomService {
    private final RoomDAO roomDAO;
    private final com.discordmini.server.dao.ChannelDAO channelDAO;

    public RoomService(RoomDAO roomDAO, com.discordmini.server.dao.ChannelDAO channelDAO) {
        this.roomDAO = roomDAO != null ? roomDAO : new RoomDAO();
        this.channelDAO = channelDAO != null ? channelDAO : new com.discordmini.server.dao.ChannelDAO();
    }

    public RoomService(RoomDAO roomDAO) {
        this(roomDAO, null);
    }

    public com.discordmini.server.dao.ChannelDAO getChannelDAO() {
        return channelDAO;
    }

    public com.discordmini.server.model.Channel createChannel(int roomId, String name, int requestedByUserId) {
        if (roomId <= 0 || name == null || name.isBlank() || requestedByUserId <= 0) {
            return null;
        }

        // Kiểm tra quyền: Chỉ OWNER hoặc ADMIN mới được tạo kênh
        String role = getMemberRole(roomId, requestedByUserId);
        if (role == null || (!"OWNER".equalsIgnoreCase(role) && !"ADMIN".equalsIgnoreCase(role))) {
            System.err.println("[RoomService] User " + requestedByUserId + " không có quyền tạo kênh trong phòng " + roomId);
            return null;
        }

        return channelDAO.createChannel(roomId, name.trim());
    }

    public List<com.discordmini.server.model.Channel> listChannels(int roomId, int requestedByUserId) {
        if (roomId <= 0) return new ArrayList<>();
        // Kiểm tra quyền: Người dùng phải là thành viên của phòng
        if (requestedByUserId > 0 && !isMember(roomId, requestedByUserId)) {
            System.err.println("[RoomService] User " + requestedByUserId + " không phải thành viên phòng " + roomId);
            return new ArrayList<>();
        }
        return channelDAO.getChannelsByRoomId(roomId);
    }

    public com.discordmini.server.model.Channel findChannel(int channelId) {
        return channelDAO.findById(channelId);
    }

    public com.discordmini.server.model.Channel getDefaultChannel(int roomId) {
        return channelDAO.getDefaultChannel(roomId);
    }

    public boolean isMember(int roomId, int userId) {
        if (roomId <= 0 || userId <= 0) return false;
        return getMemberRole(roomId, userId) != null;
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

    public boolean existsByName(String name) {
        if (name == null || name.isBlank()) return false;
        try {
            return roomDAO.findRoomByName(name.trim()) != null;
        } catch (Exception e) {
            return false;
        }
    }

    public Room createRoom(String name, int createdByUserId) throws Exception {
        if (name == null || name.isBlank() || name.trim().length() > 50) {
            return null;
        }
        if (existsByName(name.trim())) {
            return null;
        }
        return roomDAO.createRoom(name.trim(), createdByUserId);
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

    public boolean addMember(int roomId, int userId, String role) {
        try {
            return roomDAO.addMember(roomId, userId, role);
        } catch (Exception e) {
            System.err.println("Lỗi thêm thành viên Database: " + e.getMessage());
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

    public List<com.discordmini.server.model.User> getRoomMembers(int roomId) {
        try {
            return roomDAO.getRoomMembers(roomId);
        } catch (Exception e) {
            return new ArrayList<>();
        }
    }

    public boolean renameRoom(int roomId, String newName) {
        try {
            return roomDAO.renameRoom(roomId, newName);
        } catch (Exception e) {
            System.err.println("Lỗi renameRoom: " + e.getMessage());
            return false;
        }
    }

    public boolean deleteRoom(int roomId) {
        try {
            return roomDAO.deleteRoom(roomId);
        } catch (Exception e) {
            System.err.println("Lỗi deleteRoom: " + e.getMessage());
            return false;
        }
    }

    public boolean updateDescription(int roomId, String description) {
        try {
            return roomDAO.updateDescription(roomId, description);
        } catch (Exception e) {
            System.err.println("Lỗi updateDescription: " + e.getMessage());
            return false;
        }
    }

    public boolean transferOwnership(int roomId, int oldOwnerId, int newOwnerId) {
        try {
            return roomDAO.transferOwnership(roomId, oldOwnerId, newOwnerId);
        } catch (Exception e) {
            System.err.println("Lỗi transferOwnership: " + e.getMessage());
            return false;
        }
    }

    public boolean setMemberRole(int roomId, int userId, String role) {
        try {
            return roomDAO.setMemberRole(roomId, userId, role);
        } catch (Exception e) {
            System.err.println("Lỗi setMemberRole: " + e.getMessage());
            return false;
        }
    }
}
