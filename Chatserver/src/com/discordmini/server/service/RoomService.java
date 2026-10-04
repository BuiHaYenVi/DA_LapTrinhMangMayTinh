package com.discordmini.server.service;

import com.discordmini.server.dao.RoomDAO;
import com.discordmini.server.model.Room;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class RoomService {
    private final RoomDAO roomDAO;

    public RoomService(RoomDAO roomDAO) {
        this.roomDAO = roomDAO;
    }

    public List<Room> listRooms() {
        try {
            return roomDAO.listRooms();
        } catch (SQLException e) {
            System.err.println("Loi danh sach phong Database: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public Room findRoom(int roomId) {
        try {
            return roomDAO.findRoom(roomId);
        } catch (SQLException e) {
            return null;
        }
    }

    public Room createRoom(String name, int createdByUserId) throws Exception {
        return roomDAO.createRoom(name, createdByUserId);
    }

    public void joinRoom(int roomId, int userId) {
        try {
            roomDAO.joinRoom(roomId, userId);
        } catch (SQLException e) {
            System.err.println("Loi vao phong Database: " + e.getMessage());
        }
    }
}
