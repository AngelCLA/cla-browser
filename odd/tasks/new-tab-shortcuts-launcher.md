# New-tab shortcuts launcher

## Objective
Add a compact nine-dot launcher in the top-right corner of the new-tab page that reveals the first nine icon-only saved shortcuts, links to dedicated tabs for all bookmarks and keyboard shortcuts, and provides intuitive panel dismissal and scrolling.

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
- In institutional mode, constrain branding image styles to the new-tab logo so shortcut favicons retain their square dimensions.
- Provide “Ver todos los marcadores” and “Atajos de teclado” actions that open dedicated local browser tabs available in both editions; clicking a bookmark from the full list navigates in that same tab.
- No remote operations, publishing, or delivery actions.

## Delivery
- Strategy: ask-on-risk (default).
- Forecast: approximately 680 authored changed lines across five work units, crossing the ~400-line delivery budget.
- Chain strategy: `stacked-to-main` (user-selected before the NT-4 commit).
- Test strategy: retain parallel `npm test` execution and investigate/fix the native-focus failure (user-selected).
- Route: NT-1 delegated direct (multiple non-trivial files); NT-2 delegated direct (renderer plus integration tests, after mapping keyboard behavior); NT-3 delegated direct (outside-click behavior, scrollbar styling, and integration tests); NT-4 delegated direct (main bookmark ordering, renderer display, and integration tests); NT-5 delegated direct (two local views, scoped main/preload bridges, launcher actions, and integration tests).

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
- [x] NT-4 — Localize the panel as “Atajos,” show up to the first nine favorites, and append newly added bookmarks.
  - Acceptance: all visible “Shortcuts” labels and related accessible names are Spanish; the panel shows the first nine saved bookmarks in bookmarks-bar order, or all entries if fewer than nine exist; newly added bookmarks are appended to the end without reordering existing entries; outside-dismissal, keyboard reference, and icon-only behavior remain intact.
  - Checks: add deterministic integration coverage for more than nine entries, fewer than nine entries, and adding a bookmark at the end; verify order and localized labels, then run `node --test test/toolbar-tabs.test.js` and `npm test`.
  - Verification: RED observed in both editions because a new bookmark appeared first. Writer reports `node --test test/toolbar-tabs.test.js` passed (2 tests) and `npm test` passed (42 tests); parent repeated the focused test (2 tests), `git diff --check` passed, and pre-commit assessment returned medium risk, `review_due: false`, `under_budget` (78 changed lines).
  - Implementation evidence: new bookmarks append with `bookmarks.push`, existing normalized order is preserved, the renderer limits display to `bookmarks.slice(0, 9)`, and all launcher labels are Spanish.
  - Commit evidence: `7ddae21` (`feat(bookmarks): append new favorites`).
  - Review outcome: RDD on; assessment from `a25c69e2f28bb2efa673d7d2861c26863271bfdd` returned medium risk, `review_due: false`, reason `under_budget` (379 changed lines).
  - Route: delegated direct. Trigger: bookmark insertion, UI copy, and bounded-list behavior span main-process code, renderer, and integration coverage.
- [ ] NT-5 — Replace the keyboard dropdown with dedicated local tabs for all bookmarks and keyboard shortcuts.
  - Acceptance: the launcher panel provides “Ver todos los marcadores” and “Atajos de teclado”; each opens a separate browser tab using the shared local-page/createTab pattern, styled consistently with Restricted; the bookmark page shows all entries in bookmarks-bar order and opening one navigates that same tab; the keyboard page contains the implemented shortcut reference; both editions work, local-page data/navigation bridges are sender-scoped, and institutional favicon icons remain square.
  - Checks: add Electron integration coverage for both actions in both editions, full bookmark ordering and same-tab navigation, shortcut-reference parity, scoped IPC, institutional favicon sizing, and parallel test focus; run `node --test test/toolbar-tabs.test.js` and parallel `npm test`.
  - Verification: RED observed in both editions because the launcher lacked “Ver todos los marcadores”; the institutional favicon probe also observed 280px/absolute styling instead of 24px/static. After fixes, writer reports `node --test test/toolbar-tabs.test.js` and parallel `npm test` passed (2 and 42 tests respectively); parent repeated the focused test successfully (2 tests), and `git diff --check` passed. An earlier parallel run failed once at `test/toolbar-tabs.test.js:495`; a bounded native-focus wait now allows restoration without changing test concurrency.
  - Implementation evidence: panel actions open separate local tabs; bookmarks and keyboard pages follow the Restricted dark-page pattern; bookmark data/navigation handlers require the active WebContents, exact local page URL, and normalized saved bookmark URL; institutional image rules target `.brand-logo`, leaving favicons 24px and static.
  - Commit evidence: `ef17285` (`feat(new-tab): add dedicated bookmarks and shortcut views`).
  - Review outcome: the pre-commit assessment was unassessable because the two new renderer pages were untracked; committed-candidate assessment from the feature base returned medium risk with `review_due: true` (`slice_budget_reached`).
  - Route: delegated direct. Trigger: multiple new local views, IPC/preload access, launcher changes, and cross-edition integration tests.
- [x] NT-6 — Show each saved bookmark's favicon on the full bookmarks page.
  - Acceptance: every row of the bookmarks page renders an icon resolved from the saved URL (Gmail's icon, otherwise the origin favicon), with a generic fallback when the origin is not HTTP(S) or the image fails; names and URLs keep their order and accessible labels; both editions work.
  - Checks: extend the Electron integration assertions first and observe RED; run `node --test test/toolbar-tabs.test.js` and `npm test`.
  - Verification: RED observed in both editions because the page had no title class and no icons. After implementation, `node --test test/toolbar-tabs.test.js` passed (2 tests) and `npm test` passed (42 tests); `git diff --check` passed.
  - Implementation evidence: shared `fallbackFavicon` rule (Gmail special case, otherwise `new URL('/favicon.ico', page)`), 20px icon column with a generic circular fallback, and `data-favicon-src` retained per row for deterministic coverage.
  - Commit evidence: pending work-unit commit.
  - Review outcome: pending committed assessment.
  - Route: delegated direct. Trigger: renderer layout change plus cross-edition integration assertions.

## Next step
Record the NT-6 committed assessment and close the feature task.
