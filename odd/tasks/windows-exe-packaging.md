# Windows CLA Browser packaging

## Objective
Configure reproducible Windows x64 builds that produce both a portable `CLA Browser.exe` and an installer named `CLA Browser Setup.exe`.

## Problem and rationale
The repository has no packaging tool or build command. Its `package.json` defines only test, start, and benchmark scripts, so no final executable name or installer/portable outputs are currently defined.

## Scope and constraints
- Use electron-builder, configured in `package.json`, to produce both NSIS installer and portable targets from one Windows build command.
- Set the installed app executable/product name to `CLA Browser`; name the installer `CLA Browser Setup.exe` and portable artifact `CLA Browser.exe`.
- Place generated artifacts in `dist/` and keep generated output out of version control.
- Do not rename the npm package identity `cla-browser`.
- The user authorized downloading electron-builder and dependencies only from `https://registry.npmjs.org/`, anonymously, without stored credentials; do not contact other hosts or run lifecycle scripts.
- Do not run the actual packaging build because electron-builder may download helper binaries from unapproved hosts; verify configuration and tests only.

## Authorized scope
- `package.json`
- `package-lock.json`
- `.gitignore`
- `README.md`
- `test/build-packaging.test.js`
- `odd/tasks/windows-exe-packaging.md`

## Delivery strategy and forecast
- Strategy: `single-pr`.
- Forecast: approximately 100 authored changed lines; generated lockfile changes excluded from the authored-line estimate.
- Route: delegated direct implementation. Trigger evidence: packaging config, package metadata/lockfile, ignored output, and build documentation require coordinated changes.
- Feature branch: `fix/figma-google-sso` (current non-default branch).

## Tasks
- [x] **WIN-1** Add electron-builder, configure portable and NSIS Windows x64 outputs, name both artifacts and the app executable, document the build command, and ignore generated output.
  - Acceptance: `npm run build:win` is configured for x64 NSIS and portable outputs; the app executable and portable artifact use `CLA Browser.exe`; the installer artifact uses `CLA Browser Setup.exe`; output is under ignored `dist/`.
  - Checks: focused config tests (3/3), `npm test` (22/22), `electron-builder --version` (26.15.3), and ignored `dist/` confirmation passed. Actual output build not run: helper downloads may contact hosts outside the user's npm-only authorization.
  - Install: anonymous `npm install` from `https://registry.npmjs.org/` with scripts disabled succeeded; npm reported 8 moderate advisories, not investigated or auto-fixed.
  - Verification route: delegated writer self-verification plus parent spot-check; post-commit RDD assessment pending.
  - Work-unit commit: pending.

## Progress and next step
Configuration and tests are complete. `productName` is `CLA Browser`; `npm run build:win` targets x64 NSIS and portable artifacts under `dist/`, named `CLA Browser Setup.exe` and `CLA Browser.exe`. `dist/` was already ignored. The actual build was not run because it may download helper binaries from other hosts; request separate authorization before generating artifacts. Next: commit the work unit and assess it under RDD.
