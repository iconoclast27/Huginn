# ADR-19: An LLM infra failure is not a model mistake — `clientFailed`, and no corrections recorded

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-08 (`01497d3`), bundle-shipping 2026-11-13 (`240b688`).

## Context

When the LLM returns null, the harness used to treat the run like a schema failure, writing a
correction. That made a connectivity/infra event into a permanent instruction to the model, keyed by
recipe name, injected into every future prompt.

## Decision

- **Do not record corrections on LLM infra failure** (`01497d3`). The harness sets `clientFailed`
  ("Infrastructure failure (LLM returned null) — not a model mistake",
  `src/harness/harness.ts:24, 26-27`), and the correction path is skipped (`:87-88`).
- f26 was added in the same commit, so the guard ships with the behaviour.
- **Manual step owed:** delete the stale `LLM client returned null` entry from the vault's
  `Agents/Huginn/MEMORY/corrections.md` (keyed by `tag-assignment`) — the surviving artifact of the old
  behaviour, pre-release.

## Consequences

- A null response renders `[No response from model]` (`src/ui/chat-view.ts:299`), with no memory write.
- In the op loop, an infra failure is a machine-readable, turn-local condition: never a correction, no
  retry on the same chain (ADR-28, R9/R11).
- The shipped-bundle discipline is part of this decision: `main.js` had to be rebuilt for the guard to
  reach the plugin (`240b688`), and `main.js` churn is real content, not inert.

## Sources

Commits `01497d3` (2026-11-08, "do not record corrections on LLM infra failure") and `240b688`
(2026-11-13, "shipped bundle now carries the F26 clientFailed guard");
`src/harness/harness.ts:24, 26-27, 87-88`; `src/fixtures/f26.ts` (added with `01497d3`);
`src/ui/chat-view.ts:299`; `docs/Handover 2026-11-13.md` (the guard's record).

**Cross-references:** ADR-12 (no rule failure, no correction), ADR-15, ADR-24, ADR-28.
