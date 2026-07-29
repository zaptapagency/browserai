import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { scanPage, selectorForId } from '../src/page-scanner';

const FIXTURE = `<!doctype html>
<html>
  <head><title>Scanner Fixture</title></head>
  <body>
    <h1>Welcome</h1>
    <a href="/about">About us</a>
    <button id="buy">Buy now</button>
    <input type="text" placeholder="Search products" />
    <button disabled>Sold out</button>
    <div style="display:none"><a href="/hidden">Hidden link</a></div>
    <img src="logo.png" alt="Company logo" />
  </body>
</html>`;

describe('scanPage', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.setContent(FIXTURE);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('returns protocol-conformant page state', async () => {
    const state = await scanPage(page, 'sess-1', { actionCount: 0, startedAtMs: Date.now() });
    expect(state.protocolVersion).toBe('1.0');
    expect(state.title).toBe('Scanner Fixture');
    expect(state.viewport).toEqual({ width: 1280, height: 720 });
    expect(state.memory.sessionId).toBe('sess-1');
  });

  it('indexes interactable elements with roles and accessible names', async () => {
    const state = await scanPage(page, 'sess-1', { actionCount: 0, startedAtMs: Date.now() });
    const names = state.elements.map((e) => e.name);
    expect(names).toContain('About us');
    expect(names).toContain('Buy now');
    expect(names).toContain('Search products');

    const link = state.elements.find((e) => e.name === 'About us');
    expect(link?.role).toBe('link');
    expect(link?.interactable).toBe(true);
    expect(link?.attributes?.href).toBe('/about');
  });

  it('marks a disabled button as non-interactable', async () => {
    const state = await scanPage(page, 'sess-1', { actionCount: 0, startedAtMs: Date.now() });
    const soldOut = state.elements.find((e) => e.name === 'Sold out');
    expect(soldOut?.interactable).toBe(false);
  });

  it('omits hidden elements from the scan', async () => {
    const state = await scanPage(page, 'sess-1', { actionCount: 0, startedAtMs: Date.now() });
    expect(state.elements.some((e) => e.name === 'Hidden link')).toBe(false);
  });

  it('assigns stable selectors that resolve to the scanned node', async () => {
    const state = await scanPage(page, 'sess-1', { actionCount: 0, startedAtMs: Date.now() });
    const buy = state.elements.find((e) => e.name === 'Buy now');
    expect(buy).toBeDefined();
    const handle = await page.$(selectorForId(buy!.id));
    expect(handle).not.toBeNull();
    expect(await handle!.innerText()).toBe('Buy now');
  });

  it('reports an interactable count consistent with the element list', async () => {
    const state = await scanPage(page, 'sess-1', { actionCount: 0, startedAtMs: Date.now() });
    const counted = state.elements.filter((e) => e.interactable).length;
    expect(state.interactableCount).toBe(counted);
  });
});
