const test = require('node:test');
const assert = require('node:assert/strict');
const {mediaUrl, sourceOf, SITE_ADAPTERS, describeUrl, createLogger} = require('../preview-trailer.js');
const base = 'https://example.test/clips/42';

test('relative, protocol-relative, signed and uppercase media URLs', () => {
    assert.equal(mediaUrl('../trailer.MP4?token=x#t=2', base), 'https://example.test/trailer.MP4?token=x#t=2');
    assert.equal(mediaUrl('//cdn.test/a.webm', base), 'https://cdn.test/a.webm');
    assert.equal(mediaUrl('/scene/123/preview', base), 'https://example.test/scene/123/preview');
});
test('reject empty, non-string, images, credentials and executable schemes', () => {
    for (const value of [null, undefined, {}, [], '', ' ', '/poster.jpg', 'javascript:alert(1)', 'data:video/mp4;base64,AAAA', 'https://user:pass@cdn.test/a.mp4']) {
        assert.equal(mediaUrl(value, base), null);
    }
    assert.equal(mediaUrl('javascript:alert(1)', base, true), null);
});
test('extensionless endpoints need an explicit media context', () => {
    assert.equal(mediaUrl('/preview?id=3', base), null);
    assert.equal(mediaUrl('/preview?id=3', base, true), 'https://example.test/preview?id=3');
});
test('empty src does not hide lazy preview; poster does not mask video attribute', () => {
    const element = attributes => ({tagName:'IMG', getAttribute:name => attributes[name] ?? null});
    assert.equal(sourceOf(element({src:'', 'data-src':'/lazy.mp4'}), base), 'https://example.test/lazy.mp4');
    assert.equal(sourceOf(element({src:'/poster.jpg', 'data-preview-src':'/preview.mp4'}), base), 'https://example.test/preview.mp4');
    assert.equal(sourceOf(null, base), null);
});
test('site adapters are extensible and identify AdultTime trailers', () => {
    const adultTime = SITE_ADAPTERS.find(adapter => adapter.name === 'adulttime');
    assert.ok(adultTime);
    assert.equal(adultTime.matches(new URL('https://members.adulttime.com/en/videos/')), true);
    assert.equal(adultTime.matches(new URL('https://adulttime.com/en/videos/')), true);
    assert.equal(adultTime.matches(new URL('https://adulttime.com.attacker.test/')), false);
    assert.equal(adultTime.isPreviewUrl('https://videothumb.gammacdn.com/500x281/288813.mp4'), true);
    assert.equal(adultTime.isPreviewUrl('https://streaming-hls.gammacdn.com/fame/video.m3u8'), false);
});
test('standalone diagnostics are quiet by default and redact URL credentials', () => {
    const calls = [];
    const consoleLike = {debug: (...args) => calls.push(['debug', ...args]), info: (...args) => calls.push(['info', ...args])};
    createLogger({}, consoleLike).debug('hidden');
    createLogger({debug:true}, consoleLike).info('preview', {preview: describeUrl('https://cdn.test/trailer.mp4?Policy=secret')});
    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0], ['info', '[Preview Trailer] preview', {preview:'https://cdn.test/trailer.mp4'}]);
});
