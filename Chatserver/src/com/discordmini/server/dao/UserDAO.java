package com.discordmini.server.dao;

import com.discordmini.server.model.User;

import java.sql.*;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * [HAI-03] User DAO: Thực hiện các thao tác CRUD với bảng users.
 * Sử dụng PreparedStatement và try-with-resources để quản lý bộ nhớ an toàn.
 */
public class UserDAO {

    /**
     * Đăng ký tài khoản mới với username và password.
     * Trả về boolean đại diện cho kết quả thành công.
     */
    public boolean register(String username, String password) throws SQLException {
        User created = register(username, password, username);
        return created != null;
    }

    /**
     * Đăng ký tài khoản mới đầy đủ thông tin (username, password, display_name).
     * Trả về đối tượng User vừa tạo hoặc null nếu trùng lặp/lỗi.
     */
    public User register(String username, String password, String displayName) throws SQLException {
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            return null;
        }

        String checkSql = "SELECT id FROM users WHERE LOWER(username) = LOWER(?)";
        String insertSql = "INSERT INTO users (username, password, display_name, status) VALUES (?, ?, ?, 'OFFLINE') RETURNING id, created_at";

        try (Connection conn = DatabaseConnection.getConnection()) {
            // Kiểm tra trùng username
            try (PreparedStatement checkPs = conn.prepareStatement(checkSql)) {
                checkPs.setString(1, username.trim());
                try (ResultSet checkRs = checkPs.executeQuery()) {
                    if (checkRs.next()) {
                        System.err.println("[UserDAO] Username đã tồn tại: " + username);
                        return null;
                    }
                }
            }

            // Chèn tài khoản mới với mật khẩu đã băm PBKDF2
            String hashedPassword = com.discordmini.server.security.PasswordUtil.hashPassword(password);
            try (PreparedStatement insertPs = conn.prepareStatement(insertSql)) {
                insertPs.setString(1, username.trim());
                insertPs.setString(2, hashedPassword);
                insertPs.setString(3, (displayName == null || displayName.isBlank()) ? username.trim() : displayName.trim());

                try (ResultSet rs = insertPs.executeQuery()) {
                    if (rs.next()) {
                        int id = rs.getInt("id");
                        Timestamp createdAt = rs.getTimestamp("created_at");
                        return new User(id, username.trim(), hashedPassword, displayName, "OFFLINE", createdAt);
                    }
                }
            }
        }
        return null;
    }

    /**
     * Xác thực đăng nhập với username và password.
     * Sử dụng PasswordUtil hỗ trợ cả PBKDF2 và tự động nâng cấp plaintext cũ.
     */
    public User login(String username, String password) throws SQLException {
        if (username == null || password == null) return null;

        String sql = "SELECT id, username, password, display_name, status, created_at FROM users WHERE LOWER(username) = LOWER(?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, username.trim());

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    String storedPassword = rs.getString("password");
                    if (com.discordmini.server.security.PasswordUtil.verifyPassword(password, storedPassword)) {
                        int userId = rs.getInt("id");
                        User user = new User(
                            userId,
                            rs.getString("username"),
                            storedPassword,
                            rs.getString("display_name"),
                            rs.getString("status"),
                            rs.getTimestamp("created_at")
                        );
                        // Tự động nâng cấp băm mật khẩu nếu tài khoản đang dùng plaintext cũ
                        if (com.discordmini.server.security.PasswordUtil.needsRehash(storedPassword)) {
                            updateUserPassword(userId, com.discordmini.server.security.PasswordUtil.hashPassword(password));
                        }
                        // Cập nhật trạng thái thành ONLINE sau khi đăng nhập thành công
                        updateUserStatus(user.getId(), "ONLINE");
                        user.setStatus("ONLINE");
                        return user;
                    }
                }
            }
        }
        return null;
    }

    /**
     * Cập nhật mật khẩu mới (đã băm) cho tài khoản.
     */
    public boolean updateUserPassword(int userId, String newHashedPassword) {
        String sql = "UPDATE users SET password = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newHashedPassword);
            ps.setInt(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi cập nhật mật khẩu user (ID=" + userId + "): " + e.getMessage());
            return false;
        }
    }
    /**
     * Cập nhật thông tin hồ sơ (Tên hiển thị) cho người dùng.
     * Kiểm tra độ dài từ 1 đến 32 ký tự và escape an toàn với PreparedStatement.
     */
    public boolean updateProfile(int userId, String displayName) {
        if (displayName == null || displayName.isBlank()) {
            return false;
        }
        String trimmed = displayName.trim();
        if (trimmed.length() > 32) {
            trimmed = trimmed.substring(0, 32);
        }
        String sql = "UPDATE users SET display_name = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, trimmed);
            ps.setInt(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi cập nhật hồ sơ user (ID=" + userId + "): " + e.getMessage());
            return false;
        }
    }

    /**
     * Đổi mật khẩu cho người dùng:
     * Kiểm tra mật khẩu cũ, kiểm tra độ dài mật khẩu mới (tối thiểu 6 ký tự),
     * băm bằng PBKDF2 và lưu vào CSDL.
     */
    public boolean changePassword(int userId, String oldPassword, String newPassword) {
        if (oldPassword == null || newPassword == null || newPassword.trim().length() < 6) {
            return false;
        }
        User user = findById(userId);
        if (user == null) {
            return false;
        }
        // Kiểm tra khớp mật khẩu cũ
        if (!com.discordmini.server.security.PasswordUtil.verifyPassword(oldPassword, user.getPassword())) {
            return false;
        }
        String hashedNew = com.discordmini.server.security.PasswordUtil.hashPassword(newPassword.trim());
        return updateUserPassword(userId, hashedNew);
    }
    /**
     * Cập nhật trạng thái ONLINE / OFFLINE cho tài khoản.
     */
    public boolean updateUserStatus(int userId, String status) {
        String sql = "UPDATE users SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, status != null ? status.toUpperCase() : "OFFLINE");
            ps.setInt(2, userId);

            int updated = ps.executeUpdate();
            return updated > 0;
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi cập nhật status user (ID=" + userId + "): " + e.getMessage());
            return false;
        }
    }

    /**
     * Tìm kiếm thông tin người dùng theo ID.
     */
    public User findById(int id) {
        String sql = "SELECT id, username, password, display_name, status, created_at FROM users WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setInt(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new User(
                        rs.getInt("id"),
                        rs.getString("username"),
                        rs.getString("password"),
                        rs.getString("display_name"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at")
                    );
                }
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi findById (ID=" + id + "): " + e.getMessage());
        }
        return null;
    }

    /**
     * Tìm kiếm người dùng theo Username (Không phân biệt hoa thường).
     */
    public User findByUsername(String username) {
        return findUser(username);
    }

    /**
     * Tìm kiếm người dùng theo Username (Alias method cho tương thích mã nguồn cũ).
     */
    public User findUser(String username) {
        if (username == null) return null;
        String sql = "SELECT id, username, password, display_name, status, created_at FROM users WHERE LOWER(username) = LOWER(?)";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            
            ps.setString(1, username.trim());
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return new User(
                        rs.getInt("id"),
                        rs.getString("username"),
                        rs.getString("password"),
                        rs.getString("display_name"),
                        rs.getString("status"),
                        rs.getTimestamp("created_at")
                    );
                }
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi findUser ('" + username + "'): " + e.getMessage());
        }
        return null;
    }

    /**
     * Lấy danh sách toàn bộ người dùng trong CSDL.
     */
    public Collection<User> allUsers() {
        List<User> list = new ArrayList<>();
        String sql = "SELECT id, username, password, display_name, status, created_at FROM users ORDER BY id ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             Statement stmt = conn.createStatement();
             ResultSet rs = stmt.executeQuery(sql)) {
            
            while (rs.next()) {
                list.add(new User(
                    rs.getInt("id"),
                    rs.getString("username"),
                    rs.getString("password"),
                    rs.getString("display_name"),
                    rs.getString("status"),
                    rs.getTimestamp("created_at")
                ));
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi lấy danh sách allUsers: " + e.getMessage());
        }
        return list;
    }
}
