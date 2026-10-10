# DESIGN.md - ZChat Web Application

> Design Direction for ZChat Web Frontend (Clean Modern Violet & Pastel Workspace)

## 1. Brand Identity & Personality
- **Product**: ZChat Web Client (Real-time communication companion)
- **Personality**: Friendly, modern, focused, crisp, organized
- **Aesthetic**: Clean White Workspace with Vibrant Violet Accents (`#7c3aed`) and Soft Pastel Avatars

## 2. Dials (Antislop Framework)
- **ENERGY**: 2 (Balanced - Vibrant violet primary accent, high readability on crisp white surfaces)
- **RHYTHM**: 2 (Multi-column layout: Navigation Rail + Chat Sidebar + Active Chat Stream + Contact Info Drawer)
- **MOTION**: 1 (Calm - Refined micro-interactions, hover elevations, and responsive transitions without distracting loops)

## 3. Color Palette
- **Canvas Base**: `#ffffff` (Pure White main surface & panels)
- **Background Contrast**: `#f9fafb` (Subtle off-white body canvas)
- **Border Subtle**: `#f3f4f6` / `#e5e7eb` (Crisp light boundaries)
- **Primary Accent**: `#7c3aed` (Vibrant Violet - Outgoing message bubbles, active state indicators, primary buttons)
- **Primary Hover**: `#6d28d9` (Deep Violet)
- **Primary Soft Tint**: `#f5f3ff` / `#ede9fe` (Active conversation item highlight)
- **Success / Online**: `#10b981` (Emerald online indicator dot)
- **Text Primary**: `#111827` (Near-black slate for maximum readability, WCAG AAA compliant)
- **Text Secondary**: `#6b7280` (Muted slate for previews & labels)
- **Text Muted**: `#9ca3af` (Timestamps, placeholders, subtle headers)
- **Bubble Me**: `#7c3aed` with `#ffffff` text
- **Bubble Other**: `#ffffff` with `#1f2937` text and subtle `0 2px 6px rgba(0,0,0,0.04)` elevation shadow
- **Pastel Avatar System**:
  - Rose / Pink: `#fce7f3` bg, `#db2777` text
  - Indigo / Blue: `#e0e7ff` bg, `#4338ca` text
  - Amber / Yellow: `#fef3c7` bg, `#b45309` text
  - Teal / Cyan: `#ccfbf1` bg, `#0f766e` text
  - Emerald / Green: `#dcfce7` bg, `#15803d` text

## 4. Typography
- **Primary Font**: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif
- **Scale**:
  - Title / H1: 22px, font-weight 700 (`Pesan`)
  - Subtitle / Eyebrow: 11px, font-weight 700, uppercase, letter-spacing 0.05em (`RUANG OBROLAN`, `TERBARU`, `HARI INI`)
  - Section Headings: 14px - 16px, font-weight 700
  - Body: 14px, font-weight 400
  - Timestamps & Badges: 11px - 12px, font-weight 500

## 5. Components & Layout
- **Left Navigation Rail** (width: 64px):
  - Brand initial / avatar circle at top (`N` in violet)
  - Navigation icons (Chat, Contacts, Requests)
  - Settings cog and logged-in user profile circle at bottom (`RA` in dark slate)
- **Chat Sidebar** (width: 320px - 340px):
  - Eyebrow `RUANG OBROLAN` + heading `Pesan` + dark circle pencil compose button
  - Search input `Cari percakapan...`
  - Filter row `TERBARU` + action button `Tandai dibaca`
  - Conversation list with pastel avatars, unread badges, and active soft violet highlight
- **Active Chat Stream**:
  - Header: Contact avatar with green dot, name, `Aktif sekarang`, phone icon, video icon, and menu icon
  - Stream: Date divider `HARI INI`, white partner bubbles on left, violet user bubbles on right with checks
  - Typing indicator: `••• Nadia sedang mengetik`
  - Input footer: Floating pill bar with attachment paperclip, textarea, emoji picker, and violet circular send button
- **Right Contact Info Panel** (width: 280px):
  - Large avatar with green dot, name, and email
  - Action buttons: `Telepon`, `Video`, `Senyap`
  - `Media bersama` thumbnails row
  - `Dokumen` file card (`Brief proyek.pdf`)
  - Floating bottom-right help button `?`
