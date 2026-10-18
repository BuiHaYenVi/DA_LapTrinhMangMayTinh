package com.discordmini.server.config;

import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.Statement;

/**
 * Quản lý tự động kiểm tra và nâng cấp cơ sở dữ liệu (Database Migration).
 * Tách biệt mô hình PHÒNG (Room) và KÊNH (Channel).
 * Bảo toàn 100% dữ liệu phòng cũ và đưa lịch sử tin nhắn vào kênh mặc định 'chung' của từng phòng.
 */
public class DatabaseMigration {

    public static void runMigration() {
        System.out.println("[MIGRATION] Bắt đầu kiểm tra và nâng cấp cơ sở dữ liệu (Rooms & Channels)...");
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) {
                System.err.println("[MIGRATION ERROR] Không thể kết nối cơ sở dữ liệu.");
                return;
            }

            try (Statement st = conn.createStatement()) {
                // 1. Tạo bảng channels
                st.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS channels (
                        id SERIAL PRIMARY KEY,
                        room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
                        name VARCHAR(50) NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT uq_room_channel_name UNIQUE (room_id, name)
                    )
                """);
                System.out.println("[MIGRATION] Đã kiểm tra/khởi tạo bảng 'channels'.");

                // 2. Thêm cột channel_id vào messages
                st.executeUpdate("""
                    ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id INT REFERENCES channels(id) ON DELETE CASCADE
                """);
                System.out.println("[MIGRATION] Đã kiểm tra/bổ sung cột 'channel_id' trong bảng 'messages'.");

                // 3. Tạo index
                st.executeUpdate("CREATE INDEX IF NOT EXISTS idx_channels_room_id ON channels(room_id)");
                st.executeUpdate("CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id)");

                // 4. Di chuyển dữ liệu: Tạo kênh 'chung' cho tất cả các phòng hiện có chưa có kênh 'chung'
                int newChannelsCount = st.executeUpdate("""
                    INSERT INTO channels (room_id, name, created_at)
                    SELECT r.id, 'chung', r.created_at
                    FROM rooms r
                    WHERE NOT EXISTS (
                        SELECT 1 FROM channels c WHERE c.room_id = r.id AND c.name = 'chung'
                    )
                """);
                System.out.println("[MIGRATION] Đã đồng bộ kênh mặc định 'chung' cho các phòng (mới thêm: " + newChannelsCount + ").");

                // 5. Cập nhật các tin nhắn cũ chưa có channel_id vào kênh 'chung' tương ứng của phòng đó
                int updatedMessages = st.executeUpdate("""
                    UPDATE messages m
                    SET channel_id = c.id
                    FROM channels c
                    WHERE m.channel_id IS NULL
                      AND c.room_id = m.room_id
                      AND c.name = 'chung'
                """);
                System.out.println("[MIGRATION] Đã cập nhật " + updatedMessages + " tin nhắn cũ vào đúng kênh tương ứng.");

                // Thống kê kết quả
                try (ResultSet rs = st.executeQuery("SELECT COUNT(*) FROM channels")) {
                    if (rs.next()) {
                        System.out.println("[MIGRATION THÀNH CÔNG] Tổng số kênh hiện tại trong CSDL: " + rs.getInt(1));
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("[MIGRATION LỖI] Lỗi trong quá trình nâng cấp CSDL: " + e.getMessage());
            e.printStackTrace();
        }
    }
}
