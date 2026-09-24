/* Local fixtures only. No live sites, browser profile, or remote media. */
(async () => {
    const api = window.PreviewTrailer;
    const fixture = document.getElementById('fixture');
    const passed = [], failed = [], popups = [];
    const base = location.origin;
    function equal(actual, expected) {
        if (actual !== expected) throw new Error(`Expected ${expected}; received ${actual}`);
    }
    async function check(name, fn) {
        try { await fn(); passed.push(name); }
        catch (error) { failed.push({name, error:error.message}); }
    }
    function html(markup) { fixture.innerHTML = markup; return fixture.firstElementChild; }
    function retrieve(target = null, page = location.href) { return api.retrievePreviewUrl(document, page, target); }
    const nativeOpen = window.open.bind(window);
    let opens = 0;
    window.open = (...args) => { opens++; const popup = nativeOpen(...args); if (popup) popups.push(popup); return popup; };
    await check('Stash scene routes preserve origin and reject lookalike hosts', () => {
        html('');
        equal(retrieve(null, 'http://localhost:9999/scenes/123?x=2'), 'http://localhost:9999/scene/123/preview');
        equal(retrieve(null, 'https://localhost.attacker.test:9999/scenes/123'), null);
    });
    await check('nested video source, null and document roots', () => {
        const video = html('<video><source src="/first.mp4"><source src="/second.mp4"></video>');
        equal(retrieve(video), base + '/first.mp4');
        equal(retrieve(null), base + '/first.mp4');
        equal(api.candidates(null, base).length, 0);
    });
    await check('every original site card selector selects its own preview', () => {
        for (const className of ['standard-thumb','card-preview','scene_swimlane_thumbnail_component',
            'video_preview_div','overlay-video-wrapper','hover-thumb','thumbnail','video_inner_container']) {
            const card = html(`<div class="${className}"><button>Selected</button><video data-src="/wanted.mp4"></video></div>`
                + '<article><video data-src="/wrong.mp4"></video></article>');
            equal(retrieve(card.firstElementChild), base + '/wanted.mp4');
        }
    });
    await check('Bang large preview attribute wins and missing large falls back', () => {
        const card = html('<a class="video_inner_container" data-videopreview-mp4-large-value="/large.mp4" '
            + 'data-videopreview-mp4-value="/small.mp4"><video data-src="/small.mp4"></video></a>');
        equal(retrieve(card), base + '/large.mp4');
        card.setAttribute('data-videopreview-mp4-large-value', '');
        equal(retrieve(card), base + '/small.mp4');
    });
    await check('AdultTime adapter selects the trailer in its SceneThumb card', () => {
        const card = html('<div class="SceneThumb-Preview"><a href="#"><span>AdultTime</span></a>'
            + '<video src="https://videothumb.gammacdn.com/500x281/288813.mp4"></video></div>');
        equal(retrieve(card.querySelector('span'), 'https://members.adulttime.com/en/videos/'),
            'https://videothumb.gammacdn.com/500x281/288813.mp4');
    });
    await check('parent search returns the result; focused link identifies its card', () => {
        const card = html('<div><a href="#"><span>Selected</span></a><video data-src="/parent.mp4"></video></div>');
        equal(retrieve(card.querySelector('span')), base + '/parent.mp4');
        card.querySelector('a').focus();
        equal(api.selectTarget(document), card.querySelector('a'));
    });
    await check('ambiguous pages and empty selected cards do not open unrelated videos', () => {
        const selected = html('<article><button>No preview yet</button></article><article><video data-src="/other.mp4"></video></article>');
        equal(retrieve(selected), null);
        html('<video data-src="/a.mp4"></video><video data-src="/b.mp4"></video>');
        equal(retrieve(null), null);
    });
    await check('late preview retries keep one popup and the original selection', async () => {
        const card = html('<article><video></video></article>');
        const before = opens;
        setTimeout(() => card.querySelector('video').setAttribute('data-src', '/fixture.webm'), 30);
        const result = await api.run(window, {target:card, retryDelay:20});
        equal(opens - before, 1);
        equal(result.preview, base + '/fixture.webm');
        equal(result.previewWindow.opener, null);
        const player = result.previewWindow.document.querySelector('video');
        equal(player.loop, true);
        equal(player.controls, true);
        equal(result.previewWindow.document.querySelector('a').href, result.preview);
        await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Real WebM playback did not start.')), 4000);
            player.addEventListener('playing', () => { clearTimeout(timer); resolve(); }, {once:true});
            if (!player.paused && player.readyState >= 3) { clearTimeout(timer); resolve(); }
        });
        result.previewWindow.close();
    });
    await check('missing preview reports failure inside its single popup', async () => {
        html('');
        const before = opens;
        let error;
        try { await api.run(window, {retries:0}); } catch (failure) { error = failure; }
        if (!error?.message.includes('No unique preview')) throw new Error('Expected missing-preview error');
        equal(opens - before, 1);
        equal(popups.at(-1).document.querySelector('[role="status"]').textContent, error.message);
        popups.at(-1).close();
    });
    await check('popup blocking rejects once without scheduling retries', async () => {
        html('<video data-src="/fixture.webm"></video>');
        const savedOpen = window.open;
        let count = 0;
        window.open = () => { count++; return null; };
        try {
            let error;
            try { await api.run(window); } catch (failure) { error = failure; }
            if (!error?.message.includes('Popup blocked')) throw new Error('Expected popup-blocked error');
            equal(count, 1);
        } finally { window.open = savedOpen; }
    });
    await check('standalone script can execute repeatedly without global declaration errors', async () => {
        html('');
        const script = document.createElement('script');
        script.src = '/preview-trailer.js';
        await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
        equal(window.PreviewTrailer.version, '1.0.0');
    });
    await check('default standalone entry automatically opens the detected preview', async () => {
        const card = html('<article><a href="#">Selected preview</a><video data-src="/fixture.webm"></video></article>');
        card.querySelector('a').focus();
        delete window.PreviewTrailerOptions;
        const before = opens;
        const script = document.createElement('script');
        script.src = '/preview-trailer.js';
        await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; document.head.append(script); });
        equal(opens - before, 1);
        equal(popups.at(-1).document.querySelector('video').src, base + '/fixture.webm');
        popups.at(-1).close();
    });
    for (const popup of popups) if (!popup.closed) popup.close();
    document.getElementById('result').textContent = JSON.stringify({passed, failed});
    await fetch('/result', {method:'POST', body:JSON.stringify({passed, failed})});
})();
