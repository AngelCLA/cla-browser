# Service links in tabs

## Objective
Open ordinary service links in browser tabs instead of standalone popup windows, preserving popup-dependent authentication.

## Problem and rationale
The current handler allows any nonblocked HTTPS destination as a native window. The user confirmed the symptom affects Google services rather than Google sign-in and authorized a correction.

## Scope and constraints
- Change only popup routing, its tab integration, and focused tests.
- Preserve all pre-existing tracked and untracked work, especially unrelated external-launch changes in src/main/index.js.
- Do not publish or commit without explicit authorization.
- Technical artifacts remain in English.
- Delivery strategy: ask-on-risk; forecast below 250 authored changed lines; no PR planned.

## Tasks
- [x] T1: Implement ordinary-request tab routing and narrow authentication exceptions, with deterministic regression tests. Route: delegated direct; trigger: multi-file implementation and reading in preparation for writing.
- [x] T2: Run focused and applicable regression checks, perform parent spot check, and attempt enabled native review. Route: delegated checks plus parent state/spot check. Technical verification complete; native review and manual smoke checks remain pending as documented below.

## Acceptance criteria
- Ordinary Google service destinations open tabs, not native windows.
- Existing blocked destinations remain blocked.
- Authentication popup exceptions remain narrowly scoped and tested.
- Existing unrelated edits are preserved.

## Checks
- Test-first policy: observe failing deterministic routing tests before changing behavior, then green and refactor.
- node --test test/oauth-popup-policy.test.js test/popup-window.test.js
- npm test
- Manual Electron Google service/sign-in smoke check if an interactive application session is available; otherwise record pending.

## Progress
- Existing worktree is dirty; initial changes recorded in parent git status/diff summary.
- RDD mode is on, decided by global preference.
- Ordinary permitted HTTPS links now call the registered `createTab` path and deny native creation; `background-tab` retains background activation. Names, popup features, and `new-window` disposition do not grant native-window exceptions.
- Native authentication exceptions are limited to the dedicated `https://accounts.google.com` origin and the existing test-backed `https://www.figma.com/api/oauth/google` entry point (including query parameters). Other HTTPS authentication-looking URLs are tabs, not native exceptions. The existing HTTPS/ad-tracker safety gate remains shared by both routes.
- Electron's current `setWindowOpenHandler` documentation was checked through Context7: `deny` cancels native creation; allowing authentication leaves native opener, naming and POST handling to Electron. No security preferences were relaxed.
- RED: focused tests observed 6 passes and 4 intended failures before implementation (service classification, tab routing, disposition routing, ordinary POST denial). GREEN: initial focused run passed 10/10; expanded safety coverage passed 11/11. Full `npm test` passed 40/40, including existing external-launch and packaging tests.
- `git diff --check` passed with no whitespace errors; Git emitted LF-to-CRLF working-copy warnings. Final diff inspection confirmed the only writer addition to the pre-existing `index.js` changes is passing `createTab` to `installPopupWindowPolicy`.
- Limitations: ordinary POST form requests are denied rather than silently converted to GET; ordinary named requests create fresh tabs without named-window reuse or an opener relationship. Tab navigation uses the existing `createTab` GET path and does not forward request referrer metadata. Authentication providers outside the two validated exceptions are not guaranteed popup compatibility. Supporting broader flows would need evidence and a separately scoped tab-creation integration.
- Parent spot check independently passed all 11 focused tests. Independent verifier ran `npm test` (40 passed, 0 failed) and `git diff --check` (no whitespace errors), inspected callback integration and authentication boundaries, and reported no severe findings.
- Native assessment returned high/unassessable because untracked files need an explicit inventory selection. Selectorless STATUS requested `intended_untracked_selection`; no START, consent, review, or approval occurred. The candidate includes unrelated pre-existing tracked and untracked changes, so no selection or review authority was inferred. Native review remains pending; independent verification is not native approval.
- Manual interactive Electron Google service/Figma-Google sign-in checks were not run; live authentication success is not claimed.
- Commits: none; user has not requested a commit.

## Next step
Restart the application and smoke-test Google service links, background tabs, and Figma-Google sign-in. Native review remains pending explicit candidate inventory delimitation. No commit has been created.
