# DESIGN.md - ZChat Web Application

> Design Direction for ZChat Web Frontend

## 1. Brand Identity & Personality
- **Product**: ZChat Web Client (Real-time communication companion)
- **Personality**: Focused, fast, reliable, distraction-free
- **Aesthetic**: Sleek Dark Chat Portal

## 2. Dials (Antislop Framework)
- **ENERGY**: 2 (Balanced - Clear high-contrast text, purposeful focal points, calm presence)
- **RHYTHM**: 2 (Consistent sidebar/chat column structure with distinct responsive states)
- **MOTION**: 1 (Calm - Functional hover & focus transitions only, no endless looping animations)

## 3. Color Palette
- **Canvas Base**: `#09090b` (Deep Zinc)
- **Sidebar Surface**: `#121215` (Elevated Zinc)
- **Active Area Surface**: `#18181b` (Panel Zinc)
- **Borders & Dividers**: `#27272a` (Subtle boundary)
- **Primary Accent**: `#2563eb` / `#3b82f6` (Blue - Primary CTA, active chat highlight)
- **Success & Read Receipt**: `#10b981` (Emerald - Read ticks, accepted state)
- **Text Primary**: `#f4f4f5` (WCAG AA compliant against dark background)
- **Text Secondary**: `#a1a1aa` (Metadata, usernames, previews)
- **Text Muted**: `#71717a` (Timestamps, empty cues)
- **Danger / Reject**: `#ef4444` (Delete, reject requests)

## 4. Typography
- **Primary Font**: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif
- **Scale**:
  - H1/Title: 18px - 20px, font-weight 700
  - H2/Section: 14px - 15px, font-weight 600
  - Body: 14px, font-weight 400
  - Meta/Timestamps: 12px, font-weight 500

## 5. Components & Hierarchy
- **Sidebar**:
  - Top: User profile header with status & logout
  - Tabs: Chats (`Pesan`), Contacts (`Kontak`), Requests (`Permintaan` with counter badge)
  - Action: "Tambah Teman" prominent button
- **Chat Window**:
  - Header: Active interlocutor info & online signal
  - Stream: Chronological bubbles (My messages on right, friend on left)
  - Indicators: Sent (single check), Delivered (double check), Read (double emerald check)
  - Footer: Multi-line responsive input bar with Send button (Enter key support)
- **States**:
  - Empty: Meaningful instructions ("Pilih kontak untuk mulai percakapan")
  - Loading: Subtle pulse skeleton with specific textual status
  - Error / Feedback: Non-intrusive toast notification system
