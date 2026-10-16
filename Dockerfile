# Multi-stage build for DiscordMini Java Server
FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /app
COPY . .

# Compile Chatserver Java classes with PostgreSQL driver in classpath
RUN mkdir -p /app/bin && \
    find Chatserver/src -name "*.java" > sources.txt && \
    javac -encoding UTF-8 -d /app/bin -cp "Chatserver/lib/*" @sources.txt

# Runtime image
FROM eclipse-temurin:21-jre-alpine

WORKDIR /app
COPY --from=builder /app/bin /app/bin
COPY --from=builder /app/Chatserver/lib /app/lib

EXPOSE 5000

ENV DISCORD_SERVER_PORT=5000

CMD ["java", "-cp", "bin:lib/*", "com.discordmini.server.ServerApplication"]
