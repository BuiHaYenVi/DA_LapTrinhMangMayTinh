package com.discordmini.server.security;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Tiện ích mã hóa và giải mã nội dung tin nhắn trong cơ sở dữ liệu (Encryption-at-Rest).
 *
 * Thuật toán: AES-256-GCM (Galois/Counter Mode)
 * - Đảm bảo tính bảo mật (Confidentiality) và tính toàn vẹn (Integrity / Authenticity).
 * - Sử dụng IV ngẫu nhiên 12 bytes cho mỗi lần mã hóa sinh bởi SecureRandom.
 * - Khóa bí mật 256-bit được sinh từ biến môi trường CHAT_MESSAGE_ENCRYPTION_KEY (hoặc fallback mặc định).
 *
 * Định dạng lưu trữ: "ENC:v1:<Base64(IV + CipherText + AuthTag)>"
 *
 * Tương thích ngược:
 * - Nếu tin nhắn không bắt đầu bằng "ENC:v1:", coi là tin nhắn cũ (plaintext) và giữ nguyên.
 */
public final class MessageEncryptionUtil {

    public static final String PREFIX = "ENC:v1:";
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH = 12; // 12 bytes theo chuẩn NIST khuyến nghị cho GCM
    private static final int GCM_TAG_LENGTH = 16; // 128-bit authentication tag
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final SecretKey SECRET_KEY;

    static {
        // Lấy khóa từ biến môi trường hoặc fallback key nội bộ của hệ thống
        String envKey = System.getenv("CHAT_MESSAGE_ENCRYPTION_KEY");
        if (envKey == null || envKey.isBlank()) {
            envKey = "DiscordMini_System_Message_AES256_EncryptionKey_v1_Salt";
        }
        SECRET_KEY = deriveKey(envKey);
    }

    private MessageEncryptionUtil() {}

    /**
     * Sinh khóa 256-bit từ chuỗi bí mật bằng SHA-256.
     */
    private static SecretKey deriveKey(String secret) {
        try {
            MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha256.digest(secret.getBytes(StandardCharsets.UTF_8));
            return new SecretKeySpec(keyBytes, "AES");
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Thuật toán SHA-256 không khả dụng: " + e.getMessage(), e);
        }
    }

    /**
     * Mã hóa chuỗi nội dung văn bản sang định dạng "ENC:v1:<Base64>".
     * Nếu chuỗi rỗng hoặc null, trả về giá trị ban đầu.
     */
    public static String encrypt(String plainText) {
        if (plainText == null || plainText.isEmpty()) {
            return plainText;
        }
        // Nếu đã được mã hóa rồi, không mã hóa lặp lại
        if (plainText.startsWith(PREFIX)) {
            return plainText;
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH];
            SECURE_RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.ENCRYPT_MODE, SECRET_KEY, parameterSpec);

            byte[] cipherText = cipher.doFinal(plainText.getBytes(StandardCharsets.UTF_8));

            ByteBuffer byteBuffer = ByteBuffer.allocate(iv.length + cipherText.length);
            byteBuffer.put(iv);
            byteBuffer.put(cipherText);

            return PREFIX + Base64.getEncoder().encodeToString(byteBuffer.array());
        } catch (Exception e) {
            System.err.println("[MessageEncryptionUtil ERROR] Không thể mã hóa tin nhắn: " + e.getMessage());
            // Fallback an toàn bảo toàn dữ liệu
            return plainText;
        }
    }

    /**
     * Giải mã chuỗi nội dung từ CSDL về văn bản gốc.
     * Hỗ trợ tương thích ngược: nếu không có tiền tố "ENC:v1:", trả về chuỗi gốc (tin nhắn cũ chưa mã hóa).
     */
    public static String decrypt(String storedContent) {
        if (storedContent == null || storedContent.isEmpty()) {
            return storedContent;
        }
        if (!storedContent.startsWith(PREFIX)) {
            // Tin nhắn legacy lưu dạng plaintext trước khi có mã hóa
            return storedContent;
        }

        try {
            String base64Payload = storedContent.substring(PREFIX.length());
            byte[] combined = Base64.getDecoder().decode(base64Payload);

            if (combined.length < GCM_IV_LENGTH + GCM_TAG_LENGTH) {
                return storedContent; // Kích thước không hợp lệ
            }

            ByteBuffer byteBuffer = ByteBuffer.wrap(combined);
            byte[] iv = new byte[GCM_IV_LENGTH];
            byteBuffer.get(iv);

            byte[] cipherText = new byte[byteBuffer.remaining()];
            byteBuffer.get(cipherText);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH * 8, iv);
            cipher.init(Cipher.DECRYPT_MODE, SECRET_KEY, parameterSpec);

            byte[] plainTextBytes = cipher.doFinal(cipherText);
            return new String(plainTextBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            System.err.println("[MessageEncryptionUtil ERROR] Không thể giải mã tin nhắn: " + e.getMessage());
            return storedContent;
        }
    }

    /**
     * Kiểm tra xem chuỗi có phải đã được mã hóa hay chưa.
     */
    public static boolean isEncrypted(String content) {
        return content != null && content.startsWith(PREFIX);
    }
}
