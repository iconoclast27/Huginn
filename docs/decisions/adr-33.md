# ADR-33: `listNotes` in the mirror — the sixth door is Huginn's dependency; the mirror is a compile-time contract and Huginn cannot lead

**Status:** **Accepted** — the ruling is Muninn `adr-37.md`, **Accepted 2026-11-18** (recorded Proposed
2026-11-16; **nothing implemented**).
**Ruled:** R12, Dan 2026-11-15 (shape and sequencing); the contract was ruled by Dan 2026-11-18.
**The contract of record is Muninn `adr-37.md`** — the fields, the answer shape, and the set/ranking
doctrine are in that one document, not restated here. This ADR carries the mirror's obligations.

## Context

The op loop's `list` op needs a door that Muninn does not have today: the frozen `MuninnApi` has five
doors, and none of them returns paths by folder, tag, or query. `tagVocabulary()` returns **counts, not
paths**, so a tag→path filter is inexpressible through the frozen surface [R]. Client-side emulation is
forbidden: vault enumeration in Huginn (`app.vault.getMarkdownFiles()`) creates a second source of truth
that Muninn's tag and semantic machinery cannot participate in (Muninn ADR-34). So the `list` op cannot
exist until Muninn grants the door, and Huginn cannot grant it to itself.

Dan ruled the door on 2026-11-18, after naming the two use cases that the door must serve ("all notes in
the Resource/Guitar folder" and "all notes like X"). The two kinds answer with two different things, and
the contract in `adr-37.md` states the difference. The model has to discern which kind it wants before it
can ask.

## Decision

- **One additive method, ruled, not implemented here.** The shape is Muninn `adr-37.md`. This repo's side:
  a pure read-only door through the mirror — no schema, no new data, no version event, dark-safe failure
  (`null` + console reason). Structural predicates (notes without frontmatter) are **not expressible** and
  are deferred to the proposed add-ons list, docket row **T37** (Dan's ruling, point 6: "That waits on that
  proposed addons list").
- **Sequencing is binding: Muninn `api.ts` first, then the Huginn mirror, then `list` in the loop** —
  "the mirror is a compile-time contract; Huginn cannot lead". Muninn's unfreeze work is approved to start
  (Dan, 2026-11-15), with **no piggybacking**: this is Plugin 1's own release, red-plan and smoke on its side.
- The mirror type gains `listNotes` at `src/muninn-api.ts:57` **only after** Muninn's `api.ts` gains it.
  **The ruled contract authorizes no code** — code comes on its own authorization, in ADR-10's order
  (contract → red `f27` → implementation → fakes grown → Muninn's release act → mirror).

## Consequences

- **Adding the door breaks Huginn's typecheck at the fakes:** `f22.ts:41` and `f24.ts:56` build full
  `MuninnApi` literals, so both fakes must grow before `npm run typecheck` passes [R]; runtime red comes
  from Muninn `f24.ts:84-92` (`keys.length === 5` → six) — earned red, not a compile note (ADR-27).
  Muninn's chain grows to **f27**; Huginn's loop fixtures are f31–f36 (ADR-34), and the numbering ruling
  (**T13**) is the loop's remaining gate.
- **The turn receipt carries the disclosure obligation.** `docs/Op Loop Red Plan.md` Stage 11 is its home:
  a partial answer says it is partial, and a ranking is labelled as a ranking. The doctrine is
  `adr-37.md`'s; the obligation on this repo is that the receipt renders it.
- `forceReindex` (mirror at `src/muninn-api.ts:62`) has **no production caller**; its only call sites are
  fixture stubs (`f07.ts:38`, `f19.ts:33`, `f30.ts:50`) [R] — the mirror is mirrored, present, unused.
- `criteria`/`limit` do not exist in `RecipeInput` today [R], so the `list` op's envelope lives in
  `src/ops/envelope.ts` (ADR-34), not in the recipe format: a recipe asks for an efficient read, and the
  door's transport fields (Muninn `adr-37.md`) are what it rides on.
- If the door had **not** been ruled, the loop would have no `list` op and multi-note scope would die by
  name (R13's lesson: a design tenant with no door cannot ship).

## Sources

`docs/Serial Contextual Operations Design (Ruled).md:141-157` (R12, §8, first commit 2026-11-15);
**Muninn `adr-37.md` (the ruled contract, Accepted 2026-11-18)**; Muninn ADR-36 (the freeze, `be3a1b3`);
`src/muninn-api.ts:57-62`; `src/fixtures/f22.ts:41`, `src/fixtures/f24.ts:56`, `src/fixtures/f07.ts:38`,
`src/fixtures/f19.ts:33`, `src/fixtures/f30.ts:50` [R]; `Muninn/docs/Tracked Issues.md` rows T15 (closed
2026-11-18) and T37 (the add-ons list).

**Cross-references:** Muninn ADR-34, Muninn ADR-36, Muninn ADR-37 (the contract), Muninn ADR-43 (the
declared limitation the semantic lane inherits), ADR-1, ADR-7, ADR-28, ADR-34, ADR-36.
