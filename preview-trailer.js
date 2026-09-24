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




    function openPreviewFullscreenAT(url, win = window) {
        const popup = win.open(
            'about:blank',
            '_blank',
            'popup=yes,width=1100,height=720'
        );

        if (!popup) {
            throw new Error('Popup blocked by browser');
        }

        const doc = popup.document;

        doc.title = 'Video Preview';

        doc.documentElement.style.cssText = `
        margin: 0;
        width: 100%;
        height: 100%;
        background: #000;
    `;

        doc.body.style.cssText = `
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #000;
        display: flex;
        align-items: center;
        justify-content: center;
    `;

        const video = doc.createElement('video');

        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: contain;
        background: #000;
    `;

        doc.body.appendChild(video);

        // Button is used when browser security prevents automatic fullscreen.
        const button = doc.createElement('button');

        button.textContent = '▶ Play Fullscreen';
        button.style.cssText = `
        position: fixed;
        z-index: 99999;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        padding: 18px 30px;
        font: 18px sans-serif;
        cursor: pointer;
    `;

        doc.body.appendChild(button);

        async function fullscreen() {
            try {
                await video.play();

                if (!doc.fullscreenElement) {
                    await video.requestFullscreen();
                }

                button.style.display = 'none';
            } catch (err) {
                console.warn('Automatic fullscreen/play blocked:', err);
                button.style.display = 'block';
            }
        }

        button.onclick = fullscreen;

        // Detect HLS
        const isHls =
            /\.m3u8(?:$|[?#])/i.test(url) ||
            /m3u8\.gammacdn\.com/i.test(url);

        if (isHls) {
            // Safari / browsers with native HLS
            if (video.canPlayType('application/vnd.apple.mpegurl')) {
                video.src = url;

                video.addEventListener(
                    'loadedmetadata',
                    fullscreen,
                    { once: true }
                );

                return popup;
            }

            // Chrome / Edge: use hls.js
            const script = doc.createElement('script');

            script.src =
                'https://cdn.jsdelivr.net/npm/hls.js@latest/dist/hls.min.js';

            script.onload = () => {
                if (!popup.Hls?.isSupported()) {
                    console.error('HLS is not supported in this browser');
                    return;
                }

                const hls = new popup.Hls();

                hls.loadSource(url);
                hls.attachMedia(video);

                hls.on(popup.Hls.Events.MANIFEST_PARSED, () => {
                    fullscreen();
                });

                hls.on(popup.Hls.Events.ERROR, (_, data) => {
                    console.error('HLS error:', data);
                });

                popup.hls = hls;
            };

            doc.head.appendChild(script);
        } else {
            // MP4 / WebM / other browser-supported URL
            video.src = url;

            video.addEventListener(
                'loadedmetadata',
                fullscreen,
                { once: true }
            );
        }

        // Useful from console afterwards
        popup.previewVideo = video;

        return popup;
    }

    function runInAtWindow() {
        let url = new URL(
            performance
                .getEntriesByType('resource')
                .map(x => x.name)
                .find(x => x.includes('m3u8.gammacdn.com'))
        ).searchParams.get('u');

        if (!url.isWellFormed()) url = document.querySelector('video')?.currentSrc

        alert(url)
    }

    function adultTimeTrailerUrl(value) {
        try {
            const url = new URL(value);
            if (url.hostname !== 'trailers-fame.gammacdn.com') return null;
            return /\/c\d+\/trailers\/[^/]+\/tr_[^/]+_720p\.mp4$/i.test(url.pathname) ? url.href : null;
        } catch { return null; }
    }

    function adultTimeTrailerFromHit(hit) {
        const direct = adultTimeTrailerUrl(Object.getOwnPropertyDescriptor(hit?.trailers, '720p')?.value);
        if (direct) return direct;
        const format = hit?.video_formats?.find(item => item?.format === '720p');
        return adultTimeTrailerUrl(format?.trailer_url);
    }

    function describeUrl(value) {
        try {
            const url = new URL(value);
            return `${url.origin}${url.pathname}`;
        } catch { return String(value || 'unavailable'); }
    }

    const LOG_STORAGE_KEY = 'preview_trailer_update_logs';

    function appendLog(message, details) {
        try {
            const entry = { timestamp: new Date().toISOString(), message };
            if (details !== undefined) entry.details = details;
            const logs = [...readLogs(), entry].slice(-MAX_LOG_ENTRIES);
            global.localStorage?.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
        } catch { /* Logging must not stop the shortcut update. */ }
    }

    function createLogger(options = {}, consoleLike = globalThis.console) {
        options = options || {};
        const enabled = options.debug === true;
        const write = (level, message, details) => {
            if (level === 'debug' && !enabled) return;
            const method = consoleLike?.[level] || consoleLike?.log;
            if (typeof method !== 'function') return;
            const prefix = `[Preview Trailer] ${message}`;
            if (level === 'info' || level === 'warn' || level === 'error') appendLog(`(${level}) ${prefix}`, details);
            details === undefined ? method.call(consoleLike, prefix) : method.call(consoleLike, prefix, details);
        };
        return {
            debug: (message, details) => write('debug', message, details),
            info: (message, details) => write('info', message, details),
            warn: (message, details) => write('warn', message, details),
            error: (message, details) => write('error', message, details),
        };
    }

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

    function adapterPreview(doc, page, target, base, logger) {
        const adapter = SITE_ADAPTERS.find(candidate => candidate.matches(page));
        if (!adapter || !target?.querySelectorAll) return null;
        const card = target.closest?.(adapter.cardSelector) || target;
        const urls = candidates(card, base).filter(adapter.isPreviewUrl);
        logger.debug(`${adapter.name} adapter found ${urls.length} candidate(s)`, { target: target.tagName, card: card.className || card.tagName });
        return urls.length === 1 ? urls[0] : null;
    }

    function atStuff(){
        const [pageUrl, hoverUrl] = [hoverPreview?.page(), window?.hoveredSceneUrl];

        logger.info({ pageUrl, hoverUrl })
        logger.info('Resolved AdultTime trailer from url', { pageUrl, hoverUrl });
        const url = hoverUrl || pageUrl
        if (!!url) {
            if (window?.debug === true) alert(url);
            return openPreviewFullscreenAT(
                url
            );
        }
        return null
    }
    async function resolveAdultTimeTrailer(doc, page, preview, target, logger) {
        if (!/(^|\.)adulttime\.com$/i.test(page.hostname)) return null;
        /*if (!/^https:\/\/videothumb\.gammacdn\.com\/\d+x\d+\/\d+\.mp4$/i.test(preview)) return null;*/

      


        const view = doc.defaultView;
        const config = view?.env?.api?.algolia;
        const clipId = preview.match(/\/(\d+)\.mp4$/)?.[1];
        if (!config?.applicationID || !config.apiKey || !clipId || typeof view?.fetch !== 'function') return null;
        try {
            const endpoint = `https://${config.applicationID.toLowerCase()}-dsn.algolia.net/1/indexes/*/queries`;
            const response = await view.fetch(endpoint, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    'x-algolia-application-id': config.applicationID,
                    'x-algolia-api-key': config.apiKey,
                },
                body: JSON.stringify({
                    requests: [{
                        indexName: 'all_scenes_latest_desc',
                        query: '',
                        hitsPerPage: 1000,
                        attributesToRetrieve: ['clip_id', 'trailers', 'video_formats'],
                    }]
                }),
            });
            if (!response.ok) return null;
            const payload = await response.json();
            const hit = payload?.results?.flatMap(result => result?.hits || [])
                .find(item => String(item?.clip_id) === clipId);
            const trailer = adultTimeTrailerFromHit(hit);
            if (trailer) logger.info('Resolved AdultTime trailer from clip metadata', { clipId, target: target?.tagName || 'none' });
            else logger.warn('AdultTime trailer metadata unavailable; using thumbnail', { clipId });
            return trailer;
        } catch (error) {
            logger.debug('AdultTime trailer metadata lookup failed', error.message);
            return null;
        }
    }

    function retrievePreviewUrl(doc, pageUrl, target = selectTarget(doc), logger = createLogger()) {
        const page = new URL(pageUrl);
        if (['localhost', '127.0.0.1', '[::1]'].includes(page.hostname) && page.port === '9999') {
            const scene = page.pathname.match(/^\/scenes\/(\d+)(?:\/|$)/);
            if (scene) {
                const preview = `${page.origin}/scene/${scene[1]}/preview`;
                logger.info('Using Stash scene preview', { preview: describeUrl(preview) });
                return preview;
            }
        }
        const base = doc.baseURI || page.href;
        const adapted = adapterPreview(doc, page, target, base, logger);
        if (adapted) {
            logger.info('Preview found with site adapter', { site: page.hostname, preview: describeUrl(adapted) });
            return adapted;
        }
        if (target?.querySelectorAll && target !== doc.body && target !== doc.documentElement) {
            const card = target.closest?.(CARD_SELECTOR);
            let current = card || target;
            for (let depth = 0; current && depth < 6; depth++, current = current.parentElement) {
                if (current === doc.body || current === doc.documentElement) break;
                const urls = candidates(current, base);
                if (urls.length === 1) {
                    logger.info('Preview found in selected card', { preview: describeUrl(urls[0]) });
                    return urls[0];
                }
                if (urls.length > 1 || card) return null;
            }
            // A selected card with no URL must not fall through to another card.
            return null;
        }
        const playing = [...doc.querySelectorAll('video')].filter(video => !video.paused && !video.ended);
        if (playing.length === 1) {
            const urls = candidates(playing[0], base);
            if (urls.length === 1) {
                logger.info('Preview found in the only playing video', { preview: describeUrl(urls[0]) });
                return urls[0];
            }
        }
        const urls = candidates(doc, base);
        if (urls.length === 1) {
            logger.info('Preview found by document scan', { preview: describeUrl(urls[0]) });
            return urls[0];
        }
        logger.debug('No unique preview found', { page: describeUrl(page.href), target: target?.tagName || 'none', candidates: urls.length });
        return null;
    }

    function createPlayer(popup, logger) {
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
            video.play().catch(error => {
                logger.warn('Sound playback was rejected', error.message);
                status.textContent = 'Playback unavailable. Try Open original.';
            });
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
        video.addEventListener('error', () => {
            logger.warn('Preview playback failed', { preview: describeUrl(video.src) });
            status.textContent = 'This preview could not play here. Try Open original.';
        });
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
        options = options || {};
        const doc = win.document;
        const logger = createLogger(options, win.console);
        // Capture hover before opening a new window moves focus away from the page.
        const target = options.target || selectTarget(doc);
        const pageUrl = win.location.href;
        const page = new URL(pageUrl);
        let newWindow = null;
        if (/(^|\.)adulttime\.com$/i.test(page.hostname)) {
            newWindow = atStuff();
        }
        if (!newWindow){
logger.info('Starting', { page: describeUrl(pageUrl), target: target?.tagName || 'none' });
        let preview = retrievePreviewUrl(doc, pageUrl, target, logger);
        // Reserve exactly one popup during the triggering user gesture, before retries.
        newWindow = win.open('about:blank', '_blank', 'popup=yes,width=1100,height=720');
        }
        else {
            return
        }

        const popup = newWindow
        
        if (!newWindow) {
            const error = new Error('Popup blocked. Allow popups for this site and run Preview Trailer again.');
            logger.error(error.message);
            return Promise.reject(error);
        }
   
        logger.debug('Player window opened');
        newWindow.opener = null;
        let player;
        try { player = createPlayer(popup, logger); }
        catch (error) { popup.close(); return Promise.reject(error); }
        const retries = Number.isInteger(options.retries) ? Math.max(0, Math.min(options.retries, 20)) : 5;
        const retryDelay = Number.isFinite(options.retryDelay) ? Math.max(0, options.retryDelay) : 200;
        return new Promise((resolve, reject) => {
            async function attempt(count) {
                
                if (popup.closed) { resolve(null); return; }
                if (win.location.href !== pageUrl || (target && !target.isConnected)) {
                    player.status.textContent = 'The page changed. Close this window and run Preview Trailer again.';
                    logger.warn('Selected page or card changed while waiting for preview');
                    reject(new Error('The selected page or card changed.'));
                    return;
                }
                preview = preview || retrievePreviewUrl(doc, pageUrl, target, logger);
                const trailer = await resolveAdultTimeTrailer(doc, page, preview, target, logger);
                preview = trailer || preview;
                if (preview) {
                    player.load(preview);
                    logger.info('Loading preview', { preview: describeUrl(preview), attempt: count + 1 });
                    resolve({ preview, previewWindow: popup });
                } else if (count < retries) {
                    logger.debug('Preview not ready; retrying', { attempt: count + 1, retries });
                    win.setTimeout(() => attempt(count + 1), retryDelay);
                } else {
                    const message = 'No unique preview found. Hover a video card or focus its link, then run again.';
                    player.status.textContent = message;
                    logger.warn(message, { attempts: count + 1 });
                    reject(new Error(message));
                }
            }
            attempt(0);
        });
    }

    const api = { version: VERSION, mediaUrl, sourceOf, candidates, retrievePreviewUrl, selectTarget, run, SITE_ADAPTERS, describeUrl, createLogger, adultTimeTrailerFromHit };
    if (typeof module === 'object' && module.exports && typeof window === 'undefined') {
        module.exports = api;
    } else {
        window.PreviewTrailer = api;
        if (window.PreviewTrailerOptions?.autoRun !== false) {
            run(window, window.PreviewTrailerOptions).catch(error => {
                createLogger(window.PreviewTrailerOptions, window.console).error('Run failed', error.message);
                if (error.message.startsWith('Popup blocked')) window.alert(error.message);
            });
        }
    }
})();
