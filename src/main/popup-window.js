"use strict";

const { isAllowedPopupUrl, isAllowedOAuthPopupUrl } = require("./oauth-popup-policy");

function installPopupWindowPolicy(webContents, icon, openTab) {
  webContents.setWindowOpenHandler(({ url, disposition, postBody }) => {
    if (!isAllowedPopupUrl(url)) return { action: "deny" };
    if (!isAllowedOAuthPopupUrl(url)) {
      // createTab navigates with GET; never silently discard a form's POST body.
      if (!postBody) openTab(url, disposition !== "background-tab");
      return { action: "deny" };
    }
    // Leave authentication to Electron so native opener, POST and window naming survive.
    return {
      action: "allow",
      overrideBrowserWindowOptions: {
        icon,
        autoHideMenuBar: true,
      },
    };
  });
  webContents.on("did-create-window", (childWindow) => childWindow.removeMenu());
}

module.exports = { installPopupWindowPolicy };
