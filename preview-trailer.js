/** Preview Trailer v1.0.0 — standalone browser script; no dependencies. */
(function () {
    'use strict';

    const VERSION = '1.0.0';
    const PREVIEW_ATTRIBUTES = [
        'data-videopreview-mp4-large-value', 'data-videopreview-mp4-value',
        'data-preview-src', 'data-preview', 'data-trailer-src', 'data-trailer',
    ];
    // Selectors retained from the supplied script, without brittle page nesting.
    const CARD_SELECTOR = [
        '.standard-thumb', '.card-preview', '.scene_swimlane_thumbnail_component',
        '.video_preview_div', '.overlay-video-wrapper', '.hover-thumb',
        '.thumbnail', '.video_inner_container', '[data-videopreview-mp4-value]',
        '[data-videopreview-mp4-large-value]', 'article',
    ].join(',');
    const MEDIA_SELECTOR = ['video', 'source', 'img', ...PREVIEW_ATTRIBUTES.map(a => `[${a}]`)].join(',');
    const SITE_ADAPTERS = [
        {
            name: 'adulttime',
            matches(page) {
                return /(^|\.)adulttime\.com$/i.test(page.hostname);
            },
            cardSelector: '[class*="SceneThumb"]',
            isPreviewUrl(url) {
                try {
                    const parsed = new URL(url);
                    return parsed.hostname === 'videothumb.gammacdn.com'
                        && /^\/\d+x\d+\/\d+\.mp4$/i.test(parsed.pathname);
                } catch { return false; }
            },
        },
    ];

    function mediaUrl(value, base, explicit = false) {
        if (typeof value !== 'string' || !value.trim()) return null;
        try {
            const url = new URL(value.trim(), base);
            if (!['http:', 'https:', 'blob:'].includes(url.protocol)) return null;
            if (url.username || url.password) return null;
            if (url.protocol === 'blob:' || explicit || /\.(mp4|webm|m4v|ogv)$/i.test(url.pathname)
                || /^\/scene\/\d+\/preview\/?$/.test(url.pathname)) return url.href;
        } catch { /* Invalid values are not preview URLs. */ }
        return null;
    }

    function sourceOf(element, base) {
        if (!element?.getAttribute) return null;
        for (const attribute of PREVIEW_ATTRIBUTES) {
            const result = mediaUrl(element.getAttribute(attribute), base, true);
            if (result) return result;
        }
        const isMedia = /^(VIDEO|SOURCE)$/.test(element.tagName);
        for (const value of [element.currentSrc, element.getAttribute('src'), element.getAttribute('data-src')]) {
            const result = mediaUrl(value, base, isMedia);
            if (result) return result;
        }
        return null;
    }

    function candidates(root, base) {
        if (!root?.querySelectorAll) return [];
        const urls = [];
        // A card's explicit high-quality preview takes precedence over its video.
        const own = sourceOf(root, base);
        if (own) return [own];
        for (const element of root.querySelectorAll(MEDIA_SELECTOR)) {
            // Multiple <source> children are alternatives of one video.
            if (element.tagName === 'SOURCE' && element.parentElement?.tagName === 'VIDEO') continue;
            let url = sourceOf(element, base);
            if (!url && element.tagName === 'VIDEO') {
                for (const source of element.querySelectorAll('source')) {
                    if (element.canPlayType && source.type && !element.canPlayType(source.type)) continue;
                    url = sourceOf(source, base);
                    if (url) break;
                }
            }
            if (url) urls.push(url);
        }
        // A video passed as root still needs its nested <source> fallback.
        if (root.tagName === 'VIDEO' && !urls.length) {
            for (const source of root.querySelectorAll('source')) {
                if (source.type && root.canPlayType && !root.canPlayType(source.type)) continue;
                const url = sourceOf(source, base);
                if (url) { urls.push(url); break; }
            }
        }
        return [...new Set(urls)];
    }

    function selectTarget(doc) {
        const hovered = [...doc.querySelectorAll(':hover')];
        // Deepest hovered element preserves which card the user meant.
        const hover = hovered.reverse().find(el => el !== doc.body && el !== doc.documentElement);
        const active = doc.activeElement;
        return hover || (active !== doc.body && active !== doc.documentElement ? active : null);
    }

    function adapterPreview(doc, page, target, base) {
        const adapter = SITE_ADAPTERS.find(candidate => candidate.matches(page));
        if (!adapter || !target?.querySelectorAll) return null;
        const card = target.closest?.(adapter.cardSelector) || target;
        const urls = candidates(card, base).filter(adapter.isPreviewUrl);
        return urls.length === 1 ? urls[0] : null;
    }

    function retrievePreviewUrl(doc, pageUrl, target = selectTarget(doc)) {
        const page = new URL(pageUrl);
        if (['localhost', '127.0.0.1', '[::1]'].includes(page.hostname) && page.port === '9999') {
            const scene = page.pathname.match(/^\/scenes\/(\d+)(?:\/|$)/);
            if (scene) return `${page.origin}/scene/${scene[1]}/preview`;
        }
        const base = doc.baseURI || page.href;
        const adapted = adapterPreview(doc, page, target, base);
        if (adapted) return adapted;
        if (target?.querySelectorAll && target !== doc.body && target !== doc.documentElement) {
            const card = target.closest?.(CARD_SELECTOR);
            let current = card || target;
            for (let depth = 0; current && depth < 6; depth++, current = current.parentElement) {
                if (current === doc.body || current === doc.documentElement) break;
                const urls = candidates(current, base);
                if (urls.length === 1) return urls[0];
                if (urls.length > 1 || card) return null;
            }
            // A selected card with no URL must not fall through to another card.
            return null;
        }
        const playing = [...doc.querySelectorAll('video')].filter(video => !video.paused && !video.ended);
        if (playing.length === 1) {
            const urls = candidates(playing[0], base);
            if (urls.length === 1) return urls[0];
        }
        const urls = candidates(doc, base);
        return urls.length === 1 ? urls[0] : null;
    }

    function createPlayer(popup) {
        const doc = popup.document;
        doc.title = 'Preview Trailer';
        const style = doc.createElement('style');
        style.textContent = 'html,body{margin:0;background:#111;color:#eee;font:16px system-ui;height:100%}'
            + 'body{display:flex;flex-direction:column}video{width:100%;flex:1;min-height:0;background:#000}'
            + 'footer{padding:12px;display:flex;gap:12px;align-items:center;flex-wrap:wrap}'
            + 'button,a{font:inherit;color:inherit}button{background:#333;border:1px solid #777;padding:8px 12px;border-radius:6px;cursor:pointer}'
            + 'p{margin:0;flex:1}a[hidden]{display:none}';
        doc.head.append(style);
        const video = doc.createElement('video');
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        const footer = doc.createElement('footer');
        const status = doc.createElement('p');
        status.setAttribute('role', 'status');
        status.textContent = 'Looking for a preview…';
        const play = doc.createElement('button');
        play.textContent = 'Play with sound';
        play.addEventListener('click', () => {
            video.muted = false;
            video.play().catch(() => { status.textContent = 'Playback unavailable. Try Open original.'; });
        });
        const fullscreen = doc.createElement('button');
        fullscreen.textContent = 'Fullscreen';
        fullscreen.addEventListener('click', () => {
            if (!video.requestFullscreen) { status.textContent = 'Fullscreen is unavailable in this browser.'; return; }
            video.requestFullscreen().catch(() => { status.textContent = 'Fullscreen was blocked by the browser.'; });
        });
        const original = doc.createElement('a');
        original.textContent = 'Open original';
        original.target = '_self';
        original.rel = 'noopener';
        original.hidden = true;
        footer.append(status, play, fullscreen, original);
        doc.body.replaceChildren(video, footer);
        video.addEventListener('error', () => { status.textContent = 'This preview could not play here. Try Open original.'; });
        return {
            status,
            load(url) {
                original.href = url;
                original.hidden = false;
                video.src = url;
                status.textContent = 'Preview ready. Use Fullscreen to expand.';
                video.play().catch(async () => {
                    if (popup.closed) return;
                    video.muted = true;
                    try {
                        await video.play();
                        status.textContent = 'Playing muted. Choose Play with sound to unmute.';
                    } catch {
                        status.textContent = 'Choose Play with sound, or try Open original.';
                    }
                });
            },
        };
    }

    function run(win, options = {}) {
        const doc = win.document;
        // Capture hover before opening a new window moves focus away from the page.
        const target = options.target || selectTarget(doc);
        const pageUrl = win.location.href;
        let preview = retrievePreviewUrl(doc, pageUrl, target);
        // Reserve exactly one popup during the triggering user gesture, before retries.
        const popup = win.open('about:blank', '_blank', 'popup=yes,width=1100,height=720');
        if (!popup) return Promise.reject(new Error('Popup blocked. Allow popups for this site and run Preview Trailer again.'));
        popup.opener = null;
        let player;
        try { player = createPlayer(popup); }
        catch (error) { popup.close(); return Promise.reject(error); }
        const retries = Number.isInteger(options.retries) ? Math.max(0, Math.min(options.retries, 20)) : 5;
        const retryDelay = Number.isFinite(options.retryDelay) ? Math.max(0, options.retryDelay) : 200;
        return new Promise((resolve, reject) => {
            function attempt(count) {
                if (popup.closed) { resolve(null); return; }
                if (win.location.href !== pageUrl || (target && !target.isConnected)) {
                    player.status.textContent = 'The page changed. Close this window and run Preview Trailer again.';
                    reject(new Error('The selected page or card changed.'));
                    return;
                }
                preview = preview || retrievePreviewUrl(doc, pageUrl, target);
                if (preview) {
                    player.load(preview);
                    resolve({ preview, previewWindow: popup });
                } else if (count < retries) {
                    win.setTimeout(() => attempt(count + 1), retryDelay);
                } else {
                    const message = 'No unique preview found. Hover a video card or focus its link, then run again.';
                    player.status.textContent = message;
                    reject(new Error(message));
                }
            }
            attempt(0);
        });
    }

    const api = { version: VERSION, mediaUrl, sourceOf, candidates, retrievePreviewUrl, selectTarget, run, SITE_ADAPTERS };
    if (typeof module === 'object' && module.exports && typeof window === 'undefined') {
        module.exports = api;
    } else {
        window.PreviewTrailer = api;
        if (window.PreviewTrailerOptions?.autoRun !== false) {
            run(window, window.PreviewTrailerOptions).catch(error => {
                console.warn('[Preview Trailer]', error.message);
                if (error.message.startsWith('Popup blocked')) window.alert(error.message);
            });
        }
    }
})();
