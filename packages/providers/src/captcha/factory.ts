/**
 * CAPTCHA Adapter Factory
 *
 * Selects the CAPTCHA solver implementation based on feature flags.
 * Real solvers are deferred (post-MVP per project plan): enabling the flag
 * without a shipped vendor integration fails loudly rather than silently
 * falling back to a mock solver, which would misrepresent unsolved
 * challenges as solved by a real provider.
 */

import { Features, getEnv } from '@browserai/config';
import { CaptchaAdapter } from './interface';
import { MockCaptchaAdapter } from './mock';

export function createCaptchaAdapter(): CaptchaAdapter {
  if (!Features.isRealCaptchaSolverEnabled()) {
    return new MockCaptchaAdapter();
  }

  const solverType = getEnv().CAPTCHA_SOLVER_TYPE;
  if (solverType === 'mock') {
    return new MockCaptchaAdapter();
  }

  throw new Error(
    `ENABLE_REAL_CAPTCHA_SOLVER is true with CAPTCHA_SOLVER_TYPE="${solverType}", but no real ` +
      `CAPTCHA solver adapter is implemented yet. Set ENABLE_REAL_CAPTCHA_SOLVER=false to use the mock adapter.`
  );
}
