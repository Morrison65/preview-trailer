const fs = require('node:fs');
const {Buffer} = require('node:buffer');
const process = require('node:process');
const source = fs.readFileSync('preview-trailer.js', 'utf8');
// Keep the standard arrow-IIFE bookmarklet shape while retaining the standalone source.
const bookmarklet = `javascript:(()=>{\n${source}\n})()`;
fs.writeFileSync('preview-trailer.bookmarklet.txt', bookmarklet);


function getSnippet(url = "") {
    return "(async () => {    const url =        '" + url + "';    const response = await fetch(url, {        cache: 'no-store'    });    if (!response.ok) {        throw new Error(            `Failed to load updater: HTTP ${response.status}`        );    }    const code = await response.text();    console.log(        `Loaded ${code.length} bytes from GitHub`    );    (0, eval)(        `${code}\n//# sourceURL=update-shortkeys-from-github.js`    );})();"
}

function getCodeForFilename(filename){
    return getSnippet("https://raw.githubusercontent.com/Morrison65/preview-trailer/refs/heads/main/"+filename);

}

const shortkeysPath = 'shortkeys.json';
const shortkeys = JSON.parse(fs.readFileSync(shortkeysPath, 'utf8'));
if (!Array.isArray(shortkeys) || shortkeys.length !== 3) {
	throw new Error('shortkeys.json must contain the legacy, current, and updater shortcuts.');
}
const legacy = shortkeys.find(shortcut => shortcut.id === '043b4e25-1841-41bd-8c6b-3ad258c8abea');
const current = shortkeys.find(shortcut => shortcut.id === '2aecae29-6d26-4ff8-874a-140b804ccfdc');
const updater = shortkeys.find(shortcut => shortcut.id === 'b73617bb-9758-4b74-a643-5fd2299733de');
if (!legacy || !current || !updater) throw new Error('shortkeys.json is missing a known shortcut id.');
legacy.code = getCodeForFilename('lagacy-preview.js');
current.code = getCodeForFilename('preview-trailer.js');
updater.code = getCodeForFilename('update-shortkeys-from-github.js');
const syncedJson = JSON.stringify(shortkeys, null, 2) + '\n';
fs.writeFileSync(shortkeysPath, syncedJson);

const importPayload = Buffer.from(JSON.stringify(shortkeys), 'utf8').toString('base64');
fs.writeFileSync('Importurl.txt', `https://shortkeys.app/share#${importPayload}`);
process.stdout.write('Built preview-trailer.bookmarklet.txt, shortkeys.json, and Importurl.txt\n');
