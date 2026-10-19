package com.discordmini.client.network;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * Small loopback integration check for request IDs and application ACKs.
 * This deliberately uses a fake peer so it does not require PostgreSQL.
 */
public final class SocketClientReliabilityTest {
    private SocketClientReliabilityTest() {}

    public static void main(String[] args) throws Exception {
        try (ServerSocket fakeServer = new ServerSocket(0)) {
            BlockingQueue<String> receivedByClient = new ArrayBlockingQueue<>(10);
            BlockingQueue<String> receivedByFakeServer = new ArrayBlockingQueue<>(10);

            Thread fakePeer = new Thread(() -> {
                try (Socket peer = fakeServer.accept();
                     BufferedReader reader = new BufferedReader(
                             new InputStreamReader(peer.getInputStream(), StandardCharsets.UTF_8));
                     PrintWriter writer = new PrintWriter(
                             new OutputStreamWriter(peer.getOutputStream(), StandardCharsets.UTF_8), true)) {
                    String request = reader.readLine();
                    receivedByFakeServer.offer(request);
                    String[] fields = request.split("\\|", -1);
                    if (fields.length >= 3 && "@RID".equals(fields[fields.length - 2])) {
                        writer.println("ACK|" + fields[fields.length - 1] + "|OK");
                    }
                } catch (Exception ex) {
                    receivedByFakeServer.offer("TEST_ERROR|" + ex.getMessage());
                }
            }, "FakeServer-Test");
            fakePeer.setDaemon(true);
            fakePeer.start();

            SocketClient client = new SocketClient();
            client.setListener(receivedByClient::offer);
            client.connect("127.0.0.1", fakeServer.getLocalPort());
            client.sendCommand("LOGIN", "test-user", "test-password");

            String request = receivedByFakeServer.poll(3, TimeUnit.SECONDS);
            check(request != null && request.startsWith("LOGIN|"), "request reaches fake server");
            String[] fields = request.split("\\|", -1);
            check(fields.length >= 5 && "@RID".equals(fields[fields.length - 2]),
                    "request has @RID trailer");

            String ack = receivedByClient.poll(3, TimeUnit.SECONDS);
            check(ack != null && ack.startsWith("ACK|"), "application ACK reaches client");

            client.close();
            System.out.println("SocketClientReliabilityTest: PASS");
        }
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }
}
