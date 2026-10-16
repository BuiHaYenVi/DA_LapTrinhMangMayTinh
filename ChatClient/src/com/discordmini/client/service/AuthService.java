package com.discordmini.client.service;

import com.discordmini.client.network.ConnectionManager;
import com.discordmini.client.network.SocketClient;
import com.discordmini.client.protocol.ProtocolHandler;

import java.util.Objects;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Consumer;

/**
 * Dịch vụ xử lý xác thực (Đăng nhập, Đăng ký, Đăng xuất) phía Client.
 *
 * Tiêu chí AN-04:
 * 1. Tách biệt logic xác thực khỏi giao diện Swing qua AuthCallback.
 * 2. Phân biệt rõ gói tin nghiệp vụ đăng nhập thành công (OK|LOGIN|...) với ACK (ACK|...). ACK không được coi là đã đăng nhập.
 * 3. Chống spam click: Ngăn chặn gửi yêu cầu trùng lặp khi người dùng bấm liên tục (AtomicBoolean inFlight).
 * 4. Xử lý đa dạng tình huống: tài khoản sai, username trùng, mất mạng, timeout và lỗi server.
 * 5. Gắn kết phản hồi với đúng yêu cầu đang chờ; cho phép hủy yêu cầu để tránh tác động sang màn hình khác.
 * 6. Cập nhật ConnectionManager sang AUTHENTICATED khi đăng nhập thành công.
 * 7. Bảo mật tuyệt đối: Không in mật khẩu ra log hoặc ghi plaintext xuống đĩa.
 */
public class AuthService {
    private final SocketClient client;
    private final ConnectionManager connectionManager;

    private final AtomicBoolean inFlight = new AtomicBoolean(false);
    private volatile AuthCallback activeCallback = null;
    private volatile String pendingUsername = null;
    private volatile boolean isLoginRequest = false;

    public AuthService(SocketClient client) {
        this(client, client.getConnectionManager());
    }

    public AuthService(SocketClient client, ConnectionManager connectionManager) {
        this.client = Objects.requireNonNull(client, "SocketClient không được null");
        this.connectionManager = Objects.requireNonNull(connectionManager, "ConnectionManager không được null");
        registerListeners();
    }

    private void registerListeners() {
        // Nhận gói tin phản hồi từ Server
        client.addMessageListener(this::handlePacket);
        // Nhận sự kiện mạng (mất kết nối, timeout)
        client.addConnectionListener(this::handleConnectionEvent);
    }

    public boolean isInFlight() {
        return inFlight.get();
    }

    /**
     * Hủy bỏ việc lắng nghe yêu cầu đang chờ (ví dụ khi người dùng đóng dialog/form).
     */
    public void cancelPendingRequest() {
        synchronized (this) {
            inFlight.set(false);
            activeCallback = null;
            pendingUsername = null;
        }
    }

    /**
     * Thực hiện đăng nhập bất đồng bộ với callback.
     * Chống spam click nếu có yêu cầu trước đó đang chờ xử lý.
     */
    public boolean login(String username, String password, AuthCallback callback) {
        Objects.requireNonNull(callback, "AuthCallback không được null");
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            callback.onError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
            return false;
        }

        if (!inFlight.compareAndSet(false, true)) {
            callback.onError("Yêu cầu trước đó đang được xử lý, vui lòng chờ trong giây lát.");
            return false;
        }

        synchronized (this) {
            this.activeCallback = callback;
            this.pendingUsername = username.trim();
            this.isLoginRequest = true;
        }

