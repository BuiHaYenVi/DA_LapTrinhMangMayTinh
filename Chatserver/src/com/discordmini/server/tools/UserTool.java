package com.discordmini.server.tools;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Timestamp;
import com.discordmini.server.config.DatabaseConnection;

/**
 * Công cụ quản lý người dùng tiện ích:
 * - Xem danh sách người dùng trong Database (PostgreSQL).
 * - Xóa tài khoản test theo username hoặc ID một cách an toàn (tự động cascade).
 */
public class UserTool {

    public static void main(String[] args) {
        if (args.length == 0 || args[0].equalsIgnoreCase("list")) {
            listUsers();
            return;
        }

        String command = args[0].toLowerCase();
        if (command.equals("delete") || command.equals("remove")) {
            if (args.length < 2) {
                System.out.println("Cú pháp: java com.discordmini.server.tools.UserTool delete <username_hoặc_id>");
                return;
            }
            deleteUser(args[1]);
        } else if (command.equals("clean-test")) {
            cleanAutoTestUsers();
        } else {
            System.out.println("Lệnh không hợp lệ. Các lệnh hỗ trợ:");
            System.out.println("  list                     : Xem toàn bộ tài khoản");
            System.out.println("  delete <username_hoac_id>: Xóa tài khoản theo username hoặc ID");
            System.out.println("  clean-test               : Dọn dẹp tất cả tài khoản test tự động");
        }
    }

    public static void listUsers() {
        String sql = "SELECT id, username, display_name, status, created_at FROM users ORDER BY id ASC";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {

            System.out.println("==========================================================================");
            System.out.printf("%-6s | %-16s | %-20s | %-10s | %s%n", "ID", "USERNAME", "DISPLAY NAME", "STATUS", "NGÀY TẠO");
            System.out.println("--------------------------------------------------------------------------");

            int count = 0;
            while (rs.next()) {
                int id = rs.getInt("id");
                String username = rs.getString("username");
                String displayName = rs.getString("display_name");
                String status = rs.getString("status");
                Timestamp createdAt = rs.getTimestamp("created_at");

                System.out.printf("%-6d | %-16s | %-20s | %-10s | %s%n",
                        id, username, displayName, status, createdAt != null ? createdAt.toString() : "N/A");
                count++;
            }
            System.out.println("==========================================================================");
            System.out.println("Tổng số tài khoản: " + count);

        } catch (Exception e) {
            System.err.println("[LỖI] Không thể đọc danh sách người dùng: " + e.getMessage());
        }
    }

    public static void deleteUser(String identifier) {
        boolean isId = identifier.matches("\\d+");
        String findSql = isId ? "SELECT id, username, display_name FROM users WHERE id = ?"
                              : "SELECT id, username, display_name FROM users WHERE LOWER(username) = LOWER(?)";

        try (Connection conn = DatabaseConnection.getConnection()) {
            int userId = -1;
            String username = null;
            String displayName = null;

            try (PreparedStatement psFind = conn.prepareStatement(findSql)) {
                if (isId) {
                    psFind.setInt(1, Integer.parseInt(identifier));
                } else {
                    psFind.setString(1, identifier.trim());
                }
                try (ResultSet rs = psFind.executeQuery()) {
                    if (rs.next()) {
                        userId = rs.getInt("id");
                        username = rs.getString("username");
                        displayName = rs.getString("display_name");
                    }
                }
            }

            if (userId == -1) {
                System.out.println("[THÔNG BÁO] Không tìm thấy tài khoản với: " + identifier);
                return;
            }

            String deleteSql = "DELETE FROM users WHERE id = ?";
            try (PreparedStatement psDelete = conn.prepareStatement(deleteSql)) {
                psDelete.setInt(1, userId);
                int affected = psDelete.executeUpdate();
                if (affected > 0) {
                    System.out.println("[THÀNH CÔNG] Đã xóa tài khoản: ID=" + userId + " | @" + username + " (" + displayName + ")");
                } else {
                    System.out.println("[THẤT BẠI] Không thể xóa tài khoản ID=" + userId);
                }
            }

        } catch (Exception e) {
            System.err.println("[LỖI] Khi xóa tài khoản: " + e.getMessage());
        }
    }

    public static void cleanAutoTestUsers() {
        String testPatternSql = "DELETE FROM users WHERE username LIKE 'tester_%' "
                + "OR username LIKE 'web_u%' "
                + "OR username LIKE 'autotest_%' "
                + "OR username LIKE 'owner_%' "
                + "OR username LIKE 'member_%' "
                + "OR username LIKE 'reg_tester_%' "
                + "OR username LIKE 'userA_%' "
                + "OR username LIKE 'userB_%' "
                + "OR username LIKE 'auto_%' "
                + "OR username LIKE 'diag_%' "
                + "OR username LIKE 'test_user_%'";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(testPatternSql)) {
            int affected = ps.executeUpdate();
            System.out.println("[THÀNH CÔNG] Đã dọn dẹp sạch sẽ " + affected + " tài khoản test tự động!");
        } catch (Exception e) {
            System.err.println("[LỖI] Khi dọn dẹp tài khoản test: " + e.getMessage());
        }
    }
}
