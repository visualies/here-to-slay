// Utility to spawn N interactive Chromium windows for manual multiplayer testing.
// Does NOT start any servers. Ensure your app and realtime servers are running beforehand.

import { chromium, Browser, Page } from '@playwright/test';

type WindowSpec = { x: number; y: number; w: number; h: number };

async function openBrowserAt(url: string, spec: WindowSpec) {
  const browser = await chromium.launch({
    headless: false,
    args: [
      `--window-position=${spec.x},${spec.y}`,
      `--window-size=${spec.w},${spec.h}`,
      '--autoplay-policy=no-user-gesture-required',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  const context = await browser.newContext({ viewport: { width: spec.w, height: spec.h } });
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
  const countArg = process.argv[2];
  const count = Math.max(1, parseInt(process.env.COUNT || countArg || '2', 10));

  console.log(`Launching ${count} Chromium window(s) to ${url} (size ${width}x${height})...`);

  const gap = 40;
  const specs: WindowSpec[] = Array.from({ length: count }, (_, i) => ({
    x: (width + gap) * i,
    y: 0,
    w: width,
    h: height
  }));

  const instances = await Promise.all(specs.map(spec => openBrowserAt(url, spec)));

  const cleanup = async () => {
    for (const inst of instances) {
      try { await inst.page.close(); } catch {}
      try { await inst.browser.close(); } catch {}
    }
  };

  process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
  });

  console.log('Browsers launched. Use Ctrl+C to close.');
  // Keep process alive for manual interaction
  await new Promise(() => {});
}

main().catch((err) => {
  console.error(err);
  // Do not force-exit; give user a chance to see any open windows
});


