package com.discordmini.server.dao;

import com.discordmini.server.model.Room;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class RoomDAO {

    public List<Room> listRooms() throws SQLException {
        List<Room> list = new ArrayList<>();
        String sql = "SELECT id, name FROM rooms ORDER BY id ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                Room r = new Room(rs.getInt("id"), rs.getString("name"));
                loadMemberIds(conn, r);
                list.add(r);
            }
        }
        return list;
    }

    public Room findRoom(int id) throws SQLException {
        String sql = "SELECT id, name FROM rooms WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                Room r = new Room(rs.getInt("id"), rs.getString("name"));
                loadMemberIds(conn, r);
                return r;
            }
        }
        return null;
    }

    public Room createRoom(String name, int createdByUserId) throws SQLException {
        String sql = "INSERT INTO rooms (name, created_by) VALUES (?, ?) RETURNING id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, name);
            ps.setInt(2, createdByUserId);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                int roomId = rs.getInt("id");
                Room room = new Room(roomId, name);
                joinRoom(roomId, createdByUserId);
                room.getMemberIds().add(createdByUserId);
                return room;
            }
        }
        return null;
    }

    public void joinRoom(int roomId, int userId) throws SQLException {
        String sql = "INSERT INTO room_members (room_id, user_id) VALUES (?, ?) ON CONFLICT (room_id, user_id) DO NOTHING";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            ps.setInt(2, userId);
            ps.executeUpdate();
        }
    }

    private void loadMemberIds(Connection conn, Room room) throws SQLException {
        String sql = "SELECT user_id FROM room_members WHERE room_id = ?";
        try (PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, room.getId());
            ResultSet rs = ps.executeQuery();
            while (rs.next()) {
                room.getMemberIds().add(rs.getInt("user_id"));
            }
        }
    }
}
