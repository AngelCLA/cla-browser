# Figma Google SSO popup recovery

## Objective
Restore Figma Google sign-in, allow legitimate HTTPS popups broadly, block known advertising/tracking popups, protect main-process navigation, and brand popup windows consistently.

## Problem and rationale
The browser replaces every `window.open` request with a standalone tab and denies the popup. OAuth completion needs a real opener relationship, leaving Figma at its callback URL. Navigation IPC also accepts arbitrary senders and the active tab's WebContents may have been destroyed before `loadURL` is called.

## Scope and constraints
- Allow real Electron popups for HTTPS destinations unless their domain is classified in the existing lightweight advertising/tracking domain list; keep other protocols denied.
- Remove the inherited application menu from popup windows and use the existing CLA Browser app icon in their title bar.
- Validate toolbar ownership of `browser:navigate` and avoid navigating a missing or destroyed WebContents.
- Add focused deterministic tests for the popup URL policy, including representative advertising/tracking domains.
- Do not broaden permissions, alter account credentials, or change unrelated pre-existing user files.

## Authorized scope
- `src/main/index.js`
- `src/main/oauth-popup-policy.js`
- `src/main/popup-window.js`
- `test/oauth-popup-policy.test.js`
- `test/popup-window.test.js`
- `odd/tasks/figma-google-sso.md`

## Delivery strategy and forecast
- Strategy: `single-pr` (one bounded behavior fix).
- Forecast: approximately 80 authored changed lines; generated files excluded.
- Route: delegated direct implementation. Trigger evidence: implementation spans the Electron main process plus a pure policy module and its tests; existing flow was mapped before writing.
- Feature branch: `fix/figma-google-sso` (created from `main` before implementation).

## Tasks
- [x] **SSO-1** Add an exact-host HTTPS OAuth popup allowlist, validate navigation IPC sender, and guard `loadURL` against destroyed WebContents; test the URL policy.
  - Acceptance: only allowlisted HTTPS origins produce an Electron-managed popup; all other popup URLs are denied; non-toolbar navigation IPC is ignored; absent/destroyed tab contents do not reach `loadURL`.
  - Checks: `npm test` and a parent spot-check of the reported code paths.
  - Verification route: delegated writer self-verification plus parent spot-check. Post-commit risk assessment: `medium`; `review_due=false`; `under_budget` (RDD on).
  - Work-unit commit: `ec7aff3` (`fix(auth): preserve trusted OAuth popup flow`).
- [x] **SSO-2** Expand legitimate HTTPS popups while denying destinations classified as advertising/tracking by the existing lightweight domain list.
  - Acceptance: any valid HTTPS popup destination outside that list receives a real Electron popup; known ad/tracker destinations, malformed URLs, and non-HTTPS protocols are denied. Ad-blocker toggle state does not permit known ad/tracker popups.
  - Checks: `npm test` and parent spot-check of the classifier integration.
  - Verification route: delegated writer self-verification plus parent spot-check. Post-commit RDD assessment: `medium`; `review_due=false`; `under_budget` (RDD on).
  - Work-unit commit: `a603945` (`fix(auth): allow non-ad HTTPS popups`).
- [x] **SSO-3** Remove the global Navegacion/Marcadores/Bloqueador menu from OAuth popups and show the CLA Browser app icon in their title bar.
  - Acceptance: popup windows have no inherited menu bar, use `src/assets/icon.png`, and retain normal native title-bar controls; the main browser window remains unchanged.
  - Checks: `npm test` plus parent structural readback. Live Electron visual smoke test is desirable but not available yet.
  - Verification route: delegated writer self-verification plus parent spot-check. Post-commit RDD assessment: `medium`; `review_due=false`; `under_budget` (RDD on).
  - Work-unit commit: `1e7af5e` (`feat(auth): brand popup windows without menu`).

## Progress and next step
Implemented in `src/main/index.js` with the pure policy in `src/main/oauth-popup-policy.js` and regression coverage in `test/oauth-popup-policy.test.js`.

- TDD RED observed: focused tests failed before the policy module existed.
- TDD GREEN observed: focused popup policy tests passed (2 passed, 0 failed).
- `npm test`: 16 passed, 0 failed (writer run and parent spot-check).
- `git diff --check`: passed.
- Runtime Electron OAuth smoke test: not run; popup opener behavior was not exercised in a live app.
- Work-unit commit: `ec7aff3` (`fix(auth): preserve trusted OAuth popup flow`).

SSO-1 is complete. The medium-risk candidate was below the 400-line delivery budget, so no native review was due for its commit. Live Electron OAuth smoke testing remains an optional follow-up.

SSO-2 implementation and tests are complete. The existing lightweight ad/tracker classifier now blocks popup destinations independently of the normal blocker toggle and site exceptions. TDD RED observed: 16 passed, 1 failed on the new legitimate-app case. GREEN: `npm test` passed (17/17), including the parent spot-check. Work-unit commit: `a603945` (`fix(auth): allow non-ad HTTPS popups`). Post-commit RDD assessment returned `medium`, `review_due=false`, `under_budget`; no native review was due. Live Electron popup smoke testing remains pending.

SSO-3 implementation and tests are complete. TDD RED observed: focused tests failed before `src/main/popup-window.js` existed. GREEN: focused tests passed (2/2); parent `npm test` passed (19/19); `git diff --check` passed. Popups now remove the inherited menu per child window, hide the menu during creation, and use `src/assets/icon.png`; the main window/global menu were not changed. Work-unit commit: `1e7af5e` (`feat(auth): brand popup windows without menu`). Post-commit RDD assessment against `c8d275e` returned `medium`, `review_due=false`, `under_budget`; no native review was due. A visual Electron smoke test was not run.
