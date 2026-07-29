/**
 * Proxy Adapter Factory
 *
 * Selects the proxy adapter implementation based on feature flags.
 * Real providers are deferred (post-MVP per project plan): the flag exists
 * so the wiring is real end-to-end, but enabling it without a shipped
 * vendor integration fails loudly rather than silently falling back to a
 * mock (which would misrepresent production traffic as coming through a
 * real proxy).
 */

import { Features, getEnv } from '@browserai/config';
import { ProxyAdapter } from './interface';
import { MockProxyAdapter } from './mock';

export function createProxyAdapter(): ProxyAdapter {
  if (!Features.isRealProxyProviderEnabled()) {
    return new MockProxyAdapter();
  }

  const providerType = getEnv().PROXY_PROVIDER_TYPE;
  if (providerType === 'mock') {
    return new MockProxyAdapter();
  }

  throw new Error(
    `ENABLE_REAL_PROXY_PROVIDER is true with PROXY_PROVIDER_TYPE="${providerType}", but no real ` +
      `proxy provider adapter is implemented yet. Set ENABLE_REAL_PROXY_PROVIDER=false to use the mock adapter.`
  );
}
