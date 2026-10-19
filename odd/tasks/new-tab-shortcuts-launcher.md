# New-tab shortcuts launcher

## Objective
Add a nine-dot launcher in the top-right corner of the new-tab page that reveals and opens the browser's existing saved shortcuts.

## Problem and why
The new-tab page currently has no direct access to saved bookmarks/shortcuts. A compact launcher makes these destinations available without changing the page's central layout.

## Scope and constraints
- Reuse the existing bookmark data and persistence; do not introduce a second shortcut store.
- Make the launcher available in both standard and institutional editions.
- Expose only the bookmark data and navigation capability needed by the new-tab page, with sender validation.
- Keep labels and accessible names clear, support keyboard interaction, and preserve the current appearance outside the launcher.
- No remote operations, publishing, or delivery actions.

## Delivery
- Strategy: ask-on-risk (default).
- Forecast: under 400 authored changed lines; one work unit.
- Route: delegated direct. Trigger: implementation spans multiple non-trivial files and needs test-first inspection of the renderer/preload/main IPC boundary.

## Tasks
- [x] NT-1 — Add the launcher UI and a narrowly scoped, sender-validated bridge to show and open existing bookmarks.
  - Acceptance: the top-right nine-dot control toggles a panel; saved entries open the selected destination; empty state and keyboard/accessibility behavior are handled; both editions work.
  - Checks: add/extend focused deterministic tests and run the focused test command plus applicable project tests.
  - Verification: RED observed before implementation; `node --test test/toolbar-tabs.test.js` passed (2 tests) and `npm test` passed (42 tests), reported by the writer. Parent repeated `node --test test/toolbar-tabs.test.js` successfully (2 tests); `git diff --check` passed.
  - Implementation evidence: sender-validated listing/open handlers only serve the active new-tab page and accept only normalized saved bookmark destinations; UI uses text nodes and handles Escape/arrows.
  - Commit evidence: `2aafc0c` (`feat(new-tab): add shortcuts launcher`).
  - Review outcome: RDD on; `gentle-ai review assess --cwd . --agent opencode --base-ref a25c69e2f28bb2efa673d7d2861c26863271bfdd --committed-only --json` returned medium risk, `review_due: false`, reason `under_budget` (146 changed lines).

## Next step
Feature task is complete. No further implementation is pending.
