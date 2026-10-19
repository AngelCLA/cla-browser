const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { _electron } = require('playwright');

const ROOT = path.resolve(__dirname, '..');

async function eventually(read, expected, message) {
  let actual;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    actual = await read();
    if (JSON.stringify(actual) === JSON.stringify(expected)) return;
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  assert.deepEqual(actual, expected, message);
}

for (const edition of ['personal', 'institutional']) {
  test(`${edition}: reachable tabs, stable keyboard focus and unchanged new tabs`, { timeout: 90000 }, async () => {
    const output = path.join(ROOT, '.toolbar-tabs-runtime', edition);
    await fs.mkdir(output, { recursive: true });
    const profile = await fs.mkdtemp(path.join(output, 'run-'));
    await fs.writeFile(path.join(profile, 'bookmarks.json'), JSON.stringify([
      { title: 'Saved shortcut', url: 'https://example.test/shortcut' },
    ]));
    // Keep Playwright artifacts and Electron temporary data inside the approved output.
    const previousTemp = { TEMP: process.env.TEMP, TMP: process.env.TMP };
    process.env.TEMP = profile;
    process.env.TMP = profile;
    let electron;
    try {
      electron = await _electron.launch({
        args: [ROOT, `--user-data-dir=${profile}`, '--disable-background-networking', '--host-resolver-rules=MAP * ~NOTFOUND'],
        env: { ...process.env, CLA_EDITION: edition, CLA_BENCHMARK: '0' },
        timeout: 30000,
      });
      assert.equal(await electron.evaluate(({ app }) => app.getPath('userData')), profile);
      await eventually(() => electron.evaluate(async ({ webContents }) => {
        const toolbar = webContents.getAllWebContents().find((wc) => /\/toolbar\/index\.html$/.test(wc.getURL()));
        return toolbar ? toolbar.executeJavaScript('Boolean(window.browser)') : false;
      }), true, 'toolbar initializes');
      const dom = (fn, ...args) => electron.evaluate(async ({ webContents }, { source, args }) => {
        const toolbar = webContents.getAllWebContents().find((wc) => /\/toolbar\/index\.html$/.test(wc.getURL()));
        return toolbar.executeJavaScript(`(${source})(...${JSON.stringify(args)})`);
      }, { source: fn.toString(), args });
      const state = () => dom(() => window.browser.getState());
      const nativeFocus = () => electron.evaluate(({ webContents }) =>
        webContents.getAllWebContents().find((wc) => /\/toolbar\/index\.html$/.test(wc.getURL())).isFocused());
      const focus = async (id, close = false) => {
        await electron.evaluate(({ BaseWindow, webContents }) => {
          BaseWindow.getAllWindows()[0].focus();
          webContents.getAllWebContents().find((wc) => /\/toolbar\/index\.html$/.test(wc.getURL())).focus();
        });
        await dom((id, close) => document.querySelector(`[data-tab-id="${id}"] ${close ? '.close' : '[role="tab"]'}`).focus(), id, close);
      };
      const key = (keyCode, modifiers = []) => electron.evaluate(({ webContents }, { keyCode, modifiers }) => {
        const wc = webContents.getAllWebContents().find((wc) => /\/toolbar\/index\.html$/.test(wc.getURL()));
        wc.sendInputEvent({ type: 'keyDown', keyCode, modifiers });
        if (!modifiers.length && (keyCode === 'Enter' || keyCode === 'Space')) {
          wc.sendInputEvent({ type: 'char', keyCode: keyCode === 'Enter' ? '\r' : ' ' });
        }
        wc.sendInputEvent({ type: 'keyUp', keyCode, modifiers });
      }, { keyCode, modifiers });
      const focusedId = () => dom(() => Number(document.activeElement.closest('[data-tab-id]')?.dataset.tabId));
      const click = (selector) => electron.evaluate(async ({ webContents }, selector) => {
        const wc = webContents.getAllWebContents().find((wc) => /\/toolbar\/index\.html$/.test(wc.getURL()));
        wc.focus();
        const { x, y } = await wc.executeJavaScript(`(() => {
          const bounds = document.querySelector(${JSON.stringify(selector)}).getBoundingClientRect();
          return { x: Math.round(bounds.x + bounds.width / 2), y: Math.round(bounds.y + bounds.height / 2) };
        })()`);
        wc.sendInputEvent({ type: 'mouseDown', x, y, button: 'left', clickCount: 1 });
        wc.sendInputEvent({ type: 'mouseUp', x, y, button: 'left', clickCount: 1 });
      }, selector);
      const visible = (id) => dom((id) => {
        const bounds = document.querySelector(`[data-tab-id="${id}"]`).getBoundingClientRect();
        const viewport = document.querySelector('#tab-list').getBoundingClientRect();
        return bounds.left >= viewport.left - 1 && bounds.right <= viewport.right + 1;
      }, id);
      const arrows = () => dom(() => [...document.querySelectorAll('.tab-scroll')].map((button) => ({
        hidden: button.hidden, display: getComputedStyle(button).display, width: button.getBoundingClientRect().width,
      })));
      const hiddenArrows = Array.from({ length: 2 }, () => ({ hidden: true, display: 'none', width: 0 }));
      const shownArrows = Array.from({ length: 2 }, () => ({ hidden: false, display: 'grid', width: 28 }));
      const resize = (width) => electron.evaluate(({ BaseWindow }, width) => BaseWindow.getAllWindows()[0].setContentSize(width, 600), width);
      const assertAddAdjacent = async () => {
        const geometry = await dom(() => {
          const last = document.querySelector('#tab-list').lastElementChild.getBoundingClientRect();
          const add = document.querySelector('.new-tab');
          const bounds = add.getBoundingClientRect();
          const controls = document.querySelector('#window-controls').getBoundingClientRect();
          return {
            gap: bounds.left - last.right, margin: parseFloat(getComputedStyle(add).marginLeft),
            contained: bounds.right <= controls.left && Math.abs(controls.right - innerWidth) < 1,
            hit: document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.closest('button') === add,
          };
        });
        assert.ok(Math.abs(geometry.gap - geometry.margin) < 1, `new-tab button follows the last tab: ${JSON.stringify(geometry)}`);
        assert.equal(geometry.contained, true, 'window controls stay right-aligned without overlap');
        assert.equal(geometry.hit, true, 'new-tab button is pointer-reachable');
      };
      await eventually(async () => (await state()).tabs.length, 1);
      await eventually(async () => (await state()).tabs[0].loading, false);
      const newTab = await electron.evaluate(async ({ webContents }) => {
        const wc = webContents.getAllWebContents().find((wc) => wc.getURL().includes('/new-tab/index.html'));
        return { ...await wc.executeJavaScript(`({ search: getComputedStyle(document.querySelector('.institutional-search')).display, logo: document.querySelector('img').alt })`), webContentsId: wc.id };
      });
      assert.equal(newTab.search, edition === 'personal' ? 'none' : 'block');
      assert.equal(newTab.logo, edition === 'personal' ? 'CLA Browser' : 'Institucion');
      assert.deepEqual(await electron.evaluate(async ({ webContents }, id) => {
        const page = webContents.fromId(id);
        return page.executeJavaScript(`({
          button: document.querySelector('[aria-label="Open shortcuts"]')?.tagName,
          bridge: typeof window.claBrowserShortcuts?.getBookmarks,
        })`);
      }, newTab.webContentsId), { button: 'BUTTON', bridge: 'function' });
      const shortcutsPage = await electron.evaluate(({ webContents }, id) => webContents.fromId(id).executeJavaScript(`(async () => {
        const unsafeAccepted = await window.claBrowserShortcuts.openBookmark('javascript:alert(1)');
        const button = document.querySelector('[aria-label="Open shortcuts"]');
        button.click();
        const panel = document.querySelector('#shortcuts-panel');
        for (let attempt = 0; attempt < 100 && !panel.querySelector('button'); attempt += 1) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        const label = panel?.textContent;
        const entry = panel?.querySelector('button');
        entry?.click();
        return { expanded: button.getAttribute('aria-expanded'), label, unsafeAccepted };
      })()`), newTab.webContentsId);
      assert.equal(shortcutsPage.expanded, 'true');
      assert.match(shortcutsPage.label, /Saved shortcut/);
      assert.equal(shortcutsPage.unsafeAccepted, false, 'untrusted non-bookmark destinations are rejected');
      await eventually(async () => (await state()).tabs[0].url, 'https://example.test/shortcut');
      assert.deepEqual(await arrows(), hiddenArrows, 'a single tab reserves no arrow space');
      await assertAddAdjacent();
      assert.deepEqual(await dom(() => {
        const tabs = document.querySelector('#tabs');
        const list = document.querySelector('#tab-list');
        const previous = document.querySelector('#tabs-previous').getBoundingClientRect();
        const first = list.firstElementChild.getBoundingClientRect();
        const add = document.querySelector('.new-tab').getBoundingClientRect();
        const controls = document.querySelector('#window-controls').getBoundingClientRect();
        const emptyX = (add.right + controls.left) / 2;
        return {
          brand: Boolean(tabs.querySelector('#brand, img')),
          paddingLeft: getComputedStyle(tabs).paddingLeft,
          previousLeft: previous.left,
          previousWidth: previous.width,
          listLeft: list.getBoundingClientRect().left,
          firstLeft: first.left,
          emptyHit: document.elementFromPoint(emptyX, 16)?.id,
          regions: ['#tabs', '#tab-list', '.tab', '.tab-scroll', '.new-tab', '#window-controls']
            .map((selector) => getComputedStyle(document.querySelector(selector)).getPropertyValue('-webkit-app-region')),
        };
      }), {
        brand: false, paddingLeft: '0px', previousLeft: 0, previousWidth: 0,
        listLeft: 0, firstLeft: 0, emptyHit: 'tabs',
        regions: ['drag', 'drag', 'no-drag', 'no-drag', 'no-drag', 'no-drag'],
      }, 'fitting tabs start at the left edge; unused strip is draggable');
      assert.equal(await dom(() => document.querySelector('#tab-list').getAttribute('role')), 'tablist');
      assert.equal(await dom(() => document.querySelector('#tab-list').getAttribute('aria-label')), 'Pestañas');

      await electron.evaluate(({ BaseWindow }) => BaseWindow.getAllWindows()[0].setContentSize(500, 600));
      for (let i = 0; i < 9; i += 1) {
        if (i === 0 || i === 8) await click('.new-tab');
        else await dom(() => window.browser.action('new-tab'));
        await eventually(async () => (await state()).tabs.length, i + 2);
        if (i === 0) {
          assert.deepEqual(await arrows(), hiddenArrows, 'two tabs fit at narrow width');
          await assertAddAdjacent();
        }
      }
      await eventually(async () => (await state()).tabs.every((tab) => !tab.loading), true);
      const ids = (await state()).tabs.map((tab) => tab.id);
      const activeId = ids.at(-1);
      await eventually(arrows, shownArrows, 'overflow shows both controls');
      assert.equal(await visible(activeId), true, 'overflow keeps the selected tab reachable');
      const dimensions = await dom(() => {
        const list = document.querySelector('#tab-list');
        const controls = document.querySelector('#window-controls').getBoundingClientRect();
        const add = document.querySelector('.new-tab').getBoundingClientRect();
        const hit = document.elementFromPoint(add.x + add.width / 2, add.y + add.height / 2)?.closest('button');
        return { overflow: list.scrollWidth > list.clientWidth, contained: Math.abs(controls.right - innerWidth) < 1 && add.left >= 0 && add.right <= controls.left, addReachable: hit?.classList.contains('new-tab'), height: document.querySelector('#tabs').offsetHeight };
      });
      assert.deepEqual(dimensions, { overflow: true, contained: true, addReachable: true, height: 34 });
      for (const [control, edge] of [['#tabs-previous', ids[0]], ['#tabs-next', activeId]]) {
        for (let attempt = 0; attempt < 20 && !await visible(edge); attempt += 1) {
          const before = await dom(() => document.querySelector('#tab-list').scrollLeft);
          assert.deepEqual(await dom((control) => {
            const button = document.querySelector(control);
            const bounds = button.getBoundingClientRect();
            const hit = document.elementFromPoint(Math.round(bounds.x + bounds.width / 2), Math.round(bounds.y + bounds.height / 2));
            return { disabled: button.disabled, hit: hit.closest('button')?.id, region: getComputedStyle(button).getPropertyValue('-webkit-app-region') };
          }, control), { disabled: false, hit: control.slice(1), region: 'no-drag' }, `${control} is enabled and hit-testable`);
          await click(control);
          await eventually(() => dom((before) => document.querySelector('#tab-list').scrollLeft !== before, before), true, `${control} pointer click changes overflow position from ${before}`);
        }
        assert.equal(await visible(edge), true, `${control} reaches the end of the strip`);
        await eventually(() => dom((control) => document.querySelector(control).disabled, control), true, 'only the reached direction is disabled');
        assert.equal(await dom((control) => document.querySelector(control === '#tabs-previous' ? '#tabs-next' : '#tabs-previous').disabled, control), false);
        assert.deepEqual(await arrows(), shownArrows, 'both arrows remain visible at either edge');
      }
      assert.equal(await dom(() => [...document.querySelectorAll('#tabs > button, #window-controls button, #bar button')].every((button) => button.title && button.getAttribute('aria-label'))), true);

      await focus(ids[0]);
      await key('Left');
      await eventually(focusedId, activeId, 'Left wraps focus without activating');
      await key('Right');
      await eventually(focusedId, ids[0]);
      assert.equal(await visible(ids[0]), true, 'focused tab is revealed');
      assert.equal((await state()).activeTabId, activeId);
      await key('End');
      await eventually(focusedId, activeId);
      await key('Home');
      await eventually(focusedId, ids[0]);
      await key('Enter');
      await eventually(async () => (await state()).activeTabId, ids[0]);
      assert.equal(await nativeFocus(), true, 'keyboard selection retains native toolbar focus');
      assert.equal(await dom(() => document.querySelector('[aria-selected="true"]').closest('[data-tab-id]').dataset.tabId), String(ids[0]));
      assert.equal(await dom(() => document.querySelectorAll('[role="tab"][tabindex="0"]').length), 1);
      assert.equal(await dom(() => document.querySelector('[role="tab"]').hasAttribute('aria-controls')), false);
      await key('Right');
      await key('Space');
      await eventually(async () => (await state()).activeTabId, ids[1]);
      assert.equal(await nativeFocus(), true);

      await dom(() => { globalThis.savedTab = document.activeElement; document.querySelector('#tab-list').scrollLeft = 300; });
      const intentionalScroll = await dom(() => document.querySelector('#tab-list').scrollLeft);
      await electron.evaluate(async ({ webContents }, id) => {
        const wc = webContents.fromId(id);
        await wc.executeJavaScript('document.title = "Updated full tab title"');
      }, newTab.webContentsId);
      await eventually(async () => (await state()).tabs[0].title, 'Updated full tab title');
      assert.equal(await dom(() => document.activeElement === globalThis.savedTab && globalThis.savedTab.isConnected), true);
      assert.equal(await dom(() => document.querySelector('#tab-list').scrollLeft), intentionalScroll);
      assert.equal(await dom(() => document.querySelector('[role="tab"]').title), 'Updated full tab title');
      assert.equal(await dom(() => document.querySelector('.close').getAttribute('aria-label')), 'Cerrar pestaña: Updated full tab title');
      assert.equal(await dom(() => document.querySelector('.close').tagName), 'BUTTON');
      assert.equal(await dom(() => document.querySelectorAll('button button').length), 0);
      assert.equal(await dom(() => getComputedStyle(globalThis.savedTab).outlineStyle), 'solid');
      await dom(() => { globalThis.loadingSeen = false; window.browser.onState((next) => { globalThis.loadingSeen ||= next.tabs.some((tab) => tab.loading); }); });
      await electron.evaluate(async ({ webContents }, id) => {
        await webContents.fromId(id).loadURL('data:text/html,<title>Local loaded page</title><p>Offline fixture</p>');
      }, newTab.webContentsId);
      await eventually(async () => (await state()).tabs[0].title, 'Local loaded page');
      assert.equal(await dom(() => globalThis.loadingSeen), true, 'real loading updates were observed');
      assert.equal(await dom(() => document.activeElement === globalThis.savedTab), true);
      assert.equal(await dom(() => document.querySelector('#tab-list').scrollLeft), intentionalScroll);
      assert.equal(await nativeFocus(), true);

      // Exercise the actual drag handlers; keyed nodes must survive the resulting reorder.
      await dom((id, targetId) => {
        const source = document.querySelector(`[data-tab-id="${id}"]`);
        const target = document.querySelector(`[data-tab-id="${targetId}"]`);
        const dataTransfer = new DataTransfer();
        source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
        target.dispatchEvent(new DragEvent('drop', { bubbles: true, dataTransfer, clientX: target.getBoundingClientRect().right }));
        source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
      }, ids[1], ids[3]);
      await eventually(async () => (await state()).tabs[3].id, ids[1]);
      assert.equal(await dom(() => document.activeElement === globalThis.savedTab), true);
      assert.equal(await nativeFocus(), true);

      await focus(ids[2]);
      await key('Delete');
      await eventually(async () => (await state()).tabs.length, 9);
      assert.equal((await state()).activeTabId, ids[1], 'closing focused background tab does not select its neighbor');
      await eventually(focusedId, ids[3]);
      assert.equal(await nativeFocus(), true);
      await focus(ids[1]);
      await key('Delete');
      await eventually(async () => (await state()).tabs.length, 8);
      assert.equal((await state()).activeTabId, ids[3], 'active close still selects left neighbor');
      assert.equal(await nativeFocus(), true);
      await eventually(focusedId, ids[3]);
      await focus(ids[4], true);
      await key('Enter');
      await eventually(async () => (await state()).tabs.length, 7, 'native close button dispatches once');
      assert.equal((await state()).activeTabId, ids[3]);
      assert.equal(await nativeFocus(), true);

      await focus(ids[3]);
      await key('Right', ['shift']);
      assert.equal(await focusedId(), ids[3], 'modified arrows are not tab navigation');
      await dom(() => { const input = document.querySelector('#address'); input.value = 'abc'; input.focus(); input.setSelectionRange(2, 2); });
      await key('Left');
      await eventually(() => dom(() => document.querySelector('#address').selectionStart), 1);
      assert.equal((await state()).activeTabId, ids[3]);
      // Invoke the installed menu accelerators by their registration, independent of OS key routing.
      const shortcut = (accelerator) => electron.evaluate(({ Menu }, accelerator) => {
        const item = Menu.getApplicationMenu().items.flatMap((item) => item.submenu?.items || []).find((item) => item.accelerator === accelerator);
        assertMenuItem(item);
        function assertMenuItem(item) { if (!item) throw new Error(`Missing accelerator ${accelerator}`); }
        item.click();
      }, accelerator);
      await shortcut('CommandOrControl+Tab');
      await eventually(async () => (await state()).activeTabId, ids[5]);
      assert.equal(await nativeFocus(), false, 'global selection still focuses content');
      await shortcut('CommandOrControl+W');
      await eventually(async () => (await state()).tabs.length, 6);
      assert.equal(await nativeFocus(), false, 'global close retains default content focus');
      await shortcut('CommandOrControl+Shift+T');
      await eventually(async () => (await state()).tabs.length, 7);
      await dom((id) => window.browser.selectTab(id, { focus: 'invalid' }), ids[0]);
      await eventually(async () => (await state()).activeTabId, ids[0]);
      assert.equal(await nativeFocus(), false, 'invalid focus intent defaults to content');
      await focus(ids[0]);
      await key('Tab');
      await eventually(() => dom(() => document.activeElement.classList.contains('close')), true, 'close is reachable by Tab');
      await click(`[data-tab-id="${ids[3]}"] [role="tab"]`);
      await eventually(async () => (await state()).activeTabId, ids[3]);
      assert.equal(await nativeFocus(), false, 'pointer selection focuses content');
      const activeBeforeClose = (await state()).activeTabId;
      await dom((id) => window.browser.closeTab(id), ids[0]);
      await eventually(async () => (await state()).tabs.length, 6);
      assert.equal((await state()).activeTabId, activeBeforeClose);
      assert.equal(await nativeFocus(), false, 'background close does not steal native content focus');
      // Tabs have a viewport-relative max-width; measure after widening, not at 500px.
      await resize(1400);
      await eventually(arrows, hiddenArrows, 'a wide window fits the remaining tabs');
      await assertAddAdjacent();
      // Measure the fit boundary without assuming a tab count or a control width.
      const fittingWidth = await dom(() => {
        const list = document.querySelector('#tab-list');
        const content = [...list.children].reduce((width, tab) => width + tab.getBoundingClientRect().width, 0);
        const add = document.querySelector('.new-tab');
        const fixed = document.querySelector('#window-controls').getBoundingClientRect().width + add.getBoundingClientRect().width + parseFloat(getComputedStyle(add).marginLeft);
        return Math.ceil(content + fixed) + 1;
      });
      await resize(500);
      await eventually(arrows, shownArrows);
      // A stale DOM focus in the toolbar must not steal native focus from content.
      await dom(() => document.querySelector('#tabs-previous').focus());
      assert.equal(await nativeFocus(), false);
      await resize(fittingWidth);
      await eventually(arrows, hiddenArrows, 'widening reclaims both arrow slots at the fit threshold');
      await assertAddAdjacent();
      assert.deepEqual(await dom(() => {
        const list = document.querySelector('#tab-list');
        const content = [...list.children].reduce((width, tab) => width + tab.getBoundingClientRect().width, 0);
        const slots = [...document.querySelectorAll('.tab-scroll')].reduce((width, button) => width + parseFloat(getComputedStyle(button).flexBasis), 0);
        const add = document.querySelector('.new-tab');
        const fixed = document.querySelector('#window-controls').getBoundingClientRect().width + add.getBoundingClientRect().width + parseFloat(getComputedStyle(add).marginLeft);
        const available = innerWidth - fixed;
        return { fitsWithoutArrows: content <= available, wouldOverflowWithArrows: content > available - slots };
      }), { fitsWithoutArrows: true, wouldOverflowWithArrows: true }, 'arrow slots would create phantom overflow at this width');
      assert.equal(await nativeFocus(), false, 'hiding arrows does not focus an inactive toolbar');
      assert.equal(await visible(activeBeforeClose), true);
      assert.deepEqual(await dom(async () => {
        const samples = [];
        for (let frame = 0; frame < 4; frame += 1) {
          await new Promise(requestAnimationFrame);
          samples.push([...document.querySelectorAll('.tab-scroll')].every((button) => button.hidden && button.offsetWidth === 0));
        }
        return samples;
      }), [true, true, true, true], 'the threshold does not oscillate across rendering frames');
      await electron.evaluate(async ({ webContents }) => {
        const page = webContents.getAllWebContents().find((wc) => wc.getURL().includes('/new-tab/index.html'));
        await page.executeJavaScript('document.title = "Threshold state update"');
      });
      await eventually(async () => (await state()).tabs.some((tab) => tab.title === 'Threshold state update'), true);
      assert.deepEqual(await arrows(), hiddenArrows, 'unrelated state updates cannot create phantom overflow');
      await resize(fittingWidth - 2);
      await eventually(arrows, shownArrows, 'one pixel of real overflow shows both controls');
      await resize(500);
      await eventually(() => dom(() => innerWidth), 500);
      await focus(activeBeforeClose);
      await dom(() => document.querySelector('#tabs-previous').focus());
      assert.equal(await nativeFocus(), true);
      await resize(fittingWidth);
      await eventually(arrows, hiddenArrows);
      await eventually(focusedId, activeBeforeClose, 'hiding a focused arrow restores the selected tab focus');
      assert.equal(await nativeFocus(), true);
      await focus(activeId);
      await resize(500);
      await eventually(arrows, shownArrows, 'shrinking restores overflow controls');
      await eventually(() => visible(activeId), true, 'shrinking reveals the focused background tab');
      assert.equal(await focusedId(), activeId);
      assert.equal((await state()).activeTabId, activeBeforeClose, 'resize does not activate the focused background tab');
      await electron.evaluate(({ ipcMain, webContents }, id) => {
        const page = webContents.getAllWebContents().find((wc) => wc.getURL().includes('/new-tab/index.html'));
        ipcMain.emit('browser:select-tab', { sender: page }, id, { focus: 'toolbar' });
      }, ids[6]);
      await eventually(async () => (await state()).activeTabId, ids[6]);
      assert.equal(await nativeFocus(), false, 'non-toolbar sender cannot request toolbar focus');
      const remaining = (await state()).tabs.map((tab) => tab.id);
      for (const id of remaining.slice(0, -1)) await dom((id) => window.browser.closeTab(id), id);
      await eventually(async () => (await state()).tabs.length, 1);
      await eventually(arrows, hiddenArrows, 'closing tabs until they fit removes both controls');
      await assertAddAdjacent();
      assert.equal(await dom(() => document.querySelector('#tab-list').getBoundingClientRect().left), 0);
      await dom(() => document.querySelector('#tabs-next').focus());
      assert.equal(await dom(() => document.activeElement.id === 'tabs-next'), false, 'hidden arrows cannot receive focus');
      const exited = electron.waitForEvent('close');
      await dom((id) => window.browser.closeTab(id), remaining.at(-1));
      await exited;
    } finally {
      if (electron) await electron.close();
      for (const name of ['TEMP', 'TMP']) {
        if (previousTemp[name] === undefined) delete process.env[name];
        else process.env[name] = previousTemp[name];
      }
      // Profiles are intentionally retained; the parent owns later cleanup.
    }
  });
}
