/**
 * Live-View Token
 *
 * Short-lived, signed tokens that authorize a client to connect to a session's
 * live-view WebSocket. Tokens bind to a session id and expire.
 */

import jwt from 'jsonwebtoken';

export interface LiveViewClaims {
  sessionId: string;
  organizationId: string;
}

const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour

export function signLiveViewToken(
  claims: LiveViewClaims,
  secret: string,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): string {
  return jwt.sign(claims, secret, { expiresIn: ttlSeconds });
}

export function verifyLiveViewToken(token: string, secret: string): LiveViewClaims {
  const decoded = jwt.verify(token, secret) as jwt.JwtPayload & LiveViewClaims;
  return {
    sessionId: decoded.sessionId,
    organizationId: decoded.organizationId,
  };
}
