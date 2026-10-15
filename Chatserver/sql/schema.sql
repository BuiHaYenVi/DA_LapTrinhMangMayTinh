-- ============================================================
-- DISCORD MINI - POSTGRESQL DATABASE SCHEMA
-- File: Chatserver/sql/schema.sql
-- Description: DDL script to create tables, indexes, and constraints
-- ============================================================

-- Drop tables if exists (Order matters due to Foreign Keys)
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS room_members CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 1. [HAI-01] Table: users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    status VARCHAR(20) DEFAULT 'OFFLINE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. [HAI-01] Table: rooms
CREATE TABLE rooms (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. [HAI-01] Table: room_members
CREATE TABLE room_members (
    room_id INT REFERENCES rooms(id) ON DELETE CASCADE,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id)
);

-- 4. [HAI-01] Table: messages
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    room_id INT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for optimizing history retrieval ordered by sent_at DESC
CREATE INDEX idx_messages_room_sent_at ON messages(room_id, sent_at DESC);

-- Index for user lookup by username (case-insensitive search)
CREATE INDEX idx_users_username_lower ON users(LOWER(username));

-- Initial Seed Data
INSERT INTO users (username, password, display_name, status) VALUES
('system', 'system_protected_pwd', 'Hệ Thống', 'ONLINE'),
('vinh', '123456', 'Vinh Vũ', 'OFFLINE'),
('nam', '123456', 'Nam Nguyễn', 'OFFLINE')
ON CONFLICT (username) DO NOTHING;

INSERT INTO rooms (name, created_by) VALUES
('General', 1),
('Gaming', 1),
('Study', 1)
ON CONFLICT (name) DO NOTHING;

INSERT INTO room_members (room_id, user_id) VALUES
(1, 1), (1, 2), (1, 3),
(2, 1), (2, 2),
(3, 1), (3, 3)
ON CONFLICT DO NOTHING;
