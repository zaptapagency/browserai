/**
 * Action Executor
 *
 * Executes a single action from the action protocol against a Playwright page.
 * Every action returns an ActionResult with timing, and (for navigating
 * actions) a fresh page state produced by the scanner.
 *
 * Actions target the stable integer indices assigned by the page scanner.
 * A rescan is performed before index-targeted actions to ensure the selector
 * map is current.
 */

import type { Page } from 'playwright';
import type { Action, ActionResult, PageState } from '@browserai/core';
import type { CaptchaAdapter } from '@browserai/providers';
import { scanPage, selectorForId } from './page-scanner';
import { extractData, type ExtractionSchema } from './extractor';
import { parseCondition, waitForCondition } from './wait-conditions';

export interface ExecutionContext {
  sessionId: string;
  profileName?: string;
  actionCount: number;
  startedAtMs: number;
  captchaAdapter?: CaptchaAdapter;
}

/** Credit cost per action type (base cost). */
export const ACTION_CREDIT_COST: Record<Action['type'], number> = {
  navigate: 5,
  click: 5,
  type: 3,
  select: 3,
  wait: 2,
  upload: 10,
  extract: 20,
  submit: 5,
  solve_captcha: 15,
};

/**
 * Execute a single action and return its result.
 * Throws are converted into an error ActionResult by the caller (task runner).
 */
export async function executeAction(
  page: Page,
  action: Action,
  actionIndex: number,
  ctx: ExecutionContext
): Promise<ActionResult> {
  const start = Date.now();

  const buildState = (): Promise<PageState> =>
    scanPage(page, ctx.sessionId, {
      profileName: ctx.profileName,
      lastAction: action.type,
      actionCount: ctx.actionCount,
      startedAtMs: ctx.startedAtMs,
    });

  const ok = (state?: PageState, result?: unknown): ActionResult => ({
    action_index: actionIndex,
    status: 'success',
    page_state: state,
    result,
    duration_ms: Date.now() - start,
  });

  switch (action.type) {
    case 'navigate': {
      await page.goto(action.url, {
        waitUntil: 'domcontentloaded',
        timeout: action.timeout_ms,
      });
      return ok(await buildState());
    }

    case 'click': {
      const selector = selectorForId(action.id);
      await page.click(selector, { timeout: action.timeout_ms });
      // Allow potential navigation / DOM updates to settle
      await page
        .waitForLoadState('networkidle', { timeout: action.timeout_ms })
        .catch(() => undefined);
      return ok(await buildState());
    }

    case 'type': {
      const selector = selectorForId(action.id);
      await page.fill(selector, '', { timeout: action.timeout_ms });
      await page.type(selector, action.text, { timeout: action.timeout_ms });
      return ok(await buildState());
    }

    case 'select': {
      const selector = selectorForId(action.id);
      await page.selectOption(selector, action.value, { timeout: action.timeout_ms });
      return ok(await buildState());
    }

    case 'wait': {
      const condition = parseCondition(action.condition);
      await waitForCondition(page, condition, action.timeout_ms);
      return ok(await buildState());
    }

    case 'upload': {
      const selector = selectorForId(action.id);
      await page.setInputFiles(selector, action.file_path, { timeout: action.timeout_ms });
      return ok(await buildState());
    }

    case 'extract': {
      const result = await extractData(page, action.schema as unknown as ExtractionSchema);
      return ok(undefined, {
        data: result.data,
        itemCount: result.itemCount,
        warnings: result.warnings,
      });
    }

    case 'solve_captcha': {
      if (!ctx.captchaAdapter) {
        throw new Error('No CAPTCHA adapter configured for this session');
      }
      const solution = await ctx.captchaAdapter.solve(action.challenge);
      return ok(undefined, {
        token: solution.token,
        solved_at_ms: solution.solvedAt,
      });
    }

    case 'submit': {
      if (action.id !== undefined) {
        await page.click(selectorForId(action.id), { timeout: action.timeout_ms });
      } else {
        // Submit the first form on the page
        const submitted = await page.evaluate(() => {
          const form = document.querySelector('form');
          if (!form) return false;
          if (typeof form.requestSubmit === 'function') {
            form.requestSubmit();
          } else {
            form.submit();
          }
          return true;
        });
        if (!submitted) {
          throw new Error('No form found to submit');
        }
      }
      await page
        .waitForLoadState('networkidle', { timeout: action.timeout_ms })
        .catch(() => undefined);
      return ok(await buildState());
    }
  }
}
