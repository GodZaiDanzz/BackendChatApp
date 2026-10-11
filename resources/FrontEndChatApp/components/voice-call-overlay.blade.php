{{-- Voice Call & Discord-style Voice Channel Overlay Components --}}

{{-- 1. Incoming Direct Call Modal --}}
<div id="incomingCallModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="incomingCallTitle" style="display: none; z-index: 1050;">
    <div class="modal-card" style="max-width: 360px; text-align: center; padding: 2rem 1.5rem;">
        <div style="margin: 0 auto 1.25rem; width: 84px; height: 84px; border-radius: 50%; background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(16, 185, 129, 0.2)); display: flex; align-items: center; justify-content: center; position: relative; animation: pulseRing 1.8s infinite;">
            <div id="incomingCallAvatar" class="avatar-circle avatar-pastel-pink" style="width: 68px; height: 68px; font-size: 1.5rem; font-weight: 700;">
                ?
            </div>
        </div>

        <h3 id="incomingCallTitle" style="font-size: 1.2rem; font-weight: 700; color: var(--text-main); margin-bottom: 0.25rem;">Panggilan Suara Masuk</h3>
        <p id="incomingCallerName" style="font-size: 0.95rem; color: var(--text-muted); margin-bottom: 1.5rem;">Seseorang memanggil Anda...</p>

        <div style="display: flex; justify-content: center; gap: 1.25rem;">
            {{-- Decline Button (Red) --}}
            <button type="button" id="btnDeclineCall" onclick="handleDeclineIncomingCall()" style="width: 54px; height: 54px; border-radius: 50%; border: none; background: #ef4444; color: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease, background 0.2s ease;" title="Tolak Panggilan" aria-label="Tolak Panggilan">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                    <path d="M16.5 16.5A16.8 16.8 0 0 1 12 17.5a16.8 16.8 0 0 1-9-3.2L1 16.2a19.7 19.7 0 0 0 11 3.8 19.7 19.7 0 0 0 7.5-1.5z"></path>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07"></path>
                    <path d="M8.09 9.91a16 16 0 0 0 6 6l1.27-1.27"></path>
                </svg>
            </button>

            {{-- Accept Button (Green) --}}
            <button type="button" id="btnAcceptCall" onclick="handleAcceptIncomingCall()" style="width: 54px; height: 54px; border-radius: 50%; border: none; background: #10b981; color: #ffffff; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease, background 0.2s ease;" title="Terima Panggilan" aria-label="Terima Panggilan">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
            </button>
        </div>
    </div>
</div>

{{-- 2. Discord-style Voice Stage Overlay / Fullscreen Modal --}}
<div id="voiceStageModal" class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="voiceStageTitle" style="display: none; z-index: 1040;">
    <div class="modal-card" style="max-width: 860px; width: 95%; max-height: 90vh; display: flex; flex-direction: column; padding: 1.5rem; background: var(--bg-surface-elevated, #1a1a2e); border: 1px solid var(--border-color, rgba(255,255,255,0.1));">
        {{-- Stage Header --}}
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 1rem; border-bottom: 1px solid var(--border-color, rgba(255,255,255,0.08));">
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div style="width: 36px; height: 36px; border-radius: 8px; background: rgba(16, 185, 129, 0.15); display: flex; align-items: center; justify-content: center; color: #10b981;">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                </div>
                <div>
                    <h2 id="voiceStageTitle" style="font-size: 1.125rem; font-weight: 700; color: var(--text-main); margin: 0;">Ruang Suara</h2>
                    <span id="voiceStageSubtitle" style="font-size: 0.8125rem; color: #10b981; font-weight: 500;">Terhubung ke obrolan suara</span>
                </div>
            </div>

            {{-- Minimize Button --}}
            <button type="button" class="btn-icon" onclick="minimizeVoiceStage()" title="Kecilkan ke Dock (panggilan tetap berjalan)" aria-label="Kecilkan ke dock">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="4 14 10 14 10 20"></polyline>
                    <polyline points="20 10 14 10 14 4"></polyline>
                    <line x1="14" y1="10" x2="21" y2="3"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
            </button>
        </div>

        {{-- Participants Grid (Stage Area) --}}
        <div id="voiceParticipantsGrid" style="flex: 1; overflow-y: auto; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; padding: 1.5rem 0; min-height: 240px; align-content: center;">
            {{-- Dynamically populated: cards with speaking green glow --}}
        </div>

        {{-- Stage Bottom Controls Bar --}}
        <div style="display: flex; justify-content: center; align-items: center; gap: 1rem; padding-top: 1rem; border-top: 1px solid var(--border-color, rgba(255,255,255,0.08));">
            {{-- Mic Toggle --}}
            <button type="button" id="btnStageToggleMic" onclick="toggleVoiceMute()" class="btn-action-primary" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.1rem; border-radius: 9999px;" title="Nyalakan / Matikan Mikrofon">
                <span id="stageMicIcon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                        <line x1="12" y1="19" x2="12" y2="23"></line>
                        <line x1="8" y1="23" x2="16" y2="23"></line>
                    </svg>
                </span>
                <span id="stageMicLabel">Mute</span>
            </button>

            {{-- Deafen Toggle --}}
            <button type="button" id="btnStageToggleDeafen" onclick="toggleVoiceDeafen()" class="btn-outline-action" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.1rem; border-radius: 9999px;" title="Matikan / Nyalakan Suara Masuk">
                <span id="stageDeafenIcon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                        <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
                    </svg>
                </span>
                <span id="stageDeafenLabel">Deafen</span>
            </button>

            {{-- Disconnect Button (Red) --}}
            <button type="button" id="btnStageDisconnect" onclick="handleDisconnectVoiceCall()" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.65rem 1.25rem; border-radius: 9999px; background: #ef4444; color: #ffffff; border: none; font-weight: 600; cursor: pointer; transition: opacity 0.2s ease;" title="Putuskan Sambungan Suara">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 2v4M8 2v4M3 10h18"></path>
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span>Keluar</span>
            </button>
        </div>
    </div>
