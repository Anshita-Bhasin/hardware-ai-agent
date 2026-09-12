# LLM-backed sales agent for the tile visualizer

## Context

The visualizer (`app/page.tsx`) already has a working chat panel wired to
`/api/assistant`. Today that route calls `answerFromAgent` in
`lib/roomvo-agent.ts`, which is pure keyword matching (`prompt.includes('stock')`,
etc.) against a static reply library. It cannot answer anything phrased
differently than the hardcoded phrases, and it does not carry conversation
history — each call only sees the latest message plus current visualizer
state.

Goal: replace the keyword matcher with a real LLM agent (Groq, OpenAI-compatible
API) that is grounded in the actual product catalog, can calculate accurate
quotes via tool-calling (never by having the LLM do the arithmetic itself),
and nudges high-intent conversations toward the existing lead-capture flow.
This is being built as a sellable feature on top of the existing Roomvo-style
visualizer clone, for a client who will independently close a deal with
Roomvo for the visualizer itself but wants this AI layer from us.

## Non-goals

- No fine-tuning. Grounding is via system-prompt catalog injection, not
  training a model.
- No change to the visualizer rendering, catalog data model, or Roomvo
  payload builder (`createRoomvoPayload` stays as-is).
- No change to the quote *formula* (`createQuote` in `lib/catalog.ts`) — the
  agent calls it as a tool, it does not reimplement or approximate it.
- No streaming UI (SSE/websockets) in this pass — request/response only,
  matching the current fetch-based chat flow.
- No persistent conversation storage — history lives in React state only,
  same as today.

## Architecture

```
page.tsx (chat UI, holds full message history)
   |  POST { messages, area, wastage, floorProductId, wallProductId, ... }
   v
app/api/assistant/route.ts
   |  calls
   v
lib/groq-agent.ts
   |  - builds system prompt (persona + full catalog + current state)
   |  - calls Groq chat completions API with tool schemas
   |  - on tool_calls: executes against lib/catalog.ts, appends tool
   |    results to the message list, calls Groq again (loop, max 3 rounds)
   |  - strips the [[OFFER_QUOTE]] marker from the final text if present
   |  - returns { reply, shouldOfferQuote }
   v
app/api/assistant/route.ts returns JSON to the client
   v
page.tsx appends assistant reply to chat; if shouldOfferQuote, highlights
the existing "Get my quote" CTA (no auto-opening the lead modal)
```

## Components

### `lib/groq-agent.ts` (new)

- `SYSTEM_PROMPT_TEMPLATE(state)`: builds the system message. Includes:
  - Persona: tile sales advisor for the room visualizer, concise, honest
    about price/stock, never invents products or prices.
  - Full catalog serialized as JSON (brand, code, title, surface, price,
    size, material, finish, stock) — pulled live from `products` in
    `lib/catalog.ts`, not duplicated.
  - Current visualizer state: selected floor/wall product codes, room area,
    wastage %, and the current computed quote total (via `createQuote`).
  - Instruction: when the user shows buying intent (asks for final price,
    says they're ready, asks how to order, or after they've had the quote
    explained), end the reply with a literal `[[OFFER_QUOTE]]` marker on its
    own line. Otherwise omit it entirely. The marker is never shown to the
    user — it is stripped before display.
  - Instruction: for any price, quantity, or stock question, call a tool
    rather than compute or recall the number.

- Tool schemas (OpenAI-style `tools` array):
  - `get_quote(floorProductId, wallProductId, area, wastage)` → calls
    `createQuote` from `lib/catalog.ts`.
  - `find_product(query)` → fuzzy-ish match over `products` by code/title/brand
    substring, returns the matching product(s) or a not-found message.
  - `list_products(surface)` → returns all products for `'floors' | 'walls'`.

- `executeTool(name, args)`: dispatches to the above, returns JSON-serializable
  results only (no React/UI concerns).

- `runAgent(messages, state)`:
  - Prepends the system message.
  - Calls Groq's `/openai/v1/chat/completions` with `model:
    process.env.GROQ_MODEL` (default `openai/gpt-oss-120b`), the tools array,
    and the message history.
  - If the response has `tool_calls`, executes each, appends
    `{ role: 'tool', tool_call_id, content }` messages, and re-calls Groq.
    Caps at 3 tool-call rounds to avoid infinite loops; if still unresolved,
    returns a generic "let me get back to you on that" reply.
  - On success, extracts `[[OFFER_QUOTE]]` (sets `shouldOfferQuote = true`,
    strips it from the text) and returns `{ reply, shouldOfferQuote }`.
  - On any fetch/API error (network, 401, rate limit), catches and returns a
    generic apology reply with `shouldOfferQuote: false`. No fallback to the
    old rule-based matcher — that file is being removed.

### `app/api/assistant/route.ts` (modified)

- Request body changes from `VisualizerState & { prompt }` to
  `VisualizerState & { messages: { role: 'user' | 'assistant'; text: string }[] }`.
- Maps `messages` to Groq's `{ role, content }` shape, calls `runAgent`,
  returns `{ reply, shouldOfferQuote }`.
- `GROQ_API_KEY` read from `process.env`; if missing, return a clear 500 with
  a message telling the developer to set it (not shown raw to end users).

### `lib/roomvo-agent.ts` (modified)

- Remove `answerFromAgent` (dead code once the LLM path is live).
- Keep `createRoomvoPayload` and the `VisualizerState` type — unrelated to
  the chat agent, still used for the Roomvo-style payload metadata.

### `app/page.tsx` (modified)

- `messages` state already exists; change `askAgent` to send the full
  `messages` array (mapped to `{ role, text }`) instead of just `prompt` in
  the POST body.
- Read `shouldOfferQuote` from the response. When true, set a small piece of
  state (e.g. `quoteNudge: true`) that adds a highlight/pulse class to the
  existing "Ready to see the exact price?" CTA in the assistant panel. This
  does not open the lead modal automatically — the user still clicks.
- No new modal, no new form fields — reuses the existing lead flow untouched.

### Env

- `.env.local` (gitignored, already covered by `.env*` in `.gitignore`):
  `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`).

## Error handling

- Groq API errors (network, 4xx, 5xx): caught in `runAgent`, surfaced as a
  generic in-character apology message to the chat, logged server-side with
  `console.error` for debugging. No stack traces or raw provider errors reach
  the client.
- Tool execution errors (e.g. malformed args from the model): caught per-call,
  the tool result sent back to the model is an error string so the model can
  recover conversationally (e.g. ask a clarifying question) rather than the
  whole request failing.
- Missing `GROQ_API_KEY` at startup: route returns 500 immediately with a
  developer-facing message; this is a deploy configuration error, not a
  runtime path to design around further.

## Testing

Manual verification (no existing test suite in this repo):
1. `npm run dev`, open the app, confirm existing visualizer/quote/lead flows
   are unaffected.
2. Chat with natural-language phrasing not in the old keyword list (e.g.
   "what would this cost for a 60 square meter place", "is the oak plank in
   stock", "what's cheaper than what I have now") and confirm accurate,
   catalog-grounded answers.
3. Verify quote numbers returned by the agent match `createQuote` output
   exactly (cross-check against the Quote modal for the same inputs).
4. Drive a conversation to a clear buying-intent statement and confirm the
   "Get my quote" CTA highlights (`shouldOfferQuote`), and that it does NOT
   highlight on casual/early browsing messages.
5. Temporarily use an invalid key to confirm the error path shows a graceful
   chat message instead of a crash or raw error.
