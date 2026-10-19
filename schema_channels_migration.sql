-- ============================================================
-- DISCORD MINI - DATABASE MIGRATION: ROOMS & CHANNELS
-- ============================================================

-- 1. Tạo bảng channels nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS channels (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_room_channel_name UNIQUE (room_id, name)
);

-- 2. Thêm cột channel_id vào bảng messages nếu chưa có
ALTER TABLE messages ADD COLUMN IF NOT EXISTS channel_id INT REFERENCES channels(id) ON DELETE CASCADE;

-- 3. Migration an toàn: Tạo kênh mặc định 'chung' cho tất cả các phòng hiện có chưa có kênh 'chung'
INSERT INTO channels (room_id, name, created_at)
SELECT r.id, 'chung', r.created_at
FROM rooms r
WHERE NOT EXISTS (
    SELECT 1 FROM channels c WHERE c.room_id = r.id AND c.name = 'chung'
);

-- 4. Migration an toàn: Cập nhật các tin nhắn cũ chưa có channel_id gán vào kênh 'chung' của chính phòng đó
UPDATE messages m
SET channel_id = c.id
FROM channels c
WHERE m.channel_id IS NULL
  AND c.room_id = m.room_id
  AND c.name = 'chung';

-- 5. Tạo index tăng tốc truy vấn theo channel_id
CREATE INDEX IF NOT EXISTS idx_channels_room_id ON channels(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_channel_id ON messages(channel_id);
