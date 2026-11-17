# Pointer — not authoritative

**Owned by Muninn.** Canonical copy: `Muninn/docs/LLM Coordination Protocol v1.0.md`.
This file is a pointer, not authoritative (ruling 4, 2026-11-16; Huginn ADR-35, Muninn ADR-21).

Read the Muninn original for: the fixture-first discipline (red earned against unfixed committed code at
the intended seam; first-green guards need written justification before construction), the receipts rule
(a claim needs pasted terminal output), ask-before-push, no commits/bumps/tags without Dan, sequential
fixture numbering with no gaps, and the collaboration conventions shared by both projects.

Muninn's fixtures are `src/fixtures/f01.ts`–`f26.ts` (next **f27**), run with `npx tsx`; Huginn's are
`f01.ts`–`f30.ts` (next **f31**), run with `npm run fixtures`. Each project keeps its own numbering.
A fact lives in exactly one canonical doc across both projects — cross-reference, never copy.
