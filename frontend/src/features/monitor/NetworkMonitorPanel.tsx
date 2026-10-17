import React, { useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Code2,
  Database,
  Expand,
  Filter,
  Globe,
  Layers,
  Minimize2,
  Radio,
  RefreshCw,
  Search,
  Server,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../shared/state/appStore';
import type {
  NetworkFrameLog,
  RttSample,
  TransportKind,
} from '../../shared/types/api';

type FilterTransport = 'ALL' | 'TCP' | 'UDP' | 'WS' | 'HTTP';

interface DissectedField {
  index: number;
  label: string;
  rawValue: string;
  decodedUtf8: string | null;
  encoding: 'PLAIN_ASCII' | 'BASE64_UTF8' | 'NUMERIC_ID' | 'UUID_TRAILER' | 'JSON_PAYLOAD';
  protocolNote: string;
}

interface DissectedFrameResult {
  command: string;
  version: 'v1' | 'v2' | 'UDP' | 'HTTP/WS';
  transportLabel: string;
  description: string;
  ackContract: string;
  fields: DissectedField[];
  byteLength: number;
}

/**
 * Safely attempts to decode a Base64 string into UTF-8 text.
 * Returns null if the token is not valid Base64 or decodes to control characters.
 */
function tryDecodeBase64Utf8(token: string): string | null {
  const trimmed = token.trim();
  if (!trimmed || trimmed.length < 2) return null;
  // Ignore plain numbers, UUIDs, or known uppercase command keywords
  if (/^\d+$/.test(trimmed)) return null;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed)) {
    return null;
  }
  if (/^(OK|ACK|ERROR|ONLINE|IDLE|DND|OFFLINE|text|voice|@RID|PING|PONG)$/i.test(trimmed)) {
    return null;
  }
  if (trimmed.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(trimmed)) {
    return null;
  }
  try {
    const binaryStr = window.atob(trimmed);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i += 1) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    // Check that decoded string contains printable characters
    for (let i = 0; i < decoded.length; i += 1) {
      const code = decoded.charCodeAt(i);
      if (code < 9 || (code > 13 && code < 32)) {
        return null;
      }
    }
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Schema metadata for Protocol v1, v2, and UDP datagram commands from docs/PROTOCOL.md
 */
const PROTOCOL_COMMAND_SPECS: Record<
  string,
  {
    version: 'v1' | 'v2' | 'UDP' | 'HTTP/WS';
    description: string;
    ackContract: string;
    fieldNames: string[];
    fieldNotes: string[];
  }
