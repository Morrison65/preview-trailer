/* global module */
/* Update Shortkeys from the repository export. Run in the Shortkeys options page. */
(function (global) {
    'use strict';

    const SOURCE_URL = 'https://raw.githubusercontent.com/Morrison65/preview-trailer/refs/heads/main/shortkeys.json';
    const SYNC_QUOTA = 102400;
    const SYNC_CHUNK_SIZE = 7000;
    const SYNC_CHUNK_PREFIX = 'keys_';
    const SYNC_META_KEY = 'keys_meta';
    const MAX_CHUNKS = 15;

    function log(message, details) {
        const output = global.console;
        if (!output?.info) return;
        details === undefined ? output.info(`[Shortkeys updater] ${message}`) : output.info(`[Shortkeys updater] ${message}`, details);
    }

    function fail(message) {
        throw new Error(`[Shortkeys updater] ${message}`);
    }

    function randomId() {
        if (global.crypto?.randomUUID) return global.crypto.randomUUID();
        return 'shortkeys-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }

    function normalizeShortcuts(value) {
        if (!Array.isArray(value)) fail('GitHub JSON must contain an array of shortcuts.');
        const shortcuts = value.filter(shortcut => shortcut && (shortcut.key || shortcut.action)).map(shortcut => {
            const normalized = {...shortcut};
            if (!normalized.id) normalized.id = randomId();
            if (normalized.enabled === undefined) normalized.enabled = true;
            normalized.sites = normalized.sites || '';
            normalized.sitesArray = normalized.sites.split('\n');
            return normalized;
        });
        if (!shortcuts.length) fail('GitHub JSON contains no usable shortcuts.');
        return shortcuts;
    }

    function byteSize(value) {
        return new global.TextEncoder().encode(value).length;
    }

    async function storageCall(area, methodName, ...args) {
        const method = methodName === 'get' ? area?.get
            : methodName === 'set' ? area?.set
                : methodName === 'remove' ? area?.remove : null;
        if (typeof method !== 'function') fail(`Storage method ${methodName} is unavailable.`);
        return new Promise((resolve, reject) => {
            let settled = false;
            const finish = (callback, value) => {
                if (settled) return;
                settled = true;
                callback(value);
            };
            const callback = value => {
                const error = global.chrome?.runtime?.lastError;
                if (error) finish(reject, new Error(error.message));
                else finish(resolve, value);
            };
            try {
                const result = global.browser
                    ? method.call(area, ...args)
                    : method.call(area, ...args, callback);
                if (result?.then) result.then(value => finish(resolve, value), error => finish(reject, error));
            } catch (error) {
                finish(reject, error);
            }
        });
    }

    function getStorageApi() {
        const api = global.browser || global.chrome;
        if (!api?.storage?.local) fail('Run this script in the Shortkeys extension options page.');
        return api.storage;
    }

    async function clearSyncData(sync) {
        if (!sync) return;
        const keys = ['keys', SYNC_META_KEY];
        for (let index = 0; index < MAX_CHUNKS; index++) keys.push(`${SYNC_CHUNK_PREFIX}${index}`);
        try { await storageCall(sync, 'remove', keys); } catch (error) { log('Could not clear old sync data', error.message); }
    }

    async function saveToSync(sync, json) {
        const chunks = [];
        for (let index = 0; index < json.length; index += SYNC_CHUNK_SIZE) {
            chunks.push(json.slice(index, index + SYNC_CHUNK_SIZE));
        }
        if (chunks.length > MAX_CHUNKS) fail('Shortcut export is too large for Shortkeys sync storage.');
        const entries = [['keys_meta', chunks.length]];
        chunks.forEach((chunk, index) => entries.push([`${SYNC_CHUNK_PREFIX}${index}`, chunk]));
        const payload = Object.fromEntries(entries);
        await storageCall(sync, 'set', payload);
        const staleKeys = ['keys'];
        for (let index = chunks.length; index < MAX_CHUNKS; index++) staleKeys.push(`${SYNC_CHUNK_PREFIX}${index}`);
        try { await storageCall(sync, 'remove', staleKeys); } catch (error) { log('Could not remove stale sync chunks', error.message); }
    }

    async function replaceShortcuts(storage, json) {
        const sync = storage.sync;
        if (sync && byteSize(json) < SYNC_QUOTA - 2048) {
            try {
                await saveToSync(sync, json);
                await storageCall(storage.local, 'set', {keys: json});
                return 'sync';
            } catch (error) {
                log('Sync save failed; falling back to local storage', error.message);
            }
        }
        await clearSyncData(sync);
        await storageCall(storage.local, 'set', {keys: json});
        return 'local';
    }

    async function updateShortkeysFromGithub() {
        log('Fetching shortcut export', {url: SOURCE_URL});
        const response = await global.fetch(SOURCE_URL, {cache: 'no-store'});
        if (!response.ok) fail(`GitHub returned HTTP ${response.status}.`);
        const shortcuts = normalizeShortcuts(await response.json());
        const json = JSON.stringify(shortcuts);
        const area = await replaceShortcuts(getStorageApi(), json);
        log('Shortcuts replaced', {count: shortcuts.length, area, bytes: byteSize(json)});
        return {count: shortcuts.length, area, json};
    }

    const api = {SOURCE_URL, normalizeShortcuts, replaceShortcuts, updateShortkeysFromGithub};
    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    } else {
        global.updateShortkeysFromGithub = updateShortkeysFromGithub;
        updateShortkeysFromGithub().catch(error => global.console?.error(error.message));
    }
})(globalThis);
