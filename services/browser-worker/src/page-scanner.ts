/**
 * Page Scanner
 *
 * Scans a live Playwright page and emits a compact, indexed representation
 * of interactable elements — the agent-native page state.
 *
 * Key design goals:
 * - Low token overhead (no raw HTML)
 * - Stable integer indices for each element within a scan
 * - Accessible roles + names for agent reasoning
 *
 * The scanner assigns a data attribute (`data-browserai-id`) to each indexed
 * element so that subsequent actions can reliably target the same node.
 */

import type { Page } from 'playwright';
import type { PageElement, PageState } from '@browserai/core';

const SCAN_ATTRIBUTE = 'data-browserai-id';

/**
 * Raw element data extracted from the browser context.
 * Mirrors the shape produced by the in-page evaluation below.
 */
interface RawElement {
  id: number;
  role: string;
  name: string;
  attributes: Record<string, string>;
  visible: boolean;
  interactable: boolean;
  rect: { x: number; y: number; width: number; height: number };
}

/**
 * Scan the page and return the indexed page state.
 *
 * @param page - Playwright page to scan
 * @param sessionId - Session identifier (for memory context)
 * @param context - Optional execution context for the memory block
 */
export async function scanPage(
  page: Page,
  sessionId: string,
  context: {
    profileName?: string;
    lastAction?: string;
    actionCount: number;
    startedAtMs: number;
  }
): Promise<PageState> {
  const viewport = page.viewportSize() ?? { width: 1280, height: 720 };

  // Extract elements inside the browser context. This runs in the page,
  // so it must be self-contained (no external references).
  const rawElements = await page.evaluate((scanAttr: string) => {
    const INTERACTABLE_ROLES = new Set([
      'link',
      'button',
      'textbox',
      'searchbox',
      'checkbox',
      'radio',
      'combobox',
      'listbox',
      'menuitem',
      'tab',
      'switch',
      'slider',
      'spinbutton',
    ]);

    /** Derive an ARIA-ish role from a DOM element. */
    const getRole = (el: Element): string => {
      const explicit = el.getAttribute('role');
      if (explicit) return explicit;

      const tag = el.tagName.toLowerCase();
      switch (tag) {
        case 'a':
          return el.hasAttribute('href') ? 'link' : 'generic';
        case 'button':
          return 'button';
        case 'input': {
          const type = (el.getAttribute('type') || 'text').toLowerCase();
          if (type === 'checkbox') return 'checkbox';
          if (type === 'radio') return 'radio';
          if (type === 'submit' || type === 'button') return 'button';
          if (type === 'search') return 'searchbox';
          if (type === 'file') return 'file';
          return 'textbox';
        }
        case 'textarea':
          return 'textbox';
        case 'select':
          return 'combobox';
        case 'h1':
        case 'h2':
        case 'h3':
        case 'h4':
        case 'h5':
        case 'h6':
          return 'heading';
        case 'img':
          return 'img';
        case 'nav':
          return 'navigation';
        default:
          return 'generic';
      }
    };

    /** Derive an accessible name for an element. */
    const getName = (el: Element): string => {
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel.trim();

      const labelledBy = el.getAttribute('aria-labelledby');
      if (labelledBy) {
        const labelEl = document.getElementById(labelledBy);
        if (labelEl?.textContent) return labelEl.textContent.trim();
      }

      const htmlEl = el as HTMLElement;
      if (el.tagName.toLowerCase() === 'input') {
        const input = el as HTMLInputElement;
        if (input.placeholder) return input.placeholder.trim();
        if (input.value && input.type !== 'password') return input.value.trim();
        // Associated <label>
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label?.textContent) return label.textContent.trim();
        }
      }

      if (el.tagName.toLowerCase() === 'img') {
        const alt = el.getAttribute('alt');
        if (alt) return alt.trim();
      }

      const text = htmlEl.innerText || el.textContent || '';
      return text.trim().slice(0, 120);
    };

    const isVisible = (el: Element): boolean => {
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
        return false;
      }
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    };

    const isInteractable = (el: Element, role: string): boolean => {
      if (!INTERACTABLE_ROLES.has(role)) return false;
      const htmlEl = el as HTMLElement;
      if ((htmlEl as HTMLButtonElement).disabled) return false;
      if (el.getAttribute('aria-disabled') === 'true') return false;
      return true;
    };

    // Clear any prior scan attributes
    document.querySelectorAll(`[${scanAttr}]`).forEach((el) => el.removeAttribute(scanAttr));

    const candidates = Array.from(
      document.querySelectorAll(
        'a, button, input, textarea, select, [role], h1, h2, h3, h4, h5, h6, img, nav'
      )
    );

    const results: Array<{
      id: number;
      role: string;
      name: string;
      attributes: Record<string, string>;
      visible: boolean;
      interactable: boolean;
      rect: { x: number; y: number; width: number; height: number };
    }> = [];

    let index = 0;
    for (const el of candidates) {
      const role = getRole(el);
      const visible = isVisible(el);
      if (!visible) continue;

      const name = getName(el);
      const interactable = isInteractable(el, role);

      // Skip nameless, non-interactable generics to reduce token noise
      if (!interactable && (role === 'generic' || name.length === 0)) continue;

      const rect = el.getBoundingClientRect();
      const attributes: Record<string, string> = {};
      const href = el.getAttribute('href');
      if (href) attributes.href = href;
      const placeholder = el.getAttribute('placeholder');
      if (placeholder) attributes.placeholder = placeholder;
      const type = el.getAttribute('type');
      if (type) attributes.type = type;
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) attributes['aria-label'] = ariaLabel;

      el.setAttribute(scanAttr, String(index));

      results.push({
        id: index,
        role,
        name,
        attributes,
        visible,
        interactable,
        rect: {
          x: Math.round(rect.x),
          y: Math.round(rect.y),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        },
      });

      index += 1;
    }

    return results;
  }, SCAN_ATTRIBUTE);

  const elements: PageElement[] = (rawElements as RawElement[]).map((el) => ({
    id: el.id,
    role: el.role,
    name: el.name,
    attributes: el.attributes,
    visible: el.visible,
    interactable: el.interactable,
    rect: el.rect,
  }));

  const interactableCount = elements.filter((el) => el.interactable).length;

  return {
    protocolVersion: '1.0',
    url: page.url(),
    title: await page.title(),
    viewport,
    elements,
    interactableCount,
    memory: {
      sessionId,
      profileName: context.profileName,
      lastAction: context.lastAction,
      actionCount: context.actionCount,
      elapsedMs: Date.now() - context.startedAtMs,
    },
  };
}

/**
 * Build a Playwright selector that targets an element by its scan index.
 */
export function selectorForId(id: number): string {
  return `[${SCAN_ATTRIBUTE}="${id}"]`;
}

export { SCAN_ATTRIBUTE };
