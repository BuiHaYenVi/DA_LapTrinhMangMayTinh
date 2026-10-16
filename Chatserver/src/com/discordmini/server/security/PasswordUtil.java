package com.discordmini.server.security;

import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.spec.InvalidKeySpecException;
import java.util.HexFormat;

/**
 * Tiện ích băm và xác thực mật khẩu an toàn sử dụng PBKDF2WithHmacSHA256 với Salt ngẫu nhiên.
 * Hỗ trợ tương thích ngược và nâng cấp trong suốt (transparent migration) cho tài khoản cũ lưu plaintext.
 */
public final class PasswordUtil {

    private static final String ALGORITHM = "PBKDF2WithHmacSHA256";
    private static final int ITERATIONS = 310_000;
    private static final int KEY_LENGTH = 256;
    private static final int SALT_BYTES = 16;
    private static final SecureRandom RANDOM = new SecureRandom();

    private PasswordUtil() {}

    /**
     * Băm mật khẩu dạng chuỗi với salt ngẫu nhiên 16 bytes.
     * Định dạng trả về: PBKDF2$<saltHex>$<hashHex>
     */
    public static String hashPassword(String plainPassword) {
        if (plainPassword == null || plainPassword.isEmpty()) {
            throw new IllegalArgumentException("Mật khẩu không được rỗng.");
        }
        byte[] salt = new byte[SALT_BYTES];
        RANDOM.nextBytes(salt);
        byte[] hash = pbkdf2(plainPassword.toCharArray(), salt, ITERATIONS, KEY_LENGTH);
        return "PBKDF2$" + HexFormat.of().formatHex(salt) + "$" + HexFormat.of().formatHex(hash);
    }

    /**
     * Xác thực mật khẩu nhập vào với mật khẩu lưu trong cơ sở dữ liệu.
     * Hỗ trợ cả định dạng đã băm PBKDF2 và plaintext cũ (để migration an toàn).
     */
    public static boolean verifyPassword(String inputPassword, String storedPassword) {
        if (inputPassword == null || storedPassword == null) {
            return false;
        }
        if (storedPassword.startsWith("PBKDF2$")) {
            String[] parts = storedPassword.split("\\$");
            if (parts.length != 3) {
                return false;
            }
            try {
                byte[] salt = HexFormat.of().parseHex(parts[1]);
                byte[] expectedHash = HexFormat.of().parseHex(parts[2]);
                byte[] actualHash = pbkdf2(inputPassword.toCharArray(), salt, ITERATIONS, expectedHash.length * 8);
                return slowEquals(expectedHash, actualHash);
            } catch (Exception e) {
                return false;
            }
        }
        // Tương thích ngược: kiểm tra plaintext đối với tài khoản cũ chưa băm
        return slowEquals(inputPassword.getBytes(), storedPassword.getBytes());
    }

    /**
     * Kiểm tra xem mật khẩu lưu trữ có cần được nâng cấp băm lại hay không.
     */
    public static boolean needsRehash(String storedPassword) {
        return storedPassword == null || !storedPassword.startsWith("PBKDF2$");
    }

    private static byte[] pbkdf2(char[] password, byte[] salt, int iterations, int keyLength) {
        try {
            PBEKeySpec spec = new PBEKeySpec(password, salt, iterations, keyLength);
            SecretKeyFactory skf = SecretKeyFactory.getInstance(ALGORITHM);
            return skf.generateSecret(spec).getEncoded();
        } catch (NoSuchAlgorithmException | InvalidKeySpecException e) {
            throw new IllegalStateException("Không hỗ trợ thuật toán băm " + ALGORITHM, e);
        }
    }

    /**
     * So sánh hằng thời gian (constant-time) để chống tấn công Timing Attack.
     */
    private static boolean slowEquals(byte[] a, byte[] b) {
        if (a == null || b == null || a.length != b.length) {
            return false;
        }
        int diff = 0;
        for (int i = 0; i < a.length; i++) {
            diff |= a[i] ^ b[i];
        }
        return diff == 0;
    }
}
