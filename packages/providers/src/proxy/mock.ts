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

  getProxy(_sessionId: string, _config: ProxyRotationConfig): Promise<ProxyConnection> {
    return Promise.resolve({
      host: '127.0.0.1',
      port: 3128,
      type: 'http',
    });
  }

  rotateProxy(sessionId: string): Promise<ProxyConnection> {
    return this.getProxy(sessionId, {});
  }

  reportBlocked(sessionId: string, proxy: ProxyConnection): Promise<void> {
    console.warn(`[Mock Proxy] Session ${sessionId} reported proxy ${proxy.host} as blocked`);
    return Promise.resolve();
  }

  isHealthy(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
