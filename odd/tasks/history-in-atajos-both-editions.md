# Add History to Atajos in both editions

## Objective
Expose the existing History page from the Atajos panel and make local browsing history available in both personal and institutional editions.

## Problem and why
The Atajos panel lacks a History action, while history recording and the History page are currently restricted to institutional mode. The user explicitly requested History in both editions.

## Scope and constraints
- Reuse the existing History page, history data model, and four-month/10,000-entry normalization policy.
- Persist history locally in the existing user-data history file for personal and institutional editions.
- Expose a History option in the Atajos panel in both editions; opening it creates a dedicated browser tab.
- Make the existing Ctrl/Cmd+H history action work in both editions, consistent with the keyboard reference.
- Keep history IPC scoped to the active History page; do not return browsing history to unrelated pages.
- Exclude the History page and restricted pages from history recording as today.
- No remote operations, publishing, or delivery actions.

## Delivery
- Strategy: ask-on-risk (default).
- Forecast: approximately 160 authored changed lines, below the ~400-line delivery budget.
- Route: delegated direct. Trigger: main-process recording/loading/IPC, Atajos action, and both-edition integration coverage.
- User decision: History is requested in both editions, including personal-mode recording and persistence.

## Tasks
- [x] HI-1 — Add a History action to Atajos and enable local history in both editions.
  - Acceptance: the Atajos History action opens the existing History page in a dedicated tab in both editions; personal and institutional navigation is recorded and persists across app startup; the existing retention/normalization policy applies; Ctrl/Cmd+H opens History in either edition; only the active History page can request entries.
  - Checks: add integration coverage first and observe RED for both editions, History panel action, keyboard action, returned history entries, persistence, and unauthorized IPC; run `node --test test/toolbar-tabs.test.js` and `npm test`.
  - Verification: RED observed in both editions because the Atajos panel did not expose “Historial”. Final `node --test test/toolbar-tabs.test.js` passed (2/2) and `npm test` passed (42/42); `git diff --check` passed. Tests verify seeded history loads in both editions, the Atajos action and Ctrl/Cmd+H open a dedicated tab, unrelated renderers cannot read entries, and a new visit is persisted locally in both editions. One intermediate parent spot-check failed once at a native-focus assertion in the personal case; a verifier run and the final full suite passed, so the cause remains indeterminate.
  - Implementation evidence: generalized history load/save/show routines to both editions; history recording still uses existing exclusions and normalization; `browser:get-history` requires the active tab to be the History page; Atajos links to History in a dedicated tab.
  - Commit evidence: pending work-unit commit.
  - Review outcome: pending committed assessment against the last reviewed boundary.
  - Route: delegated direct. Trigger: history persistence and route changes span main process, renderer, and integration coverage.

## Next step
Record the HI-1 work-unit commit and committed assessment, then close this feature task.
