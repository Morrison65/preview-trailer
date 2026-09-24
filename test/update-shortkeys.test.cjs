const test = require('node:test');
const assert = require('node:assert/strict');
const {normalizeShortcuts, deleteExistingShortcuts, replaceShortcuts, readLogs, appendLog, clearLogs} = require('../update-shortkeys-from-github.js');

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

test('GitHub updates replace the complete shortcut list in sync and local storage', async () => {
    const syncWrites = [];
    const syncRemovals = [];
    const localWrites = [];
    const storage = {
        sync: {
            set: async value => syncWrites.push(value),
            remove: async value => syncRemovals.push(value),
        },
        local: {set: async value => localWrites.push(value)},
    };
    const json = JSON.stringify([{key:'ctrl+new', action:'javascript', code:'new'}]);
    const area = await replaceShortcuts(storage, json);
    assert.equal(area, 'sync');
    assert.equal(syncWrites[0].keys_0, json);
    assert.equal(localWrites[0].keys, json);
    assert.ok(syncRemovals[0].includes('keys'));
    assert.ok(syncRemovals[0].includes('keys_1'));
});

test('GitHub import deletes and verifies existing sync and local shortcuts first', async () => {
    const operations = [];
    const storage = {
        sync: {
            remove: async keys => operations.push(['sync-remove', keys]),
            get: async keys => { operations.push(['sync-get', keys]); return {}; },
        },
        local: {
            remove: async keys => operations.push(['local-remove', keys]),
            get: async keys => { operations.push(['local-get', keys]); return {}; },
        },
    };
    await deleteExistingShortcuts(storage);
    assert.deepEqual(operations.map(operation => operation[0]), ['sync-remove', 'sync-get', 'local-remove', 'local-get']);
});

test('updater logs persist in localStorage and can be cleared', () => {
    const originalStorage = global.localStorage;
    const values = new Map();
    global.localStorage = {
        getItem: key => values.get(key) ?? null,
        setItem: (key, value) => values.set(key, value),
        removeItem: key => values.delete(key),
    };
    try {
        clearLogs();
        appendLog('test event', {count:1});
        assert.equal(readLogs().length, 1);
        assert.deepEqual(readLogs()[0].details, {count:1});
        clearLogs();
        assert.deepEqual(readLogs(), []);
    } finally { global.localStorage = originalStorage; }
});
