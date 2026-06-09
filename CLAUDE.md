@AGENTS.md

## Writing style rules

- Never use the em dash character ("—", U+2014) anywhere in output: chat replies,
  code, comments, markdown, commit messages, and file content. It reads as
  obviously AI-written.
- Replace each em dash with a regular hyphen "-". If a hyphen does not read
  well, rephrase the sentence or remove the punctuation instead.
- This also applies to the en dash "–" used as punctuation; prefer a hyphen or
  rephrase. (A hyphen in numeric ranges like "3-5" is fine.)
- A PostToolUse hook (.claude/hooks/check-em-dash.sh) flags em dashes in files
  as a safety net; treat any such flag as a required fix.
