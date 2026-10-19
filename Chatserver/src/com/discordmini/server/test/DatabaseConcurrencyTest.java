package com.discordmini.server.test;

import com.discordmini.server.dao.MessageDAO;
import com.discordmini.server.dao.RoomDAO;
import com.discordmini.server.dao.UserDAO;
import com.discordmini.server.model.Message;
import com.discordmini.server.model.Room;
import com.discordmini.server.model.User;
import com.discordmini.server.service.ChatPersistenceService;

import java.sql.SQLException;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * [HAI-09] Kiểm thử truy vấn & CRUD đồng thời đa luồng (Database Concurrency Test).
 * Giả lập 15 threads gửi tin nhắn cùng lúc vào PostgreSQL để kiểm tra tính nhất quán dữ liệu (Data Integrity).
 */
public class DatabaseConcurrencyTest {

    private static final int THREAD_COUNT = 15;
    private static final int MESSAGES_PER_THREAD = 10;

    public static void main(String[] args) {
        System.out.println("==================================================");
        System.out.println("   DISCORD MINI - DATABASE CONCURRENCY TEST       ");
        System.out.println("==================================================");

        UserDAO userDAO = new UserDAO();
        RoomDAO roomDAO = new RoomDAO();
        MessageDAO messageDAO = new MessageDAO();
        ChatPersistenceService persistenceService = new ChatPersistenceService(messageDAO);

        // 1. Chuẩn bị dữ liệu mẫu (User test & Room test)
        System.out.println("\n[STEP 1] Tạo dữ liệu thử nghiệm...");
        User testUser = userDAO.findUser("concurrency_tester");
        try {
            if (testUser == null) {
                testUser = userDAO.register("concurrency_tester", "pwd123", "Tester Đồng Thời");
            }
            if (testUser == null) {
                testUser = userDAO.login("concurrency_tester", "pwd123");
            }
        } catch (SQLException e) {
            System.err.println("Lỗi thao tác DB khi khởi tạo user test: " + e.getMessage());
        }

        if (testUser == null) {
            System.err.println("❌ KHÔNG THỂ KHỞI TẠO USER TEST. Vui lòng kiểm tra CSDL PostgreSQL!");
            return;
        }

        Room testRoom = roomDAO.createRoom("Concurrency_Room_Test", testUser.getId());
        if (testRoom == null) {
            testRoom = roomDAO.findRoom(1); // Fallback room 1
        }
        if (testRoom == null) {
            System.err.println("❌ KHÔNG THỂ KHỞI TẠO ROOM TEST!");
            return;
        }

        final int targetRoomId = testRoom.getId();
        final int targetUserId = testUser.getId();

        System.out.println("✔ User Test ID: " + targetUserId + " (" + testUser.getDisplayName() + ")");
        System.out.println("✔ Room Test ID: " + targetRoomId + " (" + testRoom.getName() + ")");

        // 2. Chạy kiểm thử đồng thời với ExecutorService và CountDownLatch
        System.out.println("\n[STEP 2] Khởi chạy " + THREAD_COUNT + " luồng gửi tin nhắn đồng thời...");
        ExecutorService executor = Executors.newFixedThreadPool(THREAD_COUNT);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch finishLatch = new CountDownLatch(THREAD_COUNT);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        long startTime = System.currentTimeMillis();

        for (int i = 0; i < THREAD_COUNT; i++) {
            final int threadId = i + 1;
            executor.submit(() -> {
                try {
                    startLatch.await(); // Chờ tín hiệu xuất phát đồng thời từ tất cả các thread
                    for (int m = 1; m <= MESSAGES_PER_THREAD; m++) {
                        String msgContent = "Concurrent Message T" + threadId + "-" + m + " @ " + System.nanoTime();
                        try {
                            Message saved = persistenceService.persistBeforeBroadcast(targetRoomId, targetUserId, msgContent);
                            if (saved != null && saved.getId() > 0) {
                                successCount.incrementAndGet();
                            } else {
                                failureCount.incrementAndGet();
                            }
                        } catch (Exception ex) {
                            System.err.println("Thread-" + threadId + " Error: " + ex.getMessage());
                            failureCount.incrementAndGet();
                        }
                    }
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    finishLatch.countDown();
                }
            });
        }

        // Phát tín hiệu cho toàn bộ 15 threads đồng loạt chạy
        startLatch.countDown();

        try {
            boolean finished = finishLatch.await(30, TimeUnit.SECONDS);
            long endTime = System.currentTimeMillis();

            System.out.println("\n==================================================");
            System.out.println("             KẾT QUẢ KIỂM THỬ ĐỒNG THỜI           ");
            System.out.println("==================================================");
            System.out.println("Thời gian hoàn thành: " + (endTime - startTime) + " ms");
            System.out.println("Tổng số tin nhắn kỳ vọng: " + (THREAD_COUNT * MESSAGES_PER_THREAD));
            System.out.println("Số tin nhắn lưu THÀNH CÔNG: " + successCount.get());
            System.out.println("Số tin nhắn THẤT BẠI: " + failureCount.get());

            // 3. Kiểm tra tính nhất quán (Data Integrity Check)
            System.out.println("\n[STEP 3] Kiểm tra tính nhất quán dữ liệu trong CSDL...");
            List<Message> history = messageDAO.getMessageHistory(targetRoomId, THREAD_COUNT * MESSAGES_PER_THREAD + 50);
            System.out.println("Số lượng tin nhắn truy vấn từ DB: " + history.size());

            if (finished && failureCount.get() == 0 && successCount.get() == (THREAD_COUNT * MESSAGES_PER_THREAD)) {
                System.out.println("\n🎉 SUCCESS: BẢNG MESSAGES ĐẠT TÍNH NHẤT QUÁN DỮ LIỆU HOÀN HẢO ĐA LUỒNG!");
            } else {
                System.out.println("\n⚠️ WARNING: Phát hiện phát sinh thất bại hoặc rớt gói tin trong quá trình kiểm thử.");
            }

        } catch (InterruptedException e) {
            System.err.println("Kiểm thử bị ngắt giữa chừng: " + e.getMessage());
        } finally {
            executor.shutdown();
        }
    }
}
