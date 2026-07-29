import { describe, it, expect } from 'vitest';
import { ActionSchema } from '@browserai/core';
import { ACTION_CREDIT_COST } from '../src/action-executor';

describe('ActionSchema', () => {
  it('parses a navigate action and applies the default timeout', () => {
    const parsed = ActionSchema.parse({ type: 'navigate', url: 'https://example.com' });
    expect(parsed).toEqual({
      type: 'navigate',
      url: 'https://example.com',
      timeout_ms: 30000,
    });
  });

  it('rejects a navigate action with a non-URL', () => {
    const result = ActionSchema.safeParse({ type: 'navigate', url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('parses a click action targeting a stable index', () => {
    const parsed = ActionSchema.parse({ type: 'click', id: 3 });
    expect(parsed).toMatchObject({ type: 'click', id: 3, timeout_ms: 5000 });
  });

  it('rejects a click action with a negative index', () => {
    expect(ActionSchema.safeParse({ type: 'click', id: -1 }).success).toBe(false);
  });

  it('parses a type action carrying text', () => {
    const parsed = ActionSchema.parse({ type: 'type', id: 0, text: 'hello' });
    expect(parsed).toMatchObject({ type: 'type', id: 0, text: 'hello' });
  });

  it('rejects an unknown action type', () => {
    expect(ActionSchema.safeParse({ type: 'teleport', id: 0 }).success).toBe(false);
  });

  it('parses an extract action with a schema record', () => {
    const parsed = ActionSchema.parse({
      type: 'extract',
      schema: { type: 'array', items: { type: 'string' } },
    });
    expect(parsed.type).toBe('extract');
  });
});

describe('ACTION_CREDIT_COST', () => {
  it('defines a cost for every action type in the protocol', () => {
    const actionTypes = [
      'navigate',
      'click',
      'type',
      'select',
      'wait',
      'upload',
      'extract',
      'submit',
    ] as const;
    for (const type of actionTypes) {
      expect(ACTION_CREDIT_COST[type]).toBeGreaterThan(0);
    }
  });

  it('prices extraction highest and waiting lowest', () => {
    expect(ACTION_CREDIT_COST.extract).toBeGreaterThan(ACTION_CREDIT_COST.navigate);
    expect(ACTION_CREDIT_COST.wait).toBeLessThanOrEqual(ACTION_CREDIT_COST.type);
  });
});