</div>

{{-- 3. Discord-style Floating Bottom Voice Dock (Always visible during active voice) --}}
<div id="activeVoiceDock" style="display: none; position: fixed; bottom: 1.25rem; left: 50%; transform: translateX(-50%); z-index: 1030; background: rgba(18, 18, 30, 0.95); backdrop-filter: blur(12px); border: 1px solid rgba(16, 185, 129, 0.35); box-shadow: 0 12px 32px rgba(0,0,0,0.45); border-radius: 9999px; padding: 0.5rem 1rem; align-items: center; gap: 1rem; max-width: calc(100vw - 2rem);">
    {{-- Left: Status & Title Clickable to Open Stage --}}
    <div onclick="openVoiceStage()" style="display: flex; align-items: center; gap: 0.65rem; cursor: pointer; user-select: none;">
        <span style="width: 10px; height: 10px; border-radius: 50%; background: #10b981; box-shadow: 0 0 8px #10b981; animation: pulseRing 2s infinite;"></span>
        <div style="display: flex; flex-direction: column;">
            <span id="dockVoiceTitle" style="font-size: 0.8125rem; font-weight: 600; color: #ffffff; white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis;">Suara Terhubung</span>
            <span id="dockVoiceDuration" style="font-size: 0.7rem; color: #10b981; font-weight: 500;">00:00</span>
        </div>
    </div>

    {{-- Right: Quick Action Buttons --}}
    <div style="display: flex; align-items: center; gap: 0.4rem;">
        {{-- Expand to Stage --}}
        <button type="button" onclick="openVoiceStage()" class="btn-icon" style="width: 32px; height: 32px;" title="Lihat Ruang Suara" aria-label="Buka ruang suara">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
            </svg>
        </button>

        {{-- Mic Toggle --}}
        <button type="button" id="btnDockToggleMic" onclick="toggleVoiceMute()" class="btn-icon" style="width: 32px; height: 32px;" title="Mute Mikrofon" aria-label="Mute mikrofon">
            <svg id="dockMicSvg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
        </button>

        {{-- Deafen Toggle --}}
        <button type="button" id="btnDockToggleDeafen" onclick="toggleVoiceDeafen()" class="btn-icon" style="width: 32px; height: 32px;" title="Deafen Suara" aria-label="Deafen suara">
            <svg id="dockDeafenSvg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 18v-6a9 9 0 0 1 18 0v6"></path>
                <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"></path>
            </svg>
        </button>

        {{-- Disconnect (Red) --}}
        <button type="button" onclick="handleDisconnectVoiceCall()" style="width: 32px; height: 32px; border-radius: 50%; background: #ef4444; color: #ffffff; border: none; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.15s ease;" title="Putuskan Sambungan" aria-label="Putuskan sambungan suara">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="6"></line>
            </svg>
        </button>
    </div>
</div>

{{-- Dynamic Audio Stream Mount --}}
<div id="voiceAudioElements" style="display: none;" aria-hidden="true"></div>

<style>
#incomingCallModal.active,
#voiceStageModal.active {
    display: flex !important;
    opacity: 1 !important;
    pointer-events: auto !important;
    visibility: visible !important;
}

#incomingCallModal.active .modal-card,
#voiceStageModal.active .modal-card {
    opacity: 1 !important;
    transform: scale(1) !important;
    pointer-events: auto !important;
    visibility: visible !important;
}

@keyframes pulseRing {
    0% { transform: scale(0.95); opacity: 0.8; }
    50% { transform: scale(1.05); opacity: 1; }
    100% { transform: scale(0.95); opacity: 0.8; }
}

.voice-participant-card {
    background: var(--bg-surface, rgba(255,255,255,0.03));
    border: 1px solid var(--border-color, rgba(255,255,255,0.08));
    border-radius: var(--radius-lg, 12px);
    padding: 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    position: relative;
    transition: all 0.2s ease;
}

.voice-participant-card.is-speaking {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.35) !important;
    background: rgba(16, 185, 129, 0.06) !important;
}

.voice-participant-avatar {
    width: 64px;
    height: 64px;
    border-radius: 50%;
    margin-bottom: 0.75rem;
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: 700;
    transition: box-shadow 0.2s ease;
}

.voice-participant-card.is-speaking .voice-participant-avatar {
    box-shadow: 0 0 0 3px #10b981;
}
</style>
