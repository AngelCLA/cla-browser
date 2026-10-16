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

test("popup policy preserves Google authentication and ad-tracker deny decisions", () => {
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

test("ordinary HTTPS requests open registered tabs and never native windows", () => {
  const webContents = createFakeWebContents();
  const opened = [];
  installPopupWindowPolicy(webContents, "icon.png", (...args) => opened.push(args));
  for (const url of ["https://mail.google.com/", "https://drive.google.com/", "https://docs.google.com/", "https://example.org/"]) {
    assert.deepEqual(webContents.handlers.windowOpen({ url, disposition: "foreground-tab" }), { action: "deny" });
    assert.deepEqual(opened.at(-1), [url, true]);
  }
  assert.equal(opened.length, 4);
});

test("background requests stay in the background; popup features and names do not bypass routing", () => {
  const webContents = createFakeWebContents();
  const opened = [];
  installPopupWindowPolicy(webContents, "icon.png", (...args) => opened.push(args));
  for (const disposition of ["background-tab", "foreground-tab", "new-window", "default", "other"]) {
    assert.deepEqual(webContents.handlers.windowOpen({
      url: "https://drive.google.com/", disposition, frameName: "service", features: "popup,width=600,height=400",
    }), { action: "deny" });
    assert.deepEqual(opened.at(-1), ["https://drive.google.com/", disposition !== "background-tab"]);
  }
});

test("unsafe destinations and ordinary POST forms never reach tab creation", () => {
  const webContents = createFakeWebContents();
  const opened = [];
  installPopupWindowPolicy(webContents, "icon.png", (...args) => opened.push(args));
  for (const url of ["https://google-analytics.com/collect", "https://events.google-analytics.com/collect", "http://example.com/", "javascript:alert(1)", "file:///tmp/page.html", "about:blank", "invalid"]) {
    assert.deepEqual(webContents.handlers.windowOpen({ url }), { action: "deny" });
  }
  assert.deepEqual(webContents.handlers.windowOpen({ url: "https://example.org/", postBody: { data: [] } }), { action: "deny" });
  assert.deepEqual(opened, []);
});

test("authentication retains native opener handling even for named POST popups", () => {
  const webContents = createFakeWebContents();
  const opened = [];
  installPopupWindowPolicy(webContents, "icon.png", (...args) => opened.push(args));
  for (const url of ["https://www.figma.com/api/oauth/google", "https://accounts.google.com/o/oauth2/v2/auth"]) {
    const result = webContents.handlers.windowOpen({ url, frameName: "oauth", features: "popup,width=500", postBody: { data: [] } });
    assert.equal(result.action, "allow");
    assert.equal(result.overrideBrowserWindowOptions.autoHideMenuBar, true);
    assert.equal(result.createWindow, undefined);
  }
  assert.deepEqual(opened, []);
});
