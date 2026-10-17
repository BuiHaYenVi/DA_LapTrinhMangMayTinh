package com.discordmini.server.dao;

import com.discordmini.server.model.Guild;
import com.discordmini.server.model.Room;

import java.security.SecureRandom;
import java.sql.*;
import java.util.ArrayList;
import java.util.List;

/**
 * DAO quản lý Server (Guild), thành viên Guild, kênh mặc định, và mã mời (Invite Codes).
 */
public class GuildDAO {

    private static final String INVITE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    private static final SecureRandom RANDOM = new SecureRandom();
    private final RoomDAO roomDAO = new RoomDAO();

    private static String computeIconText(String name, String providedIcon) {
        if (providedIcon != null && !providedIcon.isBlank()) {
            String trimmed = providedIcon.trim();
            return trimmed.length() > 10 ? trimmed.substring(0, 10) : trimmed;
        }
        if (name == null || name.isBlank()) return "DM";
        String[] parts = name.trim().split("\\s+");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (!p.isEmpty() && sb.length() < 3) {
                sb.append(Character.toUpperCase(p.charAt(0)));
            }
        }
        return sb.length() > 0 ? sb.toString() : "G";
    }

    private Guild mapGuild(ResultSet rs) throws SQLException {
        Timestamp ts = rs.getTimestamp("created_at");
        return new Guild(
            rs.getInt("id"),
            rs.getString("name"),
            rs.getString("icon_text"),
            rs.getInt("owner_id"),
            ts != null ? ts.toString() : ""
        );
    }

    /**
     * Đảm bảo Guild mặc định ("Discord Mini Community") luôn tồn tại và gắn các kênh cơ bản.
     */
    public Guild ensureDefaultGuild(int defaultOwnerId) {
        String selectSql = "SELECT id, name, icon_text, owner_id, created_at FROM guilds ORDER BY id ASC LIMIT 1";
        try (Connection conn = DatabaseConnection.getConnection()) {
            Guild defaultGuild = null;
            try (PreparedStatement ps = conn.prepareStatement(selectSql);
                 ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    defaultGuild = mapGuild(rs);
                }
            }

            if (defaultGuild == null) {
                String insertSql = "INSERT INTO guilds (name, icon_text, owner_id) VALUES ('Discord Mini Community', 'DM', ?) " +
                                   "RETURNING id, name, icon_text, owner_id, created_at";
                try (PreparedStatement insPs = conn.prepareStatement(insertSql)) {
                    if (defaultOwnerId > 0) {
                        insPs.setInt(1, defaultOwnerId);
                    } else {
                        insPs.setNull(1, Types.INTEGER);
                    }
                    try (ResultSet rs = insPs.executeQuery()) {
                        if (rs.next()) {
                            defaultGuild = mapGuild(rs);
                        }
                    }
                }
            }

            if (defaultGuild != null) {
                int gid = defaultGuild.getId();
                // Gắn các phòng chưa có guild_id vào default guild
                try (PreparedStatement upPs = conn.prepareStatement("UPDATE rooms SET guild_id = ? WHERE guild_id IS NULL")) {
                    upPs.setInt(1, gid);
                    upPs.executeUpdate();
                }

                List<Room> channels = roomDAO.listChannelsByGuild(gid, defaultOwnerId);
                boolean hasText = false;
                boolean hasVoice = false;
                for (Room r : channels) {
                    if ("voice".equalsIgnoreCase(r.getChannelType())) {
                        hasVoice = true;
                    } else {
                        hasText = true;
                    }
                }
                if (!hasText) {
                    roomDAO.createChannel(gid, "general", "text", "General discussion", 0, defaultOwnerId);
                }
                if (!hasVoice) {
                    roomDAO.createChannel(gid, "General Voice", "voice", "Default voice lounge", 100, defaultOwnerId);
                }
                if (defaultOwnerId > 0) {
                    addMember(gid, defaultOwnerId, defaultGuild.getOwnerId() == defaultOwnerId ? "OWNER" : "MEMBER");
                }
                defaultGuild.setChannels(roomDAO.listChannelsByGuild(gid, defaultOwnerId));
            }
            return defaultGuild;
        } catch (SQLException e) {
            System.err.println("[GuildDAO ERROR] Lỗi ensureDefaultGuild: " + e.getMessage());
            return null;
        }
    }

    /**
     * Lấy danh sách tất cả Guild của userId (tự động nạp danh sách channels cho từng Guild).
     */
    public List<Guild> listGuildsForUser(int userId) {
        List<Guild> guilds = new ArrayList<>();
        Guild defaultGuild = ensureDefaultGuild(userId);
        if (defaultGuild != null && userId > 0) {
            addMember(defaultGuild.getId(), userId, defaultGuild.getOwnerId() == userId ? "OWNER" : "MEMBER");
        }

        String sql = "SELECT DISTINCT g.id, g.name, g.icon_text, g.owner_id, g.created_at " +
                     "FROM guilds g " +
                     "LEFT JOIN guild_members gm ON g.id = gm.guild_id " +
                     "WHERE gm.user_id = ? OR g.id = 1 " +
                     "ORDER BY g.id ASC";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    Guild g = mapGuild(rs);
                    g.setChannels(roomDAO.listChannelsByGuild(g.getId(), userId));
                    guilds.add(g);
                }
            }
        } catch (SQLException e) {
            System.err.println("[GuildDAO ERROR] Lỗi listGuildsForUser (userId=" + userId + "): " + e.getMessage());
            if (defaultGuild != null) {
                guilds.add(defaultGuild);
            }
        }
        return guilds;
    }

    /**
     * Tìm thông tin Guild theo ID kèm danh sách kênh.
     */
    public Guild findById(int guildId) {
        String sql = "SELECT id, name, icon_text, owner_id, created_at FROM guilds WHERE id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setInt(1, guildId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Guild g = mapGuild(rs);
                    g.setChannels(roomDAO.listChannelsByGuild(g.getId(), 0));
                    return g;
                }
            }
        } catch (SQLException e) {
            System.err.println("[GuildDAO ERROR] Lỗi findById (guildId=" + guildId + "): " + e.getMessage());
        }
        return null;
    }

    /**
     * Tạo một Guild mới, thêm owner vào guild_members với quyền OWNER,
     * đồng thời khởi tạo kênh #general (text) và General Voice (voice).
     */
    public Guild createGuild(String name, String iconText, int ownerId) {
        if (name == null || name.isBlank()) return null;

        String cleanName = name.trim();
        String cleanIcon = computeIconText(cleanName, iconText);
        String sql = "INSERT INTO guilds (name, icon_text, owner_id) VALUES (?, ?, ?) " +
                     "RETURNING id, name, icon_text, owner_id, created_at";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {

            ps.setString(1, cleanName);
            ps.setString(2, cleanIcon);
            if (ownerId > 0) {
                ps.setInt(3, ownerId);
            } else {
                ps.setNull(3, Types.INTEGER);
            }

            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    Guild guild = mapGuild(rs);
                    int gid = guild.getId();
                    if (ownerId > 0) {
                        addMember(gid, ownerId, "OWNER");
                    }
                    roomDAO.createChannel(gid, "general", "text", "General discussion", 0, ownerId);
                    roomDAO.createChannel(gid, "General Voice", "voice", "Voice lounge", 100, ownerId);
                    guild.setChannels(roomDAO.listChannelsByGuild(gid, ownerId));
                    return guild;
                }
            }
        } catch (SQLException e) {
            System.err.println("[GuildDAO ERROR] Lỗi createGuild ('" + name + "'): " + e.getMessage());
        }
        return null;
    }

    /**
     * Thêm người dùng vào Guild với vai trò ('OWNER', 'ADMIN', 'MEMBER') và tự động thêm vào các kênh public của Guild.
     */
    public boolean addMember(int guildId, int userId, String role) {
        if (guildId <= 0 || userId <= 0) return false;
        String cleanRole = (role != null && !role.isBlank()) ? role.trim().toUpperCase() : "MEMBER";
        if (!"OWNER".equals(cleanRole) && !"ADMIN".equals(cleanRole) && !"MEMBER".equals(cleanRole)) {
            cleanRole = "MEMBER";
        }

        String sql = "INSERT INTO guild_members (guild_id, user_id, role) VALUES (?, ?, ?) " +
                     "ON CONFLICT (guild_id, user_id) DO UPDATE SET role = CASE " +
                     "WHEN guild_members.role = 'OWNER' THEN 'OWNER' ELSE EXCLUDED.role END";

        try (Connection conn = DatabaseConnection.getConnection()) {
            int updated;
            try (PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.setInt(1, guildId);
                ps.setInt(2, userId);
                ps.setString(3, cleanRole);
                updated = ps.executeUpdate();
            }

            String roomMemberSql = "INSERT INTO room_members (room_id, user_id, role) " +
                                   "SELECT id, ?, ? FROM rooms WHERE guild_id = ? AND COALESCE(is_private, false) = false " +
                                   "ON CONFLICT (room_id, user_id) DO NOTHING";
            try (PreparedStatement rmPs = conn.prepareStatement(roomMemberSql)) {
                rmPs.setInt(1, userId);
                rmPs.setString(2, cleanRole);
                rmPs.setInt(3, guildId);
                rmPs.executeUpdate();
            }
            return updated > 0;
        } catch (SQLException e) {
            System.err.println("[GuildDAO ERROR] Lỗi addMember (guildId=" + guildId + ", userId=" + userId + "): " + e.getMessage());
            return false;
        }
    }

    /**
     * Lấy vai trò của thành viên trong Guild ('OWNER', 'ADMIN', 'MEMBER', hoặc null).
     */
    public String getMemberRole(int guildId, int userId) {
        String sql = "SELECT role FROM guild_members WHERE guild_id = ? AND user_id = ?";
        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setInt(1, guildId);
            ps.setInt(2, userId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return rs.getString("role");
                }
            }
        } catch (SQLException e) {
            System.err.println("[GuildDAO ERROR] Lỗi getMemberRole: " + e.getMessage());
        }
        return null;
    }

    /**
     * Tạo mã mời (invite code) cho Guild với thời hạn ttlMinutes và số lượt dùng tối đa maxUses (0 = không giới hạn).
     */
    public String createInvite(int guildId, int createdBy, int ttlMinutes, int maxUses) {
        int validTtl = ttlMinutes > 0 ? ttlMinutes : 1440; // mặc định 24h
        int validMaxUses = Math.max(0, maxUses);

        StringBuilder codeBuilder = new StringBuilder(8);
        for (int i = 0; i < 8; i++) {
            codeBuilder.append(INVITE_ALPHABET.charAt(RANDOM.nextInt(INVITE_ALPHABET.length())));
        }
        String code = codeBuilder.toString();

        String sql = "INSERT INTO guild_invites (code, guild_id, created_by, expires_at, max_uses, uses) " +
                     "VALUES (?, ?, ?, CURRENT_TIMESTAMP + (? * INTERVAL '1 minute'), ?, 0)";

        try (Connection conn = DatabaseConnection.getConnection();
             PreparedStatement ps = conn.prepareStatement(sql)) {
            ps.setString(1, code);
            ps.setInt(2, guildId);
            if (createdBy > 0) {
                ps.setInt(3, createdBy);
            } else {
                ps.setNull(3, Types.INTEGER);
            }
            ps.setInt(4, validTtl);
            ps.setInt(5, validMaxUses);
            ps.executeUpdate();
            return code;
        } catch (SQLException e) {
            System.err.println("[GuildDAO ERROR] Lỗi createInvite (guildId=" + guildId + "): " + e.getMessage());
            return null;
        }
    }

    /**
     * Tham gia Guild thông qua mã mời hợp lệ và trả về đối tượng Guild kèm danh sách kênh.
     */
    public Guild joinByInviteCode(String code, int userId) {
        if (code == null || code.isBlank() || userId <= 0) return null;

        String selectSql = "SELECT code, guild_id FROM guild_invites " +
                           "WHERE LOWER(code) = LOWER(?) " +
                           "  AND expires_at > CURRENT_TIMESTAMP " +
                           "  AND (max_uses IS NULL OR max_uses = 0 OR uses < max_uses)";

        try (Connection conn = DatabaseConnection.getConnection()) {
            String actualCode = null;
            int guildId = -1;
            try (PreparedStatement ps = conn.prepareStatement(selectSql)) {
                ps.setString(1, code.trim());
                try (ResultSet rs = ps.executeQuery()) {
                    if (rs.next()) {
                        actualCode = rs.getString("code");
                        guildId = rs.getInt("guild_id");
                    }
                }
            }

            if (guildId <= 0 || actualCode == null) {
                return null;
            }

            try (PreparedStatement upPs = conn.prepareStatement("UPDATE guild_invites SET uses = uses + 1 WHERE code = ?")) {
                upPs.setString(1, actualCode);
                upPs.executeUpdate();
            }

            addMember(guildId, userId, "MEMBER");
            Guild joined = findById(guildId);
            if (joined != null) {
                joined.setChannels(roomDAO.listChannelsByGuild(guildId, userId));
            }
            return joined;
        } catch (SQLException e) {
            System.err.println("[GuildDAO ERROR] Lỗi joinByInviteCode ('" + code + "'): " + e.getMessage());
            return null;
        }
    }
}
