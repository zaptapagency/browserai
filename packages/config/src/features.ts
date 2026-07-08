/**
 * Feature Flags
 * Centralized feature toggles for the platform
 */

import { getEnv } from './env';

export class Features {
  /**
   * Real CAPTCHA solver enabled
   * When false, always uses mock solver
   */
  static isRealCaptchaSolverEnabled(): boolean {
    return getEnv().ENABLE_REAL_CAPTCHA_SOLVER;
  }

  /**
   * Real proxy provider enabled
   * When false, always uses mock proxy (localhost bypass)
   */
  static isRealProxyProviderEnabled(): boolean {
    return getEnv().ENABLE_REAL_PROXY_PROVIDER;
  }

  /**
   * Sentry error tracking enabled
   */
  static isSentryEnabled(): boolean {
    return getEnv().ENABLE_SENTRY;
  }

  /**
   * Email notifications enabled
   */
  static isEmailNotificationsEnabled(): boolean {
    return getEnv().ENABLE_EMAIL_NOTIFICATIONS;
  }

  /**
   * Demo mode enabled (pre-recorded flows, sandbox data)
   */
  static isDemoModeEnabled(): boolean {
    return getEnv().FEATURE_DEMO_MODE;
  }

  /**
   * Skills marketplace enabled
   */
  static isSkillMarketplaceEnabled(): boolean {
    return getEnv().FEATURE_SKILL_MARKETPLACE;
  }

  /**
   * Enterprise SSO (WorkOS) enabled
   */
  static isEnterpriseSSOEnabled(): boolean {
    return getEnv().FEATURE_ENTERPRISE_SSO;
  }

  /**
   * Development mode (faster, more logging)
   */
  static isDevelopment(): boolean {
    return getEnv().NODE_ENV === 'development';
  }

  /**
   * Production mode
   */
  static isProduction(): boolean {
    return getEnv().NODE_ENV === 'production';
  }

  /**
   * Test mode
   */
  static isTest(): boolean {
    return getEnv().NODE_ENV === 'test';
  }
}