> = {
  LOGIN: {
    version: 'v1',
    description: 'Xác thực phiên TCP/WS bằng tên đăng nhập và mật khẩu (Base64 UTF-8).',
    ackContract: 'OK|LOGIN|<userId>|<base64-displayName> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Base64 Username', 'Base64 Password'],
    fieldNotes: [
      'Tên lệnh cố định chữ hoa (Plain ASCII)',
      'Tên đăng nhập mã hóa Base64 để tránh ký tự | làm vỡ khung',
      'Mật khẩu người dùng mã hóa Base64 UTF-8',
    ],
  },
  REGISTER: {
    version: 'v1',
    description: 'Đăng ký tài khoản mới trên PostgreSQL (Neon) qua TCP/HTTP.',
    ackContract: 'OK|REGISTER|<base64-msg> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Base64 Username', 'Base64 Password', 'Base64 DisplayName'],
    fieldNotes: [
      'Lệnh đăng ký Protocol v1',
      'Username mã hóa Base64',
      'Password mã hóa Base64',
      'Tên hiển thị tiếng Việt có dấu mã hóa Base64 UTF-8',
    ],
  },
  AUTH_TOKEN: {
    version: 'v2',
    description: 'Xác thực phiên bằng JWT (HmacSHA256) không cần gửi lại mật khẩu.',
    ackContract: 'OK|LOGIN|<userId>|<base64-displayName> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'JWT Token (HmacSHA256)'],
    fieldNotes: [
      'Lệnh xác thực mở rộng Protocol v2 (§9.1.1)',
      'Chuỗi JWT ký bằng HmacSHA256 từ JwtUtil.java',
    ],
  },
  SEND_MESSAGE: {
    version: 'v1',
    description: 'Gửi tin nhắn văn bản vào phòng/kênh hiện tại (Backward-compatible v1 & v2).',
    ackContract: 'Broadcast NEW_MESSAGE + ACK|<uuid>|OK cho người gửi',
    fieldNames: ['Command', 'Base64 Content'],
    fieldNotes: [
      'Lệnh gửi tin nhắn văn bản',
      'Nội dung chat (hỗ trợ tiếng Việt, emoji, nhiều dòng) mã hóa Base64 UTF-8',
    ],
  },
  NEW_MESSAGE: {
    version: 'v1',
    description: 'Sự kiện phát tán (Broadcast) tin nhắn mới tới mọi thành viên trong phòng qua EventBus.',
    ackContract: 'Server push frame (không yêu cầu client ACK)',
    fieldNames: [
      'Command',
      'Room/Channel ID',
      'Sender User ID',
      'Base64 Sender Name',
      'Base64 Content',
      'Epoch Timestamp',
      'Database Message ID',
    ],
    fieldNotes: [
      'Khung broadcast từ Server → Client',
      'ID phòng/kênh nguyên dương (room_id == channel_id)',
      'ID người gửi trong bảng users',
      'Tên hiển thị người gửi (Base64 UTF-8)',
      'Nội dung tin nhắn (Base64 UTF-8)',
      'Thời điểm tạo bản ghi trên Server',
      'Khóa chính message_id trong PostgreSQL',
    ],
  },
  JOIN_ROOM: {
    version: 'v1',
    description: 'Tham gia vào kênh/phòng chat theo ID nguyên.',
    ackContract: 'OK|JOIN_ROOM|<roomId>|<base64-roomName> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Room ID (Integer)'],
    fieldNotes: [
      'Lệnh chuyển phòng/kênh',
      'ID phòng dạng số nguyên ASCII trần (§2)',
    ],
  },
  LIST_GUILDS: {
    version: 'v2',
    description: 'Truy vấn danh sách Guild (Server) và các kênh Text/Voice đã tham gia.',
    ackContract: 'GUILDS|<base64-json> + ACK|<uuid>|OK',
    fieldNames: ['Command'],
    fieldNotes: ['Lệnh truy vấn cấu trúc Guild & Channel Protocol v2 (§9.1.2)'],
  },
  CREATE_GUILD: {
    version: 'v2',
    description: 'Tạo máy chủ (Guild) mới kèm kênh #general và General Voice mặc định.',
    ackContract: 'GUILD_CREATED|<guildId>|<base64-name>|<ownerId>|<inviteCode> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Base64 Guild Name'],
    fieldNotes: [
      'Lệnh tạo Guild Protocol v2 (§9.1.3)',
      'Tên máy chủ mã hóa Base64 UTF-8',
    ],
  },
  CREATE_CHANNEL: {
    version: 'v2',
    description: 'Tạo kênh văn bản (text) hoặc kênh thoại/video (voice) trong Guild.',
    ackContract: 'CHANNEL_CREATED|<guildId>|<roomId>|<base64-name>|<type> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Guild ID', 'Base64 Channel Name', 'Channel Type (text|voice)'],
    fieldNotes: [
      'Lệnh tạo Channel Protocol v2 (§9.1.4)',
      'ID của Guild chứa kênh',
      'Tên kênh mã hóa Base64 UTF-8',
      'Loại kênh: text (TCP/WS) hoặc voice (WebRTC/UDP)',
    ],
  },
  EDIT_MSG: {
    version: 'v2',
    description: 'Chỉnh sửa nội dung tin nhắn đã gửi.',
    ackContract: 'Broadcast MSG_EDITED|<roomId>|<messageId>|<base64-newContent>|<editedAt> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Message ID', 'Base64 New Content'],
    fieldNotes: [
      'Lệnh sửa tin nhắn Protocol v2 (§9.1.5)',
      'ID tin nhắn cần chỉnh sửa',
      'Nội dung mới mã hóa Base64 UTF-8',
    ],
  },
  DELETE_MSG: {
    version: 'v2',
    description: 'Thu hồi / xóa mềm (soft-delete) tin nhắn trong phòng.',
    ackContract: 'Broadcast MSG_DELETED|<roomId>|<messageId> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Message ID'],
    fieldNotes: [
      'Lệnh xóa tin nhắn Protocol v2 (§9.1.6)',
      'ID tin nhắn cần thu hồi',
    ],
  },
  REACT_MSG: {
    version: 'v2',
    description: 'Thả hoặc gỡ biểu tượng cảm xúc (Emoji Reaction) trên tin nhắn.',
    ackContract: 'Broadcast MSG_REACTED|<roomId>|<messageId>|<userId>|<base64-emoji>|<1|0> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Message ID', 'Base64 Emoji'],
    fieldNotes: [
      'Lệnh thả cảm xúc Protocol v2 (§9.1.7)',
      'ID tin nhắn mục tiêu',
      'Ký tự Emoji UTF-8 mã hóa Base64',
    ],
  },
  PIN_MSG: {
    version: 'v2',
    description: 'Ghim hoặc bỏ ghim tin nhắn quan trọng trong kênh.',
    ackContract: 'Broadcast MSG_PINNED|<roomId>|<messageId>|<pinned:1|0> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Message ID', 'Pin Flag (1|0)'],
    fieldNotes: [
      'Lệnh ghim tin nhắn Protocol v2 (§9.1.8)',
      'ID tin nhắn mục tiêu',
      '1 = Ghim (Pin), 0 = Bỏ ghim (Unpin)',
    ],
  },
  MARK_READ: {
    version: 'v2',
    description: 'Cập nhật con trỏ đã đọc (Read Receipt Cursor) cho kênh.',
    ackContract: 'READ_UPDATED|<roomId>|<userId>|<lastMessageId> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Room ID', 'Last Read Message ID'],
    fieldNotes: [
      'Lệnh đánh dấu đã đọc Protocol v2 (§9.1.9)',
      'ID phòng/kênh',
      'ID tin nhắn mới nhất đã đọc',
    ],
  },
  PRESENCE: {
    version: 'v2',
    description: 'Cập nhật trạng thái hiện diện (ONLINE, IDLE, DND, OFFLINE).',
    ackContract: 'Broadcast PRESENCE_UPDATED|<userId>|<status> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Presence Status'],
    fieldNotes: [
      'Lệnh cập nhật trạng thái Protocol v2 (§9.1.10)',
      'Trạng thái: ONLINE | IDLE | DND | OFFLINE',
    ],
  },
  SIGNAL_OFFER: {
    version: 'v2',
    description: 'Chuyển tiếp gói WebRTC SDP Offer qua EventBus để thiết lập kết nối P2P.',
    ackContract: 'Relay SIGNAL_OFFER|<roomId>|<fromUserId>|<base64-sdp> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Voice Room ID', 'Target/From User ID', 'Base64 SDP Offer'],
    fieldNotes: [
      'Lệnh báo hiệu WebRTC SDP Offer (§9.1.11)',
      'ID kênh thoại WebRTC',
      'ID của Peer nhận hoặc gửi Offer',
      'Chuỗi Session Description Protocol (SDP) mã hóa Base64',
    ],
  },
  SIGNAL_ANSWER: {
    version: 'v2',
    description: 'Chuyển tiếp gói WebRTC SDP Answer hoàn tất thương lượng codec âm thanh/hình ảnh.',
    ackContract: 'Relay SIGNAL_ANSWER|<roomId>|<fromUserId>|<base64-sdp> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Voice Room ID', 'Target/From User ID', 'Base64 SDP Answer'],
    fieldNotes: [
      'Lệnh báo hiệu WebRTC SDP Answer (§9.1.12)',
      'ID kênh thoại WebRTC',
      'ID của Peer nhận hoặc gửi Answer',
      'Chuỗi SDP Answer mã hóa Base64',
    ],
  },
  SIGNAL_ICE: {
    version: 'v2',
    description: 'Trao đổi ứng viên mạng ICE Candidate (STUN/UDP host/srflx) giữa các WebRTC Peers.',
    ackContract: 'Relay SIGNAL_ICE|<roomId>|<fromUserId>|<base64-candidate> + ACK|<uuid>|OK',
    fieldNames: ['Command', 'Voice Room ID', 'Target/From User ID', 'Base64 ICE Candidate'],
    fieldNotes: [
      'Lệnh trao đổi đường truyền mạng ICE (§9.1.13)',
      'ID kênh thoại WebRTC',
      'ID của Peer đối tác',
      'Thông tin địa chỉ IP/Port UDP ứng viên từ STUN server mã hóa Base64',
    ],
  },
  UDP_PING: {
    version: 'UDP',
    description: 'Gói tin thăm dò độ trễ (RTT Probe) không kết nối qua DatagramSocket :5001.',
    ackContract: 'Server phản hồi tức thời UDP_PONG|<seq>|<clientTs>|<serverTs> (< 1024 bytes)',
    fieldNames: ['Datagram Type', 'Sequence Number (<seq>)', 'Client Timestamp (ms)', 'User ID'],
    fieldNotes: [
      'Header gói UDP Datagram (:5001) (§10.2.1)',
      'Số thứ tự gói tăng dần để phát hiện mất gói & tính Jitter',
      'Mốc thời gian epoch (ms) lúc Client phát gói',
      'ID người dùng gửi gói dò',
    ],
  },
  UDP_PONG: {
    version: 'UDP',
    description: 'Phản hồi đo độ trễ RTT từ cổng UDP :5001 (Không bị Head-of-Line Blocking).',
    ackContract: 'Client tính UDP RTT = now - clientTimestampMs',
    fieldNames: ['Datagram Type', 'Sequence Number (<seq>)', 'Client Timestamp (ms)', 'Server Timestamp (ms)'],
    fieldNotes: [
      'Header phản hồi UDP Datagram (:5001) (§10.2.1)',
      'Số thứ tự khớp với gói UDP_PING',
      'Mốc thời gian gốc của Client',
      'Mốc thời gian System.currentTimeMillis() tại Server',
    ],
  },
  UDP_TYPING: {
    version: 'UDP',
    description: 'Tín hiệu đang gõ phím (Ephemeral Typing Indicator) gửi qua UDP :5001.',
    ackContract: 'Server phát tán TYPING_UPDATE tới phòng qua EventBus (Fire-and-forget)',
    fieldNames: ['Datagram Type', 'User ID', 'Room ID', 'IsTyping Flag (1|0)', 'Base64 DisplayName'],
    fieldNotes: [
      'Gói tin trạng thái gõ phím tức thời (§10.2.2)',
      'ID người dùng đang nhập liệu',
      'ID kênh chat mục tiêu',
      '1 = Đang gõ, 0 = Ngừng gõ',
      'Tên hiển thị người dùng mã hóa Base64 UTF-8',
    ],
  },
  UDP_PRESENCE: {
    version: 'UDP',
    description: 'Gói tin nhịp tim & trạng thái hiện diện nhẹ qua UDP :5001.',
    ackContract: 'Cập nhật last-seen timestamp & phát tán PRESENCE_UPDATED (§10.2.3)',
    fieldNames: ['Datagram Type', 'User ID', 'Status (ONLINE|IDLE|DND|OFFLINE)'],
    fieldNotes: [
      'Beacon hiện diện UDP (:5001)',
      'ID người dùng',
      'Trạng thái hiện diện mới',
    ],
  },
  PING: {
    version: 'v1',
    description: 'Gói giữ kết nối (Application Heartbeat) định kỳ mỗi 15 giây trên TCP/WS.',
    ackContract: 'PONG + ACK|<uuid>|OK (Timeout ngắt kết nối sau 40s-45s)',
    fieldNames: ['Command'],
    fieldNotes: ['Lệnh kiểm tra kết nối sống (§4)'],
  },
  PONG: {
    version: 'v1',
    description: 'Phản hồi nhịp tim từ máy chủ xác nhận kết nối TCP/WS đang hoạt động.',
    ackContract: 'Reset bộ đếm heartbeat timeout 40 giây tại Client',
    fieldNames: ['Command'],
    fieldNotes: ['Phản hồi PONG từ máy chủ (§4)'],
  },
  ACK: {
    version: 'v1',
    description: 'Xác nhận hoàn tất xử lý lệnh ứng dụng khớp theo Request ID (@RID).',
    ackContract: 'Hoàn tất vòng đời Request-Response bất đồng bộ (§3)',
    fieldNames: ['Command', 'Correlated Request UUID', 'Status (OK)'],
    fieldNotes: [
      'Khung xác nhận mức ứng dụng',
      'UUID khớp với trường @RID của gói yêu cầu',
      'Trạng thái thực thi thành công',
    ],
  },
  ERROR: {
    version: 'v1',
    description: 'Báo lỗi chuẩn hóa kèm mã lỗi ProtocolErrorCode (v1/v2) và thông điệp Base64.',
    ackContract: 'Khớp với Request UUID (nếu có) và hiển thị thông báo lỗi (§3)',
    fieldNames: ['Command', 'Base64 Human Message', 'Correlated UUID', 'ProtocolErrorCode'],
    fieldNotes: [
      'Khung báo lỗi từ Server',
      'Thông điệp tiếng Việt giải thích lỗi mã hóa Base64 UTF-8',
      'Request UUID gây lỗi (hoặc rỗng với client cũ)',
      'Mã lỗi cố định cho logic chương trình (VD: AUTH_FAILED, FORBIDDEN, RATE_LIMITED)',
    ],
  },
};

