package com.discordmini.server.protocol;

/** Standalone protocol regression checks; run with the Chatserver project classpath. */
public final class ProtocolHandlerTest {
    private ProtocolHandlerTest() {}

    public static void main(String[] args) {
        String original = "Xin chào | 👋\nsecond line";
        String encoded = ProtocolHandler.encode(original);
        check(original.equals(ProtocolHandler.decode(encoded)), "UTF-8/Base64 round trip");

        String frame = ProtocolHandler.command(MessageType.SEND_MESSAGE, original, "");
        String[] fields = ProtocolHandler.split(frame);
        check("SEND_MESSAGE".equals(fields[0]), "command name");
        check(original.equals(ProtocolHandler.decode(fields[1])), "encoded payload");
        check(fields.length == 3 && fields[2].isEmpty(), "empty field is preserved");

        String withId = frame + "|" + ProtocolHandler.REQUEST_ID_MARKER + "|request-123";
        check("request-123".equals(ProtocolHandler.requestId(ProtocolHandler.split(withId))),
                "request ID trailer");

        expectFailure(() -> ProtocolHandler.decode("%%%"), "invalid Base64 rejected");
        expectFailure(() -> ProtocolHandler.split("PING\nLOGIN"), "multi-line frame rejected");
        expectFailure(() -> ProtocolHandler.split("X".repeat(ProtocolHandler.MAX_LINE_LENGTH + 1)),
                "oversized frame rejected");

        System.out.println("ProtocolHandlerTest: PASS");
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private static void expectFailure(Runnable action, String message) {
        try {
            action.run();
            throw new AssertionError(message);
        } catch (IllegalArgumentException expected) {
            // expected
        }
    }
}
