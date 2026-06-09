#!/usr/bin/env bash
# PostToolUse safety net: flag the em dash character in files Claude writes.
# Project rule: never use the em dash; use a regular hyphen "-" or rephrase.
set -uo pipefail

input="$(cat)"
file="$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')"

[ -n "$file" ] || exit 0
[ -f "$file" ] || exit 0

# U+2014 EM DASH = bytes E2 80 94. Match as raw bytes (locale-independent).
if LC_ALL=C grep -q $'\xe2\x80\x94' "$file"; then
  count="$(LC_ALL=C grep -c $'\xe2\x80\x94' "$file" 2>/dev/null || true)"
  msg="Em dash detected in ${file} (${count} line(s)). Project rule: replace each with a regular hyphen \"-\" or rephrase, then re-save."
  jq -nc --arg m "$msg" \
    '{systemMessage: $m, hookSpecificOutput: {hookEventName: "PostToolUse", additionalContext: $m}}'
fi
exit 0
