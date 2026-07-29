import { describe, it, expect } from 'vitest';
import { ConfirmationRegistry } from '../src/confirmation-registry';

describe('ConfirmationRegistry', () => {
  it('issues a confirmation gate with a confirm token bound to the action type', () => {
    const registry = new ConfirmationRegistry('test-secret');
    const gate = registry.request('solve_captcha', 'needs approval', { action_index: 0 });

    expect(gate.requires_confirmation).toBe(true);
    expect(gate.action_type).toBe('solve_captcha');
    expect(gate.reason).toBe('needs approval');
    expect(typeof gate.confirm_token).toBe('string');
    expect(new Date(gate.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('verifies a valid token for the matching action type without throwing', () => {
    const registry = new ConfirmationRegistry('test-secret');
    const gate = registry.request('solve_captcha', 'needs approval', {});
    expect(() => registry.verify(gate.confirm_token, 'solve_captcha')).not.toThrow();
  });

  it('rejects a token presented for a different action type', () => {
    const registry = new ConfirmationRegistry('test-secret');
    const gate = registry.request('solve_captcha', 'needs approval', {});
    expect(() => registry.verify(gate.confirm_token, 'submit')).toThrow(/issued for action type/);
  });

  it('rejects a token that has already been consumed (single-use)', () => {
    const registry = new ConfirmationRegistry('test-secret');
    const gate = registry.request('solve_captcha', 'needs approval', {});
    registry.verify(gate.confirm_token, 'solve_captcha');
    expect(() => registry.verify(gate.confirm_token, 'solve_captcha')).toThrow(/already been used/);
  });

  it('rejects a token signed with a different secret', () => {
    const registryA = new ConfirmationRegistry('secret-a');
    const registryB = new ConfirmationRegistry('secret-b');
    const gate = registryA.request('solve_captcha', 'needs approval', {});
    expect(() => registryB.verify(gate.confirm_token, 'solve_captcha')).toThrow(/Invalid or expired/);
  });

  it('rejects an expired token', () => {
    const registry = new ConfirmationRegistry('test-secret', -1);
    const gate = registry.request('solve_captcha', 'needs approval', {});
    expect(() => registry.verify(gate.confirm_token, 'solve_captcha')).toThrow(/Invalid or expired/);
  });
});
