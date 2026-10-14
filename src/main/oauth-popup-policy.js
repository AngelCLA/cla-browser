"use strict";

const ALLOWED_OAUTH_HOSTS = new Set(["www.figma.com", "accounts.google.com"]);

function isAllowedOAuthPopupUrl(value) {
  if (typeof value !== "string") return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" && ALLOWED_OAUTH_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

module.exports = { isAllowedOAuthPopupUrl };
