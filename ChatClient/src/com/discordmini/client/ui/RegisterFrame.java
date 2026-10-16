package com.discordmini.client.ui;

import com.discordmini.client.network.SocketClient;
import com.discordmini.client.service.AuthCallback;
import com.discordmini.client.service.AuthResult;
import com.discordmini.client.service.AuthService;

import javax.swing.*;
import java.awt.*;
import java.awt.event.WindowAdapter;
import java.awt.event.WindowEvent;

/**
 * Giao diện Đăng ký tài khoản cho Discord Mini.
 *
 * Tiêu chí AN-07:
 * 1. Kiểm tra dữ liệu bắt buộc (username, password), dùng JPasswordField.
 * 2. Hiển thị trạng thái đang gửi yêu cầu và thông báo lỗi tiếng Việt dễ hiểu.
 * 3. Khóa thao tác gửi trùng (inFlight), mở lại khi xong, lỗi, timeout hoặc mất mạng.
 * 4. Không thực hiện tác vụ mạng hay chờ đợi trên EDT.
 * 5. Khi đóng cửa sổ (nút Đóng hoặc nút X), trả lại quyền nhận sự kiện về LoginFrame an toàn mà không làm mất listener kết nối.
 * 6. Kiểm tra isDisplayable() trước khi cập nhật GUI trong callback để tránh tác động vào cửa sổ đã đóng.
 */
public class RegisterFrame extends JFrame {
    private final LoginFrame parent;
    private final AuthService authService;

    private final JTextField usernameField = new JTextField();
    private final JTextField displayField = new JTextField();
    private final JPasswordField passwordField = new JPasswordField();
    private final JLabel status = new JLabel(" ");
    private final JButton btnRegister = new JButton("Tạo tài khoản");
    private final JButton btnCancel = new JButton("Đóng");

    private volatile boolean inFlight = false;
    private volatile boolean disposed = false;

    public RegisterFrame(SocketClient client, LoginFrame parent) {
        this.parent = parent;
        this.authService = new AuthService(client);

        setTitle("Discord Mini - Đăng ký");
        setSize(430, 320);
        setLocationRelativeTo(parent);
        setResizable(false);
        setDefaultCloseOperation(JFrame.DO_NOTHING_ON_CLOSE);
        buildUi();

        // Bắt sự kiện đóng cửa sổ qua nút X
        addWindowListener(new WindowAdapter() {
            @Override
            public void windowClosing(WindowEvent e) {
                closeAndRestore();
            }
        });
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

        JLabel title = new JLabel("ĐĂNG KÝ TÀI KHOẢN", SwingConstants.CENTER);
        title.setFont(new Font("Segoe UI", Font.BOLD, 20));
        title.setForeground(new Color(33, 150, 243));
        root.add(title, BorderLayout.NORTH);

        JPanel form = new JPanel(new GridLayout(4, 2, 8, 8));
        form.add(new JLabel("Tên đăng nhập:"));
        form.add(usernameField);
        form.add(new JLabel("Tên hiển thị:"));
        form.add(displayField);
        form.add(new JLabel("Mật khẩu:"));
        form.add(passwordField);
        form.add(btnRegister);
        form.add(btnCancel);
        root.add(form, BorderLayout.CENTER);

        status.setHorizontalAlignment(SwingConstants.CENTER);
        status.setFont(new Font("Segoe UI", Font.PLAIN, 12));
        status.setForeground(Color.DARK_GRAY);
        root.add(status, BorderLayout.SOUTH);
        setContentPane(root);

        btnRegister.addActionListener(e -> register());
        btnCancel.addActionListener(e -> closeAndRestore());
        usernameField.addActionListener(e -> register());
        displayField.addActionListener(e -> register());
        passwordField.addActionListener(e -> register());
    }

    public void closeAndRestore() {
        authService.cancelPendingRequest();
        if (parent != null) {
            parent.onRegisterClosed();
        }
        dispose();
    }

    /**
     * Kiểm tra tính hợp lệ của dữ liệu form đăng ký.
     */
    public String validateInputs(String u, String p, String d) {
        if (u == null || u.isBlank()) {
            return "Vui lòng nhập tên đăng nhập.";
        }
        if (u.contains("|") || u.contains("\n") || u.contains("\r")) {
            return "Tên đăng nhập không được chứa ký tự đặc biệt ('|').";
        }
        if (p == null || p.isEmpty()) {
            return "Vui lòng nhập mật khẩu.";
        }
        if (p.contains("|") || p.contains("\n") || p.contains("\r")) {
            return "Mật khẩu không được chứa ký tự đặc biệt ('|').";
        }
        if (d != null && (d.contains("|") || d.contains("\n") || d.contains("\r"))) {
            return "Tên hiển thị không được chứa ký tự đặc biệt ('|').";
        }
        return null; // Hợp lệ
    }

    public void register() {
        if (inFlight) {
            return; // Khóa thao tác gửi trùng
        }

        String u = usernameField.getText().trim();
        String d = displayField.getText().trim();
        String p = new String(passwordField.getPassword());

        String validationError = validateInputs(u, p, d);
        if (validationError != null) {
            status.setForeground(new Color(211, 47, 47));
            status.setText(validationError);
            if (u.isBlank()) {
                usernameField.requestFocusInWindow();
            } else {
                passwordField.requestFocusInWindow();
            }
            return;
        }

        // Nếu người dùng không nhập tên hiển thị, mặc định lấy username
        if (d.isBlank()) {
            d = u;
        }

        inFlight = true;
        setFormEnabled(false);
        status.setForeground(new Color(25, 118, 210));
        status.setText("Đang tạo tài khoản, vui lòng chờ...");

        final String finalDisplay = d;
        authService.register(u, p, finalDisplay, new AuthCallback() {
            @Override
            public void onSuccess(AuthResult result) {
                SwingUtilities.invokeLater(() -> {
                    if (disposed) return;
                    inFlight = false;
                    JOptionPane.showMessageDialog(RegisterFrame.this,
                            "Tạo tài khoản thành công! Bạn có thể đăng nhập ngay.",
                            "Đăng ký thành công", JOptionPane.INFORMATION_MESSAGE);
                    closeAndRestore();
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
                    status.setText("Mất kết nối Server trong khi đăng ký.");
                });
            }
        });
    }

    private String formatErrorMessage(String rawError) {
        if (rawError == null || rawError.isBlank()) {
            return "Đăng ký thất bại. Vui lòng thử lại.";
        }
        if (rawError.contains("USER_EXISTS") || rawError.contains("đã tồn tại")) {
            return "Tên đăng nhập này đã có người sử dụng. Vui lòng chọn tên khác.";
        }
        return rawError;
    }

    public void setFormEnabled(boolean enabled) {
        btnRegister.setEnabled(enabled);
        btnCancel.setEnabled(enabled);
        usernameField.setEnabled(enabled);
        displayField.setEnabled(enabled);
        passwordField.setEnabled(enabled);
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
