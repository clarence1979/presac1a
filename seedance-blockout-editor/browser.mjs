// One place that starts headless Chrome for render.mjs and check.mjs.
// Uses puppeteer-core (npm install) with the Chrome that is already on this computer. Set CHROME_PATH if it is somewhere unusual.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function findChrome() {
  if (process.env.CHROME_PATH) { if (fs.existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH; throw new Error('CHROME_PATH is set to "' + process.env.CHROME_PATH + '" but nothing is there.'); }
  const home = os.homedir(), list = process.platform === 'darwin' ? ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', path.join(home, 'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'), '/Applications/Chromium.app/Contents/MacOS/Chromium', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge']
    : process.platform === 'win32' ? [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean).flatMap((d) => [path.join(d, 'Google/Chrome/Application/chrome.exe'), path.join(d, 'Microsoft/Edge/Application/msedge.exe')])
    : ['/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/snap/bin/chromium'];
  const hit = list.find((f) => fs.existsSync(f)); if (hit) return hit;
  throw new Error('Google Chrome was not found. Install Chrome, or set CHROME_PATH to a Chrome, Chromium or Edge program, for example:\n  CHROME_PATH="/path/to/chrome" node render.mjs stills out 0 10 20');
}
export async function launchBrowser() {
  let puppeteer; try { puppeteer = (await import('puppeteer-core')).default; } catch (e) { throw new Error('puppeteer-core is not installed. Run "npm install" in this folder first.'); }
  return puppeteer.launch({ executablePath: findChrome(), headless: 'new', args: ['--use-angle=' + (process.platform === 'darwin' ? 'metal' : 'default'), '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader'] });
}
