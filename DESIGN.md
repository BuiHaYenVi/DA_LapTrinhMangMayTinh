---
version: "1.0.0"
name: "Oceanic Protocol — Discord Web Clone"
description: "Dual-theme real-time messaging, voice/video communication, and live TCP/UDP network telemetry workspace."
colors:
  primary: "#2563EB"
  primary-hover: "#1D4ED8"
  primary-active: "#1E40AF"
  primary-soft: "#EFF6FF"
  primary-tint: "#DBEAFE"
  secondary: "#0284C7"
  secondary-hover: "#0369A1"
  secondary-soft: "#E0F2FE"
  tertiary: "#F59E0B"
  tertiary-soft: "#FEF3C7"
  surface: "#FFFFFF"
  surface-subtle: "#F8FAFC"
  surface-muted: "#F1F5F9"
  surface-elevated: "#FFFFFF"
  surface-hover: "#E2E8F0"
  on-surface: "#0F172A"
  on-surface-secondary: "#475569"
  on-surface-muted: "#64748B"
  on-primary: "#FFFFFF"
  border: "#E2E8F0"
  border-strong: "#CBD5E1"
  success: "#10B981"
  success-soft: "#D1FAE5"
  warning: "#F59E0B"
  warning-soft: "#FEF3C7"
  error: "#F43F5E"
  error-soft: "#FFE4E6"
  presence-online: "#10B981"
  presence-idle: "#F59E0B"
  presence-dnd: "#F43F5E"
  presence-offline: "#94A3B8"
  telemetry-tcp: "#2563EB"
  telemetry-udp: "#10B981"
  dark-surface-rail: "#0B1120"
  dark-surface-sidebar: "#0F172A"
  dark-surface-main: "#1E293B"
  dark-surface-elevated: "#334155"
  dark-on-surface: "#F8FAFC"
  dark-on-surface-secondary: "#CBD5E1"
  dark-on-surface-muted: "#94A3B8"
  dark-primary: "#3B82F6"
  dark-secondary: "#0EA5E9"
  dark-border: "#334155"
typography:
  headline-display:
    fontFamily: "Quicksand"
    fontSize: 32px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: "Quicksand"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.015em
  headline-md:
    fontFamily: "Quicksand"
    fontSize: 18px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: "Quicksand"
    fontSize: 16px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: -0.005em
  body-lg:
    fontFamily: "Quicksand"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0em
  body-md:
    fontFamily: "Quicksand"
    fontSize: 15px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0em
  body-sm:
    fontFamily: "Quicksand"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0em
  label-lg:
    fontFamily: "Quicksand"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: 0.01em
  label-md:
    fontFamily: "Quicksand"
    fontSize: 12px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: 0.02em
  label-sm:
    fontFamily: "Quicksand"
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: 0.06em
  mono-lg:
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: -0.01em
  mono-md:
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0em
  mono-sm:
    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace"
    fontSize: 11px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0em
rounded:
  none: 0px
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 20px
  2xl: 24px
  full: 9999px
spacing:
  2xs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  rail-width: 72px
  channel-sidebar-width: 240px
  member-sidebar-width: 260px
  header-height: 56px
  status-bar-height: 56px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  button-secondary:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.md}"
    padding: 12px
    height: 40px
  guild-rail-icon:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.2xl}"
    size: 48px
  guild-rail-icon-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.lg}"
    size: 48px
  channel-item:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.on-surface-secondary}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 36px
  channel-item-active:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.sm}"
    padding: 8px
    height: 36px
  message-composer:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 12px
  modal-dialog:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.lg}"
    padding: 24px
  badge-mention:
    backgroundColor: "{colors.error}"
    textColor: "{colors.on-primary}"
    typography: "{typography.label-sm}"
    rounded: "{rounded.full}"
    padding: 4px
  network-monitor-drawer:
    backgroundColor: "{colors.surface-subtle}"
    textColor: "{colors.on-surface}"
    typography: "{typography.mono-md}"
    rounded: "{rounded.md}"
    padding: 16px
