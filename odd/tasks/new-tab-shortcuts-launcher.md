# New-tab shortcuts launcher

## Objective
Add a compact nine-dot launcher in the top-right corner of the new-tab page that reveals icon-only saved shortcuts and a dropdown listing implemented keyboard shortcuts.

## Problem and why
The new-tab page needs a compact way to open saved bookmarks and discover browser keyboard shortcuts without changing the central page layout.

## Scope and constraints
- Reuse the existing bookmark data and persistence; do not introduce a second shortcut store.
- Make the launcher available in both standard and institutional editions.
- Expose only the bookmark data and navigation capability needed by the new-tab page, with sender validation.
- Keep labels and accessible names clear, support keyboard interaction, and preserve the current appearance outside the launcher.
- Show saved destinations as favicon-only tiles with accessible names/tooltips; include an expandable keyboard-shortcut reference based only on shortcuts actually implemented in the browser.
- No remote operations, publishing, or delivery actions.

## Delivery
- Strategy: ask-on-risk (default).
- Forecast: under 400 authored changed lines for the current feature slice; two work units total.
- Route: NT-1 delegated direct (multiple non-trivial files); NT-2 delegated direct (renderer plus integration tests, after mapping keyboard behavior).

## Tasks
- [x] NT-1 — Add the launcher UI and a narrowly scoped, sender-validated bridge to show and open existing bookmarks.
  - Acceptance: the top-right nine-dot control toggles a panel; saved entries open the selected destination; empty state and keyboard/accessibility behavior are handled; both editions work.
  - Checks: add/extend focused deterministic tests and run the focused test command plus applicable project tests.
  - Verification: RED observed before implementation; `node --test test/toolbar-tabs.test.js` passed (2 tests) and `npm test` passed (42 tests), reported by the writer. Parent repeated `node --test test/toolbar-tabs.test.js` successfully (2 tests); `git diff --check` passed.
  - Implementation evidence: sender-validated listing/open handlers only serve the active new-tab page and accept only normalized saved bookmark destinations; UI uses text nodes and handles Escape/arrows.
  - Commit evidence: `2aafc0c` (`feat(new-tab): add shortcuts launcher`).
  - Review outcome: RDD on; assessment from `a25c69e2f28bb2efa673d7d2861c26863271bfdd` returned medium risk, `review_due: false`, reason `under_budget` (196 changed lines).
  - Follow-up commit: `48f6487` (`feat(new-tab): polish shortcut icons and launcher`).
- [ ] NT-2 — Make saved shortcuts icon-only in a compact grid and add a dropdown reference for implemented keyboard shortcuts.
  - Acceptance: shortcut tiles show icons without visible names/URLs while retaining accessible names/tooltips; an initially collapsed, keyboard-accessible dropdown lists only shortcuts confirmed in main/preload/toolbar code; existing navigation and Escape/arrow handling remain intact in both editions.
  - Shortcut inventory from read-only mapping: Ctrl/Cmd+L/T/W/Shift+T/Tab/Shift+Tab/[/]/R/Shift+R/P/D/Shift+B/H, F5/F11/F12, Ctrl/Cmd+1–9, Ctrl/Cmd+plus/minus/0. Group and label actions precisely; do not list contextual bare-arrow controls as global shortcuts.
  - Checks: add focused deterministic Electron integration assertions first and observe RED; run `node --test test/toolbar-tabs.test.js` and `npm test`.
  - Verification: RED observed in both editions because bookmark names/URLs were visible. Writer reports `node --test test/toolbar-tabs.test.js` passed (2 tests) and `npm test` passed (42 tests); parent repeated the focused test successfully (2 tests) and `git diff --check` passed.
  - Implementation evidence: four-column icon-only grid retains accessible bookmark names/tooltips; a collapsed native `<details>` dropdown lists the verified keyboard bindings grouped by action.
  - Commit evidence: pending work-unit commit.
  - Review outcome: pending assessment after commit.
  - Route: delegated direct. Trigger: two UI behaviors/files plus repository-wide keyboard-shortcut mapping; writer owns implementation and test preparation.

## Next step
Complete NT-2 with focused tests, update this file and its Engram mirror, create the authorized work-unit commit, and assess the committed slice under RDD.
