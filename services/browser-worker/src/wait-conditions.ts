/**
 * Wait Condition Parser & Evaluator
 *
 * Supports the condition mini-language from the action protocol:
 *   - text_contains_<TEXT>   → page contains the given text
 *   - element_visible_<ID>   → scanned element ID is visible
 *   - element_gone_<ID>      → scanned element ID is no longer present
 *   - page_load              → network is idle
 *   - url_matches_<PATTERN>  → current URL matches the (regex) pattern
 */

import type { Page } from 'playwright';
import { selectorForId } from './page-scanner';

export type WaitCondition =
  | { kind: 'text_contains'; text: string }
  | { kind: 'element_visible'; id: number }
  | { kind: 'element_gone'; id: number }
  | { kind: 'page_load' }
  | { kind: 'url_matches'; pattern: string };

/**
 * Parse a raw condition string into a structured WaitCondition.
 * Throws on unrecognized syntax.
 */
export function parseCondition(raw: string): WaitCondition {
  if (raw === 'page_load') {
    return { kind: 'page_load' };
  }
  if (raw.startsWith('text_contains_')) {
    return { kind: 'text_contains', text: raw.slice('text_contains_'.length) };
  }
  if (raw.startsWith('element_visible_')) {
    const id = Number(raw.slice('element_visible_'.length));
    if (Number.isNaN(id)) throw new Error(`Invalid element id in condition: ${raw}`);
    return { kind: 'element_visible', id };
  }
  if (raw.startsWith('element_gone_')) {
    const id = Number(raw.slice('element_gone_'.length));
    if (Number.isNaN(id)) throw new Error(`Invalid element id in condition: ${raw}`);
    return { kind: 'element_gone', id };
  }
  if (raw.startsWith('url_matches_')) {
    return { kind: 'url_matches', pattern: raw.slice('url_matches_'.length) };
  }
  throw new Error(`Unrecognized wait condition: ${raw}`);
}

/**
 * Evaluate a condition against the page. Resolves when satisfied or rejects on timeout.
 */
export async function waitForCondition(
  page: Page,
  condition: WaitCondition,
  timeoutMs: number
): Promise<void> {
  switch (condition.kind) {
    case 'page_load':
      await page.waitForLoadState('networkidle', { timeout: timeoutMs });
      return;

    case 'text_contains':
      await page.waitForFunction(
        (text: string) => document.body.innerText.includes(text),
        condition.text,
        { timeout: timeoutMs, polling: 200 }
      );
      return;

    case 'element_visible':
      await page.waitForSelector(selectorForId(condition.id), {
        state: 'visible',
        timeout: timeoutMs,
      });
      return;

    case 'element_gone':
      await page.waitForSelector(selectorForId(condition.id), {
        state: 'detached',
        timeout: timeoutMs,
      });
      return;

    case 'url_matches': {
      const regex = new RegExp(condition.pattern);
      await page.waitForFunction(
        (pattern: string) => new RegExp(pattern).test(window.location.href),
        condition.pattern,
        { timeout: timeoutMs, polling: 200 }
      );
      void regex; // constructed early to fail fast on invalid patterns
      return;
    }
  }
}
