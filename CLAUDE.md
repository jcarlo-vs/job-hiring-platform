@AGENTS.md

## Writing style rules

- Never use the em dash character (Unicode U+2014, the long dash) anywhere in
  output: chat replies, code, comments, markdown, commit messages, and file
  content. It reads as obviously AI-written.
- Replace each em dash with a regular hyphen "-". If a hyphen does not read
  well, rephrase the sentence or remove the punctuation instead.
- The same applies to the en dash (Unicode U+2013) used as punctuation: prefer
  a hyphen or rephrase. A hyphen in a numeric range like "3-5" is fine.
- A PostToolUse hook (.claude/hooks/check-em-dash.sh) flags these characters in
  files as a safety net; treat any such flag as a required fix.
