package com.discordmini.server.network;

import com.discordmini.server.dao.MessageDAO;
import com.discordmini.server.dao.RoomDAO;
import com.discordmini.server.dao.UserDAO;
import com.discordmini.server.manager.ClientManager;
import com.discordmini.server.manager.RoomManager;
import com.discordmini.server.model.Room;
import com.discordmini.server.model.User;
import com.discordmini.server.service.AuthService;
import com.discordmini.server.service.ChatService;
import com.discordmini.server.service.RoomService;

import java.io.IOException;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.List;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class ChatServer {
    public static final int PORT = 5000;

    private final UserDAO userDAO = new UserDAO();
    private final RoomDAO roomDAO = new RoomDAO();
    private final MessageDAO messageDAO = new MessageDAO();

    private final ClientManager clientManager = new ClientManager();
    private final RoomManager roomManager = new RoomManager();

    private final AuthService authService;
    private final RoomService roomService;
    private final ChatService chatService;
    private final ExecutorService pool = Executors.newCachedThreadPool();

    public ChatServer() throws IOException {
        authService = new AuthService(userDAO);
        roomService = new RoomService(roomDAO);
        chatService = new ChatService(messageDAO);

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
                System.out.println("[DB] Da khoi tao cac phong mac dinh (General, Gaming, Study).");
            }
        } catch (Exception e) {
            System.err.println("[DB WARNING] Chua the khoi tao phong mac dinh: " + e.getMessage());
        }
    }

    public void start() throws IOException {
        try (ServerSocket serverSocket = new ServerSocket(PORT)) {
            System.out.println("====================================");
            System.out.println(" Discord Mini Chat Server (PostgreSQL)");
            System.out.println(" TCP Port: " + PORT);
            System.out.println(" Database: PostgreSQL (discord_mini)");
            System.out.println("====================================");
            while (!serverSocket.isClosed()) {
                Socket socket = serverSocket.accept();
                socket.setKeepAlive(true);
                System.out.println("[CONNECT] " + socket.getRemoteSocketAddress());
                pool.submit(new ClientHandler(socket, this));
            }
        }
    }

    public UserDAO getUserDAO() { return userDAO; }
    public RoomDAO getRoomDAO() { return roomDAO; }
    public MessageDAO getMessageDAO() { return messageDAO; }
    public ClientManager getClientManager() { return clientManager; }
    public RoomManager getRoomManager() { return roomManager; }
    public AuthService getAuthService() { return authService; }
    public RoomService getRoomService() { return roomService; }
    public ChatService getChatService() { return chatService; }
}
