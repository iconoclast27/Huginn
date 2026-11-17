# ADR-30: Memory Feedback Loop — design and Implementation Guide accepted as design, unimplemented, and its fixture plan collides with the shipped chain

**Status:** Accepted as design, **unimplemented** (recorded 2026-11-16); release ruling owed (docket T13)
**Ruled:** design 2026-11-07 (`0a066d7` shipped the guide, `Memory Feedback Loop Design.md` first commit
2026-11-07, 215 lines; guide 494 lines, same commit); as-built read path unchanged.

## Context

Corrections accumulate and are read by recipe name, so memory grows and the prompt gets the same
entries forever. The design proposes scoring and selection: prefer recipe-matched corrections,
reinforce recurrence instead of duplicating, cap the memory budget, scope by recipe, filter
chat summaries by date.

## Decision

- The design is **accepted as design**; it is **not implemented**, and the Implementation Guide names the
  order: "Implement the read-side scoring/selection pipeline first. Do **not** change the append path
  until the read side is proven with fixtures" (`docs/Memory Feedback Loop Implementation Guide.md:17`).
- Shipped shape stays ADR-15: three append-only kinds, `readContext` as the read path, budget by
  `limit`, no scoring.

## Consequences

- **Measured unimplemented** [R]: `src/memory/` carries 4 tracked files (`commands.ts`, `kinds.ts`,
  `obsidian-storage.ts`, `store.ts`); **no `ranker.ts`** on disk or tracked; `grep -r
  "scoreEntry|reinforce|memoryBudget|rank" src` → **0 hits**; **no memory sub-object in `settings.ts`**
  (grep `memory`/`Memory` → 0 hits); the read path is `src/memory/store.ts:56` (`readContext`), called at
  `kinds.ts:53, 93, 128`, `harness.ts:72`, `dispatch.ts:55`, `main.ts:313, 317`.
- **Fixture-number collision, ledgered:** the Guide plans **F26–F30** (`:442-446`: `scoreEntry`,
  `reinforce`, budget caps, user-memory scope, `sinceDate` filtering) and step 8 says "Add fixtures
  F26–F30 and update `package.json`" (`:485`). Those numbers are **taken**: f26 = infra-failure no-correction
  (`01497d3`), f27 = abort through both legs (`69a4b45`), f28 = catalog↔`.md` drift (`a6b4500`),
  f29 = two-tag strip seam (`30db86b`), f30 = non-path params (`1bbc908`). The chain has no gaps, so the
  loop fixtures are `f31`–`f36` (ADR-34) and ranking fixtures, if built, continue **f37+** — a numbering
  ruling, owed to Dan.
- The Guide's `FakeMemoryStorage` pattern reference (`:448`) is real: `f12.ts`/`f13.ts` pattern.
- T13 stays open: ruling + release slot owed. The loop's memory read stays `getContext(..., 5)`.
- The corrections loop is named as remaining work in `docs/Unified Project Definition v0.2.md:114`
  ("⏳ Remaining skills, corrections loop, then the deferred rulings revisit").

## Sources

`docs/Memory Feedback Loop Design.md` (215 lines, first commit 2026-11-07, three-kind table at `:10-14`);
`docs/Memory Feedback Loop Implementation Guide.md` (494 lines, first commit 2026-11-07, `:17, 440-448,
464, 471, 485`); commit `0a066d7` (2026-11-07, "docs: memory feedback loop implementation guide");
`src/memory/*` listing measured; `/tmp/opencode/rationalisation/docket-2026-11-16.md` T13, and findings
(b) of the Phase 2 Huginn measurement.

**Cross-references:** ADR-15, ADR-22, ADR-34, ADR-31.
