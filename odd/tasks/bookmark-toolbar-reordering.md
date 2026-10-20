# Reorder saved bookmarks in the toolbar

## Objective
Let users reorder saved bookmarks directly in the top toolbar, persist that order, and keep the behavior available to keyboard users.

## Problem and why
Saved bookmarks are ordered in the toolbar, but users currently cannot change that order after adding them.

## Scope and constraints
- Reorder the existing saved-bookmark array; do not add a second order/store.
- Support pointer drag-and-drop and an accessible keyboard alternative.
- Validate reorder requests against the current saved bookmark URLs before mutating or persisting.
- Preserve click-to-open, bookmark add/remove, user-visible URLs, and the Atajos first-nine ordering/cap.
- Support personal and institutional editions.
- No remote operations, publishing, or delivery actions.

## Delivery
- Strategy: ask-on-risk (default).
- Forecast: approximately 140 authored changed lines, below the ~400-line delivery budget.
- Route: delegated direct. Trigger: renderer interaction, preload IPC, main-process validation/persistence, and cross-edition integration coverage.
- Prior working-tree changes for hiding local-page URLs are authorized and must be preserved.

## Tasks
- [x] BM-1 — Add persistent drag-and-drop and keyboard reordering for toolbar bookmarks.
  - Acceptance: users can move a bookmark before/after another bookmark with drag-and-drop and reorder a focused bookmark with an announced keyboard affordance; the main process validates requested bookmark identities, persists the new order, and refreshes toolbar state; all pages and Atajos reflect the same full ordering while its nine-item display cap remains unchanged.
  - Checks: add integration coverage first and observe RED for both editions, drag and keyboard moves, persisted order after reload/reload state, invalid reorder requests, and unchanged bookmark navigation; run `node --test test/toolbar-tabs.test.js` and `npm test`.
  - Verification: RED observed in both editions because bookmark drag left the stored order unchanged. After implementation, writer reports focused tests passed (2/2) and `npm test` passed (42/42); parent repeated `node --test test/toolbar-tabs.test.js` successfully (2/2), and `git diff --check` passed.
  - Implementation evidence: renderer supports before/after drag targets and Alt+ArrowLeft/Right keyboard moves with live announcements and focus restoration; main process validates canonical saved URLs, persists the existing bookmark array, and notifies state. Tests cover both editions, persistence, malformed/identical/missing identities, ordering, and append behavior.
  - Commit evidence: pending work-unit commit.
  - Review outcome: pending committed assessment against the previous reviewed boundary.
  - Route: delegated direct. Trigger: behavior crosses renderer, preload, main-process persistence, and integration tests.

## Next step
Record the BM-1 commit and committed assessment, then close this feature task.
