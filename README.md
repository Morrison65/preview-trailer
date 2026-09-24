# Preview Trailer

Standalone JavaScript that opens the hovered or focused preview/trailer in a separate looping video player. Based on the supplied Preview URL Retriever; the original is preserved in `reference/preview-url-retriever.original.js`.

## Use

Run **`preview-trailer.js`** using the same browser snippet, shortcut, or script runner as the original. Hover the intended video card (or focus its link with Tab) before invoking it. Each execution opens one player window and tries to start playback. If there is just one preview on the page, no selection is required.

For a bookmark, run `npm run build`, create a bookmark, and paste the full contents of **`preview-trailer.bookmarklet.txt`** into its URL field. Invoke it on the video page. Bookmarklet availability depends on the page's content security policy and the browser; a script runner may work where bookmarklets are blocked.

The player offers native controls, looping, **Play with sound**, **Fullscreen**, and **Open original**. Allow popups for the page if prompted. Autoplay may start muted; fullscreen requires clicking its button. This is a one-shot script, not a script that opens windows automatically on every page load or hover.

Diagnostics are quiet by default. For troubleshooting, set `window.PreviewTrailerOptions = { debug: true }` before loading the script; it logs detection stages, adapter matches, retries, and playback setup while redacting query strings from media URLs. The file has no runtime dependencies and includes its own browser entry point, player, adapter registry, and CommonJS test export.

## Legacy Differences

`lagacy-preview.js` is the original direct-retrieval implementation. It remains useful as a behavioral reference, but it is not loaded by the current script.

| Area | Legacy version | Current `preview-trailer.js` |
| --- | --- | --- |
| Entry point | Runs immediately through `scheduleRun()` and retries thrown errors. | Exposes `PreviewTrailer.run(window)` and auto-runs unless `PreviewTrailerOptions.autoRun` is `false`. |
| Detection | Uses page-specific `if/else` branches plus broad recursive DOM fallbacks. | Uses selected hover/focus targets, bounded card traversal, generic media extraction, and the `SITE_ADAPTERS` registry. |
| Sites | Explicitly handles TeamSkeet, Nookies, BadMommyPOV, BrattySis, and Stash. | Preserves the known card patterns, adds AdultTime, and supports future adapters without expanding the main retrieval branch. |
| Safety | Accepts any URL recognized by `URL.canParse()` and can return the first `.mp4` it finds. | Allows only HTTP(S)/blob media, rejects credentials and executable schemes, and refuses ambiguous or unrelated cards. |
| Player | Opens the preview URL directly, then tries to find the remote page's `<video>` to loop and request fullscreen. | Opens one same-origin blank player window first, renders controls locally, supports muted-autoplay fallback, and provides **Open original**. |
| Retry behavior | Three retries with a recursive `setTimeout`; some errors are swallowed or alerted. | Five bounded retries for lazy sources with promise rejection, status text, and structured diagnostics. |
| API | Global functions and implicit browser globals; no module export. | Self-contained IIFE with a browser API and CommonJS exports for testing. |

Use the legacy file only when reproducing its direct-navigation or automatic-fullscreen behavior. Add new site support to `SITE_ADAPTERS` in the current file instead of adding another top-level page branch.

## Detection

- Keeps the card selectors from TeamSkeet, Nookies, BadMommyPOV, BrattySis, FreeUsePorn and Bang. Uses generic video/source elements and preview/trailer data attributes on other sites.
- Includes an adapter registry in `preview-trailer.js`. AdultTime matches `*.adulttime.com`, scopes lookup to its `SceneThumb` card, resolves the thumbnail clip ID through the page's Algolia metadata, and prefers the returned `trailers-fame.gammacdn.com` 720p trailer. The thumbnail remains a fallback when metadata is unavailable. Add another same-pattern site by appending an object with `name`, `matches(page)`, `cardSelector`, and `isPreviewUrl(url)` to `SITE_ADAPTERS`.
- Supports local Stash scene pages on port 9999, including localhost, 127.0.0.1 and IPv6 loopback.
- Handles relative URLs, query strings, uppercase extensions, lazy sources, multiple video source alternatives, and explicit extensionless media URLs.
- Captures the selected card before opening the popup and retries five times at 200 ms intervals for lazy previews. Stops if the card is removed or the page URL changes.
- Returns no match for ambiguous pages or a selected card without a preview, instead of opening another card's video.
- Uses advertised URLs as provided, including their signed query parameters. Unlike the original, it does not guess a 720p URL by replacing `mediabook_320p.mp4`.

The script reads the current document only. Cross-origin iframes, DRM players and JavaScript-only stream manifests need separate site support. Blob URLs work only while their source remains valid. Authentication, expiring links and a site's media/content policies can prevent playback; **Open original** provides a direct-link fallback. Live authenticated site compatibility has not been verified.

## Development

No npm packages or runtime downloads are required. Node.js 22+, Chrome/Edge and FFmpeg with libvpx are needed for all checks:

```powershell
npm run check
npm run build
```

`npm run build` also synchronizes [shortkeys.json](shortkeys.json) from `lagacy-preview.js` and `preview-trailer.js`, then writes [Importurl.txt](Importurl.txt) as `https://shortkeys.app/share#` plus the UTF-8 Base64 encoding of compact JSON. JSON formatting whitespace is removed only for the Base64 payload; whitespace inside shortcut fields and JavaScript strings is preserved. Run `npm run release` for the pre-release/commit check: it runs the full test suite before rebuilding all three artifacts.

To update the installed Shortkeys extension from GitHub, open the Shortkeys options page, open its DevTools console, and paste [update-shortkeys-from-github.js](update-shortkeys-from-github.js). It fetches the repository export, normalizes `id`, `enabled`, `sites`, and `sitesArray` like Shortkeys, then writes the `keys` value using chunked `storage.sync` with a `storage.local` backup and local fallback. The script automatically runs once when pasted and also exposes `updateShortkeysFromGithub()` for another run. It cannot update extension storage from an ordinary website or Node process.

Set `CHROME_PATH` if Chrome/Edge is installed elsewhere. Browser checks use an isolated temporary profile and an in-memory synthetic WebM, with no downloaded analysis media retained. They cover source selection, card targeting, Stash routes, lazy-source retries, popup failure, player controls and actual local WebM playback. Headless checks permit popups/autoplay; they do not establish real-user popup permission, autoplay or fullscreen behavior on live sites.

For programmatic use, set `window.PreviewTrailerOptions = { autoRun: false }` before loading the script, then call:

```js
await PreviewTrailer.run(window); // opens the player
PreviewTrailer.retrievePreviewUrl(document, location.href); // URL or null, without opening
```

Optional `run` settings: `target` (a DOM element), `retries` (0–20), and `retryDelay` (milliseconds). Call `run` directly from a click or keyboard action to retain popup permission.

## Agent Release Rule

For every release or before every commit that changes either JavaScript shortcut, agents must run `npm run release`. Do not edit the `code` fields in `shortkeys.json` by hand: the build replaces them from the two JavaScript source files and regenerates `Importurl.txt`. Review the generated JSON and import URL as part of the change.
