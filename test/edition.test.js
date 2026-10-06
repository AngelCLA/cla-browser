"use strict";

const path = require("node:path");
const test = require("node:test");
const assert = require("node:assert/strict");
const { institutionalLogoUrl, isBlockedUrl, isRestrictedInstaller, loadInstitutionalConfig } = require("../src/main/edition");

test("institutional configuration loads the local branding assets", () => {
  const appPath = path.resolve(__dirname, "..");
  const config = loadInstitutionalConfig(appPath);
  assert.equal(config.organizationName, "Institucion");
  assert.equal(config.accentColor, "#0054A2");
  assert.match(institutionalLogoUrl(appPath, config.logo), /institutional\/logo\.svg$/);
});

test("blocked institutional sites include their subdomains only", () => {
  assert.equal(isBlockedUrl("https://video.example.com/watch", ["example.com"]), true);
  assert.equal(isBlockedUrl("https://notexample.com/", ["example.com"]), false);
});

test("restricted installer detection does not depend on the download domain", () => {
  assert.equal(isRestrictedInstaller("Firefox Installer.exe"), true);
  assert.equal(isRestrictedInstaller("GoogleChromeStandaloneEnterprise64.msi"), true);
  assert.equal(isRestrictedInstaller("SteamSetup.exe"), true);
  assert.equal(isRestrictedInstaller("RobloxPlayerLauncher.exe"), true);
  assert.equal(isRestrictedInstaller("microsoft-office-installer.exe"), false);
  assert.equal(isRestrictedInstaller("chrome-release-notes.pdf"), false);
});
