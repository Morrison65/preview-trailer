# Agent Release Instructions

Before every commit or release that changes either JavaScript shortcut, run:

```powershell
npm run release
```

This runs the full test suite and rebuilds:

- `shortkeys.json`
- `Importurl.txt`
- `preview-trailer.bookmarklet.txt`

The `code` fields in `shortkeys.json` are generated from `lagacy-preview.js` and `preview-trailer.js`. Do not edit those fields by hand. `Importurl.txt` contains `https://shortkeys.app/share#` followed by the UTF-8 Base64 encoding of the compact JSON export. Review all generated artifacts before committing.
