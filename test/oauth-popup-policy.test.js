"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedOAuthPopupUrl } = require("../src/main/oauth-popup-policy");

test("allows legitimate HTTPS OAuth and application popup URLs", () => {
  assert.equal(isAllowedOAuthPopupUrl("https://www.figma.com/api/oauth/google"), true);
  assert.equal(isAllowedOAuthPopupUrl("https://accounts.google.com/o/oauth2/v2/auth"), true);
  assert.equal(isAllowedOAuthPopupUrl("https://app.example.net/auth/callback"), true);
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
