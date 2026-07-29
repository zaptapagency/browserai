import { describe, it, expect } from 'vitest';
import { parseCondition } from '../src/wait-conditions';

describe('parseCondition', () => {
  it('parses page_load', () => {
    expect(parseCondition('page_load')).toEqual({ kind: 'page_load' });
  });

  it('parses text_contains with the remainder as text', () => {
    expect(parseCondition('text_contains_Checkout')).toEqual({
      kind: 'text_contains',
      text: 'Checkout',
    });
  });

  it('preserves underscores in the text payload', () => {
    expect(parseCondition('text_contains_Order_Complete')).toEqual({
      kind: 'text_contains',
      text: 'Order_Complete',
    });
  });

  it('parses element_visible with a numeric id', () => {
    expect(parseCondition('element_visible_5')).toEqual({
      kind: 'element_visible',
      id: 5,
    });
  });

  it('parses element_gone with a numeric id', () => {
    expect(parseCondition('element_gone_12')).toEqual({
      kind: 'element_gone',
      id: 12,
    });
  });

  it('parses url_matches with the remainder as pattern', () => {
    expect(parseCondition('url_matches_/checkout')).toEqual({
      kind: 'url_matches',
      pattern: '/checkout',
    });
  });

  it('throws on a non-numeric element id', () => {
    expect(() => parseCondition('element_visible_abc')).toThrow(/Invalid element id/);
  });

  it('throws on unrecognized syntax', () => {
    expect(() => parseCondition('frobnicate_now')).toThrow(/Unrecognized wait condition/);
  });
});
