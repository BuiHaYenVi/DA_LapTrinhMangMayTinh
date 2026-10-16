package com.discordmini.client.service;

/**
 * Kết quả xác thực (Đăng nhập / Đăng ký) trả về từ AuthService.
 */
public record AuthResult(
        boolean isSuccess,
        boolean isLogin,
        int userId,
        String username,
        String displayName,
        String message
) {
    public static AuthResult loginSuccess(int userId, String username, String displayName) {
        return new AuthResult(true, true, userId, username, displayName, "Đăng nhập thành công.");
    }

    public static AuthResult registerSuccess(String message) {
        return new AuthResult(true, false, 0, null, null, message);
    }
}
