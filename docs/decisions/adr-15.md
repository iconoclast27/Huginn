# ADR-15: Three append-only memory kinds, one store; user memory gated by the `Remember` keyword

**Status:** Accepted (retrospective; recorded 2026-11-16), with the filename deviation ledgered
**Ruled:** 2026-11-07 (`a2c9429` store + kinds; `f2def43` `Remember` keyword; `5be252d` Remember-chat
feedback); `user.md` naming as-built.

## Context

Huginn must remember corrections, user statements, and chat summaries in the vault, human-readable,
append-only. The design questions: what triggers a write, and which file each kind lives in.

## Decision

- Three kinds over one append-only store (`src/memory/store.ts`): `CorrectionsMemory`
  (`src/memory/kinds.ts:34` → `corrections.md`), `UserMemory` (`:75`), `ChatSummaryMemory` (`:110` →
  `chat-summaries.md`). Entries are frontmatter blocks joined by horizontal rules, so the files stay
  human-readable.
- **User memory requires the `Remember` keyword**: a chat message must *begin* with `Remember` to be
  captured; ordinary chat containing "don't" or "avoid" is **not** captured (`f2def43`,
  `README.md:14`). Remember-chat shows immediate feedback (`5be252d`).
- The harness writes corrections after schema/apply/refusal failures (ADR-4), and reads them before
  rendering a recipe: `getContext(recipe, 5)` (`harness.ts:8-10`).

## Consequences

- **Filename deviation ledgered:** as-built appends and reads `user.md`
  (`src/memory/kinds.ts:89, 93`), while `docs/Huginn Plugin 2 Definition v0.1.md` and `README.md:55`
  say `user-memory.md`. A rename is a ruling with a vault migration, not an implementation decision.
- Read path is `readContext` (`src/memory/store.ts:56`) with recurrence bookkeeping
  (`recurrenceKey` `:166`, `summarizeRecurrence`); the relevance ranking the Memory Feedback Loop
  design proposed is **not implemented** (ADR-30).
- Pre-release manual step, of record: delete the stale `LLM client returned null` entry from the vault's
  `Agents/Huginn/MEMORY/corrections.md` (keyed by `tag-assignment`) — a memory artifact of the dead
  infra-failure path (ADR-19).

## Sources

Commits `a2c9429` (2026-11-07, "generic recipe apply, shared memory store, corrections, user memory,
chat summary button"), `f2def43` (2026-11-07, `Remember` keyword), `5be252d` (2026-11-07, Remember-chat
feedback); `docs/Memory Feedback Loop Design.md:10-14` (first commit 2026-11-07, the three-kind table);
`src/memory/kinds.ts:34, 75, 89, 93, 110`; `src/memory/store.ts:42, 56, 166`; `README.md:14, 55`.

**Cross-references:** ADR-12 (no rule failure, no correction), ADR-19, ADR-30.
