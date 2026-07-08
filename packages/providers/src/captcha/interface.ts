/**
 * CAPTCHA Solver Adapter Interface
 *
 * All CAPTCHA solvers (2Captcha, DeathByCaptcha, etc.) implement this interface.
 * Adapters are swapped via configuration, not code changes.
 */

export type CaptchaType =
  | 'hcaptcha'
  | 'recaptcha_v2'
  | 'recaptcha_v3'
  | 'cloudflare'
  | 'image_captcha'
  | 'other';

export interface CaptchaChallenge {
  type: CaptchaType;
  siteKey?: string;
  pageUrl: string;
  imageBase64?: string;
}

export interface CaptchaSolution {
  token: string;
  timestamp: Date;
  solvedAt: number; // milliseconds to solve
}

export abstract class CaptchaAdapter {
  abstract name: string;

  /**
   * Solve a CAPTCHA challenge
   */
  abstract solve(challenge: CaptchaChallenge): Promise<CaptchaSolution>;

  /**
   * Report a solution as incorrect
   */
  abstract reportError(token: string): Promise<void>;

  /**
   * Check if solver is healthy and has available capacity
   */
  abstract isHealthy(): Promise<boolean>;
}
