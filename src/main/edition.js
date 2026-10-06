const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const edition = process.env.CLA_EDITION === 'institutional' ? 'institutional' : 'personal';
const DEFAULT_INSTITUTIONAL_CONFIG = {
  organizationName: 'Institucion',
  logo: '',
  accentColor: '#0054A2',
};

function loadInstitutionalConfig(appPath) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(appPath, 'institutional.config.json'), 'utf8'));
    return {
      organizationName: typeof data.organizationName === 'string' && data.organizationName.trim()
        ? data.organizationName.trim()
        : DEFAULT_INSTITUTIONAL_CONFIG.organizationName,
      logo: typeof data.logo === 'string' ? data.logo : '',
      accentColor: typeof data.accentColor === 'string' && /^#[\da-f]{6}$/i.test(data.accentColor)
        ? data.accentColor
        : DEFAULT_INSTITUTIONAL_CONFIG.accentColor,
      blockedSites: normalizeBlockedSites(data.blockedSites),
    };
  } catch {
    return { ...DEFAULT_INSTITUTIONAL_CONFIG, blockedSites: [] };
  }
}

function normalizeBlockedSites(sites) {
  if (!Array.isArray(sites)) return [];
  const seen = new Set();
  return sites.flatMap((site) => {
    if (typeof site !== 'string' || !site.trim()) return [];
    try {
      const value = site.trim().replace(/^\*\./, '');
      const hostname = new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
      if (!hostname || seen.has(hostname)) return [];
      seen.add(hostname);
      return [hostname];
    } catch {
      return [];
    }
  });
}

function isBlockedUrl(url, blockedSites) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return blockedSites.some((site) => hostname === site || hostname.endsWith(`.${site}`));
  } catch {
    return false;
  }
}

function isRestrictedInstaller(filename) {
  if (typeof filename !== 'string') return false;
  const name = filename.toLowerCase();
  if (!/\.(exe|msi|dmg|pkg|appimage|deb|rpm)$/i.test(name)) return false;
  return /(chrome|chromium|firefox|edge|opera|brave|vivaldi|waterfox|tor[ -]?browser|arc|yandex|steam|epic[ _-]?games|epicinstaller|gog[ _-]?galaxy|battle[._ -]?net|riot[ _-]?client|league[ _-]?of[ _-]?legends|valorant|minecraft|roblox|fortnite|among[ _-]?us|stumble[ _-]?guys)/i.test(name);
}

function institutionalLogoUrl(appPath, logo) {
  if (!logo || path.isAbsolute(logo)) return '';
  const filePath = path.resolve(appPath, logo);
  const relativePath = path.relative(appPath, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath) || !fs.existsSync(filePath)) return '';
  return pathToFileURL(filePath).toString();
}

module.exports = { edition, institutionalLogoUrl, isBlockedUrl, isRestrictedInstaller, loadInstitutionalConfig };
