"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { installPopupWindowPolicy } = require("../src/main/popup-window");

function createFakeWebContents() {
  const handlers = {};
  return {
    handlers,
    setWindowOpenHandler(handler) {
      handlers.windowOpen = handler;
    },
    on(eventName, handler) {
      handlers[eventName] = handler;
    },
  };
}

test("popup policy preserves HTTPS allow and ad-tracker deny decisions", () => {
  const webContents = createFakeWebContents();
  installPopupWindowPolicy(webContents, "C:/app/assets/icon.png");

  assert.deepEqual(webContents.handlers.windowOpen({ url: "https://accounts.google.com/signin" }), {
    action: "allow",
    overrideBrowserWindowOptions: {
      icon: "C:/app/assets/icon.png",
      autoHideMenuBar: true,
    },
  });
  assert.deepEqual(webContents.handlers.windowOpen({ url: "https://google-analytics.com/collect" }), {
    action: "deny",
  });
  assert.deepEqual(webContents.handlers.windowOpen({ url: "http://example.com" }), {
    action: "deny",
  });
});

test("created popup windows have their inherited menu removed", () => {
  const webContents = createFakeWebContents();
  installPopupWindowPolicy(webContents, "C:/app/assets/icon.png");
  const removedMenus = [];
  const firstPopup = { removeMenu: () => removedMenus.push("first") };
  const secondPopup = { removeMenu: () => removedMenus.push("second") };

  webContents.handlers["did-create-window"](firstPopup);
  webContents.handlers["did-create-window"](secondPopup);

  assert.deepEqual(removedMenus, ["first", "second"]);
});
