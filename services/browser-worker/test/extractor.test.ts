import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { extractData, type ExtractionSchema } from '../src/extractor';

const PRODUCTS = `<!doctype html>
<html>
  <body>
    <ul class="products">
      <li class="product">
        <span class="name">Widget</span>
        <span class="price">$19.99</span>
        <a class="link" href="/p/widget">view</a>
      </li>
      <li class="product">
        <span class="name">Gadget</span>
        <span class="price">$4,200.00</span>
        <a class="link" href="/p/gadget">view</a>
      </li>
      <li class="product">
        <span class="name">Gizmo</span>
        <span class="price">$0.50</span>
        <a class="link" href="/p/gizmo">view</a>
      </li>
    </ul>
    <div class="summary">
      <span class="title">Acme Store</span>
      <span class="count">3</span>
    </div>
  </body>
</html>`;

describe('extractData', () => {
  let browser: Browser;
  let page: Page;

  beforeAll(async () => {
    browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    page = await browser.newPage();
    await page.setContent(PRODUCTS);
  });

  afterAll(async () => {
    await browser?.close();
  });

  it('extracts an array via itemSelector with per-property selectors', async () => {
    const schema: ExtractionSchema = {
      type: 'array',
      itemSelector: 'li.product',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', selector: '.name' },
          price: { type: 'number', selector: '.price' },
          link: { type: 'string', selector: '.link', attribute: 'href' },
        },
      },
    };
    const result = await extractData(page, schema);
    expect(result.itemCount).toBe(3);
    expect(result.data).toEqual([
      { name: 'Widget', price: 19.99, link: '/p/widget' },
      { name: 'Gadget', price: 4200, link: '/p/gadget' },
      { name: 'Gizmo', price: 0.5, link: '/p/gizmo' },
    ]);
  });

  it('coerces numeric strings, stripping currency and separators', async () => {
    const schema: ExtractionSchema = {
      type: 'object',
      selector: '.summary',
      properties: {
        title: { type: 'string', selector: '.title' },
        count: { type: 'number', selector: '.count' },
      },
    };
    const result = await extractData(page, schema);
    expect(result.data).toEqual({ title: 'Acme Store', count: 3 });
  });

  it('returns null for missing fields and records a warning (never fabricates)', async () => {
    const schema: ExtractionSchema = {
      type: 'object',
      properties: {
        missing: { type: 'string', selector: '.does-not-exist' },
      },
    };
    const result = await extractData(page, schema);
    expect(result.data).toEqual({ missing: null });
    expect(result.warnings.some((w) => w.includes('missing'))).toBe(true);
  });

  it('detects repeating structures heuristically without a selector', async () => {
    const schema: ExtractionSchema = {
      type: 'array',
      items: { type: 'string' },
    };
    const result = await extractData(page, schema);
    expect(result.itemCount).toBeGreaterThanOrEqual(3);
  });
});
