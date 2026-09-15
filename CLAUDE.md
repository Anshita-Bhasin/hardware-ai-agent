# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A single-page AI room visualizer demo ("RoomStyle") that clones a Roomvo-style tile/floor
visualizer experience, plus a chat sales assistant and lead-capture flow. It's a sellable
demo/client project, not a general product — the visualizer rendering and Roomvo integration
payload are meant to stay stable while the AI assistant layer is actively evolving.

## Commands

```bash
npm run dev      # Next.js dev server (primary workflow)
npm run build    # Next.js production build
npm run start    # Next.js production server
npm run lint     # eslint . (ignores dist/ and .next/)

# Cloudflare/vinext deployment path (alternate to plain Next.js — see "Two build systems" below)
npm run sites:dev
npm run sites:build
npm run sites:start
```

There is no test suite in this repo. Verification is manual (see "Testing" in
`docs/superpowers/specs/2026-09-13-llm-sales-agent-design.md` for the expected manual
verification steps when touching the assistant).

## Two build systems, one app

This repo is set up to ship the same Next.js app two different ways:

- **Plain Next.js** (`next dev` / `next build`) — the straightforward path, deploys via
  `vercel.json` (`framework: nextjs`).
- **vinext + Cloudflare Workers** (`vinext dev` / `vinext build`, driven by `vite.config.ts`) —
  wraps the same `app/` router through Vite with the Cloudflare Workers plugin, targeting a
  Workers/D1/R2 hosting setup described by `.openai/hosting.json`.

Don't assume Vercel-only or Workers-only constraints when editing `app/`; both entry points
render the same route tree. Config specific to the Workers path lives in `vite.config.ts` and
`wrangler`-generated state (`.wrangler/`, `dist/`) — treat those as build output, not source.

## Architecture

Everything funnels through three layers:

1. **`lib/catalog.ts`** — the product catalog (`products: Product[]`) and pure pricing/lookup
   logic (`createQuote`, `findProduct`). This is the single source of truth for tile products,
   prices, and the BOQ (bill of quantities) formula — floor area, wall area (42% of floor area),
   adhesive/grout/trim/installation costs, and carton counts. Nothing else should hardcode a
   product or reimplement the quote math.

2. **`lib/roomvo-agent.ts`** — bridges catalog state to two things: `createRoomvoPayload` (the
   metadata payload describing selected surfaces/products, shaped as if handed to a real Roomvo
   visualizer integration) and `answerFromAgent` (the **current** chat reply logic — pure
   keyword matching against `prompt.includes(...)`, e.g. "stock", "compare", "budget"). This
   keyword matcher is the known limitation being actively replaced — see "In-flight work" below.

3. **`app/page.tsx`** — the entire UI in one client component: catalog browser, room viewer
   with CSS-generated tile textures (`productTexture`, procedural gradients per pattern type —
   linear/marble/wood/stone — no real texture images), compare-mode slider, chat assistant
   panel, quote modal, and lead-capture modal. All app state (selected products, room area,
   chat history, modals) lives in this one component's `useState` calls; there's no global
   state manager.

API routes are thin wrappers with no independent logic:
- `app/api/assistant/route.ts` → `answerFromAgent` + `createRoomvoPayload`
- `app/api/visualizer/route.ts` → `createQuote` + `createRoomvoPayload`
- `app/api/leads/route.ts` → validates name/phone, builds a WhatsApp deep link with the
  design summary (no persistence — leads aren't stored anywhere, just handed off to WhatsApp)

## In-flight work: LLM-backed assistant

`docs/superpowers/specs/2026-09-13-llm-sales-agent-design.md` specs out replacing
`answerFromAgent`'s keyword matching with a real LLM agent (Groq, OpenAI-compatible
tool-calling API), grounded in the live catalog and using tools for quote math instead of
having the model compute it. Key points if you're implementing or continuing this:

- New file will be `lib/groq-agent.ts` (does not exist yet) exposing `runAgent(messages, state)`.
- `answerFromAgent` in `lib/roomvo-agent.ts` gets removed once the LLM path lands;
  `createRoomvoPayload` and `VisualizerState` stay (unrelated to the chat agent).
- `app/api/assistant/route.ts`'s request shape changes from `{ ...state, prompt }` to
  `{ ...state, messages }` (full history, not just latest message).
- Quote/product/stock questions must go through tool calls into `lib/catalog.ts` — the model
  must never compute or recall prices itself.
- A literal `[[OFFER_QUOTE]]` marker (stripped before display) signals buying intent back to
  the client, which should highlight the existing quote CTA — no new UI, no auto-opening modals.
- Env vars: `GROQ_API_KEY`, `GROQ_MODEL` (default `openai/gpt-oss-120b`), read from `.env.local`
  (gitignored).

Read that spec in full before touching the assistant — it also covers the tool schemas
(`get_quote`, `find_product`, `list_products`) and error-handling behavior (generic in-character
apology on API/tool errors, no raw provider errors or stack traces surfaced to the client).

## Conventions specific to this repo

- Path alias `@/*` maps to the repo root (see `tsconfig.json`), e.g. `@/lib/catalog`.
- Money is QAR (Qatari Riyal); prices are per m². Keep formatting consistent with existing
  `toLocaleString()` / `toFixed(2)` usage in `app/page.tsx`.
- Tile textures are pure CSS (`productTexture` in `app/page.tsx`) generated from each product's
  `pattern`, `color`, and `accent` fields — there are no real per-product texture image assets.
  When adding a product, picking a reasonable `pattern`/`color`/`accent` combination matters as
  much as the real catalog data.
