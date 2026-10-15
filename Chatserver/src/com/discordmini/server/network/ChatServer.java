package com.discordmini.server.network;

import com.discordmini.server.dao.MessageDAO;
import com.discordmini.server.dao.RoomDAO;
import com.discordmini.server.dao.UserDAO;
import com.discordmini.server.manager.ClientManager;
import com.discordmini.server.manager.RoomManager;
import com.discordmini.server.model.Room;
import com.discordmini.server.model.User;
import com.discordmini.server.protocol.ProtocolHandler;
import com.discordmini.server.service.AuthService;
import com.discordmini.server.service.ChatService;
import com.discordmini.server.service.RoomService;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

public class ChatServer {
    public static final int PORT = 5000;

    private final int port;
    private final UserDAO userDAO = new UserDAO();
    private final RoomDAO roomDAO = new RoomDAO();
    private final MessageDAO messageDAO = new MessageDAO();

    private final ClientManager clientManager = new ClientManager();
    private final RoomManager roomManager = new RoomManager();

    private final AuthService authService;
    private final RoomService roomService;
    private final ChatService chatService;

    private final AtomicInteger threadCounter = new AtomicInteger(1);
    private final ExecutorService pool;
    private ServerSocket serverSocket;
    private volatile boolean running = false;

    public ChatServer() throws IOException {
        this(PORT);
    }

    public ChatServer(int port) throws IOException {
        this.port = port;
        this.authService = new AuthService(userDAO);
        this.roomService = new RoomService(roomDAO);
        this.chatService = new ChatService(messageDAO);

        this.pool = Executors.newCachedThreadPool(r -> {
            Thread t = new Thread(r, "ChatServer-Worker-" + threadCounter.getAndIncrement());
            t.setDaemon(true);
            return t;
        });

        initDefaultDatabaseRecords();
    }

    private void initDefaultDatabaseRecords() {
        try {
            User systemUser = userDAO.findUser("system");
            if (systemUser == null) {
                systemUser = userDAO.register("system", "system_protected_pwd", "Hệ Thống");
            }
            List<Room> rooms = roomDAO.listRooms();
            if (rooms.isEmpty() && systemUser != null) {
                roomDAO.createRoom("General", systemUser.getId());
                roomDAO.createRoom("Gaming", systemUser.getId());
                roomDAO.createRoom("Study", systemUser.getId());
                System.out.println("[DB] Đã khởi tạo các phòng mặc định (General, Gaming, Study).");
            }
        } catch (Exception e) {
            System.err.println("[DB WARNING] Chưa thể khởi tạo phòng mặc định: " + e.getMessage());
        }
    }

    public void start() throws IOException {
        synchronized (this) {
            if (running) return;
            serverSocket = new ServerSocket(port);
            running = true;
        }

        System.out.println("====================================");
        System.out.println(" Discord Mini Chat Server (PostgreSQL)");
        System.out.println(" TCP Port: " + port);
        System.out.println(" Database: PostgreSQL (discord_mini)");
        System.out.println("====================================");

        try {
            while (running && serverSocket != null && !serverSocket.isClosed()) {
                try {
                    Socket socket = serverSocket.accept();
                    socket.setKeepAlive(true);
                    System.out.println("[CONNECT] " + socket.getRemoteSocketAddress());
                    pool.submit(new ClientHandler(socket, this));
                } catch (IOException e) {
                    if (!running || serverSocket.isClosed()) {
                        break;
                    }
                    System.err.println("[SERVER ACCEPT ERROR] " + e.getMessage());
                }
            }
        } finally {
            stop();
        }
    }

    public synchronized void stop() {
        if (!running && (serverSocket == null || serverSocket.isClosed())) {
            return;
        }
        running = false;
        try {
            if (serverSocket != null && !serverSocket.isClosed()) {
                serverSocket.close();
            }
        } catch (IOException ignored) {}

        // Thông báo ngắt tới toàn bộ client đang online
        for (ClientHandler client : clientManager.all()) {
            try {
                client.sendPacket("SYSTEM|" + ProtocolHandler.encode("Server đang tắt để bảo trì."));
            } catch (Exception ignored) {}
        }

        pool.shutdown();
        try {
            if (!pool.awaitTermination(2, TimeUnit.SECONDS)) {
                pool.shutdownNow();
            }
        } catch (InterruptedException e) {
            pool.shutdownNow();
            Thread.currentThread().interrupt();
        }
        System.out.println("[SERVER] Đã dừng server an toàn trên cổng " + port);
    }

    public int getPort() { return port; }
    public boolean isRunning() { return running && serverSocket != null && !serverSocket.isClosed(); }
    public UserDAO getUserDAO() { return userDAO; }
    public RoomDAO getRoomDAO() { return roomDAO; }
    public MessageDAO getMessageDAO() { return messageDAO; }
    public ClientManager getClientManager() { return clientManager; }
    public RoomManager getRoomManager() { return roomManager; }
    public AuthService getAuthService() { return authService; }
    public RoomService getRoomService() { return roomService; }
    public ChatService getChatService() { return chatService; }
}
