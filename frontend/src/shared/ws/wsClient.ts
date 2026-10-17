import type { NetworkFrameLog, TransportKind, WsEnvelope } from '../types/api';

const DEFAULT_WS_BASE =
  (import.meta as unknown as { env?: Record<string, string | undefined> }).env?.VITE_WS_URL ||
  'ws://localhost:8081';

type WsEventHandler = (envelope: WsEnvelope<Record<string, unknown>>) => void;
type ConnectionStateHandler = (connected: boolean) => void;
type FrameLogger = (entry: Omit<NetworkFrameLog, 'id' | 'timestampMs'>) => void;

export class WsClient {
  private wsUrl: string;
  private socket: WebSocket | null = null;
  private token: string | null = null;
  private handlers = new Set<WsEventHandler>();
  private stateHandlers = new Set<ConnectionStateHandler>();
  private frameLogger: FrameLogger | null = null;
  private reconnectTimer: number | null = null;
  private manualClose = false;

  constructor(wsUrl = DEFAULT_WS_BASE) {
    this.wsUrl = wsUrl;
  }

  setFrameLogger(logger: FrameLogger | null): void {
    this.frameLogger = logger;
  }

  onEvent(handler: WsEventHandler): () => void {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  onConnectionState(handler: ConnectionStateHandler): () => void {
    this.stateHandlers.add(handler);
    return () => {
      this.stateHandlers.delete(handler);
    };
  }

  connect(token: string): void {
    this.token = token;
    this.manualClose = false;
    this.clearReconnect();

    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      this.socket.close();
    }

    const separator = this.wsUrl.includes('?') ? '&' : '?';
    const fullUrl = `${this.wsUrl}${separator}token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(fullUrl);
      this.socket = ws;

      ws.onopen = () => {
        this.emitFrame(
          'OUT',
          'WS',
          `WS_HANDSHAKE GET ${this.wsUrl}?token=jwt... HTTP/1.1 101 Switching Protocols`,
          'WebSocket Connected (:8081)',
        );
        this.notifyState(true);
      };

      ws.onmessage = (event: MessageEvent) => {
        const raw = typeof event.data === 'string' ? event.data : JSON.stringify(event.data);
        try {
          const parsed = JSON.parse(raw) as WsEnvelope<Record<string, unknown>>;
          const eventType = parsed.type || 'UNKNOWN';
          const payloadTransport =
            (parsed.payload?.transport as TransportKind | undefined) ?? 'WS';

          if (eventType === 'PROTOCOL_FRAME_LOG') {
            const p = parsed.payload ?? {};
            this.emitFrame(
              (p.direction as 'IN' | 'OUT') ?? 'IN',
              (p.transport as TransportKind) ?? 'TCP',
              String(p.rawFrame ?? raw),
              `Bridge ${String(p.transport ?? 'TCP')} Frame`,
            );
          } else {
            this.emitFrame(
              'IN',
              payloadTransport,
              raw,
              `RX ${eventType}`,
            );
          }

          this.handlers.forEach((h) => h(parsed));
        } catch {
          this.emitFrame('IN', 'WS', raw, 'RX Raw WS Text Frame');
        }
      };

      ws.onerror = () => {
        this.notifyState(false);
      };

      ws.onclose = () => {
        this.notifyState(false);
        if (!this.manualClose && this.token) {
          this.reconnectTimer = window.setTimeout(() => {
            if (this.token && !this.manualClose) {
              this.connect(this.token);
            }
          }, 4000);
        }
      };
    } catch {
      this.notifyState(false);
    }
  }

  disconnect(): void {
    this.manualClose = true;
    this.token = null;
    this.clearReconnect();
    if (this.socket) {
      try {
        this.socket.close();
      } catch {
        // Ignore close errors
      }
      this.socket = null;
    }
    this.notifyState(false);
  }

  isOpen(): boolean {
    return this.socket !== null && this.socket.readyState === WebSocket.OPEN;
  }

  send<T = Record<string, unknown>>(
    type: string,
    payload: T,
    transportHint: TransportKind = 'WS',
  ): boolean {
    const rid = `req-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const envelope: WsEnvelope<T> = { type, rid, payload };
    const serialized = JSON.stringify(envelope);

    this.emitFrame('OUT', transportHint, serialized, `TX ${type}`);

    if (this.isOpen() && this.socket) {
      this.socket.send(serialized);
      return true;
    }
    return false;
  }

  private emitFrame(
    direction: 'IN' | 'OUT',
    transport: TransportKind,
    rawFrame: string,
    summary: string,
  ): void {
    if (this.frameLogger) {
      this.frameLogger({ direction, transport, rawFrame, summary });
    }
  }

  private notifyState(connected: boolean): void {
    this.stateHandlers.forEach((fn) => fn(connected));
  }

  private clearReconnect(): void {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
}

export const wsClient = new WsClient();
