# Agent Release Instructions

When the requested work is complete and all tests pass, agents must run `npm run release`, review the generated artifacts, create the commit, and push it to the configured remote. Keep this order: tests, release build, artifact review, commit, then push. Do not commit or push while tests are failing.

The optional `update-shortkeys-from-github.js` script is for the Shortkeys options page. It fetches the published `shortkeys.json` and updates Shortkeys storage; it is not a Node CLI and must not be run on an ordinary website.

Before every commit or release that changes either JavaScript shortcut, run:

```powershell
npm run release
```

This runs the full test suite and rebuilds:

- `shortkeys.json`
- `Importurl.txt`
- `preview-trailer.bookmarklet.txt`

The `code` fields in `shortkeys.json` are generated from `lagacy-preview.js` and `preview-trailer.js`. Do not edit those fields by hand. `Importurl.txt` contains `https://shortkeys.app/share#` followed by the UTF-8 Base64 encoding of the compact JSON export. Review all generated artifacts before committing.
