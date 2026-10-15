package com.discordmini.server.service;

import com.discordmini.server.dao.RoomDAO;
import com.discordmini.server.model.Room;

import java.util.ArrayList;
import java.util.List;

public class RoomService {
    private final RoomDAO roomDAO;

    public RoomService(RoomDAO roomDAO) {
        this.roomDAO = roomDAO != null ? roomDAO : new RoomDAO();
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

    public void joinRoom(int roomId, int userId) {
        try {
            roomDAO.joinRoom(roomId, userId);
        } catch (Exception e) {
            System.err.println("Lỗi vào phòng Database: " + e.getMessage());
        }
    }
}
