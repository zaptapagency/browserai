/**
 * Live-View WebSocket Server
 *
 * Streams session events to authorized clients:
 *   - session_status changes
 *   - action_complete results (page state, extraction output)
 *   - log lines (browser console, page errors, lifecycle)
 *   - periodic screenshots (live view frames)
 *
 * Clients connect to:  ws://host:port/sessions/:sessionId/stream?token=<jwt>
 * The token must be a valid live-view token bound to the session id.
 *
 * Also hosts the remote-assist control channel:
 *   ws://host:port/sessions/:sessionId/control?token=<remote-assist-jwt>
 * Only one control connection is allowed per session at a time, and input is
 * only applied while the session is marked `remoteAssistActive` (set via the
 * POST /internal/sessions/:id/remote-assist endpoint). Disconnecting the
 * control socket automatically hands control back to automation.
 */

import { WebSocketServer, WebSocket, type RawData } from 'ws';
import type { Server, IncomingMessage } from 'node:http';
import type { Duplex } from 'node:stream';
import { RemoteAssistInputSchema, type ActionResult, type WSMessage } from '@browserai/core';
import type { SessionManager, SessionLogEvent } from './session';
import { verifyLiveViewToken } from './live-view-token';
import { verifyRemoteAssistToken } from './remote-assist-token';

/** Normalize a ws message payload (Buffer | ArrayBuffer | Buffer[]) into a UTF-8 string. */
function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf-8');
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf-8');
  }
  return data.toString('utf-8');
}

interface ClientRegistry {
  [sessionId: string]: Set<WebSocket>;
}

export class LiveViewServer {
  private readonly wss: WebSocketServer;
  private readonly clients: ClientRegistry = {};
  private readonly screenshotTimers = new Map<string, NodeJS.Timeout>();
  private readonly controlClients = new Map<string, WebSocket>();

  constructor(
    server: Server,
    private readonly sessionManager: SessionManager,
    private readonly secret: string,
    private readonly screenshotIntervalMs = 2000
  ) {
    this.wss = new WebSocketServer({ noServer: true });
    this.attachUpgradeHandler(server);
    this.wireSessionEvents();
  }

  private attachUpgradeHandler(server: Server): void {
    server.on('upgrade', (req: IncomingMessage, socket: Duplex, head: Buffer) => {
      let url: URL;
      try {
        url = new URL(req.url ?? '', `http://${req.headers.host}`);
      } catch {
        socket.destroy();
        return;
      }

      const streamMatch = url.pathname.match(/^\/sessions\/([^/]+)\/stream$/);
      if (streamMatch) {
        this.handleStreamUpgrade(streamMatch[1], url, req, socket, head);
        return;
      }

      const controlMatch = url.pathname.match(/^\/sessions\/([^/]+)\/control$/);
      if (controlMatch) {
        this.handleControlUpgrade(controlMatch[1], url, req, socket, head);
        return;
      }

      socket.destroy();
    });
  }

