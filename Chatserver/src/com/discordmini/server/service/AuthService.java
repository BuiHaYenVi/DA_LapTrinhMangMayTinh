package com.discordmini.server.service;

import com.discordmini.server.dao.UserDAO;
import com.discordmini.server.model.User;

import java.sql.SQLException;

public class AuthService {
    private final UserDAO userDAO;

    public AuthService(UserDAO userDAO) {
        this.userDAO = userDAO;
    }

    public User login(String username, String password) {
        try {
            return userDAO.login(username, password);
        } catch (SQLException e) {
            System.err.println("Loi Dang nhap Database: " + e.getMessage());
            return null;
        }
    }

    public User register(String username, String password, String displayName) throws Exception {
        if (username == null || username.isBlank() || password == null || password.isBlank()) return null;
        String name = (displayName == null || displayName.isBlank()) ? username.trim() : displayName.trim();
        return userDAO.register(username.trim(), password, name);
    }
}
