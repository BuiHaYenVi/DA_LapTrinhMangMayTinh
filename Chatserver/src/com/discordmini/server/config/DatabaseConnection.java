package com.discordmini.server.config;

import java.io.InputStream;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.Properties;

/**
 * [HAI-02 & HAI-08] Quản lý kết nối JDBC PostgreSQL an toàn.
 * Đọc cấu hình từ file db.properties qua ClassLoader.
 * Đảm bảoThread-safe và xử lý ngoại lệ trung tâm tránh crash TCP Server.
 */
public class DatabaseConnection {

    private static String url;
    private static String user;
    private static String password;
    private static String driver;
    private static boolean driverLoaded = false;

    static {
        loadProperties();
    }

    private static synchronized void loadProperties() {
        // 1. Kiểm tra cấu hình qua biến môi trường (ưu tiên cao nhất)
        String envUrl = System.getenv("DB_URL");
        String envUser = System.getenv("DB_USER");
        String envPass = System.getenv("DB_PASSWORD");
        String envDriver = System.getenv("DB_DRIVER");

        // Hỗ trợ tự động phân tích DATABASE_URL (chuẩn Render, Railway, Supabase: postgres://user:pass@host:port/db)
        String renderDbUrl = System.getenv("DATABASE_URL");
        if (renderDbUrl != null && !renderDbUrl.isBlank()) {
            try {
                String cleanUrl = renderDbUrl.trim();
                if (cleanUrl.startsWith("postgres://")) {
                    cleanUrl = "postgresql://" + cleanUrl.substring("postgres://".length());
                }
                java.net.URI dbUri = new java.net.URI(cleanUrl);
                String userInfo = dbUri.getUserInfo();
                if (userInfo != null && userInfo.contains(":")) {
                    String[] parts = userInfo.split(":", 2);
                    if (envUser == null) envUser = parts[0];
                    if (envPass == null) envPass = parts[1];
                }
                int port = dbUri.getPort() > 0 ? dbUri.getPort() : 5432;
                String path = dbUri.getPath();
                String query = dbUri.getQuery();
                if (envUrl == null) {
                    envUrl = "jdbc:postgresql://" + dbUri.getHost() + ":" + port + path + (query != null ? "?" + query : "");
                }
                System.out.println("[DB CONFIG] Đã tự động nhận diện DATABASE_URL: " + dbUri.getHost() + ":" + port + path);
            } catch (Exception ex) {
                System.err.println("[DB WARNING] Không thể phân tích DATABASE_URL: " + ex.getMessage());
            }
        }

        Properties props = new Properties();
        String[] candidatePaths = {
            "config/db.properties",
            "db.properties",
            "com/discordmini/server/config/db.properties"
        };

        InputStream input = null;
        for (String path : candidatePaths) {
            input = DatabaseConnection.class.getClassLoader().getResourceAsStream(path);
            if (input != null) {
                System.out.println("[DB CONFIG] Đã tìm thấy file cấu hình: " + path);
                break;
            }
        }

        if (input != null) {
            try (InputStream is = input) {
                props.load(is);
            } catch (Exception e) {
                System.err.println("[DB ERROR] Lỗi đọc db.properties: " + e.getMessage() + ". Sử dụng cấu hình mặc định.");
            }
        } else {
            System.err.println("[DB WARNING] Không tìm thấy file db.properties trên ClassLoader. Sử dụng cấu hình cơ bản.");
        }

        url = envUrl != null ? envUrl : props.getProperty("db.url", "jdbc:postgresql://localhost:5432/discord_mini");
        user = envUser != null ? envUser : props.getProperty("db.user", "postgres");
        password = envPass != null ? envPass : props.getProperty("db.password", "");
        driver = envDriver != null ? envDriver : props.getProperty("db.driver", "org.postgresql.Driver");

        try {
            Class.forName(driver);
            driverLoaded = true;
            System.out.println("[DB CONFIG] Driver PostgreSQL đã nạp thành công: " + driver);
        } catch (ClassNotFoundException e) {
            System.err.println("[DB CRITICAL] Không tìm thấy PostgreSQL JDBC Driver! Thư viện org.postgresql.Driver chưa được thêm vào classpath.");
        }
    }

    /**
     * Lay ket noi JDBC den PostgreSQL.
     * @return Connection JDBC connection hoặc null nếu kết nối thất bại.
     */
    public static Connection getConnection() throws SQLException {
        if (!driverLoaded) {
            try {
                Class.forName(driver);
                driverLoaded = true;
            } catch (ClassNotFoundException e) {
                System.err.println("[DB ERROR] Driver JDBC chưa được nạp: " + e.getMessage());
                throw new SQLException("PostgreSQL JDBC Driver chưa có trong classpath", e);
            }
        }
        try {
            return DriverManager.getConnection(url, user, password);
        } catch (SQLException e) {
            System.err.println("[DB ERROR] Kết nối CSDL thất bại (URL: " + url + "): " + e.getMessage());
            throw e;
        }
    }

    public static String getUrl() { return url; }
    public static String getUser() { return user; }
}
