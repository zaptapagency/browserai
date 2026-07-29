/**
 * Task Runner
 *
 * Executes a sequence of actions (a task) against a session's page.
 * - Emits an event after each action so the WebSocket layer can stream progress.
 * - Retries transient action failures with exponential backoff.
 * - Stops on the first unrecoverable failure and returns an error result.
 * - Gates sensitive actions (e.g., solve_captcha) behind an explicit
 *   confirmation token before they are allowed to execute.
 * - Refuses to run automated actions while a session is under human
 *   remote-assist control.
 */

import { EventEmitter } from 'node:events';
import type { Action, ActionResult } from '@browserai/core';
import type { CaptchaAdapter } from '@browserai/providers';
import { executeAction, type ExecutionContext } from './action-executor';
import type { Session } from './session';
import type { ConfirmationRegistry } from './confirmation-registry';

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 100;

/** Action types that must be explicitly confirmed before they execute. */
const ACTIONS_REQUIRING_CONFIRMATION = new Set<Action['type']>(['solve_captcha']);

export interface TaskResult {
  taskId: string;
  status: 'success' | 'error';
  results: ActionResult[];
  error?: string;
  durationMs: number;
}

export interface TaskRunnerEvents {
  action_complete: (result: ActionResult) => void;
}

export interface RunTaskOptions {
  profileName?: string;
  captchaAdapter?: CaptchaAdapter;
  /** Confirmation tokens keyed by action index, for actions requiring confirmation. */
  confirmations?: Record<number, string>;
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class TaskRunner extends EventEmitter {
  constructor(private readonly confirmationRegistry?: ConfirmationRegistry) {
    super();
  }

  /**
   * Run a full task (sequence of actions) on a session.
   */
  async run(
    session: Session,
    taskId: string,
    actions: Action[],
    options: RunTaskOptions = {}
  ): Promise<TaskResult> {
    const start = Date.now();
    const results: ActionResult[] = [];

    if (session.remoteAssistActive) {
      return {
        taskId,
        status: 'error',
        results,
        error: 'Session is under human remote-assist control; automated actions are paused.',
        durationMs: Date.now() - start,
      };
    }

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      const gateResult = this.checkConfirmation(action, i, options.confirmations);
      if (gateResult) {
        results.push(gateResult);
        session.actionCount += 1;
        this.emit('action_complete', gateResult);
        return {
          taskId,
          status: 'error',
          results,
          error: `Action ${i} ("${action.type}") requires confirmation before it can run.`,
          durationMs: Date.now() - start,
        };
      }

      const ctx: ExecutionContext = {
        sessionId: session.id,
        profileName: options.profileName,
        actionCount: session.actionCount,
        startedAtMs: session.startedAtMs,
        captchaAdapter: options.captchaAdapter,
      };

      const result = await this.runWithRetry(session, action, i, ctx);
      results.push(result);
      session.actionCount += 1;
      this.emit('action_complete', result);

      if (result.status === 'error') {
        return {
          taskId,
          status: 'error',
          results,
          error: result.error,
          durationMs: Date.now() - start,
        };
      }
    }

    return {
      taskId,
      status: 'success',
      results,
      durationMs: Date.now() - start,
    };
  }

  /**
   * If the action requires confirmation, validate any provided token. Returns
   * a "skipped" ActionResult carrying a fresh ConfirmationGate when no valid
   * token has been provided yet, or null when the action is clear to run.
   */
  private checkConfirmation(
    action: Action,
    actionIndex: number,
    confirmations?: Record<number, string>
  ): ActionResult | null {
    if (!ACTIONS_REQUIRING_CONFIRMATION.has(action.type) || !this.confirmationRegistry) {
      return null;
    }

    const token = confirmations?.[actionIndex];
    if (!token) {
      const gate = this.confirmationRegistry.request(
        action.type,
        `Action "${action.type}" requires explicit confirmation before executing.`,
        { action_index: actionIndex, action }
      );
      return {
        action_index: actionIndex,
        status: 'skipped',
        result: gate,
        duration_ms: 0,
      };
    }

    try {
      this.confirmationRegistry.verify(token, action.type);
      return null;
    } catch (err) {
      return {
        action_index: actionIndex,
        status: 'error',
        error: (err as Error).message,
        duration_ms: 0,
      };
    }
  }

  /**
   * Execute a single action with exponential-backoff retries.
   */
  private async runWithRetry(
    session: Session,
    action: Action,
    actionIndex: number,
    ctx: ExecutionContext
  ): Promise<ActionResult> {
    let lastError = '';

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await executeAction(session.page, action, actionIndex, ctx);
      } catch (err) {
        lastError = (err as Error).message;
        if (attempt < MAX_RETRIES) {
          await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
        }
      }
    }

    return {
      action_index: actionIndex,
      status: 'error',
      error: `Action "${action.type}" failed after ${MAX_RETRIES + 1} attempts: ${lastError}`,
      duration_ms: 0,
    };
  }
}
