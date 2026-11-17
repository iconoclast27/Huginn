# ADR-36: Prompt budget and context floor — the loop prompt carries names and triggers, not recipe text; base context is implied; latency is a manual-testability fact

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** R8/R11/§6 (Dan 2026-11-15, `c4b103e`); G5 (the engineer's measurement, same commit); as-built
chat context 2026-11-07 (`0a066d7`, harness doc §Chat interface).

## Context

The loop runs up to 12 ops per turn against local Ollama. Every op call costs a prompt. The design
questions: what enters the prompt, who pays for recipe instructions, and what the user waits through.
The project already has a named closure cause of exactly this class: `qwen3.5:9b-32k` "died repeatedly:
context starvation as agent" (`docs/HANDOVER - 2026-11-08.md:41`).

## Decision

- **Catalog summary only in the loop prompt** (R8, Option A): names + one-line triggers, with the
  active-note floor, corrections, and the per-send verbosity instruction; **full recipe instructions
  enter only via the sub-run's own prompt**. "This keeps prompt cost flat (~13 kB of recipe text is never
  poured into every op call) and keeps all recipe-level fixtures at today's level" (ruled §3.3).
- **Base context is implied, never itemized**: the user's prompt and the **active-note floor** (ruled
  §4.3.1). Disclosure is the accounting of *reads*, not the prompt itself.
- **Latency is accounted for by design, not by optimism** (G5, `:133`): `chatTimeoutMs` default
  **120000** (`src/settings.ts:20-27`), the client's own timeout controller default 60000
  (`src/llm/client.ts:69`), per-op timeout inherited per op (`harness.ts:96` + f26 doctrine), and "a
  12-op turn may run minutes on local Ollama; the smoke plan accounts for this by design" (ruled §6).
- **Warmup is the loop's dependency**: `warmup()` (measured at `src/harness/harness.ts:205` [R]; the
  assessment cites `harness.ts:201` [H]) exists for the
  model-kept-out-of-memory case, and "a 12-op turn is the first feature that needs it reliably"
  (assessment `:260-261`); model-kept-out-of-memory is treated as an expected case, not an exception.
- **Memory enters by `limit`, never by ranking** (ADR-15): corrections at `getContext(recipe, 5)`
  (`harness.ts:72`) and `getContext(undefined, 5)` (`dispatch.ts:55`), user memory and chat summaries at
  `getContext(5)` (`main.ts:313, 317`). The ranking the Memory Loop guide proposes is unimplemented
  (ADR-30), so prompt growth is bounded by count, and the memory-pollution vector is closed by the
  no-rule-failure-no-correction rule (ADR-12) and the schema-whitelist ruling (ADR-14).

## Consequences

- **`num_ctx` is not set in Huginn's client** (`grep -n "num_ctx" src/llm/client.ts` → 0 hits) [R]: the
  context window is the model's and Muninn's, not a client knob. Context starvation is closed as
  model-layer business (ADR-21), not as project work.
- Chat today injects **the active note only** (`docs/Huginn Plugin 2 Harness.md:180`), and **no RAG** —
  no vault-wide search results in the chat prompt (`:187`). The loop's `list`/`read` ops are the first
  vault-wide surface, and they enter as **inert data** with disclosure accounting (ADR-28, R6).
- `defaultTargetPath` (`'notes/gamma.md'`) is never set in production, so it never reaches a prompt
  (ADR-26).
- The verbosity instruction rides the loop system prompt, **never persisted** (ruled §5), and the turn
  receipt is **counts and paths only** (ruled §4.4, R11) — no vault content enters persisted state.

## Sources

`docs/Serial Contextual Operations Design (Ruled).md:67, 98, 119-121, 126-131`;
`docs/Serial Contextual Operations Design Assessment.md:133-140, 260-261`;
`docs/HANDOVER - 2026-11-08.md:41`; `src/settings.ts:20-27`; `src/llm/client.ts:69`;
`src/harness/harness.ts:72, 87-91, 205`; `src/chat/dispatch.ts:55`; `src/main.ts:313, 317`;
`docs/Huginn Plugin 2 Harness.md:180, 187`; `grep -n "num_ctx" src/llm/client.ts` → 0 hits [R].

**Cross-references:** ADR-21, ADR-26, ADR-28, ADR-30, ADR-12, ADR-14, ADR-34, Muninn ADR-33.
