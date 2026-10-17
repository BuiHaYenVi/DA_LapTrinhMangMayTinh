package com.discordmini.server.config;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.HashMap;
import java.util.Map;
import java.util.Properties;

/**
 * [HAI-02 & HAI-08] Quản lý kết nối JDBC PostgreSQL / Neon Serverless an toàn.
 * Hỗ trợ đọc cấu hình từ .env, biến môi trường (NEON_JDBC_URL / DB_URL, v.v.), và db.properties.
 * Có cơ chế retry-with-backoff cho Neon cold-start và tự động chạy migration V003 idempotent.
 */
public class DatabaseConnection {

    private static String url;
    private static String user;
    private static String password;
    private static String driver;
    private static boolean driverLoaded = false;
    private static final Properties props = new Properties();
    private static final Map<String, String> dotenvMap = new HashMap<>();
    private static volatile boolean migrationsAttempted = false;

    static {
        loadProperties();
    }

    private static synchronized void loadProperties() {
        loadDotEnvFiles();

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

        if (input == null) {
            String[] fileCandidates = {
                "config/db.properties",
                "Chatserver/config/db.properties",
                "src/com/discordmini/server/config/db.properties",
                "Chatserver/src/com/discordmini/server/config/db.properties"
            };
            for (String fc : fileCandidates) {
                File f = new File(fc);
                if (f.exists() && f.isFile()) {
                    try {
                        input = new FileInputStream(f);
                        System.out.println("[DB CONFIG] Đã tìm thấy file cấu hình trên đĩa: " + f.getAbsolutePath());
                        break;
                    } catch (Exception ignored) {
                    }
                }
            }
        }

        if (input != null) {
            try (InputStream is = input) {
                props.load(is);
            } catch (Exception e) {
                System.err.println("[DB ERROR] Lỗi đọc db.properties: " + e.getMessage() + ". Sử dụng cấu hình mặc định.");
            }
        } else {
            System.err.println("[DB WARNING] Không tìm thấy file db.properties. Sử dụng biến môi trường/.env hoặc mặc định.");
        }

        url = firstNonBlank(
             getEnvOrDotenv("NEON_JDBC_URL"),
            getEnvOrDotenv("DB_URL"),
            props.getProperty("db.url"),
            "jdbc:postgresql://localhost:5432/discord_mini"
        );
        user = firstNonBlank(
            getEnvOrDotenv("NEON_DB_USER"),
            getEnvOrDotenv("DB_USER"),
            props.getProperty("db.user"),
            "postgres"
        );
        password = firstNonNull(
            getEnvOrDotenv("NEON_DB_PASSWORD"),
            getEnvOrDotenv("DB_PASSWORD"),
            props.getProperty("db.password"),
            ""
        );
        driver = firstNonBlank(
            getEnvOrDotenv("DB_DRIVER"),
            props.getProperty("db.driver"),
            "org.postgresql.Driver"
        );

        try {
            Class.forName(driver);
            driverLoaded = true;
            System.out.println("[DB CONFIG] Driver PostgreSQL đã nạp thành công: " + driver);
        } catch (ClassNotFoundException e) {
            System.err.println("[DB CRITICAL] Không tìm thấy PostgreSQL JDBC Driver! Thư viện org.postgresql.Driver chưa được thêm vào classpath.");
        }
    }

    private static void loadDotEnvFiles() {
        String[] dotenvCandidates = {
            ".env",
            "../.env",
            "Chatserver/.env",
            "Uri/DA_LapTrinhMangMayTinh/.env",
            "Uri/DA_LapTrinhMangMayTinh/Chatserver/.env"
        };
        for (String candidate : dotenvCandidates) {
            File f = new File(candidate);
            if (f.exists() && f.isFile()) {
                try (BufferedReader reader = new BufferedReader(
                        new InputStreamReader(new FileInputStream(f), StandardCharsets.UTF_8))) {
                    String line;
                    while ((line = reader.readLine()) != null) {
                        String trimmed = line.trim();
                        if (trimmed.isEmpty() || trimmed.startsWith("#")) continue;
                        int eqIdx = trimmed.indexOf('=');
                        if (eqIdx > 0) {
                            String k = trimmed.substring(0, eqIdx).trim();
                            String v = trimmed.substring(eqIdx + 1).trim();
                            if ((v.startsWith("\"") && v.endsWith("\"")) || (v.startsWith("'") && v.endsWith("'"))) {
                                v = v.substring(1, v.length() - 1);
                            }
                            dotenvMap.putIfAbsent(k, v);
                        }
                    }
                    System.out.println("[DB CONFIG] Đã nạp cấu hình từ .env: " + f.getAbsolutePath());
                } catch (Exception e) {
                    System.err.println("[DB WARNING] Không thể đọc file .env (" + candidate + "): " + e.getMessage());
                }
            }
        }
    }

