/**
 * BrowserAI Action Protocol v1.0
 *
 * This is the core protocol that defines how agents interact with browser sessions.
 * It's used identically across REST API, WebSocket, SDK, CLI, and MCP server.
 */

import { z } from 'zod';

/**
 * Page Element with stable integer index
 * Designed for low token overhead and agent reasoning
 */
export const PageElementSchema = z.object({
  id: z.number().int().nonnegative().describe('Stable integer index for this element'),
  role: z.string().describe('ARIA role (link, button, textbox, etc.)'),
  name: z.string().describe('Accessible name or text content'),
  attributes: z.record(z.string()).optional().describe('Key HTML attributes (href, placeholder, etc.)'),
  visible: z.boolean().describe('Whether element is visible in viewport'),
  interactable: z.boolean().describe('Whether element can be clicked/typed'),
  rect: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional()
    .describe('Element position and size'),
});

export type PageElement = z.infer<typeof PageElementSchema>;

/**
 * Current Page State Response
 * Low-token JSON of the current page (not raw HTML)
 */
export const PageStateSchema = z.object({
  protocolVersion: z.literal('1.0').default('1.0'),
  url: z.string().url().describe('Current page URL'),
  title: z.string().optional().describe('Page title'),
  viewport: z
    .object({
      width: z.number().int(),
      height: z.number().int(),
    })
    .optional(),
  elements: z.array(PageElementSchema).describe('Interactable elements on the page'),
  interactableCount: z.number().int().nonnegative(),
  memory: z
    .object({
      sessionId: z.string(),
      profileName: z.string().optional(),
      lastAction: z.string().optional(),
      actionCount: z.number().int(),
      elapsedMs: z.number().int(),
    })
    .describe('Session execution context'),
});

export type PageState = z.infer<typeof PageStateSchema>;

/**
 * Action: Navigate to URL
 */
export const NavigateActionSchema = z.object({
  type: z.literal('navigate'),
  url: z.string().url(),
  timeout_ms: z.number().int().optional().default(30000),
});

export type NavigateAction = z.infer<typeof NavigateActionSchema>;

/**
 * Action: Click element by index
 */
export const ClickActionSchema = z.object({
  type: z.literal('click'),
  id: z.number().int().nonnegative(),
  timeout_ms: z.number().int().optional().default(5000),
});

export type ClickAction = z.infer<typeof ClickActionSchema>;

/**
 * Action: Type text into element
 */
export const TypeActionSchema = z.object({
  type: z.literal('type'),
  id: z.number().int().nonnegative(),
  text: z.string(),
  timeout_ms: z.number().int().optional().default(5000),
});

export type TypeAction = z.infer<typeof TypeActionSchema>;

/**
 * Action: Select option in select element
 */
export const SelectActionSchema = z.object({
  type: z.literal('select'),
  id: z.number().int().nonnegative(),
  value: z.string(),
  timeout_ms: z.number().int().optional().default(5000),
});

export type SelectAction = z.infer<typeof SelectActionSchema>;

/**
 * Action: Wait for condition
 * Condition syntax examples:
 *   - "text_contains_Checkout" → wait for text "Checkout" to appear
 *   - "element_visible_5" → wait for element with id=5 to be visible
 *   - "page_load" → wait for network idle
 *   - "url_matches_/checkout" → wait for URL to match pattern
 */
export const WaitActionSchema = z.object({
  type: z.literal('wait'),
  condition: z.string().describe('Condition string (text_contains_X, element_visible_ID, page_load, etc.)'),
  timeout_ms: z.number().int().default(5000),
});

export type WaitAction = z.infer<typeof WaitActionSchema>;

/**
 * Action: Upload file to input
 */
export const UploadActionSchema = z.object({
  type: z.literal('upload'),
  id: z.number().int().nonnegative(),
  file_path: z.string().describe('Local file path to upload'),
  timeout_ms: z.number().int().optional().default(10000),
});

export type UploadAction = z.infer<typeof UploadActionSchema>;

/**
 * Action: Extract structured data from page
 * Schema should be a Zod schema serialized as JSON Schema
 */
export const ExtractActionSchema = z.object({
  type: z.literal('extract'),
  schema: z.record(z.unknown()).describe('JSON Schema for extraction (generated from Zod)'),
  timeout_ms: z.number().int().optional().default(5000),
});

export type ExtractAction = z.infer<typeof ExtractActionSchema>;

/**
 * Action: Submit a form
 */
export const SubmitActionSchema = z.object({
  type: z.literal('submit'),
  id: z.number().int().nonnegative().optional().describe('Optional: specific button to click'),
  timeout_ms: z.number().int().optional().default(5000),
});

export type SubmitAction = z.infer<typeof SubmitActionSchema>;

/**
 * All action types
 */
export const ActionSchema = z.discriminatedUnion('type', [
  NavigateActionSchema,
  ClickActionSchema,
  TypeActionSchema,
  SelectActionSchema,
  WaitActionSchema,
  UploadActionSchema,
  ExtractActionSchema,
  SubmitActionSchema,
]);

export type Action = z.infer<typeof ActionSchema>;

/**
 * Task Definition: sequence of actions
 */
export const TaskDefinitionSchema = z.object({
  actions: z.array(ActionSchema),
  description: z.string().optional(),
});

export type TaskDefinition = z.infer<typeof TaskDefinitionSchema>;

/**
 * Action Result
 */
export const ActionResultSchema = z.object({
  action_index: z.number().int(),
  status: z.enum(['success', 'error', 'skipped']),
  page_state: PageStateSchema.optional(),
  result: z.unknown().optional(),
  error: z.string().optional(),
  duration_ms: z.number().int(),
});

export type ActionResult = z.infer<typeof ActionResultSchema>;

/**
 * Confirmation Gate Response
 * When a sensitive operation requires explicit approval
 */
export const ConfirmationGateSchema = z.object({
  requires_confirmation: z.literal(true),
  action_type: z.string(),
  reason: z.string(),
  details: z.record(z.unknown()),
  confirm_token: z.string(),
  expires_at: z.string().datetime(),
});

export type ConfirmationGate = z.infer<typeof ConfirmationGateSchema>;

/**
 * Confirmation Response
 */
export const ConfirmationResponseSchema = z.object({
  action_type: z.literal('confirm'),
  confirm_token: z.string(),
  confirmed: z.boolean(),
});

export type ConfirmationResponse = z.infer<typeof ConfirmationResponseSchema>;

/**
 * WebSocket message types
 */
export const WSMessageSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('session_status'),
    data: z.object({
      status: z.string(),
      session_id: z.string(),
    }),
  }),
  z.object({
    type: z.literal('action_complete'),
    data: ActionResultSchema,
  }),
  z.object({
    type: z.literal('task_complete'),
    data: z.object({
      task_id: z.string(),
      status: z.string(),
    }),
  }),
  z.object({
    type: z.literal('log'),
    data: z.object({
      level: z.enum(['debug', 'info', 'warn', 'error']),
      message: z.string(),
      timestamp: z.string().datetime(),
    }),
  }),
  z.object({
    type: z.literal('artifact'),
    data: z.object({
      type: z.string(),
      url: z.string(),
      size_bytes: z.number().int().optional(),
    }),
  }),
  z.object({
    type: z.literal('error'),
    data: z.object({
      code: z.string(),
      message: z.string(),
      details: z.record(z.unknown()).optional(),
    }),
  }),
]);

export type WSMessage = z.infer<typeof WSMessageSchema>;