---

# Oceanic Protocol — Discord Web Clone Design System

## Overview

**Oceanic Protocol** is the visual and interaction language for the Discord Web Clone and Computer Networking (`DA_LapTrinhMangMayTinh`) capstone workspace. It merges friendly, high-clarity real-time community collaboration with precision network engineering telemetry.

- **Brand Personality:** Crisp, transparent, responsive, and technically rigorous.
- **Primary Audience:** Students, instructors, and software engineers evaluating real-time full-duplex TCP/WebSocket chat and low-latency UDP/WebRTC media alongside live protocol frames.
- **Theme Architecture:**
  - **Light Mode (Default):** Clean White (`#FFFFFF`) and Crisp Ice/Slate surfaces (`#F8FAFC`, `#F1F5F9`) paired with **Ocean / Royal Blue** primary accents (`#2563EB`). Designed for daytime lecture halls, code walkthroughs, and high-readability projection.
  - **Dark Navy Mode (`[data-theme="dark"]`):** Deep Navy/Slate surfaces (`#0B1120`, `#0F172A`, `#1E293B`) paired with **Luminous Blue** (`#3B82F6`, `#0EA5E9`) and crisp off-white text (`#F8FAFC`).
- **Strict Anti-Cliche Rule (Zero Purple Ban):** All purple, violet, indigo, and legacy "blurple" hues are strictly prohibited across both themes, gradients, shadows, and chart series.

## Colors

### 1. Light Mode Surfaces & Neutrals (Default `:root`)
- **Primary Canvas (`surface` / `#FFFFFF`):** Main chat stage, modal cards, and active input backgrounds.
- **Channel & Drawer Surface (`surface-subtle` / `#F8FAFC`):** Channel & DM sidebar, Member sidebar, and Network Monitor drawer background.
- **Guild Rail & Muted Containers (`surface-muted` / `#F1F5F9`):** Leftmost Guild Rail (`72px`), code block backgrounds, and inactive pill buttons.
- **Interactive Hover (`surface-hover` / `#E2E8F0`):** Hover state for channel rows, member items, and toolbar icon buttons.
- **Borders (`border` / `#E2E8F0`, `border-strong` / `#CBD5E1`):** Hairline `1px` structural dividers between the 4 workspace columns and card outlines.
- **Typography Hierarchy:**
  - `on-surface` (`#0F172A`): Primary message text, channel headings, and active usernames.
  - `on-surface-secondary` (`#475569`): Channel list labels, timestamps, and role headers.
  - `on-surface-muted` (`#64748B`): Placeholders, offline member names, and packet byte offsets.

### 2. Primary & Secondary Ocean Blue Accents
- **Ocean Royal Blue (`primary` / `#2563EB`):** Primary CTAs, active Guild icon background, send button, and TCP telemetry line series.
- **Deep Royal Hover (`primary-hover` / `#1D4ED8`, `primary-active` / `#1E40AF`):** Hover and pressed states for primary interactive controls.
- **Soft Blue Tints (`primary-soft` / `#EFF6FF`, `primary-tint` / `#DBEAFE`):** Selected channel row background, self-mention highlight bar, and active filter chips.
- **Sky Highlight (`secondary` / `#0284C7`, `secondary-soft` / `#E0F2FE`):** Hyperlinks, file attachment icons, voice/video speaking ring, and informational banners.

### 3. Semantic, Presence & Network Telemetry Accents
- **Online & Low-RTT Emerald (`success` / `presence-online` / `telemetry-udp` / `#10B981`, `success-soft` / `#D1FAE5`):** Online presence dot, active voice connection indicator, UDP datagram series, and RTT `< 50ms` badge.
- **Idle & Medium-RTT Amber (`warning` / `presence-idle` / `tertiary` / `#F59E0B`, `warning-soft` / `#FEF3C7`):** Idle presence badge, pinned message indicator, and RTT `50ms–150ms` warning state.
- **Mentions, DND & Packet Loss Coral (`error` / `presence-dnd` / `#F43F5E`, `error-soft` / `#FFE4E6`):** Unread mention count pills, Do Not Disturb status, disconnect/hangup button, and TCP retransmission / high-RTT (`> 150ms`) alert.
- **Offline Slate (`presence-offline` / `#94A3B8`):** Offline presence ring and archived channel icon.

