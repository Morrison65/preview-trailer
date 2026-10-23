#!/bin/sh
# CHROME_PATH target for the headless browser tests on Linux (dev containers,
# Claude Code cloud sessions, GitHub-hosted runners). Containers have no usable
# Chrome sandbox, so it is disabled here; the tests only load local fixtures.
for candidate in "${CHROMIUM_BIN:-}" /usr/bin/chromium /usr/bin/chromium-browser /usr/bin/google-chrome \
    /opt/pw-browsers/chromium-*/chrome-linux/chrome; do
    if [ -n "$candidate" ] && [ -x "$candidate" ]; then
        exec "$candidate" --no-sandbox "$@"
    fi
done
echo 'chrome-headless.sh: no Chromium found; install chromium or set CHROMIUM_BIN.' >&2
exit 127
