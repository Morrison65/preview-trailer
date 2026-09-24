const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'preview-trailer.js'), 'utf8');
// Percent encoding preserves comments/newlines without requiring a minifier.
const bookmarklet = 'javascript:' + encodeURIComponent(source) + '\n';
fs.writeFileSync(path.join(root, 'preview-trailer.bookmarklet.txt'), bookmarklet);
console.log('Built preview-trailer.bookmarklet.txt');
