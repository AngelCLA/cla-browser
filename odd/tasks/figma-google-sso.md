# Figma Google SSO popup recovery

## Objective
Restore Figma Google sign-in while preventing stale or untrusted IPC navigation from crashing the Electron main process.

## Problem and rationale
The browser replaces every `window.open` request with a standalone tab and denies the popup. OAuth completion needs a real opener relationship, leaving Figma at its callback URL. Navigation IPC also accepts arbitrary senders and the active tab's WebContents may have been destroyed before `loadURL` is called.

## Scope and constraints
- Allow a real Electron popup only for HTTPS auth URLs on exact Figma and Google account hosts; keep other popups denied and ordinary popup behavior unchanged.
- Validate toolbar ownership of `browser:navigate` and avoid navigating a missing or destroyed WebContents.
- Add focused deterministic tests for the pure popup URL policy.
- Do not broaden permissions, alter account credentials, or change unrelated pre-existing user files.

## Authorized scope
- `src/main/index.js`
- `src/main/oauth-popup-policy.js`
- `test/oauth-popup-policy.test.js`
- `odd/tasks/figma-google-sso.md`

## Delivery strategy and forecast
- Strategy: `single-pr` (one bounded behavior fix).
- Forecast: approximately 80 authored changed lines; generated files excluded.
- Route: delegated direct implementation. Trigger evidence: implementation spans the Electron main process plus a pure policy module and its tests; existing flow was mapped before writing.
- Feature branch: `fix/figma-google-sso` (created from `main` before implementation).

## Tasks
- [ ] **SSO-1** Add an exact-host HTTPS OAuth popup allowlist, validate navigation IPC sender, and guard `loadURL` against destroyed WebContents; test the URL policy.
  - Acceptance: only allowlisted HTTPS origins produce an Electron-managed popup; all other popup URLs are denied; non-toolbar navigation IPC is ignored; absent/destroyed tab contents do not reach `loadURL`.
  - Checks: `npm test` and a parent spot-check of the reported code paths.
  - Verification route: delegated writer self-verification; risk is currently unassessable before implementation, so reassess after the work-unit commit.
  - Work-unit commit: pending.

## Progress and next step
Implemented in `src/main/index.js` with the pure policy in `src/main/oauth-popup-policy.js` and regression coverage in `test/oauth-popup-policy.test.js`.

- TDD RED observed: focused tests failed before the policy module existed.
- TDD GREEN observed: focused popup policy tests passed (2 passed, 0 failed).
- `npm test`: 16 passed, 0 failed (writer run and parent spot-check).
- `git diff --check`: passed.
- Runtime Electron OAuth smoke test: not run; popup opener behavior was not exercised in a live app.
- Work-unit commit: pending.

Next: inspect the final diff, commit this behavior unit, and follow the native review assessment/lifecycle for the committed candidate.