    private static String getEnvOrDotenv(String key) {
        if (key == null || key.isEmpty()) return null;
        String val = System.getenv(key);
        if (val != null && !val.isEmpty()) return val;
        String sysProp = System.getProperty(key);
        if (sysProp != null && !sysProp.isEmpty()) return sysProp;
        return dotenvMap.get(key);
    }

    private static String firstNonBlank(String... values) {
        for (String v : values) {
            if (v != null && !v.trim().isEmpty()) {
                return v.trim();
            }
        }
        return "";
    }

    private static String firstNonNull(String... values) {
        for (String v : values) {
            if (v != null) {
                return v;
            }
        }
        return "";
    }

    /**
     * Đọc giá trị cấu hình ưu tiên từ biến môi trường / .env, sau đó tới db.properties, cuối cùng là defaultVal.
     */
    public static String getEnvOrProp(String envKey, String propKey, String defaultVal) {
        String envVal = getEnvOrDotenv(envKey);
        if (envVal != null && !envVal.isEmpty()) {
            return envVal;
        }
        if (propKey != null && !propKey.isEmpty()) {
            String propVal = props.getProperty(propKey);
            if (propVal != null && !propVal.isEmpty()) {
                return propVal;
            }
        }
        return defaultVal;
    }

    /**
     * Lấy kết nối JDBC đến PostgreSQL với cơ chế retry-with-backoff cho Neon cold-start.
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

        int maxAttempts = 3;
        long backoffMs = 250L;
        SQLException lastException = null;

        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                DriverManager.setLoginTimeout(5);
                return DriverManager.getConnection(url, user, password);
            } catch (SQLException e) {
                lastException = e;
                if (attempt < maxAttempts) {
                    try {
                        Thread.sleep(backoffMs);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                    backoffMs *= 2;
                }
            }
        }

        System.err.println("[DB ERROR] Kết nối CSDL thất bại (URL: " + url + "): " +
                (lastException != null ? lastException.getMessage() : "Unknown error"));
        throw lastException != null ? lastException : new SQLException("Không thể kết nối CSDL");
    }

    /**
     * Kiểm tra kết nối CSDL hiện tại có hoạt động không.
     */
    public static boolean isConnected() {
        try (Connection conn = getConnection()) {
            return conn != null && conn.isValid(3);
        } catch (SQLException e) {
            return false;
        }
    }

    /**
     * Tự động chạy file migration V003__guilds_channels.sql một cách idempotent nếu DB kết nối được.
     */
    public static synchronized void runMigrationsIfAvailable() {
        if (migrationsAttempted) {
            return;
        }
        migrationsAttempted = true;

        String[] migrationCandidates = {
            "sql/V003__guilds_channels.sql",
            "Chatserver/sql/V003__guilds_channels.sql",
            "../Chatserver/sql/V003__guilds_channels.sql",
            "Uri/DA_LapTrinhMangMayTinh/Chatserver/sql/V003__guilds_channels.sql"
        };

        File sqlFile = null;
        for (String candidate : migrationCandidates) {
            File f = new File(candidate);
            if (f.exists() && f.isFile()) {
                sqlFile = f;
                break;
            }
        }

        if (sqlFile == null) {
            System.out.println("[DB MIGRATION] Không tìm thấy file V003__guilds_channels.sql để tự động migrate.");
            return;
        }

        try (Connection conn = getConnection();
             Statement stmt = conn.createStatement()) {
            String sqlContent = Files.readString(sqlFile.toPath(), StandardCharsets.UTF_8);
            stmt.execute(sqlContent);
            System.out.println("[DB MIGRATION] Đã thực thi idempotent migration thành công: " + sqlFile.getPath());
        } catch (Exception e) {
            System.err.println("[DB MIGRATION WARNING] Không thể chạy tự động V003__guilds_channels.sql: " + e.getMessage());
        }
    }

    public static String getUrl() { return url; }
    public static String getUser() { return user; }
}
