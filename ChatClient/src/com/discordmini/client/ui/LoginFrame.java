package com.discordmini.client.ui;

import com.discordmini.client.network.ConnectionManager;
import com.discordmini.client.network.ConnectionState;
import com.discordmini.client.network.SocketClient;
import com.discordmini.client.service.AuthCallback;
import com.discordmini.client.service.AuthResult;
import com.discordmini.client.service.AuthService;

import javax.swing.*;
import java.awt.*;

/**
 * Giao diện Đăng nhập cho Discord Mini.
 *
 * Tiêu chí AN-07:
 * 1. Kiểm tra dữ liệu bắt buộc (username, password), dùng JPasswordField.
 * 2. Hiển thị trạng thái đang gửi yêu cầu và thông báo tiếng Việt rõ ràng.
 * 3. Khóa thao tác gửi trùng (inFlight), mở lại khi thành công, lỗi, timeout hoặc mất mạng.
 * 4. Không thực hiện tác vụ mạng hay blocking trên EDT.
 * 5. Chỉ mở MainFrame sau phản hồi đăng nhập thành công.
 * 6. Kiểm tra isDisplayable() trước khi cập nhật GUI trong callback để tránh lỗi khi cửa sổ đã đóng.
 * 7. Giữ nguyên cấu trúc giao diện chuẩn Swing không cần thư viện ngoài.
 */
public class LoginFrame extends JFrame {
    private final SocketClient client;
    private final ConnectionManager connectionManager;
    private final AuthService authService;

    private final JTextField usernameField = new JTextField();
    private final JPasswordField passwordField = new JPasswordField();
    private final JLabel status = new JLabel(" ");
    private final JButton loginBtn = new JButton("Đăng nhập");
    private final JButton registerBtn = new JButton("Đăng ký");

    private volatile boolean inFlight = false;
    private volatile boolean disposed = false;

    public LoginFrame(SocketClient client) {
        this.client = client;
        this.connectionManager = client.getConnectionManager();
        this.authService = new AuthService(client, connectionManager);

        setTitle("Discord Mini - Đăng nhập");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(430, 310);
        setLocationRelativeTo(null);
        setResizable(false);
        buildUi();
        listenConnectionState();
    }

    public AuthService getAuthService() {
        return authService;
    }

    public boolean isInFlight() {
        return inFlight;
    }

    private void buildUi() {
        JPanel root = new JPanel(new BorderLayout(10, 10));
        root.setBorder(BorderFactory.createEmptyBorder(20, 20, 20, 20));
        JLabel title = new JLabel("DISCORD MINI", SwingConstants.CENTER);
        title.setFont(new Font("Segoe UI", Font.BOLD, 24));
        title.setForeground(new Color(33, 150, 243));
        root.add(title, BorderLayout.NORTH);

        JPanel form = new JPanel(new GridLayout(3, 2, 8, 8));
        form.add(new JLabel("Tên đăng nhập:"));
        form.add(usernameField);
        form.add(new JLabel("Mật khẩu:"));
        form.add(passwordField);
        form.add(loginBtn);
        form.add(registerBtn);
        root.add(form, BorderLayout.CENTER);

        status.setHorizontalAlignment(SwingConstants.CENTER);
        status.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        status.setForeground(Color.DARK_GRAY);
        root.add(status, BorderLayout.SOUTH);
        setContentPane(root);

        loginBtn.addActionListener(e -> doLogin());
        registerBtn.addActionListener(e -> openRegisterWindow());
        usernameField.addActionListener(e -> doLogin());
        passwordField.addActionListener(e -> doLogin());
    }

    private void openRegisterWindow() {
        if (inFlight) return;
        RegisterFrame regFrame = new RegisterFrame(client, this);
        regFrame.setVisible(true);
    }

    private void listenConnectionState() {
        connectionManager.addStateChangeListener((oldState, newState, reason) -> {
            SwingUtilities.invokeLater(() -> {
                if (disposed) return;
                if (newState == ConnectionState.DISCONNECTED) {
                    inFlight = false;
                    status.setForeground(new Color(211, 47, 47));
                    status.setText("Mất kết nối tới Server.");
                    setFormEnabled(true);
                }
            });
        });
    }

