# LLM-Backed Sales Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the keyword-matching chat assistant (`answerFromAgent`) with a Groq tool-calling LLM agent that is grounded in the live product catalog, calculates quotes only via existing catalog functions, and signals the frontend to highlight the lead-capture CTA when buying intent is detected.

**Architecture:** A new `lib/groq-agent.ts` module builds a system prompt from the live catalog + current visualizer state, calls Groq's OpenAI-compatible chat-completions API with three tool schemas (`get_quote`, `find_product`, `list_products`), executes any requested tool calls against `lib/catalog.ts`, loops until Groq returns a final text answer (capped at 3 rounds), and extracts a `[[OFFER_QUOTE]]` marker into a `shouldOfferQuote` boolean. `app/api/assistant/route.ts` is updated to accept full message history and call this module. `app/page.tsx` sends full history and reads `shouldOfferQuote` to add a highlight class to the existing quote CTA. `lib/roomvo-agent.ts` loses `answerFromAgent` (dead code) but keeps `createRoomvoPayload`.

**Tech Stack:** Next.js 16 (App Router), TypeScript, React 19, Groq REST API (`https://api.groq.com/openai/v1/chat/completions`, OpenAI-compatible), no new npm dependencies (native `fetch`).

**Spec:** `docs/superpowers/specs/2026-09-13-llm-sales-agent-design.md`

## Global Constraints

- `GROQ_API_KEY` and `GROQ_MODEL` (default `openai/gpt-oss-120b`) are read from `process.env`, sourced from `.env.local` (already present, gitignored via `.env*` in `.gitignore`). Never log or echo the key value.
- The LLM must never compute or recall prices/quantities itself — all such answers go through tool calls into `lib/catalog.ts` (`createQuote`, `findProduct`, `products`). This is a hard requirement from the spec, not a style preference.
- Tool-call loop is capped at 3 rounds; if unresolved after that, return a generic "let me get back to you on that" reply rather than looping further.
- On any Groq API error (network, non-2xx, timeout), return a generic in-character apology reply with `shouldOfferQuote: false`. No raw provider errors, stack traces, or `error.message` content reaches the client. Log the real error server-side with `console.error`.
- The `[[OFFER_QUOTE]]` marker is always stripped from the text shown to the user, whether or not the marker was present.
- No new UI (no new modals, no auto-opening the lead form). The only frontend behavior change is a CSS highlight state on the existing "Get my quote" CTA.
- No streaming, no persistent conversation storage — matches current fetch-based, client-state-only chat flow.
- This repo has no test framework (`npm run lint` is the only checked-in script beyond dev/build/start). Verification steps in this plan use standalone Node scripts run with `node` (v26+, native TS stripping via `--experimental-strip-types` where needed) or plain `.mjs`, not a test runner.

---

## Task 1: Tool schemas and executor in `lib/groq-agent.ts`

**Files:**
- Create: `lib/groq-agent.ts`
- Create (throwaway verification, delete after use): `scratchpad/verify-tools.mjs` — actually place this in the session scratchpad directory, not the repo, since it's not part of the codebase.

**Interfaces:**
- Consumes: `products`, `findProduct`, `createQuote`, `Surface`, `Product`, `QuoteInput` from `lib/catalog.ts` (all already exported, see `lib/catalog.ts:1-19` for types, `:173-209` for functions).
- Produces:
  - `type ToolName = 'get_quote' | 'find_product' | 'list_products'`
  - `const TOOL_SCHEMAS: { type: 'function'; function: { name: string; description: string; parameters: object } }[]` — the Groq/OpenAI tool definitions, exported for use in Task 2.
  - `function executeTool(name: string, args: Record<string, unknown>): unknown` — exported, dispatches to catalog functions, returns JSON-serializable results (never throws — catches internally and returns `{ error: string }` shaped objects on bad input).

This task has no network calls — it's pure, testable logic.

- [ ] **Step 1: Write `lib/groq-agent.ts` with tool schemas and `executeTool`**

