# DESIGN.md - ZChat Web Application

> Design Direction for ZChat Web Frontend (Deep Obsidian Dark Theme & Vibrant Violet Workspace)

## 1. Brand Identity & Personality
- **Product**: ZChat Web Client (Real-time communication companion)
- **Personality**: Focused, sleek, modern, comfortable for long screen hours, high clarity
- **Aesthetic**: Deep Obsidian & Dark Slate Surfaces (`#0f1117`, `#131620`, `#181c28`) with Vibrant Violet Accents (`#7c3aed` / `#8b5cf6`) and Jewel-Toned Soft Pastel Avatars

## 2. Dials (Antislop Framework)
- **ENERGY**: 2 (Balanced - Deep, glare-free dark surfaces paired with high-contrast readable typography and vibrant violet accents)
- **RHYTHM**: 2 (Multi-column layout: Navigation Rail + Chat Sidebar + Active Chat Stream + Contact Info Drawer)
- **MOTION**: 1 (Calm - Refined micro-interactions, hover transitions, and accessible focus states without distracting loops)

## 3. Color Palette (Dark Theme Default with Light Fallback)
### Dark Theme (Default)
- **Canvas Base**: `#0f1117` (Deep obsidian main viewport background, prevents eye strain)
- **Sidebar & Info Panel**: `#131620` (Elevated dark slate secondary panels)
- **Navigation Rail**: `#0b0d13` (Deep anchor rail)
- **Surface / Cards**: `#181c28` (Card components, dropdowns, and modals)
- **Surface Elevated / Hover**: `#202534` (Hover states and active item backgrounds)
- **Input Background**: `#1a1e2b` (Search input and floating pill bar)
- **Border Subtle**: `#222736` (Clean section boundaries with 3:1+ contrast)
- **Border Card / Divider**: `#292f42` (Visible card & modal edges)
- **Primary Violet Accent**: `#7c3aed` (Core violet - Outgoing message bubbles, primary action buttons)
- **Primary Hover**: `#8b5cf6` (Lighter violet for dark surface hover)
- **Accent Soft**: `rgba(124, 58, 237, 0.16)` (Subtle violet glow for active items)
- **Accent Border**: `rgba(139, 92, 246, 0.28)`
- **Success / Online**: `#10b981` (Emerald online indicator dot)
- **Text Primary**: `#f3f4f6` (Soft off-white, no glare, WCAG AAA compliant 12:1+ contrast)
- **Text Secondary**: `#9ca3af` (Clear neutral slate for preview messages and subheadings)
- **Text Muted**: `#6b7280` (Calibrated timestamps and subtle labels)
- **Bubble Me**: `#7c3aed` with `#ffffff` text and `#ddd6fe` meta
- **Bubble Other**: `#1c202c` with `#f3f4f6` text, `#9ca3af` meta, and `#282f42` border
- **Jewel-Toned Pastel Avatar System (Dark Mode)**:
  - Rose / Pink: `rgba(219, 39, 119, 0.2)` bg, `#f472b6` text, `rgba(244, 114, 182, 0.25)` border
  - Indigo / Blue: `rgba(79, 70, 229, 0.22)` bg, `#a5b4fc` text, `rgba(165, 180, 252, 0.25)` border
  - Amber / Yellow: `rgba(217, 119, 6, 0.2)` bg, `#fcd34d` text, `rgba(252, 211, 77, 0.25)` border
  - Teal / Cyan: `rgba(13, 148, 136, 0.2)` bg, `#5eead4` text, `rgba(94, 234, 212, 0.25)` border
  - Emerald / Green: `rgba(22, 163, 74, 0.2)` bg, `#86efac` text, `rgba(134, 239, 172, 0.25)` border

### Light Theme (Accessible Alternative)
- **Canvas Base**: `#ffffff`
- **Sidebar & Panels**: `#f9fafb`
- **Text Primary**: `#111827`
- **Text Secondary**: `#6b7280`

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
  - Theme toggle button (Dark / Light switcher)
  - Settings cog and logged-in user profile circle at bottom
- **Chat Sidebar** (width: 320px):
  - Eyebrow `RUANG OBROLAN` + heading `Pesan` + compose button
  - Search input `Cari percakapan...`
  - Filter row `TERBARU` + action button `Tandai dibaca`
  - Conversation list with jewel-toned avatars, unread badges, and active soft highlight
- **Active Chat Stream**:
  - Header: Contact avatar with green dot, name, `Aktif sekarang`, phone icon, video icon, and menu icon
  - Stream: Date divider `HARI INI`, elevated dark partner bubbles on left, violet user bubbles on right with checks
  - Typing indicator: `••• Nadia sedang mengetik`
  - Input footer: Floating pill bar with attachment paperclip, textarea, emoji picker, and violet circular send button
- **Right Contact Info Panel** (width: 280px):
  - Large avatar with green dot, name, and email
  - Action buttons: `Telepon`, `Video`, `Senyap`
  - `Media bersama` thumbnails row
  - `Dokumen` file card (`Brief proyek.pdf`)
  - Floating bottom-right help button `?`
