// Small utility to spawn two interactive Chromium windows for manual multiplayer testing.
// Does NOT start any servers. Ensure your app and realtime servers are running beforehand.

import { chromium, Browser, Page } from '@playwright/test';

async function openBrowserAt(url: string, position: { x: number; y: number }, size: { w: number; h: number }) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--window-position=${position.x},${position.y}`,
      `--window-size=${size.w},${size.h}`,
      '--autoplay-policy=no-user-gesture-required',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  const context = await browser.newContext({ viewport: { width: size.w, height: size.h } });
  const page = await context.newPage();
  try {
    await page.goto(url);
  } catch (err) {
    console.warn(`Navigation to ${url} failed:`, (err as Error)?.message);
    console.warn('Keeping the browser open. You can navigate manually.');
  }
  return { browser, page } as { browser: Browser; page: Page };
}

async function main() {
  const url = process.env.APP_URL || 'http://localhost:3000';
  const width = parseInt(process.env.WIDTH || '1200', 10);
  const height = parseInt(process.env.HEIGHT || '800', 10);

  console.log(`Launching two Chromium windows to ${url} (size ${width}x${height})...`);

  const [a, b] = await Promise.all([
    openBrowserAt(url, { x: 0, y: 0 }, { w: width, h: height }),
    openBrowserAt(url, { x: width + 40, y: 0 }, { w: width, h: height })
  ]);

  const cleanup = async () => {
    try { await a.page.close(); } catch {}
    try { await a.browser.close(); } catch {}
    try { await b.page.close(); } catch {}
    try { await b.browser.close(); } catch {}
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  console.log('Two browsers launched. Use Ctrl+C to close.');
  // Keep process alive for manual interaction
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  // Do not force-exit; give user a chance to see any open windows
});


