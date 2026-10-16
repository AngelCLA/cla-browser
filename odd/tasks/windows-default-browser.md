# Windows default browser integration

## Objective and problem
Make the installed CLA Browser selectable in Windows Default apps, and correctly open HTTP/HTTPS links and HTML files passed by Windows. The existing NSIS installer has no browser capabilities registration and startup ignores external destinations.

## Scope and constraints
- Register browser capabilities in the installation's user/machine context; remove only owned entries on uninstall.
- Leave default selection to the user; never write UserChoice or overwrite existing defaults.
- Handle cold launches and second-instance requests without losing destinations.
- Preserve current portable packaging, browser navigation restrictions, and artifact branding.
- Do not install dependencies, download build helpers, execute installers, or change this computer's registry.
- No commit, push, or PR without explicit user request.

## Authorized edit surfaces
- `.gitignore` (preserve installer source while ignoring generated build files)
- `package.json`
- `build/installer.nsh` (new)
- `src/main/index.js`
- `src/main/external-launch.js` (new)
- `test/external-launch.test.js` (new)
- `test/build-packaging.test.js`
- `README.md`
- `odd/tasks/windows-default-browser.md`

## Delivery and route
- Strategy: ask-on-risk; forecast approximately 350 authored changed lines, excluding this tracking document. No publication authorized.
- Route: delegated direct. Trigger: coordinated installer, startup, deterministic tests, and documentation changes; preparation for writing belongs to the writer.
- Branch: existing `fix/figma-google-sso`; initial worktree clean.
- RDD: on, global preference. Initial assessment was high/unassessable because new files need explicit selection; native review remains pending.

## Tasks
- [ ] **DEFAULT-1** Register installed browser capabilities, receive external launches, and cover the behavior with tests and user instructions.
  - Acceptance: NSIS registers HTTP/HTTPS and .htm/.html capabilities with correctly quoted commands and scoped uninstall cleanup; portable does not register itself; invalid external schemes are ignored; valid external destinations reach tabs on cold and subsequent launches.
  - Test-first policy: no dedicated TDD setting found. Use default RED → GREEN for meaningful deterministic tests with Node's built-in runner.
  - Checks: `node --test --test-concurrency=1 test/external-launch.test.js test/build-packaging.test.js`; `npm test`; `git diff --check`.
  - Manual integration: actual installer build, Windows Default apps visibility, link/file launches, and uninstall registry cleanup remain pending in a test Windows environment. Build may download helpers and is not authorized here.
  - Commit: not authorized; do not create one automatically.

## Progress and next step
Implementation and deterministic verification complete; DEFAULT-1 remains unchecked pending native assessment and Windows integration verification.

- NSIS-only include registers scoped browser capabilities and owned HTML/URL ProgIDs, quotes executable/destination arguments, and notifies the shell. Uninstall checks installation path and each ProgID command before removing owned entries. No existing defaults are changed.
- Confirmed local electron-builder templates use `SetShellVarContext current/all` and `SHELL_CONTEXT` for matching installation/uninstallation registration. Portable packaging and artifact names are unchanged.
- Startup takes the single-instance lock before configuration/IPC/bootstrap. Accepted HTTP/HTTPS and HTML destinations queue until the window is ready, replace the initial blank tab, and open in subsequent tabs with restore/focus behavior. Windows file paths become encoded file URLs before existing navigation policies apply.
- RED: `node --test --test-concurrency=1 test/external-launch.test.js test/build-packaging.test.js` observed 4 passes / 3 failures: missing NSIS include configuration, missing installer script, and missing launch module.
- GREEN: first focused rerun passed 13/13. Added alternate/negative cases and lifecycle/ownership structural checks; final focused command passed 15/15.
- `npm test`: passed 34/34, no skips or failures.
- `git diff --check`: passed; Git emitted only its LF-to-CRLF working-copy warnings.
- README documents Default apps selection, supported associations, portable limitations, and uninstall expectations.
- No build, helper download, installer execution, host registry changes, staging, commit, or native review performed.
- Parent fixed `.gitignore` to ignore `build/*` except `build/installer.nsh`; installer source now appears in the untracked inventory. This mechanical supporting change was added to authorized surfaces.
- Parent spot-check: focused tests passed 15/15 after the ignore fix; `git diff --check` passed.
- Independent verifier: `npm test` passed 34/34 and `git diff --check` passed. Local cached NSIS `/PPO` preprocessing expanded both install/uninstall macros successfully; this is not a full compilation or an installer execution.
- Independent inspection found no demonstrated high-severity code blocker; actual Windows integration and primary Electron lifecycle remain unverified beyond deterministic/structural checks.

Next: parent assessment/native review, then authorized installer compilation and testing on a disposable Windows environment. Verify Settings visibility, user/machine installation contexts, cold/running/minimized launches, HTML paths with spaces/hash/Unicode, and ownership-safe uninstall (including a second installation path). NSIS assertions are structural checks, not proof of compilation or Windows shell behavior. Overall task/native verification remain pending; commit still requires explicit authorization.