/**
 * Dissects any raw protocol frame (pipe-delimited TCP/UDP or JSON WS/HTTP) into educational fields.
 */
function dissectProtocolFrame(log: NetworkFrameLog): DissectedFrameResult {
  const raw = log.rawFrame.trim();
  const byteLength = new TextEncoder().encode(raw).length;

  // Case 1: JSON Envelope (WebSocket or HTTP REST payload)
  if (raw.startsWith('{') && raw.endsWith('}')) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // If the JSON envelope wraps a tcpFrame or raw pipe frame, dissect that too
      if (typeof parsed.tcpFrame === 'string' && parsed.tcpFrame.includes('|')) {
        return dissectPipeFrame(parsed.tcpFrame, log.transport, byteLength);
      }
      const cmdType = String(parsed.type || parsed.command || log.transport);
      const spec = PROTOCOL_COMMAND_SPECS[cmdType];
      const fields: DissectedField[] = Object.entries(parsed).map(([k, v], idx) => {
        const strVal = typeof v === 'string' ? v : JSON.stringify(v);
        const decoded = typeof v === 'string' ? tryDecodeBase64Utf8(v) : null;
        return {
          index: idx,
          label: `JSON.${k}`,
          rawValue: strVal,
          decodedUtf8: decoded,
          encoding: decoded ? 'BASE64_UTF8' : 'JSON_PAYLOAD',
          protocolNote:
            k === 'rid'
              ? 'UUID định danh yêu cầu dùng để đối chiếu ACK bất đồng bộ'
              : k === 'type'
              ? 'Loại sự kiện trên cầu nối WebSocket ↔ EventBus (:8081)'
              : 'Dữ liệu payload JSON truyền qua WebSocket/HTTP',
        };
      });

      return {
        command: cmdType,
        version: spec?.version || 'HTTP/WS',
        transportLabel:
          log.transport === 'UDP_FALLBACK'
            ? 'WS/TCP (UDP Fallback Mode)'
            : `${log.transport} JSON Envelope`,
        description:
          spec?.description ||
          `Khung JSON đóng gói sự kiện ${cmdType} trên cổng ${
            log.transport === 'HTTP' ? ':8080 REST' : ':8081 WebSocket'
          }.`,
        ackContract: spec?.ackContract || 'JSON response / WS ACK envelope { type: "ACK", rid }',
        fields,
        byteLength,
      };
    } catch {
      // Fall through to pipe parser if invalid JSON
    }
  }

  return dissectPipeFrame(raw, log.transport, byteLength);
}

function dissectPipeFrame(
  rawPipe: string,
  transport: TransportKind,
  byteLength: number
): DissectedFrameResult {
  const parts = rawPipe.split('|');
  const command = (parts[0] || 'UNKNOWN').trim().toUpperCase();
  const spec = PROTOCOL_COMMAND_SPECS[command];

  const fields: DissectedField[] = [];
  let i = 0;
  while (i < parts.length) {
    const token = parts[i];

    // Detect @RID|<uuid> trailer defined in docs/PROTOCOL.md §2
    if (token === '@RID' && i + 1 < parts.length) {
      fields.push({
        index: i,
        label: 'Trailer Marker (@RID)',
        rawValue: '@RID',
        decodedUtf8: null,
        encoding: 'PLAIN_ASCII',
        protocolNote: 'Cờ đánh dấu bắt đầu Request-ID Trailer (Protocol v1/v2 §2)',
      });
      fields.push({
        index: i + 1,
        label: 'Request ID (UUID)',
        rawValue: parts[i + 1],
        decodedUtf8: null,
        encoding: 'UUID_TRAILER',
        protocolNote:
          'UUID duy nhất cho mỗi lệnh để đối chiếu ACK|<uuid>|OK hoặc bắt REQUEST_TIMEOUT sau 10s',
      });
      i += 2;
      continue;
    }

    const decoded = i > 0 ? tryDecodeBase64Utf8(token) : null;
    const isNumeric = i > 0 && /^\d+$/.test(token.trim());
    const fieldLabel =
      spec?.fieldNames[i] || (i === 0 ? 'Command Name' : `Field #${i}`);
    const fieldNote =
      spec?.fieldNotes[i] ||
      (i === 0
        ? 'Tên lệnh giao thức chữ hoa (Delimiter: |)'
        : decoded
        ? 'Trường văn bản người dùng mã hóa Base64 UTF-8 để bảo toàn cấu trúc khung'
        : isNumeric
        ? 'Định danh số nguyên / mốc thời gian epoch (Plain ASCII)'
        : 'Tham số điều khiển giao thức');

    fields.push({
      index: i,
      label: fieldLabel,
      rawValue: token,
      decodedUtf8: decoded,
      encoding:
        i === 0
          ? 'PLAIN_ASCII'
          : decoded
          ? 'BASE64_UTF8'
          : isNumeric
          ? 'NUMERIC_ID'
          : 'PLAIN_ASCII',
      protocolNote: fieldNote,
    });

    i += 1;
  }

  return {
    command,
    version:
      spec?.version ||
      (command.startsWith('UDP_') ? 'UDP' : transport === 'HTTP' ? 'HTTP/WS' : 'v2'),
    transportLabel:
      transport === 'UDP'
        ? 'UDP Datagram (:5001)'
        : transport === 'UDP_FALLBACK'
        ? 'WS/TCP (UDP Fallback Active)'
        : transport === 'TCP'
        ? 'TCP Socket (:5000)'
        : transport === 'HTTP'
        ? 'HTTP REST (:8080)'
        : 'WebSocket Bridge (:8081)',
    description:
      spec?.description ||
      'Khung giao thức tầng ứng dụng phân tách bằng ký tự | (UTF-8 line framing).',
    ackContract: spec?.ackContract || 'ACK|<uuid>|OK hoặc ERROR|<base64-msg>|<uuid>|<CODE>',
    fields,
    byteLength,
  };
}

