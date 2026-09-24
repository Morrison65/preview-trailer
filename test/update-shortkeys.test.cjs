const test = require('node:test');
const assert = require('node:assert/strict');
const {normalizeShortcuts} = require('../update-shortkeys-from-github.js');

test('GitHub shortcut updates use Shortkeys normalization rules', () => {
    const shortcuts = normalizeShortcuts([
        {key:'ctrl+x', action:'javascript', code:'', sites:'example.test\nlocalhost'},
        {key:'', action:'', label:'empty'},
    ]);
    assert.equal(shortcuts.length, 1);
    assert.equal(typeof shortcuts[0].id, 'string');
    assert.ok(shortcuts[0].id.length > 0);
    assert.equal(shortcuts[0].enabled, true);
    assert.deepEqual(shortcuts[0].sitesArray, ['example.test', 'localhost']);
});

test('GitHub shortcut updates reject invalid or empty exports', () => {
    assert.throws(() => normalizeShortcuts({}), /must contain an array/);
    assert.throws(() => normalizeShortcuts([{label:'empty'}]), /no usable shortcuts/);
});
