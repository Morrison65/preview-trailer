/**
 * Preview URL Retriever (Simplified)
 * ----------------------------------
 * Retrieves a video preview URL from supported pages.
 */

/**
 * Convert any value to string, JSON if object.
 * @param {*} v
 * @returns {string}
 */
function toString(v) {
    if (typeof v === 'string') return v;
    try {
        if (typeof v === 'object') {
            const j = JSON.stringify(v);
            if (j && j.trim()) return j;
        }
    } catch { }
    return String(v);
}

/**
 * Checks if a value is empty: null, undefined, '', [] or {}.
 * @param {*} v
 * @returns {boolean}
 */
function isEmpty(v) {
    if (v == null) return true;
    if (typeof v === 'string') return !v.trim();
    if (Array.isArray(v)) return v.length === 0;
    //if (typeof v === 'object') return Object.keys(v).length === 0;
    return false;
}

/**
 * Generate 3-char alphanumeric ID
 * @returns {string}
 */
function generateId() {
    const CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 3 }, () => CH.charAt(Math.random() * CH.length | 0)).join('');
}
const isValidUrl = (src) => {
    if (isEmpty(src)) return false;
    if (URL.canParse(src) || src?.includes("localhost:9999")) return true
    console.log(`Value '${src}' is not a valid URL`)
    return false

}
function getElementSource(el) {
    try {
        return tryGetElementSource(el);
    }
    catch (e) {
        console.error(e)
    }
    return null
}
function tryGetElementSource(el) {
    if (isEmpty(el)) return null;
    const commonSourcePaths = el?.src
        ?? el?.getAttribute("src")
        ?? el?.getAttribute("data-src")
        ?? el?.currentSrc
    if (isValidUrl(commonSourcePaths)) return commonSourcePaths;
    const otherPossibleSources = el?.getAttribute("data-preview-src") ?? el?.firstChild?.src;
    if (isValidUrl(otherPossibleSources)) return otherPossibleSources;
    return null;
}
function isValidPreviewUrl(src) {
    if (isEmpty(src) || typeof src !== "string") return false
    console.trace(src + ' is string ')
    if (src.includes("localhost:9999")) return true;
    if (src.includes("?")) {
        const firstChunk = src.split("?")[0]
        return firstChunk.endsWith(".mp4")
    }
    else {
        return src.endsWith(".mp4")
    }
}
function retrieveUrlByElement(element = null, recursioncount = 0) {
    if (!isEmpty(element) && recursioncount === 0) console.trace(element)
    const res = (isEmpty(element) ? retrieveUrlByElementLogless() : retrieveUrlByElementLogless(element))
    if (!isEmpty(res)) {
        console.log(res)
    } else if (!isEmpty(element) && recursioncount < 5) {
        retrievePreviewUrl((element?.parentNode ?? element?.parentElement), recursioncount + 1)
    }
    return res
}
function retrieveUrlByElementLogless(element = document.activeElement) {
    const elementSrc = getElementSource(element);
    if (isValidPreviewUrl(elementSrc)) return elementSrc;
    const videoEl = element.querySelector("video:hover")
        ?? element.querySelector("div:hover>video")
        ?? element.querySelector("video:focus")
        ?? element.querySelector("div:focus-within>video")
        ?? element.querySelector("video");
    const videoSrc = getElementSource(videoEl);
    if (isValidPreviewUrl(videoSrc)) return videoSrc;

    const videoSourceEl = videoEl?.querySelector("source")
    const videoSourceSrc = getElementSource(videoSourceEl)
    if (isValidPreviewUrl(videoSourceSrc)) return videoSourceSrc

    const imgEl = element.querySelector("img:hover")
        ?? element.querySelector("div:hover>img")
        ?? element.querySelector("img:focus")
        ?? element.querySelector("div:focus-within>img")
        ?? element.querySelector("img");
    const imgSrc = getElementSource(imgEl)
    if (isValidPreviewUrl(imgSrc)) return imgSrc
    console.log("Nothing found for:")
    console.log(element)
    return null
}


