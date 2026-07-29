/**
 * Structured Data Extractor
 *
 * Extracts typed data from a live page using a JSON-Schema-like definition.
 *
 * Two extraction strategies (both real, deterministic — no mock data):
 *
 * 1. Selector-driven (precise): when a property provides a `selector`, the
 *    extractor reads text/attribute from matching nodes. For arrays, an
 *    `itemSelector` identifies each row and per-property selectors are scoped
 *    to the row.
 *
 * 2. Heuristic (best-effort): when no selectors are given, the extractor
 *    detects repeating sibling structures for arrays and label/value pairs for
 *    objects. Missing fields are returned as null (never fabricated).
 */

import type { Page } from 'playwright';

export interface ExtractionSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean';
  /** For object type: property name -> schema */
  properties?: Record<string, ExtractionSchema>;
  /** For array type: schema of each item */
  items?: ExtractionSchema;
  /** Optional CSS selector for precise extraction */
  selector?: string;
  /** For arrays: CSS selector identifying each item container */
  itemSelector?: string;
  /** Optional attribute to read instead of text content (e.g., "href") */
  attribute?: string;
}

export interface ExtractionResult {
  data: unknown;
  warnings: string[];
  itemCount: number;
}

/**
 * Extract structured data from the page per the given schema.
 */
export async function extractData(
  page: Page,
  schema: ExtractionSchema
): Promise<ExtractionResult> {
  const warnings: string[] = [];

  const data = await page.evaluate(
    (input: { schema: ExtractionSchema }) => {
      const { schema } = input;
      const collectedWarnings: string[] = [];

      const readValue = (el: Element | null, attribute?: string): string | null => {
        if (!el) return null;
        if (attribute) {
          const attr = el.getAttribute(attribute);
          return attr !== null ? attr.trim() : null;
        }
        const text = (el as HTMLElement).innerText || el.textContent || '';
        return text.trim() || null;
      };

      const coerce = (raw: string | null, type: ExtractionSchema['type']): unknown => {
        if (raw === null) return null;
        if (type === 'number') {
          // Strip currency symbols, thousands separators, keep decimal + sign
          const cleaned = raw.replace(/[^0-9.-]/g, '');
          const num = parseFloat(cleaned);
          return Number.isNaN(num) ? null : num;
        }
        if (type === 'boolean') {
          return /^(true|yes|on|1)$/i.test(raw);
        }
        return raw;
      };

      const extractObject = (
        schema: ExtractionSchema,
        scope: Element | Document
      ): Record<string, unknown> => {
        const result: Record<string, unknown> = {};
        const props = schema.properties ?? {};
        for (const [key, propSchema] of Object.entries(props)) {
          if (propSchema.type === 'array') {
            result[key] = extractArray(propSchema, scope);
            continue;
          }
          if (propSchema.type === 'object') {
            const nestedScope = propSchema.selector
              ? (scope as ParentNode).querySelector(propSchema.selector)
              : scope;
            result[key] = nestedScope
              ? extractObject(propSchema, nestedScope as Element)
              : null;
            continue;
          }
          // Scalar
          let el: Element | null = null;
          if (propSchema.selector) {
            el = (scope as ParentNode).querySelector(propSchema.selector);
          } else {
            // Heuristic: find a descendant whose class/id/text hints the key
            const candidates = Array.from((scope as ParentNode).querySelectorAll('*'));
            el =
              candidates.find((c) => {
                const idClass = `${c.id} ${c.className}`.toLowerCase();
                return idClass.includes(key.toLowerCase()) && (c as HTMLElement).innerText;
              }) ?? null;
          }
          if (!el && propSchema.selector) {
            collectedWarnings.push(`No match for "${key}" (selector: ${propSchema.selector})`);
          }
          result[key] = coerce(readValue(el, propSchema.attribute), propSchema.type);
        }
        return result;
      };

      const detectRepeating = (scope: ParentNode): Element[] => {
        // Find the parent whose direct children include the largest group of
        // same-tag siblings — a common pattern for lists/tables/cards.
        const all = Array.from(scope.querySelectorAll('*'));
        let best: { parent: Element; children: Element[] } | null = null;
        const seen = new Set<Element>();
        for (const el of all) {
          const parent = el.parentElement;
          if (!parent || seen.has(parent)) continue;
          seen.add(parent);
          const groups = new Map<string, Element[]>();
          for (const child of Array.from(parent.children)) {
            const key = child.tagName + (child.className ? `.${child.className}` : '');
            const arr = groups.get(key) ?? [];
            arr.push(child);
            groups.set(key, arr);
          }
          for (const group of groups.values()) {
            if (group.length >= 2 && (!best || group.length > best.children.length)) {
              best = { parent, children: group };
            }
          }
        }
        return best?.children ?? [];
      };

      const extractArray = (
        schema: ExtractionSchema,
        scope: Element | Document
      ): unknown[] => {
        const itemSchema = schema.items;
        if (!itemSchema) return [];

        let rows: Element[];
        if (schema.itemSelector) {
          rows = Array.from((scope as ParentNode).querySelectorAll(schema.itemSelector));
        } else {
          rows = detectRepeating(scope as ParentNode);
        }

        return rows.map((row) => {
          if (itemSchema.type === 'object') {
            return extractObject(itemSchema, row);
          }
          return coerce(readValue(row, itemSchema.attribute), itemSchema.type);
        });
      };

      let output: unknown;
      if (schema.type === 'array') {
        output = extractArray(schema, document);
      } else if (schema.type === 'object') {
        const scope = schema.selector
          ? document.querySelector(schema.selector) ?? document
          : document;
        output = extractObject(schema, scope as Element);
      } else {
        const el = schema.selector ? document.querySelector(schema.selector) : document.body;
        output = coerce(readValue(el, schema.attribute), schema.type);
      }

      return { output, warnings: collectedWarnings };
    },
    { schema }
  );

  warnings.push(...data.warnings);

  const itemCount = Array.isArray(data.output) ? data.output.length : data.output === null ? 0 : 1;

  return {
    data: data.output,
    warnings,
    itemCount,
  };
}
