{{-- Media Lightbox Gallery Modal (Pratinjau Layar Penuh Gambar & Video) --}}
<div id="mediaLightboxModal" class="media-lightbox-overlay" style="display: none;" role="dialog" aria-modal="true" aria-label="Pratinjau Media Layar Penuh">
    {{-- Top Action Bar --}}
    <header class="lightbox-header">
        <div class="lightbox-meta-info">
            <h4 id="lightboxMediaTitle" class="lightbox-title">Gambar</h4>
            <div class="lightbox-subtitle">
                <span id="lightboxSenderName">Pengirim</span> • <span id="lightboxTimestamp">Baru saja</span>
            </div>
        </div>

        <div id="lightboxCounterBadge" class="lightbox-counter-badge">1 dari 1</div>

        <div class="lightbox-actions">
            {{-- Zoom Out --}}
            <button type="button" class="btn-lightbox-action" onclick="lightboxZoomOut()" title="Perkecil (-)" aria-label="Perkecil">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
            </button>
            {{-- Zoom In --}}
            <button type="button" class="btn-lightbox-action" onclick="lightboxZoomIn()" title="Perbesar (+)" aria-label="Perbesar">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    <line x1="11" y1="8" x2="11" y2="14"></line>
                    <line x1="8" y1="11" x2="14" y2="11"></line>
                </svg>
            </button>
            {{-- Reset Zoom --}}
            <button type="button" id="btnLightboxResetZoom" class="btn-lightbox-action" onclick="lightboxResetZoom()" title="Reset Ukuran (100%)" aria-label="Reset Ukuran" style="font-size: 0.75rem; font-weight: 700; width: auto; padding: 0 8px;">
                100%
            </button>
            {{-- Download --}}
            <button type="button" class="btn-lightbox-action" onclick="lightboxDownloadCurrent()" title="Unduh Media" aria-label="Unduh Media">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
            </button>
            {{-- Close --}}
            <button type="button" class="btn-lightbox-action danger" onclick="closeMediaLightbox()" title="Tutup (Esc)" aria-label="Tutup">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>
    </header>

    {{-- Main Viewport --}}
    <div class="lightbox-stage" onclick="handleLightboxStageClick(event)">
        {{-- Previous Button --}}
        <button type="button" id="btnLightboxPrev" class="lightbox-nav-btn prev" onclick="lightboxPrev()" title="Sebelumnya (←)" aria-label="Media Sebelumnya">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
        </button>

        {{-- Media Container --}}
        <div id="lightboxMediaWrapper" class="lightbox-media-wrapper">
            <img id="lightboxImage" src="" alt="Pratinjau Gambar" class="lightbox-image" ondblclick="toggleLightboxZoom(event)">
            <video id="lightboxVideo" src="" controls playsinline class="lightbox-video" style="display: none;"></video>
        </div>

        {{-- Next Button --}}
        <button type="button" id="btnLightboxNext" class="lightbox-nav-btn next" onclick="lightboxNext()" title="Berikutnya (→)" aria-label="Media Berikutnya">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
        </button>
    </div>

    {{-- Bottom Thumbnails Carousel Strip --}}
    <footer id="lightboxThumbStrip" class="lightbox-thumb-strip">
        <div id="lightboxThumbList" class="lightbox-thumb-list">
            {{-- Injected dynamically via JavaScript --}}
        </div>
    </footer>
</div>