```typescript
import { createQuote, findProduct, products, Surface } from '@/lib/catalog';

export type ToolName = 'get_quote' | 'find_product' | 'list_products';

export const TOOL_SCHEMAS = [
  {
    type: 'function' as const,
    function: {
      name: 'get_quote',
      description:
        'Calculate the exact material and installation quote for the room, given the selected floor and wall products, room area, and wastage percentage. Always use this for any price or total cost question — never estimate the total yourself.',
      parameters: {
        type: 'object',
        properties: {
          floorProductId: { type: 'string', description: 'Product id of the selected floor tile' },
          wallProductId: { type: 'string', description: 'Product id of the selected wall tile' },
          area: { type: 'number', description: 'Room floor area in square meters' },
          wastage: { type: 'number', description: 'Wastage percentage, 0-25' },
        },
        required: ['floorProductId', 'wallProductId', 'area', 'wastage'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'find_product',
      description:
        'Look up a specific product by brand, code, or title keyword. Use this to answer questions about a specific product\'s price, finish, size, material, or stock level.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Brand, product code, or title keyword to search for' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'list_products',
      description:
        'List all available products for a given surface (floors or walls), with price, size, finish and stock. Use this for browsing, comparison, or budget questions across multiple products.',
      parameters: {
        type: 'object',
        properties: {
          surface: { type: 'string', enum: ['floors', 'walls'], description: 'Which surface to list products for' },
        },
        required: ['surface'],
      },
    },
  },
];

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

export function executeTool(name: string, args: Record<string, unknown>): unknown {
  try {
    if (name === 'get_quote') {
      return createQuote({
        floorProductId: asString(args.floorProductId),
        wallProductId: asString(args.wallProductId),
        area: asNumber(args.area),
        wastage: asNumber(args.wastage),
      });
    }

    if (name === 'find_product') {
      const query = asString(args.query).toLowerCase();
      const matches = products.filter((product) =>
        `${product.brand} ${product.code} ${product.title}`.toLowerCase().includes(query)
      );
      if (matches.length === 0) return { error: `No product found matching "${query}"` };
      return matches;
    }

    if (name === 'list_products') {
      const surface = asString(args.surface) as Surface;
      return products.filter((product) => product.surface === surface);
    }

    return { error: `Unknown tool: ${name}` };
  } catch {
    return { error: `Failed to execute tool "${name}" with the given arguments.` };
  }
}
```

- [ ] **Step 2: Verify `executeTool` behavior with a standalone script**

