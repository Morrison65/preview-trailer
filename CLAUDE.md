# Preview Trailer

This repository maintains a standalone browser script and bookmarklet that opens the preview associated with the hovered or focused card in a separate looping player. It is an independent project in the `docker-stuff` workspace.

@AGENTS.md

## Commands

Node.js 22+ is required; there are no npm dependencies. Browser tests also need Chrome/Edge (set `CHROME_PATH` if installed elsewhere) and FFmpeg with libvpx. Run everything from this directory: `tools/build.cjs` reads files by relative path.

| Command | Purpose |
| --- | --- |
| `npm run check` | Syntax-check both scripts, run unit tests, then the browser test. |
| `npm test` | Unit tests only (`node --test test/core.test.cjs`). |
| `npm run test:browser` | Headless-browser test only (`node test/browser.cjs`). |
| `npm run build` | Regenerate `shortkeys.json` `code` fields, `Importurl.txt`, and `preview-trailer.bookmarklet.txt`. |
| `npm run release` | `check` then `build`. Required before committing a change to either JavaScript shortcut. |

Single unit test file: `node --test test/update-shortkeys.test.cjs`. CI (`.github/workflows/ci.yml`) runs `npm run release` on Ubuntu with chromium and ffmpeg; `anthropic-wifi-test.yml` is unrelated to the build.

## Project map

- `preview-trailer.js` is the maintained implementation: one self-contained IIFE (no runtime dependencies) with a browser entry point that auto-runs unless `PreviewTrailerOptions.autoRun === false`, the player, the `SITE_ADAPTERS` registry, and a CommonJS export (only when `window` is undefined) used by tests.
- `lagacy-preview.js` is the historical direct-retrieval implementation, kept as a behavioral reference and still shipped as its own shortcut. Do not add features to it; new site support goes into `SITE_ADAPTERS` in the current file (an object with `name`, `matches(page)`, `cardSelector`, `isPreviewUrl(url)`).
- `update-shortkeys-from-github.js` is pasted into the Shortkeys extension options page DevTools console. It is not a Node CLI and must not be run on an ordinary website.
- `tools/build.cjs` is the build. `shortkeys.json` must hold exactly three shortcuts (legacy, current, updater, matched by fixed ids); the build overwrites each `code` field with a small snippet that fetches the script from `raw.githubusercontent.com/Morrison65/preview-trailer/refs/heads/main/<file>`. So shortcut behavior only changes for users after the source is pushed to `main`.
- `shortkeys.json`, `Importurl.txt`, and `preview-trailer.bookmarklet.txt` are generated; never edit them by hand. The bookmarklet is `javascript:(()=>{` + the full source + `})()`.
- `test/`: `core.test.cjs` (URL/adapter/logging unit tests via the CommonJS export), `update-shortkeys.test.cjs`, `browser.cjs` + `browser-suite.js` (launch Chrome with a temporary profile and an in-memory synthetic WebM).
- `reference/` holds the original Preview URL Retriever. `Logs/` (updater output), `verification/`, `*.mp4`, `*.webm`, `*.har` are git-ignored; do not commit them.
- Local Stash scene support (port 9999 on loopback) is a browser integration only. Stash deployment and configuration belong to `docker-workspace` and `stash/config`.

## Conventions

- Detection is deliberately conservative: only HTTP(S)/blob media URLs, no credentials or executable schemes, and no match (rather than a guess) for ambiguous pages or a selected card without a preview. Keep this when changing extraction.
- Signed media URLs are used as advertised; do not rewrite URLs to guess higher resolutions.
- The player window is opened synchronously from the user's action to keep popup permission; preserve that when changing `run`.
- Diagnostics are quiet unless `window.PreviewTrailerOptions = { debug: true }`; log helpers redact media query strings. Never log signed URLs in full.
- Style: 4-space indentation, single quotes, `const` arrow functions inside the IIFE, test files in CommonJS (`.cjs`).
- Add tests in `test/core.test.cjs` for any new adapter or URL rule, and update the README detection section.

## Validation

- Run `npm run check` for behavior changes.
- Run `npm run release` before a commit that changes either JavaScript shortcut, as required by `AGENTS.md`; review the regenerated artifacts, then commit and push.
- Browser fixtures do not establish popup, autoplay, or fullscreen behavior on authenticated live sites.
