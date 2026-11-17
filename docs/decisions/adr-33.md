# ADR-33: `listNotes` in the mirror — the sixth door is Huginn's dependency; the mirror is a compile-time contract and Huginn cannot lead

**Status:** **Proposed — ruling owed** (recorded 2026-11-16; the ruling is Muninn ADR-37, T15)
**Ruled:** R12, Dan 2026-11-15 (shape and sequencing); contract text drafted 2026-11-16; **nothing
implemented**.

## Context

The op loop's `list` op needs paths, titles, mtimes, and tags for a set of candidate notes. The frozen
`MuninnApi` has five doors and none of them returns paths by folder, tag, or query: `tagVocabulary()`
returns **counts, not paths**, so a tag→path filter is inexpressible through the frozen surface today.
Client-side emulation is forbidden: vault enumeration in Huginn (`app.vault.getMarkdownFiles()`) creates
a second source of truth that Muninn's tag and semantic machinery cannot participate in (Muninn ADR-34).

## Decision

- **One additive method, specified, not implemented here** (ruled §8, verbatim shape):

```ts
// additive to MuninnApi; read-only; dark-safe
listNotes(filter: {
    folder?: string,   // vault-relative prefix, boundary-matched as renamePrefix does
    tag?: string,      // joins tags -> path; vocabulary tag, no prefix match
    query?: string,    // free text against path/title; served by FTS today
    limit?: number,
}): { notes: Array<{ path: string; title: string; mtime: number; tags: string[] }>, total: number } | null
```

- Pure read-only SELECT over existing tables: **no schema change, no new data, no version event,
  dark-safe failure (`null` + console reason).** Proposed ordering `ORDER BY path ASC`; `total` counted
  before `limit` (Muninn doctrine: "pure functions. No clock, no locale, no random, no iteration-order
  luck").
- **Sequencing is binding: Muninn `api.ts` first, then the Huginn mirror, then `list` in the loop** —
  "the mirror is a compile-time contract; Huginn cannot lead". Muninn's unfreeze work is approved to
  start (Dan, 2026-11-15), with **no piggybacking**: this is Plugin 1's own release, red-plan and smoke
  on its side.
- The mirror type gains `listNotes` at `src/muninn-api.ts:57` **only after** Muninn's `api.ts` gains it.

## Consequences

- **Adding the door breaks Huginn's typecheck at the fakes:** `f22.ts:41` and `f24.ts:56` build full
  `MuninnApi` literals, so both fakes must grow before `npm run typecheck` passes [R]; runtime red comes
  from Muninn `f24.ts:84-90` (`keys.length === 5` → six) — earned red, not a compile note (ADR-27).
  Muninn's chain grows to **f27**; Huginn's loop fixtures are f31–f36 (ADR-34).
- `forceReindex` (mirror at `src/muninn-api.ts:62`) has **no production caller**; its only call sites are
  fixture stubs (`f07.ts:38`, `f19.ts:33`, `f30.ts:50`) [R] — the mirror is mirrored, present, unused.
- `criteria`/`limit` do not exist in `RecipeInput` today [R], so the `list` op's envelope lives in
  `src/ops/envelope.ts` (ADR-34), not in the recipe format.
- If `listNotes` is **not** ruled, the loop has no `list` op and multi-note scope dies by name (R13's
  lesson: a design tenant with no door cannot ship).

## Sources

`docs/Serial Contextual Operations Design (Ruled).md:141-157` (R12, §8, first commit 2026-11-15);
Muninn ADR-37 (`/tmp/opencode/rationalisation/muninn/adrs/adr-37.md`, Proposed); Muninn ADR-36 (the
freeze, `be3a1b3`); Muninn `docs/decisions/` numbering; `src/muninn-api.ts:57-62`; `src/fixtures/f22.ts:41`,
`src/fixtures/f24.ts:56`, `src/fixtures/f07.ts:38`, `src/fixtures/f19.ts:33`, `src/fixtures/f30.ts:50`;
`/tmp/opencode/rationalisation/docket-2026-11-16.md` T15.

**Cross-references:** Muninn ADR-34, Muninn ADR-36, Muninn ADR-37, ADR-1, ADR-7, ADR-28, ADR-34, ADR-36.