Create `/private/tmp/claude-501/-Users-anshitabhasin-Desktop-Personal-hardware-ai-agent/2dd5705c-72ca-481f-9222-b85c066f746a/scratchpad/verify-tools.mjs` (adjust to the current session's scratchpad path):

```javascript
import { executeTool } from '/Users/anshitabhasin/Desktop/Personal/hardware-ai-agent/lib/groq-agent.ts';

const quote = executeTool('get_quote', { floorProductId: 'betr670', wallProductId: 'bruae543', area: 42, wastage: 8 });
console.log('get_quote:', quote);
if (typeof quote.total !== 'number' || quote.total <= 0) throw new Error('get_quote failed: ' + JSON.stringify(quote));

const found = executeTool('find_product', { query: 'oak' });
console.log('find_product:', found);
if (!Array.isArray(found) || found[0].code !== 'WOOD924') throw new Error('find_product failed: ' + JSON.stringify(found));

const notFound = executeTool('find_product', { query: 'zzzznope' });
console.log('find_product (miss):', notFound);
if (!notFound.error) throw new Error('find_product should return an error for no match');

const listed = executeTool('list_products', { surface: 'walls' });
console.log('list_products count:', listed.length);
if (!Array.isArray(listed) || listed.length === 0 || listed.some((p) => p.surface !== 'walls')) {
  throw new Error('list_products failed: ' + JSON.stringify(listed));
}

console.log('ALL PASS');
```

Run: `node --experimental-strip-types /path/to/scratchpad/verify-tools.mjs`
Expected: prints each result, ends with `ALL PASS`, exit code 0.

- [ ] **Step 3: Commit**

```bash
git add lib/groq-agent.ts
git commit -m "Add tool schemas and executor for the sales agent"
```

---

## Task 2: System prompt builder and Groq call loop

**Files:**
- Modify: `lib/groq-agent.ts` (append to the file from Task 1)

**Interfaces:**
- Consumes: `TOOL_SCHEMAS`, `executeTool` from Task 1 (same file); `products`, `findProduct`, `createQuote` from `lib/catalog.ts`; `VisualizerState` type currently defined in `lib/roomvo-agent.ts:3-7` — this task defines its own equivalent input type locally to avoid a premature cross-import (see below).
- Produces:
  - `type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; tool_call_id?: string; tool_calls?: unknown[] }`
  - `type AgentState = { area: number; wastage: number; floorProductId: string; wallProductId: string }`
  - `type AgentResult = { reply: string; shouldOfferQuote: boolean }`
  - `async function runAgent(messages: { role: 'user' | 'assistant'; text: string }[], state: AgentState): Promise<AgentResult>` — exported, the main entry point Task 3 calls.

Note on `AgentState`: it's intentionally narrower than `VisualizerState` (no `selectedProductId`/`compareProductId`/`prompt`) because the agent only needs area/wastage/floor/wall to build the system prompt and call `get_quote` — this keeps `lib/groq-agent.ts` decoupled from `lib/roomvo-agent.ts`.

- [ ] **Step 1: Append system prompt builder, Groq call helper, and `runAgent` to `lib/groq-agent.ts`**

```typescript
export type ChatMessage = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
};

export type AgentState = {
  area: number;
  wastage: number;
  floorProductId: string;
  wallProductId: string;
};

export type AgentResult = {
  reply: string;
  shouldOfferQuote: boolean;
};

const OFFER_QUOTE_MARKER = '[[OFFER_QUOTE]]';
const MAX_TOOL_ROUNDS = 3;

function buildSystemPrompt(state: AgentState): string {
  const floorProduct = findProduct(state.floorProductId, 'floors');
  const wallProduct = findProduct(state.wallProductId, 'walls');
  const quote = createQuote(state);
  const catalogJson = JSON.stringify(
    products.map(({ id, brand, code, title, surface, price, size, material, finish, stock }) => ({
      id, brand, code, title, surface, price, size, material, finish, stock,
    }))
  );

  return [
    'You are RoomStyle AI, a tile and flooring sales advisor embedded in a room visualizer app.',
    'You help customers choose products, understand pricing, and move toward getting a final quote from a specialist.',
    'Be concise, warm, and honest. Never invent a product, price, size, or stock level that is not in the catalog below.',
    'For ANY question involving a price, total cost, quantity, cartons, or stock level, you MUST call the appropriate tool (get_quote, find_product, list_products) rather than computing or recalling the number yourself.',
    '',
    `Full product catalog (JSON): ${catalogJson}`,
    '',
    `Current room state: floor = ${floorProduct.code} (${floorProduct.title}), wall = ${wallProduct.code} (${wallProduct.title}), area = ${state.area} m², wastage = ${state.wastage}%.`,
    `The current computed quote total is QAR ${quote.total}.`,
    '',
    `When the customer shows clear buying intent — asking for the final price, saying they are ready to order, asking how to proceed, or after you have just explained a quote and they seem satisfied — end your reply with the exact literal text ${OFFER_QUOTE_MARKER} on its own line as the very last line. Do not explain or mention this marker. Omit it entirely for casual browsing or comparison questions.`,
  ].join('\n');
}

async function callGroq(messages: ChatMessage[]): Promise<{
  content: string | null;
  tool_calls?: ChatMessage['tool_calls'];
}> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY is not set');
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      tools: TOOL_SCHEMAS,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '');
    throw new Error(`Groq API error ${response.status}: ${bodyText.slice(0, 500)}`);
  }

  const data = await response.json();
  const choice = data.choices?.[0]?.message;
  if (!choice) throw new Error('Groq API returned no message choice');
  return { content: choice.content ?? null, tool_calls: choice.tool_calls };
}

export async function runAgent(
  messages: { role: 'user' | 'assistant'; text: string }[],
  state: AgentState
): Promise<AgentResult> {
  const conversation: ChatMessage[] = [
    { role: 'system', content: buildSystemPrompt(state) },
    ...messages.map((m) => ({ role: m.role, content: m.text }) as ChatMessage),
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const result = await callGroq(conversation);

      if (!result.tool_calls || result.tool_calls.length === 0) {
        const raw = result.content || '';
        const shouldOfferQuote = raw.includes(OFFER_QUOTE_MARKER);
        const reply = raw.replace(OFFER_QUOTE_MARKER, '').trim();
        return { reply: reply || "I'm here to help — could you tell me a bit more about what you're looking for?", shouldOfferQuote };
      }

      conversation.push({
        role: 'assistant',
        content: result.content || '',
        tool_calls: result.tool_calls,
      });

      for (const call of result.tool_calls) {
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments);
        } catch {
          args = {};
        }
        const toolResult = executeTool(call.function.name, args);
        conversation.push({
          role: 'tool',
          tool_call_id: call.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    return {
      reply: "Let me get back to you on that with the exact details — in the meantime, is there anything else about the products I can help with?",
      shouldOfferQuote: false,
    };
  } catch (error) {
    console.error('runAgent failed:', error);
    return {
      reply: "I'm having trouble reaching my product assistant right now. Your room and selections are still saved here — please try again in a moment.",
      shouldOfferQuote: false,
    };
  }
}
```

- [ ] **Step 2: Verify the full loop against the live Groq API**

Create a scratchpad script `verify-agent.mjs`:

```javascript
// Reads GROQ_API_KEY / GROQ_MODEL from the shell environment (already set in .env.local) —
// do not hardcode the key here; run this script with `node -r dotenv/config` or export the
// vars from .env.local into the shell before running.

const { runAgent } = await import('/Users/anshitabhasin/Desktop/Personal/hardware-ai-agent/lib/groq-agent.ts');

const state = { area: 42, wastage: 8, floorProductId: 'betr670', wallProductId: 'bruae543' };

const r1 = await runAgent([{ role: 'user', text: 'What would this room cost in total?' }], state);
console.log('Quote question:', r1);
if (!/\d/.test(r1.reply)) throw new Error('Expected a numeric answer in the reply');

const r2 = await runAgent([{ role: 'user', text: 'Is the oak plank floor in stock?' }], state);
console.log('Stock question:', r2);

const r3 = await runAgent([{ role: 'user', text: 'This looks great, I want to order it now, how do I proceed?' }], state);
console.log('Buying intent:', r3);
if (r3.shouldOfferQuote !== true) throw new Error('Expected shouldOfferQuote to be true for clear buying intent, got: ' + JSON.stringify(r3));
if (r3.reply.includes('[[OFFER_QUOTE]]')) throw new Error('Marker leaked into reply text');

const r4 = await runAgent([{ role: 'user', text: 'Tell me about the marble finish options' }], state);
console.log('Browsing question:', r4);
if (r4.shouldOfferQuote !== false) throw new Error('Expected shouldOfferQuote to be false for a casual browsing question, got: ' + JSON.stringify(r4));

console.log('ALL PASS');
```

Run: `node --experimental-strip-types /path/to/scratchpad/verify-agent.mjs`
Expected: All four scenarios print, ends with `ALL PASS`, exit code 0. If `r3.shouldOfferQuote` assertion fails, inspect the model's raw output — it means the prompt's marker instruction needs stronger wording (adjust the last line of `buildSystemPrompt` to be more directive, e.g. add "Always include the marker when the user says they want to order or proceed with purchase.").

- [ ] **Step 3: Commit**

```bash
git add lib/groq-agent.ts
git commit -m "Add Groq tool-calling loop and system prompt to the sales agent"
```

---

## Task 3: Wire the API route to the new agent

**Files:**
- Modify: `app/api/assistant/route.ts`
- Modify: `lib/roomvo-agent.ts:28-71` (remove `answerFromAgent`; keep `createRoomvoPayload` and `VisualizerState`)

**Interfaces:**
- Consumes: `runAgent`, `AgentState` from `lib/groq-agent.ts` (Task 2); `createRoomvoPayload`, `VisualizerState` from `lib/roomvo-agent.ts` (unchanged, still needed for the Roomvo payload in the response).
- Produces: `POST /api/assistant` now expects body shape `VisualizerState & { messages: { role: 'user' | 'assistant'; text: string }[] }` (dropping the old `prompt: string` field) and returns `{ reply: string; shouldOfferQuote: boolean; roomvo: ReturnType<typeof createRoomvoPayload> }`. This response shape is what Task 4's frontend change consumes.

- [ ] **Step 1: Remove `answerFromAgent` from `lib/roomvo-agent.ts`, keep the rest**

The file should end up as:

```typescript
import { findProduct, QuoteInput } from './catalog';

export type VisualizerState = QuoteInput & {
  selectedProductId: string;
  compareProductId: string;
  prompt?: string;
};

export function createRoomvoPayload(state: VisualizerState) {
  const floorProduct = findProduct(state.floorProductId, 'floors');
  const wallProduct = findProduct(state.wallProductId, 'walls');
  const selectedProduct = findProduct(state.selectedProductId);
  const compareProduct = findProduct(state.compareProductId);

  return {
    provider: 'roomvo',
    mode: 'multi_surface_visualizer',
    surfaces: [
      { surface: 'floor', productCode: floorProduct.code, roomvoAssetId: floorProduct.roomvoAssetId },
      { surface: 'wall', productCode: wallProduct.code, roomvoAssetId: wallProduct.roomvoAssetId },
    ],
    selected: { productCode: selectedProduct.code, url: selectedProduct.roomvoProductUrl },
    compare: { productCode: compareProduct.code, roomvoAssetId: compareProduct.roomvoAssetId },
    capabilities: ['room_upload', 'sample_rooms', 'surface_masking', 'compare_mode', 'catalog_sync'],
  };
}
```

(Both `createQuote` and `products` were only used inside `answerFromAgent` — confirmed via `grep -n "createQuote\b\|products\b" lib/roomvo-agent.ts` before this change — so both are dropped from the import line, leaving only `findProduct` and `QuoteInput`.)

- [ ] **Step 2: Rewrite `app/api/assistant/route.ts`**

```typescript
import { NextResponse } from 'next/server';
import { runAgent } from '@/lib/groq-agent';
import { createRoomvoPayload, VisualizerState } from '@/lib/roomvo-agent';

type AssistantRequest = VisualizerState & {
  messages: { role: 'user' | 'assistant'; text: string }[];
};

export async function POST(request: Request) {
  const state = (await request.json()) as AssistantRequest;

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY is not configured');
    return NextResponse.json(
      { reply: "I'm not fully set up yet — please contact support.", shouldOfferQuote: false, roomvo: createRoomvoPayload(state) },
      { status: 500 }
    );
  }

  const { reply, shouldOfferQuote } = await runAgent(state.messages || [], {
    area: state.area,
    wastage: state.wastage,
    floorProductId: state.floorProductId,
    wallProductId: state.wallProductId,
  });

  return NextResponse.json({
    reply,
    shouldOfferQuote,
    roomvo: createRoomvoPayload(state),
  });
}
```

- [ ] **Step 3: Verify the route with the dev server**

Run: `npm run dev` (background), then:

```bash
curl -s -X POST http://localhost:3000/api/assistant \
  -H "Content-Type: application/json" \
  -d '{"area":42,"wastage":8,"floorProductId":"betr670","wallProductId":"bruae543","selectedProductId":"betr670","compareProductId":"wood924","messages":[{"role":"user","text":"What is the total cost for this room?"}]}'
```

Expected: JSON response with a `reply` string containing a QAR figure, `shouldOfferQuote: false` (this is a neutral question, not a buying-intent statement), and a populated `roomvo` object with `surfaces`.

- [ ] **Step 4: Run lint to catch unused imports or type errors**

Run: `npm run lint`
Expected: no errors related to `app/api/assistant/route.ts` or `lib/roomvo-agent.ts`.

- [ ] **Step 5: Commit**

```bash
git add app/api/assistant/route.ts lib/roomvo-agent.ts
git commit -m "Route the assistant API through the Groq sales agent"
```

---

## Task 4: Frontend sends full history and shows the quote nudge

**Files:**
- Modify: `app/page.tsx:76` (message state — no type change needed, `Message` already matches `{ role, text }`)
- Modify: `app/page.tsx:113-129` (`askAgent` function)
- Modify: `app/page.tsx:248` (the `assistant-conversion` CTA block)
- Modify: `app/globals.css` (add a highlight class — check the file first for where similar classes like `.assistant-conversion` live)

**Interfaces:**
- Consumes: the new `/api/assistant` response shape from Task 3: `{ reply: string; shouldOfferQuote: boolean; roomvo: object }`.
- Produces: a new piece of component state `quoteNudge: boolean`, and a CSS class `quote-nudge` applied conditionally to the existing `.assistant-conversion` element.

- [ ] **Step 1: Read the current `.assistant-conversion` CSS to match existing style conventions**

Run: `grep -n "assistant-conversion" app/globals.css`

Note the selector and existing properties so the new highlight state extends rather than clashes with it.

- [ ] **Step 2: Add `quoteNudge` state and update `askAgent` in `app/page.tsx`**

Add state near the other `useState` calls (after line 78's `leadResult` state):

```typescript
const [quoteNudge, setQuoteNudge] = useState(false);
```

Update the `AssistantApiResponse` type (line 13) from:

```typescript
type AssistantApiResponse = { reply: string };
```

to:

```typescript
type AssistantApiResponse = { reply: string; shouldOfferQuote: boolean };
```

Replace `askAgent` (lines 113-129) with:

```typescript
async function askAgent(rawPrompt: string) {
  const prompt = rawPrompt.trim();
  if (!prompt || isThinking) return;
  const nextMessages: Message[] = [...messages, { role: 'user', text: prompt }];
  setMessages(nextMessages);
  setChatInput('');
  setIsThinking(true);
  try {
    const response = await fetch('/api/assistant', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ area, wastage, floorProductId, wallProductId, selectedProductId, compareProductId, messages: nextMessages }),
    });
    const result = (await response.json()) as AssistantApiResponse;
    setMessages((current) => [...current, { role: 'assistant', text: result.reply }]);
    if (result.shouldOfferQuote) setQuoteNudge(true);
  } catch {
    setMessages((current) => [...current, { role: 'assistant', text: 'I could not complete that just now. Your room and selections are still saved here.' }]);
  } finally { setIsThinking(false); }
}
```

(This sends the full `nextMessages` array, including the just-added user message, so the backend sees complete history — matching the spec's requirement that the API now takes `messages` instead of a single `prompt`.)

- [ ] **Step 3: Apply the nudge class to the CTA**

Find line 248:

```typescript
<div className="assistant-conversion"><div><strong>Ready to see the exact price?</strong><span>Keep this design and send it to a specialist.</span></div><button type="button" onClick={() => setLeadOpen(true)}>Get my quote <span>→</span></button></div>
```

Replace with:

```typescript
<div className={quoteNudge ? 'assistant-conversion quote-nudge' : 'assistant-conversion'}><div><strong>Ready to see the exact price?</strong><span>Keep this design and send it to a specialist.</span></div><button type="button" onClick={() => { setQuoteNudge(false); setLeadOpen(true); }}>Get my quote <span>→</span></button></div>
```

(Clicking the CTA clears the nudge state so the highlight doesn't persist after the user has acted on it.)

- [ ] **Step 4: Add the `.quote-nudge` highlight style to `app/globals.css`**

`globals.css` has no `--accent` custom property; the brand CTA color used by `.primary-cta`/`.dock-cta` (see `app/globals.css:143`) is `#17664f`. Append this after the `.assistant-conversion` block (`app/globals.css:186-190`):

```css
.assistant-conversion.quote-nudge {
  animation: quote-nudge-pulse 1.6s ease-in-out 3;
  box-shadow: 0 0 0 2px #17664f;
}

@keyframes quote-nudge-pulse {
  0%, 100% { box-shadow: 0 0 0 2px transparent; }
  50% { box-shadow: 0 0 0 2px #17664f; }
}
```

- [ ] **Step 5: Manual verification in the browser**

Run: `npm run dev`, open `http://localhost:3000`.
1. Open the AI assistant panel, ask "What's the total cost?" — confirm the reply shows a QAR figure and the CTA does NOT pulse.
2. Ask "I want to order this now, what's next?" — confirm the CTA pulses/highlights within a second of the reply appearing.
3. Click the highlighted "Get my quote" button — confirm the lead modal opens and the highlight stops.
4. Ask a follow-up casual question after the lead modal closes — confirm the CTA does not re-highlight unless intent is shown again.

- [ ] **Step 6: Commit**

```bash
git add app/page.tsx app/globals.css
git commit -m "Send full chat history and highlight quote CTA on buying intent"
```

---

## Task 5: End-to-end error path verification

**Files:**
- None modified — this is a verification-only task confirming the error handling built into Tasks 2 and 3 works end to end.

**Interfaces:**
- Consumes: the running dev server from Task 4.

- [ ] **Step 1: Verify graceful failure on an invalid API key**

Temporarily edit `.env.local` to set `GROQ_API_KEY=gsk_invalid_test_key_00000000000000000000`, restart the dev server (`npm run dev`), and repeat the curl from Task 3 Step 3.

Expected: HTTP 200 (not 500 — the route itself succeeds, `runAgent` catches the Groq error internally) with a JSON body where `reply` is the generic apology string ("I'm having trouble reaching my product assistant right now...") and `shouldOfferQuote: false`. No text from Groq's actual error response (e.g. "invalid_api_key") should appear in `reply`.

- [ ] **Step 2: Restore the real key**

Edit `.env.local` back to the real `GROQ_API_KEY` value (the working key already configured for this project), restart the dev server, and re-run the Task 3 Step 3 curl to confirm normal operation resumes.

- [ ] **Step 3: Verify the missing-key path**

Temporarily comment out or remove the `GROQ_API_KEY` line from `.env.local` entirely, restart the dev server, repeat the curl.

Expected: HTTP 500, body contains `"reply":"I'm not fully set up yet — please contact support."` — confirming the route-level guard from Task 3 Step 2 fires before ever calling `runAgent`.

- [ ] **Step 4: Restore `.env.local` fully and do a final full-flow smoke test**

Restore both `GROQ_API_KEY` and `GROQ_MODEL` lines. Run `npm run dev`, open the browser, and walk through: select a floor product, select a wall product, open the assistant, ask a product comparison question, ask for a quote, confirm the numbers match the Quote modal, drive to buying intent, confirm the CTA highlights, submit the lead form, confirm the WhatsApp link still generates correctly (this path is unchanged but must not have regressed).

No commit for this task — it's verification only, confirming Tasks 1-4 hold together and nothing needs to change.

---

## Self-Review Notes

- **Spec coverage:** All five spec sections (architecture/data flow, tools, API route change, frontend nudge, error handling, testing) map to Tasks 1-5. The spec's "no fallback to rule-based" constraint is enforced in Task 2 Step 1 (`runAgent`'s catch block) and never reintroduces `answerFromAgent`.
- **Type consistency:** `AgentState` (Task 2) intentionally has fewer fields than `VisualizerState` (unchanged in `lib/roomvo-agent.ts`); Task 3's route explicitly narrows one to the other when calling `runAgent`, so there's no type mismatch across the module boundary. `AssistantApiResponse` in `page.tsx` (Task 4) matches the exact `{ reply, shouldOfferQuote }` shape `runAgent` produces (Task 2) and the route returns (Task 3).
- **No placeholders:** every step has literal code; no "add error handling" style steps remain — error handling is fully written out in Task 2 Step 1 and verified in Task 5.
