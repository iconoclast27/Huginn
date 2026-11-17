# ADR-2: The model judges, the harness acts — recipes as declarative Markdown forms, no tool menu, every mutation gated

**Status:** Accepted (retrospective; recorded 2026-11-16) — cross-project, doctrine owned by Muninn
**Ruled:** 2026-10-19/10-20 in Muninn (R9, R10), ported to Huginn 2026-11-06/07, restated 2026-11-03; live in as-built.

## Context

The project doctrine was set in Muninn: contracts, not tool menus, with a diff gate as the
differentiator. Huginn inherits it when the harness modules were ported. The pressure point named in
`docs/Tool Distancing and Recipe Expansion Design.md` (first commit 2026-11-07): as recipes grow,
cases appear that look like tools — ground-truth checks need vault access, gatherers need richer sources.

## Decision

- The model fills a declarative Markdown form (the recipe) and returns raw JSON only.
- The harness validates, approves, and applies. **The model never receives a tool menu and never
  executes side effects directly.**
- Every mutation is auditable through the approval gate.

Reasons of record: keep output simple and inspectable; prevent chaining side effects without human
review; make every mutation auditable.

## Consequences

- The harness orchestrator is the only writer path: `src/harness/harness.ts` `run()` at `:64`,
  `llmClient.complete(rendered.prompt, signal)` at `:77`, gate call at `:135-141`, apply routine at
  `:147-151`.
- The op loop (ADR-28) inherits the doctrine and stays inside it: the payload of a `write` op is
  authored by a recipe sub-run via `harness.run`, never by the model directly (R8, Option A).
- "More generic apply primitives vs. a tool menu" stays resolved toward the recipe side: no function-calling
  agent shape is admitted.

## Sources

`docs/Huginn Plugin 2 Harness.md:6` ("the model judges; the harness acts. No LLM receives a tool
menu"), first commit 2026-11-06, 208 lines; `docs/Tool Distancing and Recipe Expansion Design.md:8-18`
(first commit 2026-11-07); commit `dd6efff` (2026-11-06, port); `src/harness/harness.ts:64, 77, 135-141, 147-151`.

**Cross-references:** Muninn ADR-32 (owns the doctrine), Muninn `docs/tool-skill-strategy.md`
(archived, R9/R10).