function retrievePreviewUrl(pageUrl = window.location.href) {
    if (isEmpty(pageUrl)) pageUrl = window.location.href;
    if (pageUrl?.startsWith("http://localhost:9999/scenes/")) {
        const [, sid] = pageUrl.match(/scenes\/(\d+)/) || [];
        const previewUrl = sid ? `http://localhost:9999/scene/${sid}/preview` : '';
        if (URL.canParse(previewUrl)) return previewUrl;
    }
    else if (pageUrl.includes("teamskeet.com")) {
        const elementToCheck = document.querySelector(".standard-thumb:hover")
        const previewUrlNub = retrieveUrlByElement(elementToCheck);
        if (isValidUrl(previewUrlNub)) return previewUrlNub;
    }
    else if (pageUrl.includes("nookies.com")) {
        const elementToCheck = document.querySelector(".card-preview:hover video")
        const previewUrlNub = retrieveUrlByElement(elementToCheck);
        if (isValidUrl(previewUrlNub)) return previewUrlNub;
    }
    else if (pageUrl.includes("badmommypov.com")) {
        console.log("BadMommyMatch");
        const e = document.querySelector("body > div.container.bg-primary.mx-auto.px-1.md\\:px-2 > div.mt-0 > div.grid.grid-cols-2.lg\\:grid-cols-5.gap-3 > div:hover > div.scene_swimlane_thumbnail_component.group.relative.video_preview_div > a > div.transition-all.duration-500 > video")
        if (isEmpty(e)) {
            console.log("e is empty")
        }
        else {
            const bmpr = retrieveUrlByElement(e);
            if (isValidUrl(bmpr)) return bmpr;
        }
        const elementToCheck = document.querySelector("div.scene_swimlane_thumbnail_component.group.relative.video_preview_div > a > div.transition-all.duration-500 > video") ?? document.activeElement?.querySelector("video:hover") ?? document.querySelector("video:hover") ?? document.querySelector("div:hover>video") ?? document.activeElement?.querySelector("div:hover>video")
        console.trace(elementToCheck)
        const previewUrlNub = retrieveUrlByElement(elementToCheck);
        if (isValidUrl(previewUrlNub)) return previewUrlNub;
    }
    else if (pageUrl.includes("brattysis.com")) {
        const elementToCheck = document.querySelector("div.overlay-video-wrapper.hover-thumb.cover:hover") ??
            document.activeElement?.querySelector("div.overlay-video-wrapper.hover-thumb.cover") ??
            document.querySelector(".hover-thumb:hover") ??
            document.activeElement?.querySelector(".hover-thumb");
        const previewUrlNub = retrieveUrlByElement(elementToCheck);
        if (isValidUrl(previewUrlNub)) return previewUrlNub;
    }
    else if (pageUrl.includes("freeuseporn.com")) {
        //document.querySelector("#playvthumb_2755 > video > source:nth-child(2)")
        const elementsToCheck = [
            document.querySelector(".thumbnail.overlay > video.img-fluid > source:nth-child(1)"),
            document.querySelector(".thumbnail.overlay > video.img-fluid"),
            document.activeElement?.querySelector("video.img-fluid > source:nth-child(1)"),
            document.activeElement?.querySelector("video.img-fluid"),
        ]
        for (const element of elementsToCheck) {
            const prevUrl = getElementSource(element)
            if (isValidUrl(prevUrl)) return prevUrl
        }

        const thumbsToCheck = [document.activeElement?.querySelector(".thumbnail:hover"),
        document.querySelector(".thumbnail:hover"),
        document.activeElement?.querySelector(".thumbnail"),
        document.querySelector(".thumbnail"),
        ]
        for (const element of thumbsToCheck) {
            const prevUrl = retrieveUrlByElement(element)
            if (isValidUrl(prevUrl)) return prevUrl

        }

    }
    else if (pageUrl.includes("bang.com")) {
        // data-videopreview-mp4-large-value // data-videopreview-mp4-value
        const elementsToCheck = [
            document.querySelector('div.main a[href].relative.video_inner_container.group[data-turbo-frame][data-videopreview-focus-value="true"][data-videopreview-mp4-large-value]:hover'),
                        document.activeElement?.querySelector('div.main a[href].relative.video_inner_container.group[data-turbo-frame][data-videopreview-focus-value="true"][data-videopreview-mp4-large-value]:hover'),
                        document.querySelector('div.main a[href].relative.video_inner_container.group[data-turbo-frame][data-videopreview-focus-value="true"][data-videopreview-mp4-large-value]:has(video[autoplay])'),
                        document.activeElement?.querySelector('div.main a[href].relative.video_inner_container.group[data-turbo-frame][data-videopreview-focus-value="true"][data-videopreview-mp4-large-value]:has(video[autoplay])')
        ];
        for (const element of elementsToCheck) {
            const prevUrl = element.getAttribute("data-videopreview-mp4-large-value") ?? element.getAttribute("data-videopreview-mp4-value");
            if (isValidUrl(prevUrl)) return prevUrl
        }
        for (const element of elementsToCheck) {
            const prevUrl = getElementSource(element)
            if (isValidUrl(prevUrl)) return prevUrl
        }
    }
    else {
        console.log(`No url match for '${pageUrl}' found`)
    }

    let previewUrl = retrieveUrlByElement();
    if (!isValidUrl(previewUrl)) previewUrl = retrieveUrlByElement(document);
    if (!isValidUrl(previewUrl) && !!(document.activeElement?.parentElement)) previewUrl = retrieveUrlByElement(document.activeElement?.parentElement);
    if (!isValidUrl(previewUrl) && !!(document.activeElement?.parentElement?.parentElement)) previewUrl = retrieveUrlByElement(document.activeElement?.parentElement?.parentElement);
    if (!isValidUrl(previewUrl)) previewUrl = document.activeElement?.querySelector("div:hover>video") ?? document.querySelector("div:hover>video") ?? document.activeElement?.querySelector("*:hover>video") ?? document.querySelector("*:hover>video") ?? document.activeElement?.querySelector("div:hover video") ?? document.querySelector("div:hover video")
    if (pageUrl.includes("site-ma")) {
        previewUrl = previewUrl?.replace("mediabook_320p.mp4", "mediabook_720p.mp4");
    }

    if (isValidUrl(previewUrl)) return previewUrl;
    const elementToCheck = document.querySelectorAll("div:hover>video")
    if (elementToCheck.length === 1) {
        const checkedElementSrc = retrieveUrlByElement(elementToCheck);
        if (isValidUrl(checkedElementSrc)) return checkedElementSrc;
    }

    throw new Error("Could not find a playing Video");
}

