package com.discordmini.client.service;

import com.discordmini.client.model.Room;
import java.util.List;

/**
 * Giao diện lắng nghe các sự kiện Phòng chat từ RoomService.
 */
public interface RoomEventListener {
    /**
     * Kích hoạt khi danh sách phòng chat được cập nhật từ Server.
     */
    default void onRoomListUpdated(List<Room> rooms) {}

    /**
     * Kích hoạt khi một phòng mới được tạo thành công.
     */
    default void onRoomCreated(Room room) {}

    /**
     * Kích hoạt khi Client vào phòng thành công (sau phản hồi OK|JOIN_ROOM).
     */
    default void onRoomJoined(Room room) {}

    /**
     * Kích hoạt khi Client rời phòng thành công (sau LEAVE_ROOM).
     */
    default void onRoomLeft() {}

    /**
     * Kích hoạt khi danh sách thành viên trong phòng hiện tại được cập nhật.
     */
    default void onRoomMembersUpdated(int roomId, List<String> memberNames) {}

    /**
     * Kích hoạt khi danh sách kênh của một phòng được cập nhật.
     */
    default void onChannelsUpdated(int roomId, List<com.discordmini.client.model.Channel> channels) {}

    /**
     * Kích hoạt khi một kênh mới được tạo thành công.
     */
    default void onChannelCreated(int roomId, com.discordmini.client.model.Channel channel) {}

    /**
     * Kích hoạt khi tham gia một kênh chat thành công.
     */
    default void onChannelJoined(int roomId, com.discordmini.client.model.Channel channel) {}

    /**
     * Kích hoạt khi xảy ra lỗi liên quan đến phòng hoặc kênh.
     */
    default void onRoomError(String errorMessage) {}
}
