package com.discordmini.server.dao;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DatabaseConnection {
    private static final String URL = "jdbc:postgresql://localhost:5432/discord_mini";
    private static final String USER = "postgres";
    private static final String PASSWORD = "Vinhvu14112005@"; 

    static {
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("CANH BAO: Chua them PostgreSQL JDBC Driver (postgresql.jar) vao project Chatserver!");
        }
    }

    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}
