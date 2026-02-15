#!/bin/bash
# browser-use v0.3.0 is missing system prompt .md files in the npm dist.
# This script downloads them from the source repo.
set -e

BU_AGENT=$(find node_modules/.pnpm -path "*/browser-use@*/dist/agent" -type d 2>/dev/null | head -1)
if [ -z "$BU_AGENT" ]; then
  echo "browser-use not found in node_modules, skipping prompt fix"
  exit 0
fi

if [ -f "$BU_AGENT/system_prompt.md" ]; then
  exit 0  # Already patched
fi

echo "Patching browser-use: downloading missing system prompt templates..."
BASE="https://raw.githubusercontent.com/webllm/browser-use/main/src/agent"
for f in system_prompt.md system_prompt_no_thinking.md system_prompt_flash.md system_prompt_flash_anthropic.md system_prompt_anthropic_flash.md system_prompt_browser_use.md system_prompt_browser_use_no_thinking.md system_prompt_browser_use_flash.md; do
  curl -sL "$BASE/$f" -o "$BU_AGENT/$f" 2>/dev/null || true
done
echo "browser-use prompt templates patched."
