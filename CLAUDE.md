# Preview Trailer

This repository maintains a standalone browser script and bookmarklet that opens the preview associated with the hovered or focused card in a separate looping player. It is an independent project in the `docker-stuff` workspace.

@AGENTS.md

## Project map

- `preview-trailer.js` is the maintained implementation; `lagacy-preview.js` is a historical behavioral reference.
- `shortkeys.json`, `Importurl.txt`, and `preview-trailer.bookmarklet.txt` are generated or synchronized artifacts. Follow the build and release procedure in `AGENTS.md` and the README rather than editing generated shortcut code by hand.
- Local Stash scene support is a browser integration only. Stash deployment and configuration belong to `docker-workspace` and `stash/config`.

## Validation

- Run `npm run check` for behavior changes.
- Run `npm run release` before a commit that changes either JavaScript shortcut, as required by `AGENTS.md`.
- Browser fixtures do not establish popup, autoplay, or fullscreen behavior on authenticated live sites.
