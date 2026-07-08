/**
 * @browserai/providers - Adapter interfaces and implementations
 *
 * Provides:
 * - Proxy adapters (residential, datacenter, mock)
 * - CAPTCHA solvers (2Captcha, DeathByCaptcha, mock)
 *
 * All real providers are behind feature flags.
 * Defaults to mocks for safety.
 */

export * from './proxy/index';
export * from './captcha/index';