### 4. Secondary Theme: Dark Navy Mode (`[data-theme="dark"]`)
- **Guild Rail (`dark-surface-rail` / `#0B1120`):** Deepest navy anchor on the far left edge.
- **Channel & Member Sidebars (`dark-surface-sidebar` / `#0F172A`):** Secondary structural framing panels.
- **Main Chat & Stage (`dark-surface-main` / `#1E293B`):** Primary reading and media surface.
- **Elevated Cards & Popovers (`dark-surface-elevated` / `#334155`):** Modals, tooltips, and composer box in dark mode.
- **Luminous Blue Accents (`dark-primary` / `#3B82F6`, `dark-secondary` / `#0EA5E9`):** High-contrast interactive accents optimized for dark navy surfaces.
- **Dark Typography (`dark-on-surface` / `#F8FAFC`, `dark-on-surface-secondary` / `#CBD5E1`, `dark-on-surface-muted` / `#94A3B8`):** Crisp, legible contrast meeting WCAG AA standards.

## Typography

- **Primary UI & Body Font (`Quicksand`):** Rounded geometric sans-serif (`@fontsource/quicksand`) loaded in weights `400`, `500`, `600`, and `700` with complete Vietnamese diacritics support. Because `Quicksand` has a friendly, open x-height, weight `500` is used as the default body weight (`body-md`, `body-lg`) to ensure crisp legibility on high-DPI and classroom projector screens, while `600` and `700` anchor channel names, guild headers, and badges.
- **Technical & Telemetry Monospace (`'JetBrains Mono', 'Fira Code', Consolas, monospace`):** Used exclusively for markdown code blocks, IP:port endpoints, sequence numbers, JSON/binary frame payloads, and live RTT/jitter counters in the Network Monitor drawer.
- **Typographic Scale (13 Tokens):**
  - `headline-display` (`32px`, weight `700`): Auth welcome screens and empty guild hero headers.
  - `headline-lg` (`24px`, weight `700`): Modal titles and channel welcome banners (`#general`).
  - `headline-md` (`18px`, weight `700`): Guild header title and voice stage room title.
  - `headline-sm` (`16px`, weight `600`): Drawer section headers and settings category titles.
  - `body-lg` (`16px`, weight `500`): Emphasized system messages and lead descriptions.
  - `body-md` (`15px`, weight `500`): Default chat message body and composer input text.
  - `body-sm` (`13px`, weight `500`): Message replies, file size metadata, and presence custom status.
  - `label-lg` (`14px`, weight `600`): Active channel names, member list display names, and button labels.
  - `label-md` (`12px`, weight `600`): Timestamp badges, reaction counters, and role pills.
  - `label-sm` (`11px`, weight `700`, uppercase `0.06em` tracking): Channel category headers (`TEXT CHANNELS`, `VOICE CHANNELS`) and role group headers (`OWNER — 1`, `ONLINE — 4`).
  - `mono-lg` (`14px`, weight `500`): Live RTT headline metric (`12.4 ms`).
  - `mono-md` (`12px`, weight `500`): Code blocks and Network Monitor packet table rows.
  - `mono-sm` (`11px`, weight `500`): Hex dump byte offsets and protocol flags (`SYN`, `ACK`, `FIN`, `UDP_DGRAM`).

## Layout

### 4-Column Discord-Inspired Workspace Grid
The main application shell uses a full-viewport locked layout (`100vw` × `100dvh`, `overflow: hidden`) divided into four coordinated vertical zones:

