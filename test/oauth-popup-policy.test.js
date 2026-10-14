"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { isAllowedOAuthPopupUrl } = require("../src/main/oauth-popup-policy");

test("allows HTTPS OAuth popup URLs on exact Figma and Google account hosts", () => {
  assert.equal(isAllowedOAuthPopupUrl("https://www.figma.com/api/oauth/google"), true);
  assert.equal(isAllowedOAuthPopupUrl("https://accounts.google.com/o/oauth2/v2/auth"), true);
});

test("rejects non-HTTPS, untrusted, and lookalike popup URLs", () => {
  for (const url of [
    "http://www.figma.com/api/oauth/google",
    "https://figma.com/api/oauth/google",
    "https://sub.accounts.google.com/",
    "https://accounts.google.com.example.org/",
    "https://example.com/",
    "not a URL",
  ]) {
    assert.equal(isAllowedOAuthPopupUrl(url), false, url);
  }
});
