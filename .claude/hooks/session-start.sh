#!/bin/bash
# Claude Code cloud sessions: point the browser test at the container's
# Chromium and check FFmpeg. There are no npm dependencies. Local sessions are left alone.
set -euo pipefail
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
    exit 0
fi
echo "export CHROME_PATH=\"$CLAUDE_PROJECT_DIR/.devcontainer/chrome-headless.sh\"" >> "$CLAUDE_ENV_FILE"
if ! command -v ffmpeg >/dev/null 2>&1; then
    echo 'FFmpeg with libvpx is missing; npm run check / npm run release cannot run the browser test.'
fi
