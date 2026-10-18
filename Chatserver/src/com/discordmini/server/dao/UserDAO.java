package com.discordmini.server.dao;

import com.discordmini.server.config.DatabaseConnection;
import com.discordmini.server.model.User;

import java.sql.*;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

/**
 * [HAI-03] User DAO: Thực hiện các thao tác CRUD với bảng users.
 * Sử dụng PreparedStatement và try-with-resources để quản lý bộ nhớ an toàn.
 * Hỗ trợ tự phục hồi (Self-healing schema): tự động bổ sung cột status nếu CSDL cũ chưa có.
 */
public class UserDAO {

    public UserDAO() {
        // Tự động kiểm tra và đảm bảo bảng users luôn có cột status ngay khi khởi tạo DAO
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn != null) {
                ensureStatusColumnExists(conn);
            }
        } catch (Exception ignored) {}
    }

    /**
     * Đảm bảo cột status luôn tồn tại trong bảng users.
     */
    public static void ensureStatusColumnExists(Connection conn) {
        if (conn == null) return;
        try (Statement st = conn.createStatement()) {
            st.executeUpdate("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'OFFLINE'");
        } catch (Exception e) {
            System.err.println("[UserDAO] Kiểm tra cột status users: " + e.getMessage());
        }
    }

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
            if (conn == null) {
                throw new SQLException("Không thể kết nối đến cơ sở dữ liệu.");
            }
            ensureStatusColumnExists(conn);

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
            } catch (SQLException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("status")) {
                    ensureStatusColumnExists(conn);
                    // Thử chèn không có cột status nếu hệ thống hạn chế ALTER
                    String fallbackInsert = "INSERT INTO users (username, password, display_name) VALUES (?, ?, ?) RETURNING id, created_at";
                    try (PreparedStatement fallbackPs = conn.prepareStatement(fallbackInsert)) {
                        fallbackPs.setString(1, username.trim());
                        fallbackPs.setString(2, hashedPassword);
                        fallbackPs.setString(3, (displayName == null || displayName.isBlank()) ? username.trim() : displayName.trim());
                        try (ResultSet rs = fallbackPs.executeQuery()) {
                            if (rs.next()) {
                                int id = rs.getInt("id");
                                Timestamp createdAt = rs.getTimestamp("created_at");
                                return new User(id, username.trim(), hashedPassword, displayName, "OFFLINE", createdAt);
                            }
                        }
                    }
                }
                throw e;
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
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) {
                throw new SQLException("Không thể kết nối đến cơ sở dữ liệu.");
            }

            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, username.trim());
                try (ResultSet rs = ps.executeQuery()) {
                    return extractUserFromResultSet(conn, rs, password);
                }
            } catch (SQLException e) {
                // Tự phục hồi: Nếu cột status chưa có, tự động ALTER TABLE và truy vấn lại
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("status")) {
                    ensureStatusColumnExists(conn);
                    try (PreparedStatement ps = conn.prepareStatement(sql)) {
                        ps.setString(1, username.trim());
                        try (ResultSet rs = ps.executeQuery()) {
                            return extractUserFromResultSet(conn, rs, password);
                        }
                    } catch (SQLException e2) {
                        // Fallback: Truy vấn không có cột status nếu CSDL không cho phép ALTER
                        String fallbackSql = "SELECT id, username, password, display_name, created_at FROM users WHERE LOWER(username) = LOWER(?)";
                        try (PreparedStatement ps = conn.prepareStatement(fallbackSql)) {
                            ps.setString(1, username.trim());
                            try (ResultSet rs = ps.executeQuery()) {
                                return extractUserFromResultSet(conn, rs, password);
                            }
                        }
                    }
                }
                throw e;
            }
        }
    }

    private User extractUserFromResultSet(Connection conn, ResultSet rs, String password) throws SQLException {
        if (rs.next()) {
            String storedPassword = rs.getString("password");
            if (com.discordmini.server.security.PasswordUtil.verifyPassword(password, storedPassword)) {
                int userId = rs.getInt("id");
                String status = "OFFLINE";
                try {
                    status = rs.getString("status");
                } catch (Exception ignored) {}

                User user = new User(
                    userId,
                    rs.getString("username"),
                    storedPassword,
                    rs.getString("display_name"),
                    status != null ? status : "OFFLINE",
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
     * Cập nhật thông tin hồ sơ (Tên hiển thị) của người dùng.
     */
    public boolean updateProfile(int userId, String newDisplayName) {
        if (newDisplayName == null || newDisplayName.isBlank()) return false;
        String sql = "UPDATE users SET display_name = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, newDisplayName.trim());
            ps.setInt(2, userId);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi cập nhật display_name user (ID=" + userId + "): " + e.getMessage());
            return false;
        }
    }

    /**
     * Đổi mật khẩu tài khoản sau khi kiểm tra mật khẩu cũ.
     */
    public boolean changePassword(int userId, String oldPassword, String newPassword) {
        if (oldPassword == null || newPassword == null || newPassword.isBlank()) return false;
        User user = findById(userId);
        if (user == null) return false;

        if (com.discordmini.server.security.PasswordUtil.verifyPassword(oldPassword, user.getPassword())) {
            String newHashed = com.discordmini.server.security.PasswordUtil.hashPassword(newPassword);
            return updateUserPassword(userId, newHashed);
        }
        return false;
    }

    /**
     * Cập nhật trạng thái trực tuyến (ONLINE/OFFLINE) của người dùng.
     */
    public boolean updateUserStatus(int userId, String status) {
        String sql = "UPDATE users SET status = ? WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return false;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, status != null ? status.toUpperCase() : "OFFLINE");
                ps.setInt(2, userId);
                return ps.executeUpdate() > 0;
            } catch (SQLException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("status")) {
                    ensureStatusColumnExists(conn);
                    try (PreparedStatement ps = conn.prepareStatement(sql)) {
                        ps.setString(1, status != null ? status.toUpperCase() : "OFFLINE");
                        ps.setInt(2, userId);
                        return ps.executeUpdate() > 0;
                    }
                }
                System.err.println("[UserDAO ERROR] Lỗi cập nhật status user (ID=" + userId + "): " + e.getMessage());
                return false;
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi kết nối cập nhật status user: " + e.getMessage());
            return false;
        }
    }

    /**
     * Tìm kiếm thông tin người dùng theo ID.
     */
    public User findById(int id) {
        String sql = "SELECT id, username, password, display_name, status, created_at FROM users WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return null;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, id);
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        String status = "OFFLINE";
                        try {
                            status = rs.getString("status");
                        } catch (Exception ignored) {}
                        return new User(
                            rs.getInt("id"),
                            rs.getString("username"),
                            rs.getString("password"),
                            rs.getString("display_name"),
                            status != null ? status : "OFFLINE",
                            rs.getTimestamp("created_at")
                        );
                    }
                }
            } catch (SQLException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("status")) {
                    ensureStatusColumnExists(conn);
                    return findById(id);
                }
                System.err.println("[UserDAO ERROR] Lỗi findById (ID=" + id + "): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi kết nối findById: " + e.getMessage());
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
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return null;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setString(1, username.trim());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        String status = "OFFLINE";
                        try {
                            status = rs.getString("status");
                        } catch (Exception ignored) {}
                        return new User(
                            rs.getInt("id"),
                            rs.getString("username"),
                            rs.getString("password"),
                            rs.getString("display_name"),
                            status != null ? status : "OFFLINE",
                            rs.getTimestamp("created_at")
                        );
                    }
                }
            } catch (SQLException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("status")) {
                    ensureStatusColumnExists(conn);
                    return findUser(username);
                }
                System.err.println("[UserDAO ERROR] Lỗi findUser ('" + username + "'): " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi kết nối findUser: " + e.getMessage());
        }
        return null;
    }

    /**
     * Lấy danh sách toàn bộ người dùng trong CSDL.
     */
    public Collection<User> allUsers() {
        List<User> list = new ArrayList<>();
        String sql = "SELECT id, username, password, display_name, status, created_at FROM users ORDER BY id ASC";
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) return list;
            try (Statement stmt = conn.createStatement();
                 ResultSet rs = stmt.executeQuery(sql)) {
                
                while (rs.next()) {
                    String status = "OFFLINE";
                    try {
                        status = rs.getString("status");
                    } catch (Exception ignored) {}
                    list.add(new User(
                        rs.getInt("id"),
                        rs.getString("username"),
                        rs.getString("password"),
                        rs.getString("display_name"),
                        status != null ? status : "OFFLINE",
                        rs.getTimestamp("created_at")
                    ));
                }
            } catch (SQLException e) {
                if (e.getMessage() != null && e.getMessage().toLowerCase().contains("status")) {
                    ensureStatusColumnExists(conn);
                    return allUsers();
                }
                System.err.println("[UserDAO ERROR] Lỗi lấy danh sách allUsers: " + e.getMessage());
            }
        } catch (SQLException e) {
            System.err.println("[UserDAO ERROR] Lỗi kết nối allUsers: " + e.getMessage());
        }
        return list;
    }
}
