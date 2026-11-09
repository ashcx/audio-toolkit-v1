import { chromium, webkit } from 'playwright';

/**
 * The browser engines a driver loops over, as [name, type] pairs.
 * Both by default. ENGINES=chromium limits a run, for a machine without WebKit installed.
 */
export function engines() {
  const wanted = new Set((process.env.ENGINES ?? 'chromium,webkit').split(','));
  const chosen = [['chromium', chromium], ['webkit', webkit]].filter(([name]) => wanted.has(name));
  console.log(`engines ${chosen.map(([name]) => name).join(', ')}`);
  return chosen;
}

/** Chromium always runs as the installed Chrome, like the other drivers, so no bundled browser download is needed. */
export const launchOptions = name => (name === 'chromium' ? { channel: 'chrome' } : {});
