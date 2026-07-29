import { describe, it, expect } from 'vitest';
import { signRemoteAssistToken, verifyRemoteAssistToken } from '../src/remote-assist-token';

describe('remote-assist token', () => {
  it('round-trips claims through sign and verify', () => {
    const token = signRemoteAssistToken(
      { sessionId: 'sess-1', organizationId: 'org-1' },
      'test-secret'
    );
    const claims = verifyRemoteAssistToken(token, 'test-secret');
    expect(claims).toEqual({ sessionId: 'sess-1', organizationId: 'org-1' });
  });

  it('rejects a token signed with a different secret', () => {
    const token = signRemoteAssistToken({ sessionId: 'sess-1', organizationId: 'org-1' }, 'secret-a');
    expect(() => verifyRemoteAssistToken(token, 'secret-b')).toThrow();
  });

  it('rejects an expired token', () => {
    const token = signRemoteAssistToken(
      { sessionId: 'sess-1', organizationId: 'org-1' },
      'test-secret',
      -1
    );
    expect(() => verifyRemoteAssistToken(token, 'test-secret')).toThrow();
  });
});
