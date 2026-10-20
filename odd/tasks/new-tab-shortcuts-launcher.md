# New-tab shortcuts launcher

## Objective
Add a compact nine-dot launcher in the top-right corner of the new-tab page that reveals the first nine icon-only saved shortcuts, clearly labeled as “Atajos,” implemented keyboard shortcuts, and intuitive panel dismissal and scrolling.

## Problem and why
The new-tab page needs a compact way to open saved bookmarks, discover browser keyboard shortcuts, and interact with a long panel without awkward dismissal or scrollbar styling.

## Scope and constraints
- Reuse the existing bookmark data and persistence; do not introduce a second shortcut store.
- Make the launcher available in both standard and institutional editions.
- Expose only the bookmark data and navigation capability needed by the new-tab page, with sender validation.
- Keep labels and accessible names clear, support keyboard interaction, and preserve the current appearance outside the launcher.
- Show saved destinations as favicon-only tiles with accessible names/tooltips; include an expandable keyboard-shortcut reference based only on shortcuts actually implemented in the browser.
- Close the panel on outside pointer interaction while keeping clicks inside the panel and its launcher behavior intact; visually integrate, but do not hide, the panel scrollbar.
- Label the interface in Spanish (“Atajos”) and show up to the first nine saved bookmarks in their existing bookmarks-bar order; show all available entries when fewer than nine exist.
- No remote operations, publishing, or delivery actions.

## Delivery
- Strategy: ask-on-risk (default).
- Forecast: approximately 430 authored changed lines across four work units, crossing the ~400-line delivery budget.
- Chain strategy: `stacked-to-main` (user-selected before the NT-4 commit).
- Route: NT-1 delegated direct (multiple non-trivial files); NT-2 delegated direct (renderer plus integration tests, after mapping keyboard behavior); NT-3 delegated direct (outside-click behavior, scrollbar styling, and integration tests); NT-4 delegated direct (main bookmark ordering, renderer display, and integration tests).

## Tasks
- [x] NT-1 — Add the launcher UI and a narrowly scoped, sender-validated bridge to show and open existing bookmarks.
  - Acceptance: the top-right nine-dot control toggles a panel; saved entries open the selected destination; empty state and keyboard/accessibility behavior are handled; both editions work.
  - Checks: add/extend focused deterministic tests and run the focused test command plus applicable project tests.
  - Verification: RED observed before implementation; `node --test test/toolbar-tabs.test.js` passed (2 tests) and `npm test` passed (42 tests), reported by the writer. Parent repeated `node --test test/toolbar-tabs.test.js` successfully (2 tests); `git diff --check` passed.
  - Implementation evidence: sender-validated listing/open handlers only serve the active new-tab page and accept only normalized saved bookmark destinations; UI uses text nodes and handles Escape/arrows.
  - Commit evidence: `2aafc0c` (`feat(new-tab): add shortcuts launcher`).
  - Review outcome: RDD on; assessment from `a25c69e2f28bb2efa673d7d2861c26863271bfdd` returned medium risk, `review_due: false`, reason `under_budget` (196 changed lines).
  - Follow-up commit: `48f6487` (`feat(new-tab): polish shortcut icons and launcher`).
