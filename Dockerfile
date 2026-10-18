# ==============================================================================
# DISCORD MINI - MULTI-STAGE DOCKERFILE CHO RENDER / CLOUD DEPLOYMENT
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Compile Java ChatServer & ChatClient
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jdk-jammy AS java-builder
WORKDIR /app

# Sao chép mã nguồn và thư viện
COPY Chatserver/lib ./Chatserver/lib
COPY Chatserver/src ./Chatserver/src
COPY ChatClient/src ./ChatClient/src

# Biên dịch ChatServer với thư viện PostgreSQL JDBC
RUN mkdir -p Chatserver/build/classes && \
    javac -encoding UTF-8 -cp "Chatserver/lib/*" -d Chatserver/build/classes $(find Chatserver/src -name "*.java")

# Biên dịch ChatClient (UiBridgeServer)
RUN mkdir -p ChatClient/build/classes && \
    javac -encoding UTF-8 -d ChatClient/build/classes $(find ChatClient/src -name "*.java")

# ------------------------------------------------------------------------------
# Stage 3: Runtime image nhỏ gọn
# ------------------------------------------------------------------------------
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app

# Sao chép các file class đã biên dịch và lib
COPY --from=java-builder /app/Chatserver/build/classes ./Chatserver/build/classes
COPY --from=java-builder /app/Chatserver/lib ./Chatserver/lib
COPY --from=java-builder /app/ChatClient/build/classes ./ChatClient/build/classes

# Sao chép bản build frontend tĩnh vào frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Sao chép script khởi động và chuẩn hóa LF (tránh lỗi CRLF từ Windows)
COPY start.sh ./
RUN sed -i 's/\r$//' start.sh && chmod +x start.sh

# Cổng mặc định
EXPOSE 8080

CMD ["./start.sh"]
