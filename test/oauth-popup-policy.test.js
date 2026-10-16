"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedPopupUrl, isAllowedOAuthPopupUrl } = require("../src/main/oauth-popup-policy");

test("allows the established Figma and Google authentication popup destinations", () => {
  assert.equal(isAllowedOAuthPopupUrl("https://www.figma.com/api/oauth/google"), true);
  assert.equal(isAllowedOAuthPopupUrl("https://accounts.google.com/o/oauth2/v2/auth"), true);
  assert.equal(isAllowedOAuthPopupUrl("https://accounts.google.com/signin"), true);
  assert.equal(isAllowedOAuthPopupUrl("https://www.figma.com/api/oauth/google?state=example"), true);
});

test("ordinary services and lookalike authentication destinations are not native popup exceptions", () => {
  for (const url of [
    "https://mail.google.com/", "https://drive.google.com/", "https://docs.google.com/",
    "https://www.figma.com/files", "https://app.example.net/auth/callback",
    "https://accounts.google.com.example.net/signin", "https://accounts.google.com@evil.example/",
    "https://www.figma.com/api/oauth/google/other", "https://accounts.google.com:8443/signin",
    "https://user@accounts.google.com/signin",
  ]) {
    assert.equal(isAllowedOAuthPopupUrl(url), false, url);
  }
});

test("tab destination safety is independent of the narrow authentication exception", () => {
  assert.equal(isAllowedPopupUrl("https://mail.google.com/"), true);
  assert.equal(isAllowedPopupUrl("https://app.example.net/auth/callback"), true);
  for (const url of [null, undefined, {}, "http://example.org/", "not a URL", "https://google-analytics.com/collect"]) {
    assert.equal(isAllowedPopupUrl(url), false);
    assert.equal(isAllowedOAuthPopupUrl(url), false);
  }
});

test("popup policy blocks known advertisers regardless of regular blocker settings", () => {
  assert.equal(isAllowedOAuthPopupUrl("https://google-analytics.com/collect"), false);
  assert.equal(isAllowedOAuthPopupUrl("https://events.google-analytics.com/collect"), false);
});

test("rejects non-HTTPS and malformed popup URLs", () => {
  for (const url of [
    "http://www.figma.com/api/oauth/google",
    "not a URL",
  ]) {
    assert.equal(isAllowedOAuthPopupUrl(url), false, url);
  }
});