- [x] NT-2 — Make saved shortcuts icon-only in a compact grid and add a dropdown reference for implemented keyboard shortcuts.
  - Acceptance: shortcut tiles show icons without visible names/URLs while retaining accessible names/tooltips; an initially collapsed, keyboard-accessible dropdown lists only shortcuts confirmed in main/preload/toolbar code; existing navigation and Escape/arrow handling remain intact in both editions.
  - Shortcut inventory from read-only mapping: Ctrl/Cmd+L/T/W/Shift+T/Tab/Shift+Tab/[/]/R/Shift+R/P/D/Shift+B/H, F5/F11/F12, Ctrl/Cmd+1–9, Ctrl/Cmd+plus/minus/0. Group and label actions precisely; do not list contextual bare-arrow controls as global shortcuts.
  - Checks: add focused deterministic Electron integration assertions first and observe RED; run `node --test test/toolbar-tabs.test.js` and `npm test`.
  - Verification: RED observed in both editions because bookmark names/URLs were visible. Writer reports `node --test test/toolbar-tabs.test.js` passed (2 tests) and `npm test` passed (42 tests); parent repeated the focused test successfully (2 tests) and `git diff --check` passed.
  - Implementation evidence: four-column icon-only grid retains accessible bookmark names/tooltips; a collapsed native `<details>` dropdown lists the verified keyboard bindings grouped by action.
  - Commit evidence: `dcc4167` (`feat(new-tab): add keyboard shortcuts dropdown`).
  - Review outcome: RDD on; assessment from `a25c69e2f28bb2efa673d7d2861c26863271bfdd` returned medium risk, `review_due: false`, reason `under_budget` (285 changed lines).
  - Route: delegated direct. Trigger: two UI behaviors/files plus repository-wide keyboard-shortcut mapping; writer owns implementation and test preparation.
- [x] NT-3 — Close the panel when clicking outside and style its scrollbar to blend with the panel.
  - Acceptance: clicking outside the panel dismisses it and resets `aria-expanded`; interactions inside the panel work normally; the scrollbar remains usable and keyboard accessible while its track/thumb visually match the dark panel in both editions.
  - Checks: add focused Electron integration assertions first and observe RED; run `node --test test/toolbar-tabs.test.js` and `npm test`.
  - Verification: RED observed in both editions for outside dismissal. Writer reports focused tests passed (2 tests) and `npm test` passed (42 tests); parent repeated the focused tests successfully (2 tests), `git diff --check` passed, and the pre-commit medium-risk assessment returned `review_due: false`, `under_budget` (74 changed lines).
  - Implementation evidence: outside pointer presses close and reset `aria-expanded` without stealing focus; panel-internal actions remain open; Escape restores launcher focus; Chromium and Firefox scrollbar styles keep scrolling visible and integrated.
  - Commit evidence: `a5fa9e4` (`feat(new-tab): dismiss shortcuts panel on outside click`).
  - Review outcome: RDD on; assessment from `a25c69e2f28bb2efa673d7d2861c26863271bfdd` returned medium risk, `review_due: false`, reason `under_budget` (340 changed lines).
  - Route: delegated direct. Trigger: implementation spans renderer behavior and styles plus integration coverage.
- [ ] NT-4 — Localize the panel as “Atajos,” show up to the first nine favorites, and append newly added bookmarks.
  - Acceptance: all visible “Shortcuts” labels and related accessible names are Spanish; the panel shows the first nine saved bookmarks in bookmarks-bar order, or all entries if fewer than nine exist; newly added bookmarks are appended to the end without reordering existing entries; outside-dismissal, keyboard reference, and icon-only behavior remain intact.
  - Checks: add deterministic integration coverage for more than nine entries, fewer than nine entries, and adding a bookmark at the end; verify order and localized labels, then run `node --test test/toolbar-tabs.test.js` and `npm test`.
  - Verification: RED observed in both editions because a new bookmark appeared first. Writer reports `node --test test/toolbar-tabs.test.js` passed (2 tests) and `npm test` passed (42 tests); parent repeated the focused test (2 tests), `git diff --check` passed, and pre-commit assessment returned medium risk, `review_due: false`, `under_budget` (78 changed lines).
  - Implementation evidence: new bookmarks append with `bookmarks.push`, existing normalized order is preserved, the renderer limits display to `bookmarks.slice(0, 9)`, and all launcher labels are Spanish.
  - Commit evidence: pending work-unit commit.
  - Review outcome: pending committed-candidate assessment.
  - Route: delegated direct. Trigger: bookmark insertion, UI copy, and bounded-list behavior span main-process code, renderer, and integration coverage.

## Next step
Complete NT-4 with focused tests, update this file and its Engram mirror, create the authorized work-unit commit, and assess the committed slice under RDD.
