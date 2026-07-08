/**
 * Mock Proxy Adapter
 *
 * Returns localhost bypass (no actual proxy).
 * Safe for development and testing.
 * Use in production by default; enable real providers via feature flag.
 */

import { ProxyAdapter, ProxyConnection, ProxyRotationConfig } from './interface';

export class MockProxyAdapter extends ProxyAdapter {
  name = 'mock';

  async getProxy(sessionId: string, config: ProxyRotationConfig): Promise<ProxyConnection> {
    return {
      host: '127.0.0.1',
      port: 3128,
      type: 'http',
    };
  }

  async rotateProxy(sessionId: string): Promise<ProxyConnection> {
    return this.getProxy(sessionId, {});
  }

  async reportBlocked(sessionId: string, proxy: ProxyConnection): Promise<void> {
    console.warn(`[Mock Proxy] Session ${sessionId} reported proxy ${proxy.host} as blocked`);
  }

  async isHealthy(): Promise<boolean> {
    return true;
  }
}
