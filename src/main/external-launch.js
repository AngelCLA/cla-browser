const { pathToFileURL } = require('node:url');

function parseLaunchArguments(argv, isPackaged) {
  return argv.slice(isPackaged ? 1 : 2).flatMap((argument) => {
    if (typeof argument !== 'string' || !argument || argument.startsWith('-') || argument.includes('\0')) return [];
    try {
      // Windows paths are not URL schemes. Encode literal # and % before URL parsing.
      if (/^(?:[a-z]:[\\/]|\\\\[^\\]+\\)/i.test(argument)) {
        return /\.html?$/i.test(argument) ? [pathToFileURL(argument, { windows: true }).href] : [];
      }
      const url = new URL(argument);
      if (/^https?:\/\//i.test(argument) && ['http:', 'https:'].includes(url.protocol)) return [url.href];
      if (url.protocol === 'file:') {
        const pathname = decodeURIComponent(url.pathname);
        if (!pathname.includes('\0') && /\.html?$/i.test(pathname)) return [url.href];
      }
    } catch {
      // Invalid external arguments must never become searches or executable schemes.
    }
    return [];
  });
}

function createExternalLaunchHandler({ argv, isPackaged, openTab, focusWindow }) {
  const pending = parseLaunchArguments(argv, isPackaged);
  let windowReady = false;
  let focusPending = false;

  function flush() {
    if (!windowReady) return;
    for (const destination of pending.splice(0)) openTab(destination);
    if (focusPending) {
      focusPending = false;
      focusWindow();
    }
  }

  return {
    receive(commandLine) {
      pending.push(...parseLaunchArguments(commandLine, isPackaged));
      focusPending = true;
      flush();
    },
    ready() {
      windowReady = true;
      if (!pending.length) openTab();
      flush();
    },
    pause() { windowReady = false; },
  };
}

module.exports = { parseLaunchArguments, createExternalLaunchHandler };
