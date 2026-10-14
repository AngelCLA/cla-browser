"use strict";

const { isAllowedOAuthPopupUrl } = require("./oauth-popup-policy");

function installPopupWindowPolicy(webContents, icon) {
  webContents.setWindowOpenHandler(({ url }) => {
    if (!isAllowedOAuthPopupUrl(url)) return { action: "deny" };
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
