# ADR-22: Fixture discipline — one sequential `&&` chain, no gaps, next number f31; asserts + exit code are the instrument

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-06 (`f659881`, fixtures npm script), lessons ruled 2026-11-08/11-10/11-13, numbering
rule restated 2026-11-15.

## Context

Fixtures are the instrument that keeps Huginn honest. The chain runs them in one command; numbering is
load-bearing because fixture names are the coverage map in `README.md` and the harness doc.

## Decision

- **One sequential chain, no gaps:** `npm run fixtures` is a single hunk in `package.json`, currently
  `f01.ts && … && f30.ts`. The chain cannot be split by hunk. New fixtures append **sequentially**; the
  next number is **f31**.
- **Asserts + exit code are the instrument**; a fixture's verdict lines are commentary.
- **Red is earned against unfixed committed code at the intended seam** — not at an import, mock, or
  compile error. f27 is the precedent: red earned against unfixed `src/llm/client.ts` at `1bbc908`'s
  ancestor, then green after `69a4b45`.
- **First-green guards need written justification before construction** (R14, 2026-11-15). f28 is the
  model: a drift guard with no bug today, whose green was proven against pre-change copies in a HEAD
  worktree, justification written in the fixture header.
- Pre-change red proof recipe: `git worktree add -q --detach <path> HEAD`, copy untracked fixtures in,
  run with Muninn's `node_modules/.bin/tsx`, then `git worktree remove`.
- **`import { … } from 'obsidian'` throws `ERR_MODULE_NOT_FOUND` under tsx** (no runtime module), so
  UI-leg fixtures need a mapped fake from `obsidian.d.ts`: `src/fixtures/fake-app.ts` is test-only and
  **never bundled**.

## Consequences

- f26, f27, f28, f29, f30 each landed with the behaviour they guard, in commits `01497d3`, `69a4b45`,
  `a6b4500`, `30db86b`, `1bbc908` [R] — the chain has no gaps.
- f31–f36 are Proposed with a red taxonomy (ADR-34): envelope refusal + `isVaultPath` (red at
  `1bbc908`), `contextUsed`, read-expiry (staged), Stop parity (first-green, justified), bound 12
  (staged). `f11` is re-pointed as the refusal guard, not deleted; `f28` and `f30` stay green throughout.
- Fixture coverage claims in `README.md` (F01–F30) and in `docs/Huginn Plugin 2 Harness.md` (stale at
  f27, missing f28/f29/f30 rows) are canonical docs that must be brought into line — drift ledgered.

## Sources

Commits `f659881` (2026-11-06), `01497d3` (2026-11-08), `69a4b45` (2026-11-13), `a6b4500` (2026-11-15),
`30db86b` (2026-11-15), `1bbc908` (2026-11-15); `package.json:11` (the single-hunk chain, measured);
`docs/HANDOVER - 2026-11-08.md:44` (the lessons: gate stages to pasted receipts, declares vs `ollama ps`,
retrieval reads are context not receipts, asserts + exit code are the instrument);
`docs/Handover 2026-11-10 Scenario F.md:14-16` (red must fail because the bug exists);
`src/fixtures/f27.ts:17-19`, `src/fixtures/f28.ts:6-12`, `src/fixtures/fake-app.ts`.

**Cross-references:** Muninn ADR-7 (fixture hostility, earned red), Muninn ADR-10, Muninn ADR-11,
ADR-27, ADR-34, ADR-17.
