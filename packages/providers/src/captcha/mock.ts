/**
 * Mock CAPTCHA Solver Adapter
 *
 * Auto-solves any CAPTCHA with a dummy token.
 * Safe for development and testing.
 * Use in production by default; enable real solvers via feature flag.
 */

import { CaptchaAdapter, CaptchaChallenge, CaptchaSolution } from './interface';

export class MockCaptchaAdapter extends CaptchaAdapter {
  name = 'mock';

  async solve(challenge: CaptchaChallenge): Promise<CaptchaSolution> {
    const startTime = Date.now();
    // Simulate solving time (50-200ms)
    const delay = Math.random() * 150 + 50;
    await new Promise((resolve) => setTimeout(resolve, delay));

    return {
      token: `mock_token_${challenge.type}_${Date.now()}`,
      timestamp: new Date(),
      solvedAt: Math.round(Date.now() - startTime),
    };
  }

  reportError(token: string): Promise<void> {
    console.warn(`[Mock CAPTCHA] Token reported as incorrect: ${token}`);
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
