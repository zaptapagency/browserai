/**
 * Confirmation Gate Registry
 *
 * Sensitive actions (e.g., CAPTCHA solving, which may incur real-provider
 * cost once a real solver is enabled) must be explicitly approved before
 * they execute. The registry issues short-lived, single-use signed tokens
 * describing the pending action; the caller must present that token back
 * on the same action to unlock execution.
 */

import { randomUUID } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { ConfirmationGate } from '@browserai/core';

const DEFAULT_TTL_SECONDS = 5 * 60;

interface ConfirmationTokenClaims {
  jti: string;
  actionType: string;
  details: Record<string, unknown>;
}

export class ConfirmationRegistry {
  private readonly consumed = new Set<string>();

  constructor(
    private readonly secret: string,
    private readonly ttlSeconds: number = DEFAULT_TTL_SECONDS
  ) {}

  /** Issue a signed confirmation gate for a pending sensitive action. */
  request(
    actionType: string,
    reason: string,
    details: Record<string, unknown>
  ): ConfirmationGate {
    const jti = randomUUID();
    const token = jwt.sign({ jti, actionType, details } satisfies ConfirmationTokenClaims, this.secret, {
      expiresIn: this.ttlSeconds,
    });
    const expiresAt = new Date(Date.now() + this.ttlSeconds * 1000).toISOString();

    return {
      requires_confirmation: true,
      action_type: actionType,
      reason,
      details,
      confirm_token: token,
      expires_at: expiresAt,
    };
  }

  /**
   * Verify and consume a confirmation token for the given action type.
   * Throws if the token is invalid, expired, bound to a different action
   * type, or has already been used.
   */
  verify(token: string, actionType: string): void {
    let claims: ConfirmationTokenClaims;
    try {
      claims = jwt.verify(token, this.secret) as ConfirmationTokenClaims & jwt.JwtPayload;
    } catch (err) {
      throw new Error(`Invalid or expired confirmation token: ${(err as Error).message}`);
    }

    if (claims.actionType !== actionType) {
      throw new Error(
        `Confirmation token was issued for action type "${claims.actionType}", not "${actionType}"`
      );
    }
    if (this.consumed.has(claims.jti)) {
      throw new Error('Confirmation token has already been used');
    }
    this.consumed.add(claims.jti);
  }
}
