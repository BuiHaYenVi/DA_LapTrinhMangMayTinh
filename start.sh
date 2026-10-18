#!/bin/bash
set -e

echo "============================================================"
echo "  KHỞI ĐỘNG HỆ THỐNG DISCORD MINI TRÊN RENDER / CLOUD"
echo "  HTTP Port (Render Web Service): ${PORT:-8080}"
echo "  ChatServer TCP Port (Internal): 5000"
echo "============================================================"

# 1. Khởi chạy ChatServer (TCP socket trên localhost:5000) ở background
java -Dfile.encoding=UTF-8 -cp "Chatserver/build/classes:Chatserver/lib/*" com.discordmini.server.ServerApplication &
SERVER_PID=$!

echo "[Start] ChatServer TCP đã khởi động với PID: $SERVER_PID"

# Chờ 3 giây để ChatServer kết nối database và chạy migration
sleep 3

# 2. Khởi chạy UiBridgeServer (phục vụ Frontend và API HTTP/SSE lắng nghe trên $PORT)
echo "[Start] Khởi động UiBridgeServer kết nối tới ChatServer 127.0.0.1:5000..."
exec java -Dfile.encoding=UTF-8 -cp "ChatClient/build/classes" com.discordmini.client.ClientApplication 127.0.0.1 5000