  private handleStreamUpgrade(
    sessionId: string,
    url: URL,
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): void {
    const token = url.searchParams.get('token');
    if (!token) {
      socket.destroy();
      return;
    }

    let claims;
    try {
      claims = verifyLiveViewToken(token, this.secret);
    } catch {
      socket.destroy();
      return;
    }

    if (claims.sessionId !== sessionId) {
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.registerClient(sessionId, ws);
    });
  }

  private handleControlUpgrade(
    sessionId: string,
    url: URL,
    req: IncomingMessage,
    socket: Duplex,
    head: Buffer
  ): void {
    const token = url.searchParams.get('token');
    if (!token) {
      socket.destroy();
      return;
    }

    let claims;
    try {
      claims = verifyRemoteAssistToken(token, this.secret);
    } catch {
      socket.destroy();
      return;
    }

    if (claims.sessionId !== sessionId) {
      socket.destroy();
      return;
    }

    if (!this.sessionManager.hasSession(sessionId)) {
      socket.destroy();
      return;
    }

    const session = this.sessionManager.getSession(sessionId);
    if (!session.remoteAssistActive) {
      socket.destroy();
      return;
    }

    if (this.controlClients.has(sessionId)) {
      // Only one operator may control a session at a time.
      socket.destroy();
      return;
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.registerControlClient(sessionId, ws);
    });
  }

  private registerClient(sessionId: string, ws: WebSocket): void {
    if (!this.clients[sessionId]) {
      this.clients[sessionId] = new Set();
    }
    this.clients[sessionId].add(ws);

    // Send an initial status if the session exists
    if (this.sessionManager.hasSession(sessionId)) {
      const session = this.sessionManager.getSession(sessionId);
      this.sendTo(ws, {
        type: 'session_status',
        data: { status: session.status, session_id: sessionId },
      });
      this.startScreenshotStream(sessionId);
    }

    ws.on('close', () => {
      this.clients[sessionId]?.delete(ws);
      if (this.clients[sessionId]?.size === 0) {
        this.stopScreenshotStream(sessionId);
      }
    });
  }

  private registerControlClient(sessionId: string, ws: WebSocket): void {
    this.controlClients.set(sessionId, ws);

    ws.on('message', (raw: RawData) => {
      void this.handleControlMessage(sessionId, ws, raw);
    });

    ws.on('close', () => {
      this.controlClients.delete(sessionId);
      if (!this.sessionManager.hasSession(sessionId)) return;
      const session = this.sessionManager.getSession(sessionId);
      if (session.remoteAssistActive) {
        session.remoteAssistActive = false;
        this.broadcastRemoteAssistStatus(sessionId, false);
      }
    });
  }

  /** Parse and apply a single remote-assist input message to the session's page. */
  private async handleControlMessage(sessionId: string, ws: WebSocket, raw: RawData): Promise<void> {
    if (!this.sessionManager.hasSession(sessionId)) return;
    const session = this.sessionManager.getSession(sessionId);
    if (!session.remoteAssistActive) return;

    let parsed: unknown;
    try {
      const text = rawDataToString(raw);
      parsed = JSON.parse(text);
    } catch {
      this.sendControlError(ws, 'invalid_json', 'Message was not valid JSON');
      return;
    }

    const result = RemoteAssistInputSchema.safeParse(parsed);
    if (!result.success) {
      this.sendControlError(ws, 'invalid_input', 'Message did not match remote-assist input schema');
      return;
    }

    const input = result.data;
    try {
      switch (input.type) {
        case 'mouse_move':
          await session.page.mouse.move(input.x, input.y);
          break;
        case 'mouse_down':
          await session.page.mouse.down({ button: input.button });
          break;
        case 'mouse_up':
          await session.page.mouse.up({ button: input.button });
          break;
        case 'mouse_click':
          await session.page.mouse.click(input.x, input.y, { button: input.button });
          break;
        case 'scroll':
          await session.page.mouse.wheel(input.deltaX, input.deltaY);
          break;
        case 'key_press':
          await session.page.keyboard.press(input.key);
          break;
        case 'type_text':
          await session.page.keyboard.type(input.text);
          break;
      }
    } catch (err) {
      this.sendControlError(ws, 'input_failed', (err as Error).message);
    }
  }

  private sendControlError(ws: WebSocket, code: string, message: string): void {
    this.sendTo(ws, { type: 'error', data: { code, message } });
  }

  private wireSessionEvents(): void {
    this.sessionManager.on('log', (event: SessionLogEvent) => {
      this.broadcast(event.sessionId, {
        type: 'log',
        data: { level: event.level, message: event.message, timestamp: event.timestamp },
      });
    });

    this.sessionManager.on(
      'session_status',
      (event: { sessionId: string; status: string }) => {
        this.broadcast(event.sessionId, {
          type: 'session_status',
          data: { status: event.status, session_id: event.sessionId },
        });
        if (event.status === 'closed') {
          this.stopScreenshotStream(event.sessionId);
        }
      }
    );
  }

  /** Broadcast an action result to a session's subscribers. */
  broadcastActionResult(sessionId: string, result: ActionResult): void {
    this.broadcast(sessionId, { type: 'action_complete', data: result });
  }

  /** Broadcast task completion. */
  broadcastTaskComplete(sessionId: string, taskId: string, status: string): void {
    this.broadcast(sessionId, { type: 'task_complete', data: { task_id: taskId, status } });
  }

  /** Broadcast a remote-assist activation/deactivation to a session's subscribers. */
  broadcastRemoteAssistStatus(sessionId: string, active: boolean): void {
    this.broadcast(sessionId, {
      type: 'remote_assist_status',
      data: { session_id: sessionId, active },
    });
  }

  /** Whether a remote-assist control client is currently connected for a session. */
  hasControlConnection(sessionId: string): boolean {
    return this.controlClients.has(sessionId);
  }

  /** Forcibly disconnect a session's remote-assist control client, if any. */
  closeControlConnection(sessionId: string): void {
    const ws = this.controlClients.get(sessionId);
    if (ws) {
      ws.close();
      this.controlClients.delete(sessionId);
    }
  }

  private startScreenshotStream(sessionId: string): void {
    if (this.screenshotTimers.has(sessionId)) return;

    const timer = setInterval(() => {
      void this.pushScreenshot(sessionId);
    }, this.screenshotIntervalMs);
    this.screenshotTimers.set(sessionId, timer);
  }

  private stopScreenshotStream(sessionId: string): void {
    const timer = this.screenshotTimers.get(sessionId);
    if (timer) {
      clearInterval(timer);
      this.screenshotTimers.delete(sessionId);
    }
  }

  private async pushScreenshot(sessionId: string): Promise<void> {
    if (!this.sessionManager.hasSession(sessionId)) {
      this.stopScreenshotStream(sessionId);
      return;
    }
    if (!this.clients[sessionId] || this.clients[sessionId].size === 0) return;

    try {
      const session = this.sessionManager.getSession(sessionId);
      const buffer = await session.page.screenshot({ type: 'jpeg', quality: 50 });
      const dataUrl = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      this.broadcast(sessionId, {
        type: 'artifact',
        data: { type: 'live_frame', url: dataUrl, size_bytes: buffer.length },
      });
    } catch {
      // Session may be navigating; skip this frame silently
    }
  }

  private broadcast(sessionId: string, message: WSMessage): void {
    const subscribers = this.clients[sessionId];
    if (!subscribers) return;
    for (const ws of subscribers) {
      this.sendTo(ws, message);
    }
  }

  private sendTo(ws: WebSocket, message: WSMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  close(): void {
    for (const timer of this.screenshotTimers.values()) {
      clearInterval(timer);
    }
    this.screenshotTimers.clear();
    for (const ws of this.controlClients.values()) {
      ws.close();
    }
    this.controlClients.clear();
    this.wss.close();
  }
}
