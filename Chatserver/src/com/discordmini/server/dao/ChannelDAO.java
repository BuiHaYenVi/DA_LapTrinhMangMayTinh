package com.discordmini.server.dao;

import com.discordmini.server.config.DatabaseConnection;
import com.discordmini.server.model.Channel;

import java.sql.*;
import java.util.ArrayList;
import java.util.List;

public class ChannelDAO {

    private static final String CHANNEL_COLUMNS =
            "id, room_id, name, created_at, COALESCE(type, 'text') AS type, COALESCE(is_private, FALSE) AS is_private";

    public Channel createChannel(int roomId, String channelName) {
        return createChannel(roomId, channelName, "text", false);
    }

    public Channel createChannel(int roomId, String channelName, String type, boolean isPrivate) {
        if (channelName == null || channelName.isBlank() || roomId <= 0) {
            return null;
        }
        String trimmedName = channelName.trim();
        if (trimmedName.length() > 50) {
            return null;
        }

        if (existsByName(roomId, trimmedName)) {
            return null;
        }

        String normalizedType = Channel.normalizeType(type);
        String sql = "INSERT INTO channels (room_id, name, type, is_private) VALUES (?, ?, ?, ?) RETURNING id, created_at";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            ps.setString(2, trimmedName);
            ps.setString(3, normalizedType);
            ps.setBoolean(4, isPrivate);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    int id = rs.getInt("id");
                    Timestamp createdAt = rs.getTimestamp("created_at");
                    return new Channel(id, roomId, trimmedName, createdAt, normalizedType, isPrivate);
                }
            }
        } catch (SQLException e) {
            System.err.println("[ChannelDAO LỖI] createChannel: " + e.getMessage());
        }
        return null;
    }

    public List<Channel> getChannelsByRoomId(int roomId) {
        List<Channel> channels = new ArrayList<>();
        if (roomId <= 0) return channels;

        String sql = "SELECT " + CHANNEL_COLUMNS + " FROM channels WHERE room_id = ? ORDER BY id ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    channels.add(mapRow(rs));
                }
            }
        } catch (SQLException e) {
            System.err.println("[ChannelDAO LỖI] getChannelsByRoomId: " + e.getMessage());
        }
        return channels;
    }

    public Channel findById(int channelId) {
        if (channelId <= 0) return null;
        String sql = "SELECT " + CHANNEL_COLUMNS + " FROM channels WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, channelId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRow(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("[ChannelDAO LỖI] findById: " + e.getMessage());
        }
        return null;
    }

    public Channel findByName(int roomId, String name) {
        if (roomId <= 0 || name == null || name.isBlank()) return null;
        String sql = "SELECT " + CHANNEL_COLUMNS + " FROM channels WHERE room_id = ? AND LOWER(name) = LOWER(?) LIMIT 1";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            ps.setString(2, name.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return mapRow(rs);
                }
            }
        } catch (SQLException e) {
            System.err.println("[ChannelDAO LỖI] findByName: " + e.getMessage());
        }
        return null;
    }

    public boolean existsByName(int roomId, String name) {
        return findByName(roomId, name) != null;
    }

    public Channel getDefaultChannel(int roomId) {
        if (roomId <= 0) return null;
        Channel defaultCh = findByName(roomId, "chung");
        if (defaultCh != null) return defaultCh;

        List<Channel> all = getChannelsByRoomId(roomId);
        if (!all.isEmpty()) return all.get(0);

        return createChannel(roomId, "chung", "text", false);
    }

    public boolean renameChannel(int channelId, String newName) {
        if (channelId <= 0 || newName == null || newName.isBlank()) return false;
        String trimmed = newName.trim();
        if (trimmed.length() > 50) return false;

        String sql = "UPDATE channels SET name = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, trimmed);
            ps.setInt(2, channelId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[ChannelDAO LỖI] renameChannel: " + e.getMessage());
            return false;
        }
    }

    public boolean deleteChannel(int channelId) {
        if (channelId <= 0) return false;
        String sql = "DELETE FROM channels WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, channelId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[ChannelDAO LỖI] deleteChannel: " + e.getMessage());
            return false;
        }
    }

    public int countChannelsInRoom(int roomId) {
        if (roomId <= 0) return 0;
        String sql = "SELECT COUNT(*) FROM channels WHERE room_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, roomId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) return rs.getInt(1);
            }
        } catch (SQLException e) {
            System.err.println("[ChannelDAO LỖI] countChannelsInRoom: " + e.getMessage());
        }
        return 0;
    }

    private Channel mapRow(ResultSet rs) throws SQLException {
        return new Channel(
                rs.getInt("id"),
                rs.getInt("room_id"),
                rs.getString("name"),
                rs.getTimestamp("created_at"),
                rs.getString("type"),
                rs.getBoolean("is_private")
        );
    }
}
