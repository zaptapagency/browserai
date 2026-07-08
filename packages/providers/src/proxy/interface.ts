/**
 * Proxy Provider Adapter Interface
 *
 * All proxy providers (residential, datacenter, rotating, mock) implement this interface.
 * Adapters are swapped via configuration, not code changes.
 */

export type ProxyType = 'http' | 'https' | 'socks5';

export interface ProxyConnection {
  host: string;
  port: number;
  type: ProxyType;
  username?: string;
  password?: string;
}

export interface ProxyRotationConfig {
  rotatePerSession?: boolean;
  rotatePerAction?: boolean;
  poolSize?: number;
}

export abstract class ProxyAdapter {
  abstract name: string;

  /**
   * Get a proxy connection for a session
   * May be the same proxy or a different one depending on configuration
   */
  abstract getProxy(sessionId: string, config: ProxyRotationConfig): Promise<ProxyConnection>;

  /**
   * Rotate to the next proxy (if applicable)
   */
  abstract rotateProxy(sessionId: string): Promise<ProxyConnection>;

  /**
   * Report proxy as blocked/non-functional
   */
  abstract reportBlocked(sessionId: string, proxy: ProxyConnection): Promise<void>;

  /**
   * Check if adapter is healthy and has available proxies
   */
  abstract isHealthy(): Promise<boolean>;
}
