# ADR-34: The op-loop fixture plan — f31–f36 in dependency order, three reds at `1bbc908`, two staged, one first-green with written justification

**Status:** Accepted as the construction order (recorded 2026-11-16); **no fixture built, no code
written** ("wait for tasking", Dan 2026-11-16)
**Ruled:** R14, Dan 2026-11-15, in `docs/Serial Contextual Operations Design (Ruled).md` §9; plan of
record at `docs/Serial Contextual Operations Design Assessment.md` §4.

## Context

Six fixtures, in dependency order, appended to the single-hunk chain with no gaps. The order matters:
envelope and vault-rooting are red-earnable today; the account, bound, and expiry red can only be earned
at their own stage.

## Decision (the plan, verbatim from the assessment §4, `:301-330`)

1. **`f31` — envelope refusal and vault-rooting** (invariants 2, 3). Red against `1bbc908`:
   `dispatch.ts:88-100` accepts only the dispatch shape and returns a silent `null` (no machine-readable
   error); `path-utils.ts:8` passes `../x.md` through. Entry at the envelope parser's production surface
   once `src/ops/envelope.ts` exists — first legs enter at `ChatSkillDispatcher.dispatch` (today's entry
   point) with the op envelope as the raw model emission, so the red is real. Then `isVaultPath` lands.
2. **`f32` — `contextUsed` presence and shape** (invariant 1). Red against `harness.ts:30-37`: the gate
   receives no `contextUsed`. Entry at `HuginnHarness.run` with a recording gate, per `f29`'s pattern
   (`f29.ts:377`). Green needs §4.2 plus the account, so this fixture spans two commits; the red commit
   records `contextUsed=undefined`.
3. **`f33` — serial writes, one note per write, one gate per write** (invariant 2's positive side). Red:
   today's single write path cannot express two serial writes in one turn; a two-path envelope is refused.
4. **`f34` — expiry** (invariant 4). Red earned at the stage the account exists: a read before a gated
   write must not appear in the next write's `contextUsed`. Staged, honest.
5. **`f35` — Stop parity in the loop** (invariant 5). Extends `f27`'s contract; the gate leg is a
   **first-green with written justification** (already satisfied by `approval-gate.ts:38-49` /
   `harness.ts:141-146`), the between-ops leg is a real red at the loop stage. Justification text:
   "the gate-stop guarantee is already shipped and guarded by f27/Scenario F; this leg guards the loop's
   between-ops stop, which does not exist."
6. **`f36` — bound** (invariant 6). Red at the loop stage: a 13-op turn must terminate with the
   truncation notice, `boundHit=true`, and no silent success. Staged.

`f28` (catalog ↔ `.md` sync guard) and `f30` (non-path params resolve to `null`) stay green through all
six; `f11` is re-pointed, not deleted.

## Consequences

- **The measured baseline at HEAD `c4b103e`** (receipts 2026-11-16 [R]): `npm run typecheck` →
  `TYPECHECK EXIT:0`; `npm run fixtures` → **F01–F30 all `VERDICT: GREEN`**, `FIXTURES EXIT:0`.
  Receipts: `/tmp/opencode/rationalisation/huginn-receipt-typecheck.txt`,
  `huginn-receipt-fixtures.txt`.
- Chain rule: the `package.json` `fixtures` script is a **single hunk** (`package.json:11`) that cannot be
  split by hunk; the next number is **f31** (ADR-22).
- Wiring map, no code written (assessment §3, `:265-297`): **new `src/ops/envelope.ts`** (op union
  `list|read|write|respond`, parse from raw model text reusing `dispatch.ts:101-104` fence-stripping,
  shape validation, machine-readable error strings, `isVaultPath`); **new `src/ops/loop.ts`** (turn
  driver: system prompt with catalog names + triggers, active-note floor, corrections, verbosity
  instruction; the account `reads, lists, writesRequested, writesApplied, writesDeclined, opErrors,
  boundHit`; executor read → vault reader, list → Muninn `listNotes`, write → `harness.run` per G2-A,
  respond → terminal; expiry reset at each gate; bound check; abort threaded to every call; per-op
  `clientFailed` inherited from `harness.ts:96` + f26 doctrine); `chat-view.ts:266-351` replaced;
  `ApprovalRequest` gains `contextUsed` additively; `settings.ts` gains `turnOpBound`;
  `parser.ts` untouched unless a per-recipe bound is ruled; `dispatch.ts` subsumed; TESTING1 scenarios
  redefined (ADR-25); Risk Class doc batch section marked superseded (ADR-31).
- The UI-leg fixtures need the mapped `obsidian` fake (`src/fixtures/fake-app.ts`, test-only, never
  bundled), because `import { … } from 'obsidian'` throws `ERR_MODULE_NOT_FOUND` under tsx (ADR-22).

## Sources

`docs/Serial Contextual Operations Design Assessment.md:301-330, 265-297` (first commit 2026-11-15);
`docs/Serial Contextual Operations Design (Ruled).md:159-172` (§9 red table, R14 register);
`package.json:11`; `src/chat/dispatch.ts:80-106`; `src/ui/path-utils.ts:8`; `src/harness/harness.ts:30-37`;
`src/fixtures/f29.ts:377`; `src/fixtures/f27.ts`, `f28.ts`, `f11.ts`, `fake-app.ts`; receipts
`/tmp/opencode/rationalisation/huginn-receipt-*.txt` [R].

**Cross-references:** ADR-22, ADR-27, ADR-28, ADR-33, ADR-36, Muninn ADR-7, Muninn ADR-11, Muninn ADR-37.
