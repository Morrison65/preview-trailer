const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const {spawn, spawnSync} = require('node:child_process');
const root = path.join(__dirname, '..');
const browser = process.env.CHROME_PATH || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].find(file => fs.existsSync(file));
if (!browser) throw new Error('Set CHROME_PATH to a Chrome/Edge executable.');
const generated = spawnSync('ffmpeg', ['-v','error','-f','lavfi','-i','color=c=blue:s=160x90:r=10',
    '-t','0.5','-an','-c:v','libvpx','-f','webm','pipe:1'], {windowsHide:true});
if (generated.status !== 0) throw new Error('FFmpeg with libvpx is required for the real playback fixture.');
const source = fs.readFileSync(path.join(root, 'preview-trailer.js'));
const suite = fs.readFileSync(path.join(__dirname, 'browser-suite.js'));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'preview-trailer-test-'));
let child;
let timeout;
let finish;
const result = new Promise(resolve => { finish = resolve; });
const server = http.createServer((req, res) => {
    if (req.url === '/result' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => { res.end('ok'); finish(JSON.parse(body)); });
    } else if (req.url === '/preview-trailer.js') {
        res.setHeader('Content-Type', 'text/javascript'); res.end(source);
    } else if (req.url === '/suite.js') {
        res.setHeader('Content-Type', 'text/javascript'); res.end(suite);
    } else if (req.url === '/fixture.webm') {
        res.setHeader('Content-Type', 'video/webm'); res.end(generated.stdout);
    } else {
        res.setHeader('Content-Type', 'text/html');
        res.end('<!doctype html><meta charset="utf-8"><title>Preview Trailer checks</title>'
            + '<div id="fixture"></div><pre id="result">Running</pre>'
            + '<script>window.PreviewTrailerOptions={autoRun:false};</script>'
            + '<script src="/preview-trailer.js"></script><script src="/suite.js"></script>');
    }
});
(async () => {
    try {
        await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
        child = spawn(browser, ['--headless=new','--no-first-run','--no-default-browser-check',
            '--disable-popup-blocking','--autoplay-policy=no-user-gesture-required',
            `--user-data-dir=${profile}`, `http://127.0.0.1:${server.address().port}/`],
        {windowsHide:true, stdio:'ignore'});
        child.on('error', error => finish({error:error.message}));
        child.on('exit', code => finish({error:`Browser exited before reporting: ${code}`}));
        timeout = setTimeout(() => finish({error:'Browser checks timed out after 25 seconds.'}), 25000);
        const report = await result;
        console.log(JSON.stringify(report, null, 2));
        if (report.error || report.failed?.length) process.exitCode = 1;
    } finally {
        clearTimeout(timeout);
        child?.kill();
        server.closeAllConnections();
        server.close();
        // Only remove our dedicated temporary profile, after Chrome exits.
        if (child && child.exitCode === null) await new Promise(resolve => {
            child.once('exit', resolve); setTimeout(resolve, 2000).unref();
        });
        const resolvedProfile = path.resolve(profile);
        if (path.dirname(resolvedProfile) !== path.resolve(os.tmpdir())
            || !path.basename(resolvedProfile).startsWith('preview-trailer-test-')) {
            throw new Error('Refusing to remove a profile outside the dedicated test directory.');
        }
        try { fs.rmSync(resolvedProfile, {recursive:true, force:true, maxRetries:3, retryDelay:100}); }
        catch { console.warn('Chrome profile still in use:', profile); }
    }
})();
