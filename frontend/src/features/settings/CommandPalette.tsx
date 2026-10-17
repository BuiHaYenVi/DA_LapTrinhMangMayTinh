import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  CornerDownLeft,
  Hash,
  MessageSquare,
  Moon,
  Radio,
  Search,
  Settings,
  ShieldAlert,
  Sun,
  Users,
  Volume2,
} from 'lucide-react';
import { getTranslation } from '../../shared/i18n/translations';
import { TEAM_PERSONAS, useAppStore } from '../../shared/state/appStore';

interface CommandActionItem {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  badge?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    guilds,
    selectGuild,
    selectChannel,
    joinVoiceChannel,
    setViewMode,
    theme,
    toggleTheme,
    locale,
    isMonitorOpen,
    setMonitorOpen,
    setSettingsOpen,
    triggerRttProbe,
    udpBlockedSimulated,
    setUdpBlockedSimulated,
    updatePresence,
    loginDemo,
  } = useAppStore();

  const t = getTranslation(locale);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const closeCommandPalette = () => {
    setQuery('');
    setSelectedIndex(0);
    setCommandPaletteOpen(false);
  };

  // Global Ctrl+K / Cmd+K shortcut listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuery('');
        setSelectedIndex(0);
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        e.preventDefault();
        setQuery('');
        setSelectedIndex(0);
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isCommandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (!isCommandPaletteOpen) return;
    const timer = window.setTimeout(() => {
      inputRef.current?.focus();
    }, 20);
    return () => window.clearTimeout(timer);
  }, [isCommandPaletteOpen]);

  const allItems = useMemo<CommandActionItem[]>(() => {
    const items: CommandActionItem[] = [];

    // 1. All Guild Channels
    for (const guild of guilds) {
      for (const ch of guild.channels) {
        items.push({
          id: `ch-${guild.id}-${ch.id}`,
          group: t.commandPalette.groupNavigation,
          label: `${ch.type === 'voice' ? '' : '#'}${ch.name}`,
          sublabel: guild.name,
          badge: ch.type === 'voice' ? 'UDP/RTC' : 'TCP/WS',
          icon:
            ch.type === 'voice' ? (
              <Volume2 size={16} style={{ color: 'var(--telemetry-udp)' }} />
            ) : (
              <Hash size={16} style={{ color: 'var(--primary)' }} />
            ),
          onSelect: () => {
            selectGuild(guild.id);
            if (ch.type === 'voice') {
              selectChannel(ch.id);
              joinVoiceChannel(ch.id);
            } else {
              selectChannel(ch.id);
            }
          },
        });
      }
    }

    // 2. System & Telemetry Actions
    items.push(
      {
        id: 'act-monitor',
        group: t.commandPalette.groupActions,
        label: t.commandPalette.toggleMonitor,
        sublabel: isMonitorOpen ? 'Đang mở • Bấm để ẩn' : 'Xem biểu đồ RTT & Khung gói tin TCP/UDP',
        badge: 'TCP/UDP',
        icon: <Radio size={16} style={{ color: 'var(--telemetry-udp)' }} />,
        onSelect: () => setMonitorOpen(!isMonitorOpen),
      },
      {
        id: 'act-probe',
        group: t.commandPalette.groupActions,
        label: t.commandPalette.probeRtt,
        sublabel: 'PING_RTT (:8081) + PING_UDP (:5001)',
        badge: 'PROBE',
        icon: <Activity size={16} style={{ color: 'var(--primary)' }} />,
        onSelect: () => {
          setMonitorOpen(true);
          triggerRttProbe();
        },
      },
      {
        id: 'act-udp-block',
        group: t.commandPalette.groupActions,
        label: udpBlockedSimulated
          ? 'Khôi phục cổng UDP :5001 trực tiếp (Tắt mô phỏng chặn)'
          : 'Mô phỏng tường lửa chặn cổng UDP :5001 (Bật UDP_FALLBACK)',
        sublabel: 'Kiểm thử khả năng chịu lỗi giao thức mạng',
        badge: udpBlockedSimulated ? 'FALLBACK' : 'UDP :5001',
        icon: <ShieldAlert size={16} style={{ color: 'var(--warning)' }} />,
        onSelect: () => setUdpBlockedSimulated(!udpBlockedSimulated),
      },
      {
        id: 'act-theme',
        group: t.commandPalette.groupActions,
        label: t.commandPalette.toggleTheme,
        sublabel: theme === 'light' ? 'Chuyển sang Dark Navy Mode' : 'Chuyển sang Light Ocean Mode',
        badge: theme.toUpperCase(),
        icon: theme === 'light' ? <Moon size={16} /> : <Sun size={16} />,
        onSelect: () => toggleTheme(),
      },
      {
        id: 'act-friends',
        group: t.commandPalette.groupActions,
        label: t.commandPalette.openFriends,
        sublabel: 'Danh sách bạn bè & Tin nhắn riêng 1-1',
        badge: 'DM',
        icon: <MessageSquare size={16} />,
        onSelect: () => setViewMode('friends'),
      },
      {
        id: 'act-settings',
        group: t.commandPalette.groupActions,
        label: t.commandPalette.openSettings,
        sublabel: 'Hồ sơ, Giao diện, Giao thức Mạng',
        badge: 'ESC',
        icon: <Settings size={16} />,
        onSelect: () => setSettingsOpen(true),
      },
    );

    // 3. Presence & Quick Persona Switch
    items.push(
      {
        id: 'status-online',
        group: t.commandPalette.groupStatus,
        label: 'Đặt trạng thái: Trực tuyến (ONLINE)',
        badge: 'ONLINE',
        icon: <span className="presence-dot presence-ONLINE" />,
        onSelect: () => updatePresence('ONLINE'),
      },
      {
        id: 'status-idle',
        group: t.commandPalette.groupStatus,
        label: 'Đặt trạng thái: Tạm vắng (IDLE)',
        badge: 'IDLE',
        icon: <span className="presence-dot presence-IDLE" />,
        onSelect: () => updatePresence('IDLE'),
      },
      {
        id: 'status-dnd',
        group: t.commandPalette.groupStatus,
        label: 'Đặt trạng thái: Không làm phiền (DND)',
        badge: 'DND',
        icon: <span className="presence-dot presence-DND" />,
        onSelect: () => updatePresence('DND'),
      },
    );

    (['vi', 'an', 'vinh', 'hai'] as const).forEach((key) => {
      const p = TEAM_PERSONAS[key];
      items.push({
        id: `persona-${key}`,
        group: t.commandPalette.groupStatus,
        label: `Chuyển nhanh sang: ${p.displayName}`,
        sublabel: `@${p.username} • ${p.role}`,
        badge: p.role,
        icon: <Users size={16} style={{ color: 'var(--primary)' }} />,
        onSelect: () => loginDemo(key),
      });
    });

    return items;
  }, [
    guilds,
    isMonitorOpen,
    joinVoiceChannel,
    loginDemo,
    selectChannel,
    selectGuild,
    setMonitorOpen,
    setSettingsOpen,
    setUdpBlockedSimulated,
    setViewMode,
    t,
    theme,
    toggleTheme,
    triggerRttProbe,
    udpBlockedSimulated,
    updatePresence,
  ]);

  const filteredItems = useMemo(() => {
    const clean = query.trim().toLowerCase();
    if (!clean) return allItems;
    return allItems.filter(
      (item) =>
        item.label.toLowerCase().includes(clean) ||
        (item.sublabel && item.sublabel.toLowerCase().includes(clean)) ||
        (item.badge && item.badge.toLowerCase().includes(clean)),
    );
  }, [allItems, query]);

  if (!isCommandPaletteOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (filteredItems.length > 0 ? (prev + 1) % filteredItems.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        filteredItems.length > 0 ? (prev - 1 + filteredItems.length) % filteredItems.length : 0,
      );
    } else if (e.key === 'Enter' && filteredItems[selectedIndex]) {
      e.preventDefault();
      filteredItems[selectedIndex].onSelect();
      closeCommandPalette();
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeCommandPalette();
      }}
    >
      <div className="modal-dialog cmd-palette-dialog" onKeyDown={handleKeyDown}>
        <div className="cmd-search-bar">
          <Search size={18} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            className="cmd-search-input"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder={t.commandPalette.placeholder}
          />
          <span className="kbd-badge">ESC</span>
        </div>

        <div className="cmd-list">
          {filteredItems.length === 0 ? (
            <div
              style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: 'var(--on-surface-muted)',
              }}
            >
              {t.commandPalette.emptyState}
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const selected = idx === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`cmd-item ${selected ? 'selected' : ''}`}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => {
                    item.onSelect();
                    closeCommandPalette();
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    {item.icon}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.label}
                      </div>
                      {item.sublabel && (
                        <div
                          className="text-body-sm"
                          style={{
                            color: selected ? 'var(--primary)' : 'var(--on-surface-muted)',
                            fontSize: '12px',
                          }}
                        >
                          {item.sublabel}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {item.badge && <span className="kbd-badge">{item.badge}</span>}
                    {selected && <CornerDownLeft size={14} />}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;