function formatTimeMs(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  const ms = String(d.getMilliseconds()).padStart(3, '0');
  return `${hh}:${mm}:${ss}.${ms}`;
}

export const NetworkMonitorPanel: React.FC = () => {
  const {
    theme,
    isMonitorOpen,
    setMonitorOpen,
    rttSamples,
    frameLogs,
    udpBlockedSimulated,
    setUdpBlockedSimulated,
    triggerRttProbe,
    clearFrameLogs,
  } = useAppStore();

  const [isExpandedModal, setIsExpandedModal] = useState(false);
  const [transportFilter, setTransportFilter] = useState<FilterTransport>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [hoveredSampleIndex, setHoveredSampleIndex] = useState<number | null>(null);
  const [isProbingBurst, setIsProbingBurst] = useState(false);

  const isDark = theme === 'dark';

  // Last 20 RTT samples for SVG Dual-Series Chart
  const recentSamples: RttSample[] = useMemo(() => {
    if (!Array.isArray(rttSamples)) return [];
    return rttSamples.slice(-20);
  }, [rttSamples]);

  // Compute Telemetry Summary Metrics (Avg TCP/WS RTT, Avg UDP RTT, Jitter, Packet Count)
  const metrics = useMemo(() => {
    if (recentSamples.length === 0) {
      return {
        avgTcpWsRtt: 14.2,
        avgUdpRtt: udpBlockedSimulated ? null : 6.8,
        jitterMs: 1.4,
        latestTcpWs: 14,
        latestUdp: udpBlockedSimulated ? null : 7,
        isFallbackActive: Boolean(udpBlockedSimulated),
      };
    }

    const tcpValues = recentSamples.map((s) => s.tcpRttMs || s.wsRttMs || 12);
    const avgTcpWsRtt =
      tcpValues.reduce((sum, val) => sum + val, 0) / Math.max(1, tcpValues.length);

    const validUdpValues = recentSamples
      .filter((s) => !s.udpFallback && s.udpRttMs !== null && s.udpRttMs !== undefined)
      .map((s) => s.udpRttMs as number);

    const avgUdpRtt =
      validUdpValues.length > 0
        ? validUdpValues.reduce((sum, val) => sum + val, 0) / validUdpValues.length
        : null;

    // Jitter calculation: mean absolute difference between consecutive RTT measurements
    const seriesForJitter = validUdpValues.length >= 2 ? validUdpValues : tcpValues;
    let diffSum = 0;
    for (let i = 1; i < seriesForJitter.length; i += 1) {
      diffSum += Math.abs(seriesForJitter[i] - seriesForJitter[i - 1]);
    }
    const jitterMs =
      seriesForJitter.length >= 2 ? diffSum / (seriesForJitter.length - 1) : 1.1;

    const last = recentSamples[recentSamples.length - 1];
    const isFallbackActive = Boolean(udpBlockedSimulated || last?.udpFallback);

    return {
      avgTcpWsRtt: Number(avgTcpWsRtt.toFixed(1)),
      avgUdpRtt: avgUdpRtt !== null ? Number(avgUdpRtt.toFixed(1)) : null,
      jitterMs: Number(jitterMs.toFixed(1)),
      latestTcpWs: Math.round(last.tcpRttMs || last.wsRttMs || avgTcpWsRtt),
      latestUdp:
        !isFallbackActive && last.udpRttMs !== null ? Math.round(last.udpRttMs) : null,
      isFallbackActive,
    };
  }, [recentSamples, udpBlockedSimulated]);

  // Filtered Frame Logs
  const filteredLogs: NetworkFrameLog[] = useMemo(() => {
    const list = Array.isArray(frameLogs) ? frameLogs : [];
    return list.filter((item) => {
      if (transportFilter !== 'ALL') {
        if (transportFilter === 'UDP') {
          if (item.transport !== 'UDP' && item.transport !== 'UDP_FALLBACK') return false;
        } else if (item.transport !== transportFilter) {
          return false;
        }
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchRaw = item.rawFrame.toLowerCase().includes(q);
        const matchSum = (item.summary || '').toLowerCase().includes(q);
        const matchTrans = item.transport.toLowerCase().includes(q);
        return matchRaw || matchSum || matchTrans;
      }
      return true;
    });
  }, [frameLogs, transportFilter, searchQuery]);

  // Active frame for the Frame Dissector / Base64 Decoder panel
  const selectedFrame: NetworkFrameLog | null = useMemo(() => {
    if (filteredLogs.length === 0) return null;
    if (selectedFrameId) {
      const found = filteredLogs.find((f) => f.id === selectedFrameId);
      if (found) return found;
    }
    return filteredLogs[0];
  }, [filteredLogs, selectedFrameId]);

  const dissectedResult = useMemo(() => {
    if (!selectedFrame) return null;
    return dissectProtocolFrame(selectedFrame);
  }, [selectedFrame]);

  const maxRttScale = useMemo(() => {
    let maxVal = 40;
    recentSamples.forEach((s) => {
      if (s.tcpRttMs > maxVal) maxVal = s.tcpRttMs;
      if (s.wsRttMs > maxVal) maxVal = s.wsRttMs;
      if (s.udpRttMs !== null && s.udpRttMs > maxVal) maxVal = s.udpRttMs;
    });
    return Math.ceil(maxVal / 10) * 10 + 10;
  }, [recentSamples]);

  if (!isMonitorOpen) {
    return null;
  }

  const handleSendProbe = () => {
    triggerRttProbe();
  };

  const handleSendBurstProbes = () => {
    if (isProbingBurst) return;
    setIsProbingBurst(true);
    triggerRttProbe();
    let count = 1;
    const timer = window.setInterval(() => {
      triggerRttProbe();
      count += 1;
      if (count >= 5) {
        window.clearInterval(timer);
        setIsProbingBurst(false);
      }
    }, 260);
  };

  // SVG Chart Geometry
  const svgWidth = 680;
  const svgHeight = 175;
  const padLeft = 40;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 26;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const getX = (index: number, total: number) => {
    if (total <= 1) return padLeft + plotWidth / 2;
    return padLeft + (index / (total - 1)) * plotWidth;
  };

  const getY = (rttMs: number) => {
    const clamped = Math.max(0, Math.min(maxRttScale, rttMs));
    return padTop + plotHeight - (clamped / maxRttScale) * plotHeight;
  };

  const tcpPoints = recentSamples.map((s, idx) => ({
    x: getX(idx, recentSamples.length),
    y: getY(s.tcpRttMs || s.wsRttMs || 12),
    val: s.tcpRttMs || s.wsRttMs || 12,
    seq: s.seq,
  }));

  const udpPoints = recentSamples.map((s, idx) => {
    const effectiveUdpVal =
      s.udpRttMs !== null && !s.udpFallback
        ? s.udpRttMs
        : (s.wsRttMs || s.tcpRttMs || 14) + 2;
    return {
      x: getX(idx, recentSamples.length),
      y: getY(effectiveUdpVal),
      val: effectiveUdpVal,
      isFallback: s.udpFallback || s.udpRttMs === null,
      seq: s.seq,
    };
  });

  const tcpPolyline = tcpPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const tcpAreaPath =
    tcpPoints.length > 1
      ? `M ${tcpPoints[0].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} L ` +
        tcpPoints.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ') +
        ` L ${tcpPoints[tcpPoints.length - 1].x.toFixed(1)} ${(padTop + plotHeight).toFixed(1)} Z`
      : '';

  const udpPolyline = udpPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const getTransportBadgeStyle = (kind: TransportKind): React.CSSProperties => {
    switch (kind) {
      case 'TCP':
        return {
          backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF',
          color: isDark ? '#60A5FA' : '#2563EB',
          border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.35)' : '#BFDBFE'}`,
        };
      case 'UDP':
        return {
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.18)' : '#D1FAE5',
          color: '#10B981',
          border: '1px solid rgba(16, 185, 129, 0.35)',
        };
      case 'WS':
        return {
          backgroundColor: isDark ? 'rgba(14, 165, 233, 0.18)' : '#E0F2FE',
          color: isDark ? '#38BDF8' : '#0284C7',
          border: '1px solid rgba(14, 165, 233, 0.35)',
        };
      case 'HTTP':
        return {
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.18)' : '#FEF3C7',
          color: '#F59E0B',
          border: '1px solid rgba(245, 158, 11, 0.35)',
        };
      case 'UDP_FALLBACK':
        return {
          backgroundColor: isDark ? 'rgba(245, 158, 11, 0.2)' : '#FEF3C7',
          color: '#D97706',
          border: '1px solid rgba(245, 158, 11, 0.45)',
        };
    }
  };

  const panelSurface = isDark ? '#0F172A' : '#F8FAFC';
  const cardSurface = isDark ? '#1E293B' : '#FFFFFF';
  const elevatedSurface = isDark ? '#0B1120' : '#F1F5F9';
  const borderColor = isDark ? '#334155' : '#E2E8F0';
  const textPrimary = isDark ? '#F8FAFC' : '#0F172A';
  const textSecondary = isDark ? '#CBD5E1' : '#475569';
  const textMuted = isDark ? '#94A3B8' : '#64748B';

  return (
    <section
      aria-label="Bảng Giám Sát Giao Thức Mạng TCP/UDP/WS/HTTP"
      style={{
        position: isExpandedModal ? 'fixed' : 'relative',
        inset: isExpandedModal ? '12px' : undefined,
        zIndex: isExpandedModal ? 900 : 30,
        height: isExpandedModal ? 'calc(100dvh - 24px)' : '370px',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: panelSurface,
        color: textPrimary,
        borderTop: isExpandedModal ? `1px solid ${borderColor}` : `2px solid #2563EB`,
        border: isExpandedModal ? `1px solid ${borderColor}` : undefined,
        borderRadius: isExpandedModal ? '16px' : '0px',
        boxShadow: isExpandedModal
          ? '0 24px 48px -12px rgba(2, 6, 23, 0.65)'
          : '0 -4px 20px rgba(15, 23, 42, 0.08)',
        overflow: 'hidden',
        transition: 'height 180ms ease, background-color 180ms ease',
      }}
    >
      {/* Top Sticky Telemetry Header Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
          padding: '8px 16px',
          backgroundColor: cardSurface,
          borderBottom: `1px solid ${borderColor}`,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              backgroundColor: isDark ? 'rgba(59, 130, 246, 0.18)' : '#EFF6FF',
              color: isDark ? '#3B82F6' : '#2563EB',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.35)' : '#DBEAFE'}`,
            }}
          >
            <Activity size={17} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontWeight: 700,
                  fontSize: '14px',
                  letterSpacing: '-0.01em',
                }}
              >
                Network Telemetry &amp; Application Protocol v2 Inspector
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '9999px',
                  backgroundColor: metrics.isFallbackActive
                    ? isDark
                      ? 'rgba(245, 158, 11, 0.2)'
                      : '#FEF3C7'
                    : isDark
                    ? 'rgba(16, 185, 129, 0.18)'
                    : '#D1FAE5',
                  color: metrics.isFallbackActive ? '#F59E0B' : '#10B981',
                  border: `1px solid ${
                    metrics.isFallbackActive
                      ? 'rgba(245, 158, 11, 0.4)'
                      : 'rgba(16, 185, 129, 0.35)'
                  }`,
                }}
              >
                {metrics.isFallbackActive
                  ? 'UDP fallback active (WS/TCP :8081)'
                  : '4 Transports Online'}
              </span>
            </div>
            <div style={{ fontSize: '11px', color: textMuted }}>
              Đồ án Lập trình Mạng máy tính (CMP180) — Đối chiếu trực tiếp TCP Socket (:5000), UDP Datagram (:5001), HTTP (:8080) &amp; WebSocket (:8081)
            </div>
          </div>
        </div>

        {/* Section 2: Interactive Classroom Defense Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Send RTT Probe Button */}
          <button
            type="button"
            onClick={handleSendProbe}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              height: '32px',
              padding: '0 12px',
              borderRadius: '8px',
              backgroundColor: '#2563EB',
              color: '#FFFFFF',
              fontSize: '12px',
              fontWeight: 700,
              boxShadow: '0 2px 6px rgba(37, 99, 235, 0.25)',
            }}
            title="Phát gói tin UDP_PING (:5001) và PING (:8081/:5000) để đo độ trễ RTT thực tế"
          >
            <Zap size={14} />
            <span>Gửi gói dò RTT (Send RTT Probe)</span>
          </button>

          {/* 5x Burst Probe Button for live chart demo */}
          <button
            type="button"
            onClick={handleSendBurstProbes}
            disabled={isProbingBurst}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              height: '32px',
              padding: '0 10px',
              borderRadius: '8px',
              backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
              color: isDark ? '#38BDF8' : '#0284C7',
              border: `1px solid ${isDark ? '#334155' : '#BAE6FD'}`,
              fontSize: '12px',
              fontWeight: 700,
            }}
            title="Bắn liên tiếp 5 gói dò RTT để minh họa biến thiên Jitter trên đồ thị"
          >
            <RefreshCw size={13} className={isProbingBurst ? 'animate-spin' : ''} />
            <span>{isProbingBurst ? 'Đang bắn 5x...' : 'Burst 5x'}</span>
          </button>

          {/* Simulate UDP Firewall Block Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(udpBlockedSimulated)}
            onClick={() => setUdpBlockedSimulated(!udpBlockedSimulated)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              height: '32px',
              padding: '0 12px',
              borderRadius: '8px',
              backgroundColor: udpBlockedSimulated
                ? isDark
                  ? 'rgba(245, 158, 11, 0.22)'
                  : '#FEF3C7'
                : isDark
                ? '#1E293B'
                : '#F1F5F9',
              color: udpBlockedSimulated ? '#D97706' : textSecondary,
              border: `1px solid ${
                udpBlockedSimulated ? '#F59E0B' : borderColor
              }`,
              fontSize: '12px',
              fontWeight: 700,
              transition: 'all 150ms ease',
            }}
            title="Mô phỏng tường lửa chặn cổng UDP :5001 để chứng minh cơ chế tự động chuyển đổi dự phòng sang WebSocket/TCP"
          >
            {udpBlockedSimulated ? (
              <ShieldAlert size={14} color="#F59E0B" />
            ) : (
              <ShieldCheck size={14} color="#10B981" />
            )}
            <span>Giả lập chặn tường lửa UDP :5001 (Simulate UDP Block)</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                width: '30px',
                height: '16px',
                borderRadius: '9999px',
                padding: '2px',
                backgroundColor: udpBlockedSimulated ? '#F59E0B' : '#94A3B8',
                transition: 'background-color 150ms ease',
              }}
            >
              <span
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  transform: udpBlockedSimulated ? 'translateX(14px)' : 'translateX(0)',
                  transition: 'transform 150ms ease',
                }}
              />
            </span>
          </button>

          {/* Expand / Dock Toggle */}
          <button
            type="button"
            onClick={() => setIsExpandedModal(!isExpandedModal)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: elevatedSurface,
              color: textSecondary,
              border: `1px solid ${borderColor}`,
            }}
            title={isExpandedModal ? 'Thu gọn về ngăn dưới' : 'Phóng toàn màn hình để thuyết trình'}
            aria-label={isExpandedModal ? 'Thu gọn bảng giám sát' : 'Phóng to bảng giám sát'}
          >
            {isExpandedModal ? <Minimize2 size={15} /> : <Expand size={15} />}
          </button>

          {/* Close Monitor Drawer */}
          <button
            type="button"
            onClick={() => setMonitorOpen(false)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: elevatedSurface,
              color: textSecondary,
              border: `1px solid ${borderColor}`,
            }}
            title="Đóng Network Monitor"
            aria-label="Đóng Network Monitor"
          >
            <X size={15} />
          </button>
        </div>
      </header>

      {/* Visual Alert Banner when UDP :5001 Firewall Block is Active */}
      {metrics.isFallbackActive && (
        <div
          role="status"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '6px 16px',
            backgroundColor: isDark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7',
            borderBottom: '1px solid rgba(245, 158, 11, 0.4)',
            color: isDark ? '#FBBF24' : '#92400E',
            fontSize: '12px',
            fontWeight: 600,
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} color="#F59E0B" />
            <span>
              <strong>CẢNH BÁO TƯỜNG LỬA UDP (:5001 BLOCKED):</strong> Các gói tin{' '}
              <code style={{ fontFamily: 'var(--font-mono)' }}>UDP_PING</code>,{' '}
              <code style={{ fontFamily: 'var(--font-mono)' }}>UDP_TYPING</code>,{' '}
              <code style={{ fontFamily: 'var(--font-mono)' }}>UDP_PRESENCE</code> đang tự động định tuyến dự phòng sang{' '}
              <strong>WebSocket / TCP (:8081 → :5000)</strong> theo đặc tả mục 10.3 PROTOCOL.md!
            </span>
          </div>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: '#F59E0B',
              color: '#FFFFFF',
              whiteSpace: 'nowrap',
            }}
          >
            UDP fallback active
          </span>
        </div>
      )}

      {/* Main Scrollable Telemetry Body */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {/* SECTION 1: Multi-Transport Status Matrix (4 Live Cards) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(225px, 1fr))',
            gap: '10px',
          }}
        >
          {/* Card 1: TCP Socket (:5000) */}
          <div
            style={{
              backgroundColor: cardSurface,
              border: `1px solid ${borderColor}`,
              borderLeft: '4px solid #2563EB',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDark ? '#60A5FA' : '#2563EB',
                }}
              >
                <Server size={14} />
                TCP Socket (:5000)
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#D1FAE5',
                  color: '#10B981',
                }}
              >
                CONNECTED • {metrics.latestTcpWs}ms
              </span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
              Application Protocol v2 (Swing &amp; Core Bridge)
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              COMMAND|base64|@RID|uuid • Heartbeat 15s
            </div>
          </div>

          {/* Card 2: UDP Datagram (:5001) */}
          <div
            style={{
              backgroundColor: cardSurface,
              border: `1px solid ${
                metrics.isFallbackActive ? '#F59E0B' : borderColor
              }`,
              borderLeft: `4px solid ${metrics.isFallbackActive ? '#F59E0B' : '#10B981'}`,
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: metrics.isFallbackActive ? '#F59E0B' : '#10B981',
                }}
              >
                <Radio size={14} />
                UDP Datagram (:5001)
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  backgroundColor: metrics.isFallbackActive
                    ? isDark
                      ? 'rgba(245, 158, 11, 0.22)'
                      : '#FEF3C7'
                    : isDark
                    ? 'rgba(16, 185, 129, 0.18)'
                    : '#D1FAE5',
                  color: metrics.isFallbackActive ? '#F59E0B' : '#10B981',
                }}
              >
                {metrics.isFallbackActive
                  ? 'UDP BLOCKED → FALLBACK TO WS/TCP'
                  : `ACTIVE • ${metrics.latestUdp ?? 6}ms`}
              </span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
              Low-Latency Typing, Presence &amp; RTT Probe
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              UDP_PING / UDP_PONG • Connectionless ≤1024B
            </div>
          </div>

          {/* Card 3: HTTP REST (:8080) */}
          <div
            style={{
              backgroundColor: cardSurface,
              border: `1px solid ${borderColor}`,
              borderLeft: '4px solid #F59E0B',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: '#F59E0B',
                }}
              >
                <Database size={14} />
                HTTP REST (:8080)
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  backgroundColor: isDark ? 'rgba(16, 185, 129, 0.16)' : '#D1FAE5',
                  color: '#10B981',
                }}
              >
                JDK VIRTUAL THREADS
              </span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
              JDK HttpServer + PostgreSQL Neon
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Auth JWT • Cursor History • bytea Upload
            </div>
          </div>

          {/* Card 4: WebSocket (:8081) */}
          <div
            style={{
              backgroundColor: cardSurface,
              border: `1px solid ${borderColor}`,
              borderLeft: '4px solid #0284C7',
              borderRadius: '10px',
              padding: '10px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: isDark ? '#38BDF8' : '#0284C7',
                }}
              >
                <Globe size={14} />
                WebSocket (:8081)
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  backgroundColor: isDark ? 'rgba(14, 165, 233, 0.18)' : '#E0F2FE',
                  color: isDark ? '#38BDF8' : '#0284C7',
                }}
              >
                FULL-DUPLEX RFC 6455
              </span>
            </div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
              Full-Duplex JSON Envelope Bridge
            </div>
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                color: textMuted,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {`{type, rid, payload} ↔ EventBus`}
            </div>
          </div>
        </div>

        {/* SECTION 3 & 4 SPLIT: Left = Real-Time RTT SVG Chart | Right = Live Protocol Frame Inspector & Dissector */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isExpandedModal ? '430px 1fr' : '380px 1fr',
            gap: '12px',
            alignItems: 'stretch',
          }}
        >
          {/* SECTION 3: Real-Time RTT Comparison Chart (SVG Dual-Series) */}
          <div
            style={{
              backgroundColor: cardSurface,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: textPrimary }}>
                  So sánh Độ trễ RTT Thời gian thực (20 mẫu gần nhất)
                </div>
                <div style={{ fontSize: '11px', color: textMuted }}>
                  TCP/WS Stream (Đáng tin cậy) vs UDP :5001 Datagram (Tốc độ cao)
                </div>
              </div>
              <Wifi size={16} color="#2563EB" />
            </div>

            {/* 4 Summary Metric Pills */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '6px',
              }}
            >
              <div
                style={{
                  backgroundColor: elevatedSurface,
                  borderRadius: '8px',
                  padding: '6px 8px',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: textMuted }}>
                  AVG TCP/WS
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isDark ? '#3B82F6' : '#2563EB',
                  }}
                >
                  {metrics.avgTcpWsRtt} ms
                </div>
              </div>

              <div
                style={{
                  backgroundColor: elevatedSurface,
                  borderRadius: '8px',
                  padding: '6px 8px',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: textMuted }}>
                  AVG UDP :5001
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: metrics.isFallbackActive ? '#F59E0B' : '#10B981',
                  }}
                >
                  {metrics.avgUdpRtt !== null ? `${metrics.avgUdpRtt} ms` : 'FALLBACK'}
                </div>
              </div>

              <div
                style={{
                  backgroundColor: elevatedSurface,
                  borderRadius: '8px',
                  padding: '6px 8px',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: textMuted }}>
                  JITTER
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: '#0284C7',
                  }}
                >
                  ±{metrics.jitterMs} ms
                </div>
              </div>

              <div
                style={{
                  backgroundColor: elevatedSurface,
                  borderRadius: '8px',
                  padding: '6px 8px',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <div style={{ fontSize: '10px', fontWeight: 700, color: textMuted }}>
                  PACKETS
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: textPrimary,
                  }}
                >
                  {Array.isArray(frameLogs) ? frameLogs.length : 0}
                </div>
              </div>
            </div>

            {/* Dual-Series SVG Chart */}
            <div style={{ position: 'relative', width: '100%' }}>
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                style={{
                  width: '100%',
                  height: isExpandedModal ? '210px' : '145px',
                  display: 'block',
                  backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
                  borderRadius: '8px',
                  border: `1px solid ${borderColor}`,
                }}
              >
                <defs>
                  <linearGradient id="tcpBlueFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.28" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.02" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid Lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = padTop + ratio * plotHeight;
                  const labelVal = Math.round(maxRttScale * (1 - ratio));
                  return (
                    <g key={idx}>
                      <line
                        x1={padLeft}
                        y1={y}
                        x2={svgWidth - padRight}
                        y2={y}
                        stroke={isDark ? '#1E293B' : '#E2E8F0'}
                        strokeDasharray={ratio === 1 ? undefined : '4 4'}
                        strokeWidth="1"
                      />
                      <text
                        x={padLeft - 6}
                        y={y + 4}
                        textAnchor="end"
                        fill={textMuted}
                        fontSize="10"
                        fontFamily="var(--font-mono)"
                      >
                        {labelVal}ms
                      </text>
                    </g>
                  );
                })}

                {/* Series 1 Area + Line: TCP / WebSocket RTT (Royal Blue #2563EB) */}
                {tcpAreaPath && <path d={tcpAreaPath} fill="url(#tcpBlueFill)" />}
                {tcpPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={isDark ? '#3B82F6' : '#2563EB'}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={tcpPolyline}
                  />
                )}

                {/* Series 2 Line: UDP :5001 Datagram RTT (Emerald #10B981 or Dashed Amber #F59E0B) */}
                {udpPoints.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={metrics.isFallbackActive ? '#F59E0B' : '#10B981'}
                    strokeWidth="2.5"
                    strokeDasharray={metrics.isFallbackActive ? '6 4' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={udpPolyline}
                  />
                )}

                {/* Interactive Sample Data Nodes */}
                {tcpPoints.map((pt, idx) => {
                  const udpPt = udpPoints[idx];
                  const isHovered = hoveredSampleIndex === idx;
                  return (
                    <g
                      key={pt.seq ?? idx}
                      onMouseEnter={() => setHoveredSampleIndex(idx)}
                      onMouseLeave={() => setHoveredSampleIndex(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {isHovered && (
                        <line
                          x1={pt.x}
                          y1={padTop}
                          x2={pt.x}
                          y2={padTop + plotHeight}
                          stroke="#0284C7"
                          strokeWidth="1"
                          strokeDasharray="2 2"
                        />
                      )}
                      <circle
                        cx={pt.x}
                        cy={pt.y}
                        r={isHovered ? 5 : 3.2}
                        fill={isDark ? '#3B82F6' : '#2563EB'}
                        stroke="#FFFFFF"
                        strokeWidth="1.2"
                      />
                      {udpPt && (
                        <circle
                          cx={udpPt.x}
                          cy={udpPt.y}
                          r={isHovered ? 5 : 3.2}
                          fill={
                            udpPt.isFallback || metrics.isFallbackActive
                              ? '#F59E0B'
                              : '#10B981'
                          }
                          stroke="#FFFFFF"
                          strokeWidth="1.2"
                        />
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Hover Tooltip on Chart */}
              {hoveredSampleIndex !== null && recentSamples[hoveredSampleIndex] && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '12px',
                    backgroundColor: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
                    border: `1px solid ${borderColor}`,
                    borderRadius: '8px',
                    padding: '6px 10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                    pointerEvents: 'none',
                  }}
                >
                  <div style={{ fontWeight: 700, color: textPrimary }}>
                    Seq #{recentSamples[hoveredSampleIndex].seq}
                  </div>
                  <div style={{ color: '#2563EB' }}>
                    TCP/WS: {recentSamples[hoveredSampleIndex].tcpRttMs} ms
                  </div>
                  <div
                    style={{
                      color:
                        recentSamples[hoveredSampleIndex].udpFallback ||
                        recentSamples[hoveredSampleIndex].udpRttMs === null
                          ? '#F59E0B'
                          : '#10B981',
                    }}
                  >
                    UDP :5001:{' '}
                    {recentSamples[hoveredSampleIndex].udpRttMs !== null &&
                    !recentSamples[hoveredSampleIndex].udpFallback
                      ? `${recentSamples[hoveredSampleIndex].udpRttMs} ms`
                      : 'Fallback → WS'}
                  </div>
                </div>
              )}
            </div>

            {/* Chart Legend */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
                fontSize: '11px',
                color: textSecondary,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: '#2563EB',
                      display: 'inline-block',
                    }}
                  />
                  <strong>TCP/WS (:5000/:8081)</strong>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <span
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      backgroundColor: metrics.isFallbackActive ? '#F59E0B' : '#10B981',
                      display: 'inline-block',
                    }}
                  />
                  <strong>
                    {metrics.isFallbackActive
                      ? 'UDP :5001 (Fallback sang WS)'
                      : 'UDP Datagram (:5001)'}
                  </strong>
                </span>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', color: textMuted }}>
                Window: {recentSamples.length}/20 samples
              </span>
            </div>
          </div>

          {/* SECTION 4: Live Application Protocol Frame Inspector + Dissector */}
          <div
            style={{
              backgroundColor: cardSurface,
              border: `1px solid ${borderColor}`,
              borderRadius: '12px',
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              minWidth: 0,
            }}
          >
            {/* Filter Pills + Search Input + Clear Button */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    color: textMuted,
                    marginRight: '4px',
                  }}
                >
                  <Filter size={12} />
                  Lọc gói:
                </span>
                {(['ALL', 'TCP', 'UDP', 'WS', 'HTTP'] as FilterTransport[]).map((pill) => {
                  const active = transportFilter === pill;
                  return (
                    <button
                      key={pill}
                      type="button"
                      onClick={() => setTransportFilter(pill)}
                      style={{
                        height: '26px',
                        padding: '0 10px',
                        borderRadius: '9999px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '11px',
                        fontWeight: 700,
                        backgroundColor: active
                          ? '#2563EB'
                          : isDark
                          ? '#0B1120'
                          : '#F1F5F9',
                        color: active ? '#FFFFFF' : textSecondary,
                        border: `1px solid ${active ? '#2563EB' : borderColor}`,
                      }}
                    >
                      {pill}
                    </button>
                  );
                })}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, maxWidth: '320px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flex: 1,
                    height: '28px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    backgroundColor: elevatedSurface,
                    border: `1px solid ${borderColor}`,
                  }}
                >
                  <Search size={13} color={textMuted} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm lệnh (SEND_MESSAGE, UDP_PING, @RID...)"
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '12px',
                      fontFamily: 'var(--font-mono)',
                      color: textPrimary,
                    }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    clearFrameLogs();
                    setSelectedFrameId(null);
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    height: '28px',
                    padding: '0 10px',
                    borderRadius: '8px',
                    backgroundColor: elevatedSurface,
                    color: textSecondary,
                    border: `1px solid ${borderColor}`,
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                  title="Xóa nhật ký gói tin"
                >
                  <Trash2 size={12} />
                  <span>Clear</span>
                </button>
              </div>
            </div>

            {/* Split inside Section 4: Frame Table (Top) + Frame Dissector & Base64 Decoder (Bottom) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: isExpandedModal ? '1.15fr 0.85fr' : '1.1fr 0.9fr',
                gap: '10px',
                minHeight: isExpandedModal ? '380px' : '175px',
                maxHeight: isExpandedModal ? '520px' : '195px',
              }}
            >
              {/* Scrollable Live Frame Table */}
              <div
                style={{
                  overflowY: 'auto',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
                }}
              >
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        position: 'sticky',
                        top: 0,
                        backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                        color: textSecondary,
                        textAlign: 'left',
                        zIndex: 1,
                      }}
                    >
                      <th style={{ padding: '5px 8px', width: '54px' }}>Chiều</th>
                      <th style={{ padding: '5px 8px', width: '76px' }}>Giao thức</th>
                      <th style={{ padding: '5px 8px', width: '84px' }}>Timestamp</th>
                      <th style={{ padding: '5px 8px' }}>Raw Frame (Click để giải mã Base64)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.length === 0 ? (
                      <tr>
                        <td
                          colSpan={4}
                          style={{
                            padding: '24px 12px',
                            textAlign: 'center',
                            color: textMuted,
                            fontFamily: 'var(--font-sans)',
                          }}
                        >
                          Chưa có gói tin nào khớp bộ lọc. Hãy nhấn{' '}
                          <strong>&ldquo;Gửi gói dò RTT&rdquo;</strong> hoặc gửi tin nhắn chat!
                        </td>
                      </tr>
                    ) : (
                      filteredLogs.map((item) => {
                        const isSelected = selectedFrame?.id === item.id;
                        const isOut = item.direction === 'OUT';
                        return (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedFrameId(item.id)}
                            style={{
                              cursor: 'pointer',
                              backgroundColor: isSelected
                                ? isDark
                                  ? 'rgba(59, 130, 246, 0.22)'
                                  : '#DBEAFE'
                                : 'transparent',
                              borderBottom: `1px solid ${borderColor}`,
                              transition: 'background-color 100ms ease',
                            }}
                          >
                            <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '2px',
                                  fontWeight: 700,
                                  color: isOut ? '#0284C7' : '#10B981',
                                }}
                              >
                                {isOut ? (
                                  <>
                                    <ArrowUpRight size={12} />
                                    OUT ↑
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownLeft size={12} />
                                    IN ↓
                                  </>
                                )}
                              </span>
                            </td>
                            <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '1px 6px',
                                  borderRadius: '9999px',
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  ...getTransportBadgeStyle(item.transport),
                                }}
                              >
                                {item.transport}
                              </span>
                            </td>
                            <td
                              style={{
                                padding: '5px 8px',
                                color: textMuted,
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatTimeMs(item.timestampMs)}
                            </td>
                            <td
                              style={{
                                padding: '5px 8px',
                                maxWidth: '280px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: textPrimary,
                                fontWeight: isSelected ? 700 : 500,
                              }}
                              title={item.rawFrame}
                            >
                              {item.rawFrame}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Frame Dissector & Automatic UTF-8 Base64 Decoder Panel */}
              <div
                style={{
                  overflowY: 'auto',
                  border: `1px solid ${borderColor}`,
                  borderRadius: '8px',
                  backgroundColor: isDark ? '#0B1120' : '#F8FAFC',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                {dissectedResult && selectedFrame ? (
                  <>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '6px',
                        borderBottom: `1px solid ${borderColor}`,
                        paddingBottom: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Code2 size={14} color="#2563EB" />
                        <span style={{ fontSize: '12px', fontWeight: 700, color: textPrimary }}>
                          Frame Dissector:{' '}
                          <code
                            style={{
                              fontFamily: 'var(--font-mono)',
                              color: isDark ? '#60A5FA' : '#2563EB',
                            }}
                          >
                            {dissectedResult.command}
                          </code>
                        </span>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: '6px',
                            backgroundColor: isDark ? '#1E293B' : '#E2E8F0',
                            color: textSecondary,
                          }}
                        >
                          {dissectedResult.version}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '10px',
                          color: textMuted,
                        }}
                      >
                        {dissectedResult.byteLength} bytes
                      </span>
                    </div>

                    <div style={{ fontSize: '11px', color: textSecondary, lineHeight: 1.4 }}>
                      {dissectedResult.description}
                    </div>

                    {/* Dissected Fields List */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      {dissectedResult.fields.map((f) => (
                        <div
                          key={`${f.index}-${f.label}`}
                          style={{
                            backgroundColor: cardSurface,
                            border: `1px solid ${borderColor}`,
                            borderRadius: '6px',
                            padding: '5px 8px',
                            fontSize: '11px',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: '6px',
                            }}
                          >
                            <span style={{ fontWeight: 700, color: textPrimary }}>
                              [{f.index}] {f.label}
                            </span>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '9px',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                backgroundColor:
                                  f.encoding === 'BASE64_UTF8'
                                    ? isDark
                                      ? 'rgba(16, 185, 129, 0.18)'
                                      : '#D1FAE5'
                                    : f.encoding === 'UUID_TRAILER'
                                    ? isDark
                                      ? 'rgba(2, 132, 199, 0.18)'
                                      : '#E0F2FE'
                                    : elevatedSurface,
                                color:
                                  f.encoding === 'BASE64_UTF8'
                                    ? '#10B981'
                                    : f.encoding === 'UUID_TRAILER'
                                    ? '#0284C7'
                                    : textMuted,
                              }}
                            >
                              {f.encoding}
                            </span>
                          </div>

                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '11px',
                              color: textSecondary,
                              wordBreak: 'break-all',
                              marginTop: '2px',
                            }}
                          >
                            Raw: {f.rawValue || '(empty)'}
                          </div>

                          {f.decodedUtf8 && (
                            <div
                              style={{
                                marginTop: '3px',
                                padding: '3px 6px',
                                borderRadius: '4px',
                                backgroundColor: isDark
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : '#ECFDF5',
                                color: '#10B981',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                wordBreak: 'break-word',
                              }}
                            >
                              ↳ Giải mã Base64 UTF-8: &ldquo;{f.decodedUtf8}&rdquo;
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: '10px',
                              color: textMuted,
                              marginTop: '2px',
                            }}
                          >
                            {f.protocolNote}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* ACK / Reliability Contract Footer */}
                    <div
                      style={{
                        marginTop: 'auto',
                        padding: '5px 8px',
                        borderRadius: '6px',
                        backgroundColor: isDark ? 'rgba(37, 99, 235, 0.12)' : '#EFF6FF',
                        border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : '#DBEAFE'}`,
                        fontSize: '10px',
                        color: isDark ? '#93C5FD' : '#1E40AF',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      <strong>Hợp đồng phản hồi (PROTOCOL.md):</strong> {dissectedResult.ackContract}
                    </div>
                  </>
                ) : (
                  <div
                    style={{
                      margin: 'auto',
                      textAlign: 'center',
                      color: textMuted,
                      fontSize: '12px',
                      padding: '16px',
                    }}
                  >
                    <Layers size={20} style={{ margin: '0 auto 6px', opacity: 0.6 }} />
                    <div>Chọn một khung giao thức bên trái để phân tích cấu trúc trường và giải mã Base64 UTF-8.</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NetworkMonitorPanel;
