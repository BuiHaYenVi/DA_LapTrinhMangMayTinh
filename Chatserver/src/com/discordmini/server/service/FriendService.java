package com.discordmini.server.service;

import com.discordmini.server.dao.FriendDAO;
import com.discordmini.server.model.User;

import java.util.ArrayList;
import java.util.List;

public class FriendService {
    private final FriendDAO friendDAO;

    public FriendService(FriendDAO friendDAO) {
        this.friendDAO = friendDAO != null ? friendDAO : new FriendDAO();
    }

    public List<User> searchUsers(int currentUserId, String query) {
        try {
            return friendDAO.searchUsers(currentUserId, query);
        } catch (Exception e) {
            System.err.println("Lỗi searchUsers FriendService: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public String sendFriendRequest(int senderId, int receiverId) {
        try {
            return friendDAO.sendFriendRequest(senderId, receiverId);
        } catch (Exception e) {
            System.err.println("Lỗi sendFriendRequest FriendService: " + e.getMessage());
            return "ERROR";
        }
    }

    public List<FriendDAO.FriendRequestItem> getPendingRequests(int userId) {
        try {
            return friendDAO.getPendingRequests(userId);
        } catch (Exception e) {
            System.err.println("Lỗi getPendingRequests FriendService: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public boolean acceptRequest(int requestId, int currentUserId) {
        try {
            return friendDAO.acceptRequest(requestId, currentUserId);
        } catch (Exception e) {
            System.err.println("Lỗi acceptRequest FriendService: " + e.getMessage());
            return false;
        }
    }

    public boolean acceptRequestFromUser(int senderId, int currentUserId) {
        try {
            return friendDAO.acceptRequestFromUser(senderId, currentUserId);
        } catch (Exception e) {
            System.err.println("Lỗi acceptRequestFromUser FriendService: " + e.getMessage());
            return false;
        }
    }

    public boolean rejectRequest(int requestId, int currentUserId) {
        try {
            return friendDAO.rejectRequest(requestId, currentUserId);
        } catch (Exception e) {
            System.err.println("Lỗi rejectRequest FriendService: " + e.getMessage());
            return false;
        }
    }

    public List<User> getFriends(int userId) {
        try {
            return friendDAO.getFriends(userId);
        } catch (Exception e) {
            System.err.println("Lỗi getFriends FriendService: " + e.getMessage());
            return new ArrayList<>();
        }
    }

    public boolean areFriends(int userId1, int userId2) {
        try {
            return friendDAO.areFriends(userId1, userId2);
        } catch (Exception e) {
            return false;
        }
    }
}
