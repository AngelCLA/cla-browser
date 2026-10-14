# Windows CLA Browser packaging

## Objective
Configure reproducible Windows x64 builds that produce both a portable `CLA Browser.exe` and an installer named `CLA Browser Setup.exe`.

## Problem and rationale
The repository has no packaging tool or build command. Its `package.json` defines only test, start, and benchmark scripts, so no final executable name or installer/portable outputs are currently defined.

## Scope and constraints
- Use electron-builder, configured in `package.json`, to produce both NSIS installer and portable targets from one Windows build command.
- Set the installed app executable/product name to `CLA Browser`; name the installer `CLA Browser Setup.exe` and portable artifact `CLA Browser.exe`.
- Set the Windows app icon to the existing CLA Browser asset at `src/assets/icon.png` so the app, portable executable, and NSIS installer use the brand icon instead of Electron's default.
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
- `src/assets/icon.png` (read-only source asset)
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
  - Verification route: delegated writer self-verification plus parent spot-check. Post-commit RDD assessment: `medium`; `review_due=true`; user chose `Omitir esta vez` (no review record; future reviews remain enabled).
  - Work-unit commit: `fb7559c` (`feat(build): configure Windows app packages`).
- [x] **WIN-2** Configure the existing CLA Browser image as the Windows app icon used by the installed app, portable EXE, and NSIS installer; add regression coverage.
  - Acceptance: `build.win.icon` points to `src/assets/icon.png`, which electron-builder converts to ICO for Windows; the icon asset is at least 256x256; existing artifact names and build targets remain unchanged.
  - Checks: focused config tests (4/4), `npm test` (23/23), `git diff --check`, and icon PNG signature/dimensions (1254x1252) passed. User should rebuild to confirm icons on emitted artifacts.
  - Verification route: parent implementation and spot-check; post-commit RDD assessment pending.
  - Work-unit commit: pending.

## Progress and next step
WIN-1 is committed as `fb7559c`; the native risk assessment returned `medium` with `review_due=true`, and the user chose to skip that review this time. The user's build reached dependency collection but stopped with `spawn powershell.exe ENOENT`; diagnosis confirmed Windows PowerShell is present but its directory is missing from the build process PATH. WIN-2 now points `build.win.icon` at the existing `src/assets/icon.png`; electron-builder converts it to Windows ICO and uses it for the app, portable, and default NSIS icons. Focused tests and all 23 tests pass. The working-tree `package.json` also contains a separate user change moving Electron to devDependencies; preserve it and keep it out of the icon work-unit commit. Next: commit only the icon configuration, its test, and task evidence, then reassess under RDD.