```
+----------+--------------------+---------------------------------------+----------------------+
|  Guild   |  Channel & DM      |  Main Chat / Voice / Network Stage    |  Member & Profile    |
|  Rail    |  Sidebar           |  (Sticky Header + Stream + Composer   |  Sidebar             |
|  (72px)  |  (240px)           |   + Collapsible Telemetry Drawer)     |  (260px)             |
|          |                    |  (1fr flexible width, min 420px)      |                      |
+----------+--------------------+---------------------------------------+----------------------+
```

1. **Column 1 — Guild Rail (`72px` fixed width):**
   - Vertical stack of `48px × 48px` server/guild icons and the top Direct Messages / Home crest button, separated by a `32px × 2px` horizontal slate divider.
   - Left edge features a dynamic Ocean Blue pill indicator (`4px` wide): `8px` tall on hover, expanding smoothly to `36px` tall for the active guild, and `20px` tall when unread messages exist.
2. **Column 2 — Channel & DM Sidebar (`240px` fixed width):**
   - **Top Header (`56px` height):** Displays active Guild name (`headline-md`) with dropdown menu trigger and invite shortcut.
   - **Scrollable Channel Tree (`1fr`):** Collapsible categories (`label-sm` uppercase) for Text Channels (`#`) and Voice/Video Channels (`🔊`), plus active voice participant mini-avatars.
   - **Bottom User Status Bar (`56px` height):** Current user avatar with live presence badge, username/tag, and quick icon toggles for **Mic Mute**, **Camera**, **Network Monitor Drawer**, and **Light/Dark Theme Switcher**.
3. **Column 3 — Main Chat / Voice / Network Monitor Stage (`1fr` flexible width):**
   - **Sticky Top Header (`56px` height):** Channel icon, name, topic divider, search input, pinned messages popover button, member sidebar toggle, and a prominent **"Protocol Monitor (TCP/UDP)"** pill button with live RTT dot.
   - **Primary Viewport:**
     - *Text Channel Mode:* Virtualized message stream with date dividers, grouped sender headers, reactions, and attachment lightboxes, anchored above a rich multi-line composer (`message-composer`).
     - *Voice/Video Stage Mode:* Responsive WebRTC video/audio tile grid (`16:9` aspect tiles with emerald speaking borders and per-peer UDP stats overlay).
   - **Collapsible Network Monitor Drawer (`260px`–`320px` height dock or right split):** Displays a real-time dual-series SVG/Canvas RTT & jitter chart (`telemetry-tcp` `#2563EB` vs `telemetry-udp` `#10B981`) alongside a live scrollable packet frame inspector showing direction (`TX`/`RX`), transport protocol (`TCP/WS` vs `UDP/WebRTC`), payload size in bytes, and expandable JSON/binary header breakdown.
4. **Column 4 — Member & Profile Sidebar (`260px` fixed width, collapsible at `< 1280px`):**
   - Grouped by role hierarchy (**Owner**, **Admin**, **Member**) and live 4-state presence (**Online**, **Idle**, **Do Not Disturb**, **Offline**). Clicking any member opens a floating profile card with quick DM and role assignment actions.

### Responsive Breakpoints & Mobile Drawer Behavior
- **Desktop (`>= 1280px`):** All 4 columns visible simultaneously.
- **Compact Desktop / Laptop (`1024px – 1279px`):** Columns 1, 2, and 3 visible; Column 4 (Member Sidebar) collapses into a slide-over drawer toggled from the channel header.
- **Tablet & Mobile (`< 1024px`):**
  - Column 3 (Main Stage) occupies `100vw`.
  - Swiping right or tapping the top-left menu button opens a unified slide-over drawer containing the **Guild Rail (`72px`) + Channel Sidebar (`240px`)** side-by-side over a `backdrop-filter: blur(4px)` scrim.
  - Tapping the members icon or Network Monitor button opens a bottom sheet / right slide-over drawer.

## Elevation & Depth