    /**
     * Kiểm tra dữ liệu nhập hợp lệ trước khi gửi mạng.
     */
    public String validateInputs(String username, String password) {
        if (username == null || username.isBlank()) {
            return "Vui lòng nhập tên đăng nhập.";
        }
        if (username.contains("|") || username.contains("\n") || username.contains("\r")) {
            return "Tên đăng nhập không được chứa ký tự đặc biệt ('|').";
        }
        if (password == null || password.isEmpty()) {
            return "Vui lòng nhập mật khẩu.";
        }
        if (password.contains("|") || password.contains("\n") || password.contains("\r")) {
            return "Mật khẩu không được chứa ký tự đặc biệt ('|').";
        }
        return null; // Hợp lệ
    }

    public void doLogin() {
        if (inFlight) {
            return; // Khóa thao tác gửi trùng (chống spam click)
        }

        String username = usernameField.getText().trim();
        String password = new String(passwordField.getPassword());

        String validationError = validateInputs(username, password);
        if (validationError != null) {
            status.setForeground(new Color(211, 47, 47));
            status.setText(validationError);
            if (username.isBlank()) {
                usernameField.requestFocusInWindow();
            } else {
                passwordField.requestFocusInWindow();
            }
            return;
        }

        inFlight = true;
        setFormEnabled(false);
        status.setForeground(new Color(25, 118, 210));
        status.setText("Đang đăng nhập, vui lòng chờ...");

        authService.login(username, password, new AuthCallback() {
            @Override
            public void onSuccess(AuthResult result) {
                SwingUtilities.invokeLater(() -> {
                    if (disposed) return;
                    inFlight = false;
                    dispose();
                    new MainFrame(client, result.displayName()).setVisible(true);
                });
            }

            @Override
            public void onError(String errorMessage) {
                SwingUtilities.invokeLater(() -> {
                    if (disposed) return;
                    inFlight = false;
                    setFormEnabled(true);
                    status.setForeground(new Color(211, 47, 47));
                    status.setText(formatErrorMessage(errorMessage));
                    passwordField.requestFocusInWindow();
                });
            }

            @Override
            public void onTimeout() {
                SwingUtilities.invokeLater(() -> {
                    if (disposed) return;
                    inFlight = false;
                    setFormEnabled(true);
                    status.setForeground(new Color(211, 47, 47));
                    status.setText("Quá thời gian chờ phản hồi từ Server. Vui lòng thử lại.");
                });
            }

            @Override
            public void onNetworkError() {
                SwingUtilities.invokeLater(() -> {
                    if (disposed) return;
                    inFlight = false;
                    setFormEnabled(true);
                    status.setForeground(new Color(211, 47, 47));
                    status.setText("Mất kết nối Server trong khi xác thực.");
                });
            }
        });
    }

    private String formatErrorMessage(String rawError) {
        if (rawError == null || rawError.isBlank()) {
            return "Đăng nhập thất bại. Vui lòng thử lại.";
        }
        if (rawError.contains("INVALID_CREDENTIALS") || rawError.contains("Sai tài khoản hoặc mật khẩu")) {
            return "Tên đăng nhập hoặc mật khẩu không chính xác.";
        }
        if (rawError.contains("ALREADY_LOGGED_IN") || rawError.contains("đang đăng nhập")) {
            return "Tài khoản này hiện đang đăng nhập ở một nơi khác.";
        }
        return rawError;
    }

    public void setFormEnabled(boolean enabled) {
        loginBtn.setEnabled(enabled);
        registerBtn.setEnabled(enabled);
        usernameField.setEnabled(enabled);
        passwordField.setEnabled(enabled);
    }

    /**
     * Được gọi khi RegisterFrame đóng để khôi phục quyền điều khiển cho LoginFrame.
     */
    public void onRegisterClosed() {
        if (disposed) return;
        setFormEnabled(true);
        status.setForeground(Color.DARK_GRAY);
        status.setText("Sẵn sàng đăng nhập.");
    }

    void activateListener() {
        onRegisterClosed();
    }

    @Override
    public void dispose() {
        this.disposed = true;
        super.dispose();
    }

    public boolean isDisposed() {
        return disposed;
    }
}
