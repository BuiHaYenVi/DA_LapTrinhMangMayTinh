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

    public static void main(String[] args) {
        runMigration();
    }

    public static void runMigration() {
        System.out.println("[MIGRATION] Bắt đầu kiểm tra và nâng cấp cơ sở dữ liệu (Rooms & Channels)...");
        try (Connection conn = DatabaseConnection.getConnection()) {
            if (conn == null) {
                System.err.println("[MIGRATION ERROR] Không thể kết nối cơ sở dữ liệu.");
                return;
            }

            try (Statement st = conn.createStatement()) {
                // 0. Tạo các bảng nền tảng nếu là CSDL mới hoàn toàn trên Render/Cloud
                st.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS users (
                        id SERIAL PRIMARY KEY,
                        username VARCHAR(50) UNIQUE NOT NULL,
                        password VARCHAR(255) NOT NULL,
                        display_name VARCHAR(100) NOT NULL,
                        status VARCHAR(20) DEFAULT 'OFFLINE',
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """);
                st.executeUpdate("ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'OFFLINE'");

                st.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS rooms (
                        id SERIAL PRIMARY KEY,
                        name VARCHAR(100) UNIQUE NOT NULL,
                        created_by INT REFERENCES users(id) ON DELETE SET NULL,
                        description TEXT DEFAULT '',
                        invite_code VARCHAR(20) DEFAULT '',
                        is_private BOOLEAN DEFAULT FALSE,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """);
                st.executeUpdate("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''");
                st.executeUpdate("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS invite_code VARCHAR(20) DEFAULT ''");
                st.executeUpdate("ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT FALSE");
                st.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS room_members (
                        id SERIAL PRIMARY KEY,
                        room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
                        user_id INT REFERENCES users(id) ON DELETE CASCADE,
                        role VARCHAR(20) DEFAULT 'MEMBER',
                        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        UNIQUE(room_id, user_id)
                    )
                """);
                st.executeUpdate("ALTER TABLE room_members ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'MEMBER'");

                st.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS messages (
                        id SERIAL PRIMARY KEY,
                        room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
                        sender_id INT REFERENCES users(id) ON DELETE CASCADE,
                        content TEXT NOT NULL,
                        sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """);
                st.executeUpdate("ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_id INT REFERENCES users(id) ON DELETE CASCADE");
                st.executeUpdate("ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE");
                st.executeUpdate("ALTER TABLE messages ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP");

                st.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS friendships (
                        id SERIAL PRIMARY KEY,
                        requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        addressee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        status VARCHAR(20) DEFAULT 'PENDING' NOT NULL,
                        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                        CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id),
                        UNIQUE(requester_id, addressee_id)
                    )
                """);

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
                System.out.println("[MIGRATION] Đã kiểm tra/bổ sung cột 'channel_id' và 'is_edited' trong bảng 'messages'.");

                // 3. Tạo index
                st.executeUpdate("CREATE INDEX IF NOT EXISTS idx_channels_room_id ON channels(room_id)");
                st.executeUpdate("CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id)");

                // 3b. Tạo bảng direct_messages lưu tin nhắn riêng 1-1
                st.executeUpdate("""
                    CREATE TABLE IF NOT EXISTS direct_messages (
                        id SERIAL PRIMARY KEY,
                        sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        content TEXT NOT NULL,
                        sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                        is_read BOOLEAN DEFAULT FALSE,
                        is_edited BOOLEAN DEFAULT FALSE
                    )
                """);
                st.executeUpdate("ALTER TABLE direct_messages ADD COLUMN IF NOT EXISTS is_edited BOOLEAN DEFAULT FALSE");
                st.executeUpdate("CREATE INDEX IF NOT EXISTS idx_dm_pair ON direct_messages(sender_id, receiver_id)");
                st.executeUpdate("CREATE INDEX IF NOT EXISTS idx_dm_recv ON direct_messages(receiver_id, is_read)");

                // 3c. Chuyển đổi cột sent_at cũ sang TIMESTAMPTZ (coi dữ liệu cũ theo giờ Asia/Bangkok)
                try {
                    st.executeUpdate("""
                        ALTER TABLE direct_messages 
                        ALTER COLUMN sent_at TYPE TIMESTAMPTZ 
                        USING sent_at AT TIME ZONE 'Asia/Bangkok'
                    """);
                } catch (Exception ignored) {
                    // Cột đã là TIMESTAMPTZ hoặc bảng vừa được tạo
                }
                System.out.println("[MIGRATION] Đã kiểm tra/khởi tạo bảng 'direct_messages' với TIMESTAMPTZ.");

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