- **Structural Separation via Tonal Layering & Hairlines:** In the 4-column workspace, adjacent columns are separated by subtle surface shifts (`#F1F5F9` Guild Rail → `#F8FAFC` Channel Sidebar → `#FFFFFF` Main Stage in Light Mode; `#0B1120` → `#0F172A` → `#1E293B` in Dark Mode) reinforced by crisp `1px solid` borders (`border` / `dark-border`).
- **Floating Glassmorphism (Headers & Modals Only):**
  - Sticky channel headers and floating modals use subtle translucent surfaces (`rgba(255, 255, 255, 0.85)` in Light Mode, `rgba(15, 23, 42, 0.85)` in Dark Mode) with `backdrop-filter: blur(12px)` and a `1px solid` border.
  - Always provide a solid surface fallback (`surface` / `dark-surface-main`) when `prefers-reduced-transparency: reduce` is active.
- **Tinted Elevation Shadows:**
  - **Popover / Profile Card Shadow:** `0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 4px 10px -2px rgba(37, 99, 235, 0.04)`
  - **Modal Dialog Shadow:** `0 20px 40px -12px rgba(15, 23, 42, 0.16), 0 0 1px 1px rgba(15, 23, 42, 0.06)`

## Shapes

- **Guild Icon Squircle Morph (`24px` → `16px`):** Inactive guild icons rest at `rounded.2xl` (`24px`, circular for `48px` buttons) and morph with a spring transition (`cubic-bezier(0.34, 1.56, 0.64, 1)`, `200ms`) into `rounded.lg` (`16px`) on `:hover` or `.active`.
- **Cards, Modals & Voice Tiles (`12px`–`16px`):**
  - Modals, User Profile Popovers, and WebRTC Video Tiles use `rounded.lg` (`16px`).
  - Message Composer, Attachment Preview Cards, and Network Monitor Drawer panels use `rounded.md` (`12px`).
- **Channel & Member Rows (`8px`):** Sidebar navigation items use `rounded.sm` (`8px`) with `8px` horizontal inset margins inside the `240px` / `260px` rails.
- **Badges, Presence Dots & Protocol Pills (`9999px`):** Mention counters, presence status indicators, and `TCP` / `UDP` transport tags use `rounded.full`.

## Components

### 1. Guild Rail Icon (`guild-rail-icon` / `guild-rail-icon-active`)
- **Dimensions:** `48px × 48px` centered inside the `72px` rail (`12px` horizontal padding).
- **States:**
  - *Default:* `surface-muted` (`#F1F5F9`) background, `on-surface` (`#0F172A`) 2-letter monogram in `label-lg`, `rounded.2xl` (`24px`).
  - *Hover / Active:* `primary` (`#2563EB`) background, `on-primary` (`#FFFFFF`) text/icon, `rounded.lg` (`16px`), accompanied by left pill indicator (`4px` width, `primary` color).
  - *Unread Badge:* Top-right or bottom-right `badge-mention` (`#F43F5E`) with `3px solid` surface cutout ring.

### 2. Channel Item (`channel-item` / `channel-item-active`)
- **Dimensions:** `36px` height, `8px 10px` padding, `rounded.sm` (`8px`).
- **States:**
  - *Default:* Transparent background, `on-surface-secondary` (`#475569`) text and `#` / `🔊` icon (`18px`).
  - *Unread:* `on-surface` (`#0F172A`) weight `700` text with a `6px` left-edge Ocean Blue dot (`#2563EB`).
  - *Active:* `primary-tint` (`#DBEAFE`) in Light Mode (or `rgba(59, 130, 246, 0.18)` in Dark Mode), `primary` (`#2563EB` / `#3B82F6`) text and icon in `label-lg`.

