# Shared browser usability

## Objective
Make everyday tab navigation discoverable and keyboard-accessible in both editions while retaining CLA Browser's compact dark identity.

## Scope and constraints
- Personal new tabs remain logo-only; institutional new tabs retain central search and organization branding.
- Share tab usability improvements without changing institutional restrictions, authentication popup routing, history retention, or session persistence.
- Preserve existing global shortcuts, drag reorder, close-selection policy, fixed toolbar heights, and address/bookmark behavior.
- Authorized source surfaces: `src/renderer/toolbar/index.html`, `src/preload/toolbar.js`, and only tab-focus routing in `src/main/index.js`.
- Authorized supporting surfaces: new `test/toolbar-tabs.test.js` and existing `docs/instalacion-y-uso.md`.
- User approved runtime-output subtrees `.toolbar-tabs-runtime/personal/` and `.toolbar-tabs-runtime/institutional/`; retain profiles after closing Electron, with later cleanup parent-owned. These are runtime outputs, not deliverable source.

## Work unit
- [ ] UX-1: Deliver reachable, named, keyboard-operable tabs with stable focus and concise control help in both editions, with behavior tests and user documentation.
  - Route: delegated direct. Trigger: multiple non-trivial files and native toolbar/content focus boundary require a bounded writer.
  - Acceptance: many tabs remain reachable at 500px width; selected/focused tabs can be revealed without scroll resets on unrelated updates; tab selection semantics, clear close names, keyboard navigation/activation/closing, and visible focus work; title/state updates preserve focus; personal logo-only/institutional search behavior stays unchanged.
  - Test-first policy: default applicable ODD RED → GREEN → REFACTOR using deterministic Node tests with the installed Playwright/Electron runtime; no configured strict-TDD override was discovered.
  - Checks: `node --test test/toolbar-tabs.test.js`; `node --test test/edition.test.js test/history.test.js test/oauth-popup-policy.test.js test/popup-window.test.js`; `node --check src/main/index.js`; `node --check src/preload/toolbar.js`; `node --check test/toolbar-tabs.test.js`; `npm test`; parent spot check; native risk assessment/review under the user-owned switch.
  - Runtime boundary: real Electron toolbar DOM and native WebContents focus; use isolated temporary profiles and local content, not external services.
  - Rollback: remove this work unit's toolbar/focus/test/doc changes together without changing policy, storage, or popup modules.

## Delivery and evidence
- Starting boundary: `6b35eda` on `fix/figma-google-sso`; initial worktree clean.
- RDD: on, decided by global preference; no mode changes authorized.
- Delivery strategy: `exception-ok`; user selected option 1 to retain one cohesive unit after disclosure of 462 authored changed lines. No chain or PR creation is requested. No push, PR, or merge authorized.
- Review candidates are work units/slices, never TODO checkboxes. Review and functional verification do not authorize publication.
- Verification: functional checks passed; native review and delivery closure pending. Writer initially stopped before source edits for runtime-output authorization.
- Decision: user selected option 1, authorizing both exact runtime-output subtrees and retained profiles. Source scope is unchanged; no permission for other output paths or deletion is inferred.
- Next step: close the authorized work unit locally and assess the exact committed candidate for native review. No publication is authorized.

## Observed UX-1 evidence
- Implementation: pointer overflow buttons; stable keyed tab nodes; tablist/selected semantics and roving focus; Left/Right/Home/End focus navigation, Enter/Space activation, Delete/native close buttons; validated native toolbar-focus intent; full-title labels/tooltips and visible focus. Both edition-specific new-tab presentations remain unchanged.
- RED: new real-Electron tests failed in both editions because tablist role was absent, before source implementation. An earlier harness initialization failure was resolved before behavioral RED.
- GREEN: `node --test test/toolbar-tabs.test.js` passed 2/2 edition tests. Parent independently reran that exact command: 2 passed, 0 failed, 0 skipped.
- Regressions: `node --test test/edition.test.js test/history.test.js test/oauth-popup-policy.test.js test/popup-window.test.js` passed 15/15; `npm test` passed 42/42 with no skips.
- Syntax: `node --check src/main/index.js`, `node --check src/preload/toolbar.js`, and `node --check test/toolbar-tabs.test.js` passed. `git diff --check` passed with LF-to-CRLF warnings only.
- Parent structural readback: reviewed all four tracked source/doc diffs; changes stay within authorized surfaces. New behavior test is 248 lines.
- Size: five deliverable files total 409 additions + 53 deletions = 462 authored changed lines, excluding generated profiles and this task document. Including this task document, native assessment counted 492 before this evidence update.
- Slicing decision: overflow and keyboard/focus handling share tab rendering; integration tests validate their combined native-focus behavior. User accepted an explicit size exception for one cohesive unit. Do not separate tests from their behavior or shrink source formatting to satisfy the advisory budget.
- RDD assessment: initial assessment was unassessable because of undeclared untracked files. Explicitly selecting `test/toolbar-tabs.test.js` and this task document, excluding runtime profiles, returned `medium` (`executable_change`), `review_due: true`, `slice_budget_reached`. No START, consent, receipt, or approval exists.
- Review STATUS preflight requested an explicit schema-bound intended-untracked selection. No frozen transaction exists. Inventory digests are stale after subsequent profile/task changes and must not be reused blindly.
- Limitations: menu accelerator registrations/callbacks were tested, not OS-level key dispatch; drag handlers used real DOM DragEvents, not native mouse gestures. No screen-reader or cross-platform verification. Retained isolated profiles are not deliverable source.