        // Tuyệt đối không in password ra console/log
        client.sendCommand("LOGIN", username.trim(), password);
        return true;
    }

    /**
     * Thực hiện đăng ký tài khoản mới bất đồng bộ với callback.
     */
    public boolean register(String username, String password, String displayName, AuthCallback callback) {
        Objects.requireNonNull(callback, "AuthCallback không được null");
        if (username == null || username.isBlank() || password == null || password.isBlank()) {
            callback.onError("Tên đăng nhập và mật khẩu không được để trống.");
            return false;
        }

        if (!inFlight.compareAndSet(false, true)) {
            callback.onError("Yêu cầu trước đó đang được xử lý, vui lòng chờ trong giây lát.");
            return false;
        }

        synchronized (this) {
            this.activeCallback = callback;
            this.pendingUsername = username.trim();
            this.isLoginRequest = false;
        }

        String display = (displayName != null && !displayName.isBlank()) ? displayName.trim() : username.trim();
        client.sendCommand("REGISTER", username.trim(), password, display);
        return true;
    }

    /**
     * Đăng xuất người dùng và ngắt kết nối chủ động.
     */
    public void logout() {
        cancelPendingRequest();
        try {
            client.sendCommand("LOGOUT");
        } catch (Exception ignored) {}
        connectionManager.disconnect();
    }

    /**
     * Tương thích ngược với interface cũ không dùng callback trực tiếp.
     */
    public void login(String username, String password) {
        client.sendCommand("LOGIN", username, password);
    }

    public void register(String username, String password, String displayName) {
        client.sendCommand("REGISTER", username, password, displayName);
    }

    private void handlePacket(String line) {
        if (!inFlight.get() || activeCallback == null) {
            return;
        }

        try {
            String[] parts = ProtocolHandler.split(line);
            if (parts.length == 0) return;

            String type = parts[0];

            // Tiêu chí AN-04: ACK chỉ là xác nhận request ở tầng mạng, KHÔNG ĐƯỢC COI LÀ ĐÃ ĐĂNG NHẬP
            if ("ACK".equals(type)) {
                return;
            }

            if ("OK".equals(type)) {
                if (parts.length >= 4 && "LOGIN".equals(parts[1]) && isLoginRequest) {
                    int userId = Integer.parseInt(parts[2]);
                    String displayName = ProtocolHandler.decode(parts[3]);
                    String username = pendingUsername;

                    // Cập nhật trạng thái ConnectionManager sang AUTHENTICATED
                    connectionManager.setAuthenticated(userId, username, displayName);

                    AuthResult result = AuthResult.loginSuccess(userId, username, displayName);
                    completeRequest(cb -> cb.onSuccess(result));
                } else if (parts.length >= 3 && "REGISTERED".equals(parts[1]) && !isLoginRequest) {
                    String message = ProtocolHandler.decode(parts[2]);
                    AuthResult result = AuthResult.registerSuccess(message);
                    completeRequest(cb -> cb.onSuccess(result));
                }
            } else if ("ERROR".equals(type)) {
                String errorMsg = (parts.length > 1) ? ProtocolHandler.decode(parts[1]) : "Lỗi xác thực không xác định từ Server.";
                completeRequest(cb -> cb.onError(errorMsg));
            }
        } catch (Exception ex) {
            completeRequest(cb -> cb.onError("Lỗi phân tích phản hồi xác thực: " + ex.getMessage()));
        }
    }

    private void handleConnectionEvent(String event) {
        if (!inFlight.get() || activeCallback == null) {
            return;
        }

        if ("CLIENT_DISCONNECTED".equals(event)) {
            completeRequest(AuthCallback::onNetworkError);
        } else if (event.startsWith("REQUEST_TIMEOUT|")) {
            completeRequest(AuthCallback::onTimeout);
        }
    }

    private void completeRequest(Consumer<AuthCallback> action) {
        AuthCallback callbackToInvoke;
        synchronized (this) {
            if (!inFlight.getAndSet(false)) {
                return;
            }
            callbackToInvoke = this.activeCallback;
            this.activeCallback = null;
            this.pendingUsername = null;
        }

        if (callbackToInvoke != null) {
            try {
                action.accept(callbackToInvoke);
            } catch (Throwable t) {
                System.err.println("[AuthService] Ngoại lệ trong AuthCallback: " + t.getMessage());
            }
        }
    }
}