### 3. Message Stream & Rich Composer (`message-composer`)
- **Message Grouping:** Consecutive messages from the same author within 5 minutes collapse the avatar (`40px × 40px` circle) and username header, displaying a compact `mono-sm` timestamp in the `56px` left gutter on row hover.
- **Mention & Reply Highlight:** Messages mentioning the current user receive a `primary-soft` (`#EFF6FF`) background wash and a `3px solid` left border in `primary` (`#2563EB`).
- **Composer Box:** Multi-line auto-expanding textarea (`max-height: 200px`) inside a `rounded.md` (`12px`) container (`surface-subtle` `#F8FAFC`, `1px solid` `border`), featuring a top collapsible **Reply Banner**, a middle **Drag-and-Drop Attachment Strip** (with `80px × 80px` thumbnail previews and progress bars), and right-hand action buttons (Attachment upload, Emoji picker, Ping test packet trigger, and Ocean Blue Send button).

### 4. Network Monitor Drawer (`network-monitor-drawer`)
- **Purpose:** Surfaces the underlying Computer Networking mechanics (TCP/WebSocket reliability vs. UDP/WebRTC datagram speed) directly inside the UI for live classroom demonstration and debugging.
- **Header Controls:** Protocol filter pills (`ALL`, `TCP/WS`, `UDP/RTC`), "Send Ping Burst (10x)" button, "Clear Log" button, and live metric cards (`TCP RTT`, `UDP RTT`, `Jitter`, `Packets/sec`).
- **Live Telemetry Chart:** Dual-line sparkline/chart comparing TCP (`#2563EB` solid line) and UDP (`#10B981` dashed/glow line) round-trip latency over a rolling 60-second window.
- **Packet Frame Inspector:** High-density monospace (`mono-md`) table with color-coded direction badges (`TX` in Sky `#0284C7`, `RX` in Emerald `#10B981`, `ERR/RETX` in Coral `#F43F5E`) and click-to-expand raw frame JSON/hex view.

### 5. Member & Presence Row
- **Dimensions:** `42px` height, `rounded.sm` (`8px`), `32px × 32px` avatar with bottom-right `10px × 10px` presence badge (`presence-online` `#10B981`, `presence-idle` `#F59E0B`, `presence-dnd` `#F43F5E`, `presence-offline` `#94A3B8`).
- **Role Badges:** Owner crown icon in Amber (`#F59E0B`), Admin shield badge in Ocean Blue (`#2563EB`).

## Do's and Don'ts

- **DO** use **Light Mode (`#FFFFFF` / `#F8FAFC` + Ocean Blue `#2563EB`)** as the default initial theme (`:root`), and support seamless toggling to **Dark Navy Mode (`[data-theme="dark"]`)** via CSS custom properties.
- **DO** use `Quicksand` (`500`, `600`, `700`) for all UI chrome, Vietnamese chat messages, and headings, paired with `'JetBrains Mono'` for all packet inspector frames, byte sizes, and RTT metrics.
- **DO** maintain strict visual distinction between transport protocols in the Network Monitor: **Ocean Blue (`#2563EB` / `#3B82F6`)** for TCP/WebSocket streams and **Emerald (`#10B981`)** for UDP/WebRTC media & ping datagrams.
- **DO** ensure all interactive controls in the bottom User Status Bar and Channel Header have a minimum `36px × 36px` hit target, visible `:focus-visible` `2px solid #2563EB` outline, and `aria-label` attributes.
- **DON'T** use any purple, violet, indigo, or legacy Discord "blurple" hex codes anywhere in CSS variables, Tailwind utilities, SVG illustrations, or chart series.
- **DON'T** allow any of the 4 workspace columns to cause page-level horizontal or vertical scrollbars; each column (`Guild Rail`, `Channel Sidebar`, `Message Stream`, `Member Sidebar`, and `Network Monitor Packet Table`) must manage its own independent `overflow-y: auto` scroll container.
- **DON'T** use heavy drop shadows or glassmorphism on individual chat messages or channel list items; reserve `backdrop-filter: blur(12px)` and elevation shadows strictly for sticky headers, floating popovers, and modal dialogs.
