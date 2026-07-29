/**
 * Remote-Assist Token
 *
 * Short-lived, signed tokens that authorize a client to connect to a
 * session's remote-assist control WebSocket and forward human mouse/keyboard
 * input to the page. Tokens bind to a session id and expire; the control
 * channel additionally requires the session to be marked
 * `remoteAssistActive` before any input is accepted.
 */

import jwt from 'jsonwebtoken';

export interface RemoteAssistClaims {
  sessionId: string;
  organizationId: string;
}

const DEFAULT_TTL_SECONDS = 30 * 60; // 30 minutes

export function signRemoteAssistToken(
  claims: RemoteAssistClaims,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  return jwt.sign(claims, secret, { expiresIn: ttlSeconds });
}

export function verifyRemoteAssistToken(token: string, secret: string): RemoteAssistClaims {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & RemoteAssistClaims;
  return {
    sessionId: decoded.sessionId,
    organizationId: decoded.organizationId,
  };
}