/**
 * Main run logic
 */
function run() {
    const id = generateId();
    const preview = retrievePreviewUrl();
    const previewWindow = window.open(preview, '_blank', 'popup=true,fullscreen=yes');
    if (isEmpty(previewWindow)) throw new Error("did not work");
    else {
        try {

            const vid = previewWindow.document.querySelector("video");
            if (vid) {
                vid.loop = true;
                vid.addEventListener("canplay", () => {
                    vid.play();
                    if (vid.requestFullscreen) {
                        vid.requestFullscreen();
                    } if (vid.webkitRequestFullscreen) { // Safari
                        vid.webkitRequestFullscreen();
                    } if (vid.msRequestFullscreen) { // IE/Edge
                        vid.msRequestFullscreen();
                    }
                });
            }
        }
        catch (e) {
            console.error(e)
        }
        finally {
            return { id, preview, previewWindow };
        }

    }
    return { id, preview, previewWindow };
}

/**
 * Schedule a retry mechanism
 */
function scheduleRun(tries = 3) {
    const executeRun = (count = 0) => {
        console.log("run: " + count)
        if (count > tries) return;
        try {
            return run();
        } catch (e) {
            if (count === tries) {
                if (e.message !== "Could not find a playing Video") alert(e)
            } else {
                console.error(e)
                setTimeout(() => executeRun(count + 1), (100 * count));

            }
        }
    };
    return executeRun;
}

scheduleRun()();
