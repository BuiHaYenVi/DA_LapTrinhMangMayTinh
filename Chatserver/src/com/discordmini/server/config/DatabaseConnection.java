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
                System.out.println("[DB CONFIG] Da tim thấy file cau hinh: " + path);
                break;
            }
        }

        if (input != null) {
            try (InputStream is = input) {
                props.load(is);
                url = props.getProperty("db.url", "jdbc:postgresql://localhost:5432/discord_mini");
                user = props.getProperty("db.user", "postgres");
                password = props.getProperty("db.password", "2026");
                driver = props.getProperty("db.driver", "org.postgresql.Driver");
            } catch (Exception e) {
                System.err.println("[DB ERROR] Lỗi doc db.properties: " + e.getMessage() + ". Sử dụng cấu hình mặc định.");
                setDefaultProperties();
            }
        } else {
            System.err.println("[DB WARNING] Không tìm thấy file db.properties trên ClassLoader. Sử dụng cấu hình mặc định.");
            setDefaultProperties();
        }

        try {
            Class.forName(driver);
            driverLoaded = true;
            System.out.println("[DB CONFIG] Driver PostgreSQL đã nạp thành công: " + driver);
        } catch (ClassNotFoundException e) {
            System.err.println("[DB CRITICAL] Không tìm thấy PostgreSQL JDBC Driver! Thư viện org.postgresql.Driver chưa được thêm vào classpath.");
        }
    }

    private static void setDefaultProperties() {
        url = "jdbc:postgresql://localhost:5432/discord_mini";
        user = "postgres";
        password = "2026";
        driver = "org.postgresql.Driver";
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
