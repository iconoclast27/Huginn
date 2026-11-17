# ADR-27: Diagnose before you build — red earned against unfixed committed code at the intended seam; first-green guards need written justification

**Status:** Accepted (retrospective; recorded 2026-11-16); standing rule restated 2026-11-16
**Ruled:** Muninn doctrine 2026-10-24 → 11-01 (Muninn ADR-7), adopted in Huginn from 2026-11-07;
formalized in the ruled design §9 (R14, 2026-11-15); standing rule "diagnose before you build" Dan 2026-11-16.

## Context

The project's own failure mode is writing code, then writing a fixture that passes. The ruled design
names the confession verbatim: the v1 claim "red is earnable against today's code for each" was
**overclaimed** and is corrected on the record, per the engineer's measurement (`(Ruled).md:161`). The
v1 line "no first-green fixtures are proposed" is **stricken as false** for invariant 5 (`:172`).

## Decision

- **Red must be earned against unfixed committed code at the intended seam** — not at an import,
  a mock, or a compile error. Precedents: f27 red against unfixed `src/llm/client.ts` (`69a4b45`);
  f29 red against `754e309` (`S2: existing must be recorded as dropped (strip stage missing?), got []`,
  exit 1) before the strip code existed.
- **First-green guards need written justification before construction** (R14). The justification text is
  carried in the fixture header: f28's "This is a drift guard, not a red-earning fixture… its green was
  run against the pre-change copies in a HEAD worktree to prove that the green is not manufactured by
  the edit it guards" (`src/fixtures/f28.ts:6-12`), and f35's "the gate-stop guarantee is already shipped
  and guarded by f27/Scenario F; this leg guards the loop's between-ops stop, which does not exist"
  (assessment `:324-325`).
- **The v1 debts are paid on the record** (`(Ruled).md:201-203`): overclaimed reds, self-contradiction
  on evidence selection, silence on payload authorship, and the missed tool-output injection vector — all
  found by the engineer's review measured line-and-file against committed code, not by the author.
  "Diagnose, then build applies to architects; the elephant proved it."
- **The v1 diagnosis of f30 is named as the rule's own precedent**: the amendment demands of itself what
  v1 failed to demand of f30 (`:172`).
- Red-proof recipe for a head-only tree: `git worktree add -q --detach <path> HEAD`, copy untracked
  fixtures in, run with Muninn's `node_modules/.bin/tsx`, then `git worktree remove` (ADR-22).
- Findings that arise during diagnosis go on the tracked-issues docket and **stay there until
  investigated** (Dan, 2026-11-16). No rabbit holes.

## Consequences

- The op loop's red taxonomy is fixed by this rule (ADR-34): three invariants red at `1bbc908`,
  two staged, one first-green-with-justification.
- Muninn's `f24` P1 "exactly the five doors" is the red that must be earned for `listNotes`
  (ADR-33, Muninn ADR-37): runtime red at `f24.ts:84-90`, not a compile note.
- "Diagnose before you build" froze Muninn's `f30` plan and killed the parked UI-stop fixture directory
  (`dev/parked-ui-stop-fixture/` measured **absent from disk**) [R].

## Sources

`docs/Serial Contextual Operations Design (Ruled).md:161, 172, 201-203` (first commit 2026-11-15);
`docs/Serial Contextual Operations Design Assessment.md:174-186, 301-330`;
`src/fixtures/f28.ts:6-12`; `src/fixtures/f27.ts:17-19`; commits `69a4b45` (2026-11-13), `30db86b`
(2026-11-15), `1bbc908` (2026-11-15); `docs/Handover 2026-11-10 Scenario F.md:14-16` ("red must fail
because the bug exists"); `/tmp/opencode/rationalisation/docket-2026-11-16.md` standing rulings.

**Cross-references:** Muninn ADR-7, Muninn ADR-10, ADR-22, ADR-23, ADR-34.
