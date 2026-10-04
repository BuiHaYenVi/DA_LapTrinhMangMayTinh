package com.discordmini.server.dao;

import com.discordmini.server.model.User;

import java.sql.*;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Locale;

public class UserDAO {

    public User register(String username, String password, String displayName) throws SQLException {
        String sql = "INSERT INTO users (username, password, display_name) VALUES (?, ?, ?) RETURNING id";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ps.setString(2, password);
            ps.setString(3, displayName);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                int id = rs.getInt("id");
                return new User(id, username, password, displayName);
            }
        }
        return null;
    }

    public User login(String username, String password) throws SQLException {
        String sql = "SELECT id, username, password, display_name FROM users WHERE LOWER(username) = LOWER(?) AND password = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ps.setString(2, password);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return new User(rs.getInt("id"), rs.getString("username"), rs.getString("password"), rs.getString("display_name"));
            }
        }
        return null;
    }

    public User findUser(String username) throws SQLException {
        String sql = "SELECT id, username, password, display_name FROM users WHERE LOWER(username) = LOWER(?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, username);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return new User(rs.getInt("id"), rs.getString("username"), rs.getString("password"), rs.getString("display_name"));
            }
        }
        return null;
    }

    public User findById(int id) throws SQLException {
        String sql = "SELECT id, username, password, display_name FROM users WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, id);
            ResultSet rs = ps.executeQuery();
            if (rs.next()) {
                return new User(rs.getInt("id"), rs.getString("username"), rs.getString("password"), rs.getString("display_name"));
            }
        }
        return null;
    }

    public Collection<User> allUsers() throws SQLException {
        List<User> result = new ArrayList<>();
        String sql = "SELECT id, username, password, display_name FROM users ORDER BY id ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            while (rs.next()) {
                result.add(new User(rs.getInt("id"), rs.getString("username"), rs.getString("password"), rs.getString("display_name")));
            }
        }
        return result;
    }
}
