#!/bin/bash
set -e

echo "============================================================"
echo "  KHỞI ĐỘNG HỆ THỐNG HUDDLE TRÊN RENDER / CLOUD"
echo "  HTTP Port (Render Web Service): ${PORT:-8080}"
echo "  ChatServer TCP Port (Internal): 5000"
echo "============================================================"

# 1. Khởi chạy ChatServer TCP có vòng lặp tự động phục hồi nếu có lỗi
(
  while true; do
    echo "[ChatServer] Đang chạy com.discordmini.server.ServerApplication..."
    java -Dfile.encoding=UTF-8 -cp "Chatserver/build/classes:Chatserver/lib/*" com.discordmini.server.ServerApplication || true
    echo "[ChatServer CẢNH BÁO] ChatServer đã dừng, tự động khởi động lại sau 2 giây..."
    sleep 2
  done
) &

# Chờ cổng TCP 5000 mở (tối đa 15 giây)
echo "[Start] Đang kiểm tra cổng 5000 của ChatServer..."
for i in $(seq 1 15); do
  if (echo > /dev/tcp/127.0.0.1/5000) >/dev/null 2>&1; then
    echo "[Start] ChatServer TCP đã sẵn sàng và đang lắng nghe trên cổng 5000!"
    break
  fi
  sleep 1
done

# 2. Khởi chạy UiBridgeServer (phục vụ Frontend và API HTTP/SSE lắng nghe trên $PORT)
echo "[Start] Khởi động UiBridgeServer kết nối tới ChatServer 127.0.0.1:5000..."
exec java -Dfile.encoding=UTF-8 -cp "ChatClient/build/classes" com.discordmini.client.ClientApplication 127.0.0.1 5000
