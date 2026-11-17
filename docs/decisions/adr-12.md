# ADR-12: Ground-truth failures are vault state — not retried, not written to corrections, and stripped before approval

**Status:** Accepted (retrospective; recorded 2026-11-16); drop-display debt ledgered
**Ruled:** 2026-11-07 (`f2def43`); drop-stripping 2026-11-15 (`30db86b`); governing invariant restated in `f13` S2.

## Context

Model output that contradicts vault truth is not a model mistake to be punished: the vault is the fact.
The earlier shape (ADR-11) retried such failures and wrote them to corrections, polluting memory with
non-mistakes.

## Decision

- Ground-truth failures are reported **as vault state**, not retried, and not written to corrections
  (`f2def43`).
- **Strip vault-truth drops before approval** (`30db86b`): the diff the user approves excludes
  proposals that vault truth already rejected.
- The governing invariant, fixture-certified: **no rule failure, no correction** (`f13` S2).

## Consequences

- As-built: validate at `src/harness/harness.ts:108`, `stripGroundTruthDrops` at `:119`,
  `groundTruthDropped` in the result at `:197`.
- **Debt ledgered:** `groundTruthDropped` has no UI consumer [R] — the notices are produced and never
  displayed. Drop notices must display unconditionally; the seam is `chat-view.ts` `renderRunResult`
  (`:354`). Owed in the op-loop build, not run down today.
- Array frontmatter values are comparable only since `frontmatterValues` (ADR-14 lineage; finding 7);
  `valuesMatch` was array-blind before (`ground-truth.ts:307`, `frontmatterValues` at `:320`).

## Sources

Commits `f2def43` (2026-11-07) and `30db86b` (2026-11-15, "strip vault-truth drops before approval");
`docs/Ground Truth Refactor Design.md` (239 lines, first commit 2026-11-07, "Implemented in `main`");
`src/harness/harness.ts:108, 119, 197`; `src/harness/ground-truth.ts:27-34, 307, 320, 335`;
`src/fixtures/f13.ts` (S2), `src/fixtures/f29.ts` (added with `30db86b`); `README.md` (drop behaviour).

**Cross-references:** ADR-11 (superseded half), ADR-13, ADR-14, ADR-28 (R6/R7 disclosure).
