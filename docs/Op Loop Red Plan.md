# Op Loop Red Plan — seams measured, sequence gated, no code written

**Status: planning only.** Written 2026-11-17 at Dan's request ("Go ahead with the red plan
document"). No fixture is built, no `.ts` file is edited: rulings 0/1/3 of 2026-11-16 say **wait
for tasking**, and `f31` is not started. This document is the executable form of ADR-34's accepted
construction order, with every seam re-measured at the current HEADs so the red is earned at the
right line, not at a remembered line.

**Law this plan conforms to, and cannot change:** `docs/Serial Contextual Operations Design
(Ruled).md` (R1–R14 — four ops `list`/`read`/`write`/`respond`; `write` names a recipe and is
always gated; `contextUsed` = path + deterministic machinery-taken excerpt; v1 `snippet` stricken;
reads expire at each gate `reads.length = 0`; bound 12 as a settings slider; op-shape errors are
turn-local machine-readable strings, never corrections; no retries on decline; Stop parity; turn
receipt not persisted; command palette stays single-shot; verbosity is model-facing, never a display
filter; no intermediate `0.1.0-test.21` — `1bbc908` plus the whole loop land in one release with one
merged manual smoke). **That document is law.** ADR-34 is the fixture plan of record. ADR-33
(`listNotes` in the mirror, **Proposed**) and Muninn ADR-37 (the same contract, **Proposed**) are
the gates: **ruling owed before any of this is implemented**. Muninn **ADR-43** (Dan, 2026-11-18) is
law for the loop's `list`: the main-thread limitation is declared, and the ruling is there.

**Sequencing is binding (Dan, 2026-11-15): Muninn `api.ts` first, then the Huginn mirror, then
`list` in the loop. Huginn cannot lead.** Vault enumeration in Huginn
(`app.vault.getMarkdownFiles()`) is forbidden — no second source of truth. No piggybacking: Muninn's
door is Plugin 1's own release act.

## 1. Baseline receipts (measured 2026-11-17, the starting point for every red)

Muninn at HEAD `de228d0` (docs-only pass; code unchanged from `67d2814`): `TYPECHECK EXIT:0`;
`f01`–`f26` **26** `VERDICT: GREEN`; `FIXTURES LOOP DONE`.
Huginn at HEAD `a541f68` (docs-only pass; code unchanged from `cce37c9`): `TYPECHECK EXIT:0`;
`FIXTURES EXIT:0`; `f01`–`f30` **30** `VERDICT: GREEN`.
Both trees were clean at the measured tips, `origin/main` = HEAD, `git rev-list --count
origin/main..HEAD` = 0. This pass's changes are the only changes in the trees, docs only — no `.ts`
file, no `main.js`: Huginn `M README.md`, `M docs/Initial Design Report.md`,
`?? docs/Op Loop Red Plan.md`; Muninn `M docs/Initial Design Report.md`, `M docs/Tracked Issues.md`.

Because the last two commits touched only docs and `versions.json`, the code baseline is
`1bbc908` in Huginn (the last commit that touched `main.js`) and Muninn's Plugin 1 code as it
stands. **Red is earned against committed code at the intended seam (Muninn ADR-7 discipline)**; a
first-green guard needs written justification before construction (Muninn ADR-7, ruled register R14).

## 2. Measured seams (the lines the plan enters at)

| Seam | Measured committed state (2026-11-17) |
|---|---|
| Muninn frozen surface | `src/api.ts:65-71` — `MuninnApi` with **five** members: `searchText`, `searchSemantic`, `relatedChunks`, `tagVocabulary`, `forceReindex` |
| Muninn dark-safe helper | `src/api.ts:77-83` — `fail()` logs the reason, returns `null` |
| Muninn API factory | `src/api.ts:110` — `export function createMuninnApi(`; fixtures build it with `openStore(':memory:')` |
| Muninn door test | `src/fixtures/f24.ts:82-92` — P1 `keys.length === 5` with the five names enumerated, from `fakeApi({})` |
| Muninn real-API test | `src/fixtures/f24.ts:150` — `const realApi = createMuninnApi(fakeStore(), null)` |
| Muninn typed fakes | `src/fixtures/f22.ts:41` and `src/fixtures/f24.ts:56` — both `fakeApi(...)` return a **typed** `MuninnApi` literal, so the interface growing breaks typecheck at both |
| Muninn real store | `src/store/store.ts:839` — `export async function openStore(path, opts): Promise<Store>`; `f01.ts:115` and `f04.ts:68` open `':memory:'` |
| Muninn lane + reindexer precedent | `src/fixtures/f26.ts:23` (`laneReindexer`), `:105` (`createMuninnApi(store, null, laneReindexer(lane))`) |
| Muninn fixture set | `git ls-files src/fixtures` = **26** files `f01.ts`–`f26.ts`; `package.json` has **no** `fixtures` script (scripts are `dev`, `build`, `typecheck`, `package.json:8-10`), so the run-all is the shell loop `for n in $(seq -w 1 26)` |
| Huginn mirror | `src/muninn-api.ts:57-63` — the mirror `MuninnApi`, five members, identical shapes |
| Huginn typed fakes | `src/fixtures/f19.ts:20` (`const fakeApi: MuninnApi = {`) and `src/fixtures/f30.ts:37` — typed literals; typecheck fails at both when the mirror grows |
| Huginn partial fake | `src/fixtures/f07.ts:24-41` — `createFakeApi()` returns `{…} as unknown as MuninnApi` at `:41`. **The cast is a hole**: f07's fake can lack any member and typecheck stays green. Any leg that exercises `list` must use a typed fake, never this cast |
| Huginn plugin wiring | `src/main.ts:37` (interface member `getMuninnApi`, returning `MuninnApi` or `null`), `:121` (`new MuninnApiInputGatherer({ api, app })`), `:181` (`awaitMuninnReady`), `:219` (`discoverMuninnApi`), `:222` (the `typeof muninn.getMuninnApi !== 'function'` guard), `:225` (the call), `:248` (second gatherer construction) |
| Gate request shape | `src/harness/harness.ts:29-36` — `ApprovalRequest` has `diffText`, `output`, `recipeName`, `targetPath?`, `groundTruthChecks?`. **No `contextUsed`** (invariant 1, red now) |
| Gate call and abort resolution | `src/harness/harness.ts:135-141` (`approvalGate.approve({…}, signal)`), `:142-143` (`approval === null → approved = null`) |
| Stop parity, shipped | `src/harness/approval-gate.ts:41-44` (`onAbort` closes the modal and `resolve(null)`), `:47-50` (pre-abort check). Guarded live by `f27`'s two legs and Scenario F |
| Recording gate precedent | `src/fixtures/f29.ts:377-378` (`gateCalls: gate.calls`, `approvalShown: … gate.request?.output`) |
| Silent refusal | `src/chat/dispatch.ts:81-106` — `parseDispatch`; fence strip `:83-84`; shape guard `:88-94` → `return null` at `:94`; unknown recipe `:95-97` → `return null` at `:97`; parse exception `:103-104` → `return null`. **Three silent nulls, no machine-readable string** (invariant 2, red now) |
| Refusal guard to re-point | `src/fixtures/f11.ts:63-68` — S2 asserts `r2.intent === null` for an unknown recipe, entering at `ChatSkillDispatcher.dispatch` (`f11.ts:8`, call at `:66`). Re-pointed as the envelope's refusal guard, not deleted (R14) |
| Vault-rooting | `src/ui/path-utils.ts:8-16` — `normalizeNotePath` appends `.md` and skips `?#[]` anchors; **no traversal check**: `../x.md` passes through (invariant 3, red now) |
| UI single-shot leg | `src/ui/chat-view.ts:266` (dispatch entry), `:268-271` and `:280-283` (abort re-checks), `:284` (`runSkillFromChat`), `:305-351` (`runSkillFromChat` body: harness run, abort → `[Interrupted]`, schema failure, ground-truth notice, `renderRunResult`). Replaced by the loop driver |
| Bound setting | `grep turnOpBound src/settings.ts` = **0 hits** — the bound and its slider do not exist (invariant 6, staged red) |
| Semantic cap precedent | `src/api.ts:228` — `SEMANTIC_SEARCH_HARD_CAP = 10000`; `git grep -il worker HEAD -- src` = **0 hits in Muninn, 0 in Huginn** (measured 2026-11-18). **T4 ruled 2026-11-18 — declared limitation** (Dan: "Declared limitation, we can revisit if the problem bites"). Muninn `adr-43.md` is the ruling; the loop's `list` inherits the limitation, and the turn-receipt obligation that follows is in Stage 11 |
| Huginn fixture chain | `package.json:11` — single `&&` hunk ending `… && tsx src/fixtures/f28.ts && tsx src/fixtures/f29.ts && tsx src/fixtures/f30.ts`; **next number f31**, appended with no gaps (ADR-22) |
| UI-leg fixture support | `src/fixtures/fake-app.ts` is tracked: the mapped `obsidian` fake, test-only, never bundled, because `import { … } from 'obsidian'` throws `ERR_MODULE_NOT_FOUND` under tsx (ADR-22) |
| Memory preconditions | `docs/TESTING1.md:90, 184, 208, 229, 333` assert memory **gains**; Dan deleted all memory files 2026-11-17 (T10 closed), so the scenarios start from a clean slate and the stale-correction precondition is discharged |

## 3. The sequence

**Stage 0 — rulings owed before any code.**
**T15 — ruled 2026-11-18** (Muninn `docs/decisions/adr-37.md` **Accepted**; Huginn `adr-33.md` follows).
The door exists in the contract; the code that makes it real is **a separate authorization**, so no stage
below runs until that authorization is given. **T13**: the numbering ruling, the loop's **only remaining
gate** — Muninn's next fixture is **f27**; Huginn's next is **f31** (the loop); the Memory Feedback Loop
ranking fixtures must start at **f37**, because the guide's F26–F30 collide with the taken chains. The
guide's F-numbers get conformed to the ruling.
**T4 — closed 2026-11-18** (Muninn `adr-43.md`): declared limitation. Nothing is owed here; the loop
inherits the limitation, and the obligation that lands in this plan is in Stage 11.
Commit/push authorization is asked for at every stage; no bump, tag, release, archive, or deletion
without Dan.

**Stage 1 — Muninn: the sixth door earns its red (new fixture f27).**
`f27.ts` is authored from **`adr-37.md`'s contract text** (the contract of record — the fields, the answer
shape, and the set/ranking rule are that document, not restated here), not from observed behavior (ADR-10),
exercising the public API only (ADR-7). It builds `createMuninnApi(openStore(':memory:'), null,
laneReindexer(lane))` in the f26 pattern, ingests notes through the lane, and asserts **every clause of the
contract**, with the seams this plan has measured as its backing: the public API exposes **six** doors;
`ORDER BY path ASC` is the single stable order; a capped result self-discloses that it is partial; absent
the transport cap means no cap; a heading-less note still gives identity; zero-chunk notes appear (the
watermark records every walked file, `intake/lane.ts:431-435` [R]); a folder filter is a path prefix; the
semantic answer is labelled as a ranking; every failure path returns `null` with a console reason via
`fail()` (`api.ts:77-83` [R]). `npm run fixtures`' chain grows by appending f27, no gaps.
f27's first legs use duck-typed accessors, not a typed `listNotes` reference, so the red is a real
interface behaving wrongly, not a type error (ADR-37 item 4). **Red receipt:** f27 fails at committed
code — the API has five doors. `seq -w 1 26` becomes `1 27` in the run-all script file.

**Stage 2 — Muninn: implementation, fakes grown, P1 conformed.**
`src/api.ts` gains the interface member at `:65-71` and the dark-safe implementation, composed from
store doors with **no SQL in the door** (ADR-28); the enumeration door reads `files` for
path/mtime, `chunks.title` (`ord = 0`) for title, and the `chunks.vh` → `tags.vh` join for tags
(ADR-37, all measured there). `f22.ts:41` and `f24.ts:56` grow to satisfy the widened interface;
`f24`'s P1 at `:85-92` becomes `keys.length === 6` with `listNotes` in the enumeration. Receipt
required: `TYPECHECK EXIT:0` and **27** `VERDICT: GREEN`, `FIXTURES LOOP DONE`. No `Plugin 2`
corpus edit: the corpus stays a named oracle (Muninn ADR-38), with `f25`/`f26` as the referees for
the interface `listNotes` must preserve.

**Stage 3 — Muninn's release act (Dan's, authorized separately).**
Bump, tag, release for Plugin 1's own release; no piggybacking into Huginn's release. The bump commit
touches `README.md`, `docs/TESTING1.md`, `manifest.json`, `package.json`, `versions.json`. Muninn's
manual smoke on its side precedes the cut (Muninn `docs/Release Ritual -- Walkthrough.md`; Huginn
keeps `docs/Release Ritual -- Pointer.md`).

**Stage 4 — Huginn: the mirror grows (a compile-time contract).**
`src/muninn-api.ts:57-63` gains `listNotes` mirroring Muninn's accepted contract exactly;
`f19.ts:20` and `f30.ts:37` grow. `f07.ts:24-41`'s cast needs no growth (its gatherer legs do not
exercise `list`), and the plan records the cast as a known hole. `src/main.ts` discovery is additive:
a plugin that does not answer `listNotes` is a version-skew case, disclosed, not a crash. Receipt:
`TYPECHECK EXIT:0`, 30 `VERDICT: GREEN` (chain unchanged).

**Stage 5 — `f31`: envelope refusal and vault-rooting (invariants 2, 3), red at `1bbc908`.**
New `src/ops/envelope.ts`: op union `list|read|write|respond`, parse from raw model text reusing the
fence-stripping pattern at `dispatch.ts:83-84`, shape validation, turn-local machine-readable error
strings (R1: never corrections), and `isVaultPath`. First legs enter at `ChatSkillDispatcher.dispatch`
(today's entry point, `f11.ts:8`) with the op envelope as the raw emission, so the red is real
against committed code: `dispatch.ts:94`/`:97`/`:104` return silent null, and `path-utils.ts:8-16`
passes `../x.md`. `f11`'s S2 leg (`f11.ts:63-68`) is re-pointed to assert the refusal string.
Receipt: f31 red at `1bbc908`; `f28` and `f30` stay green throughout.

**Stage 6 — `f32`: `contextUsed` presence and shape (invariant 1).**
Red against `harness.ts:29-36`: the gate receives no `contextUsed`. Entry at `HuginnHarness.run` with
a recording gate in `f29`'s pattern (`f29.ts:377-378`). `contextUsed` = `path` + a deterministic
machinery-taken excerpt (R5, no model-chosen text — R2 closes the laundering vector). Green needs the
account, so this fixture spans two commits; the red commit records `contextUsed=undefined`.

**Stage 7 — `f33`: serial writes, one note per write, one gate per write.**
Red: today's single write path cannot express two serial writes in one turn; a two-path envelope is
refused. `write` names a recipe and the payload is authored by the recipe sub-run via `harness.run`
(R8 Option A). Every write is gated, always — no auto-apply, no batch (R13, superseded by name).

**Stage 8 — `f34`: expiry (invariant 4, staged).**
Mechanical expiry at the gate boundary: a read taken before a gated write must not appear in the next
write's `contextUsed` (`reads.length = 0` at each gate). Red earned at the stage the account exists.

**Stage 9 — `f35`: Stop parity in the loop (invariant 5).**
The gate leg is **first-green with written justification**, already satisfied by
`approval-gate.ts:41-44`/`:47-50` and `harness.ts:142-143`, guarded by `f27`'s two legs and Scenario
F. Justification text, verbatim from ADR-34: "the gate-stop guarantee is already shipped and guarded
by f27/Scenario F; this leg guards the loop's between-ops stop, which does not exist." The
between-ops leg is a real red at the loop stage.

**Stage 10 — `f36`: the bound (invariant 6, staged).**
`settings.ts` gains `turnOpBound` (measured absent), default **12**, slider control (R3). A 13-op
turn terminates with the truncation notice and `boundHit=true`, never silent success. Red at the loop
stage.

**Stage 11 — `src/ops/loop.ts`, the turn driver, and the UI leg.**
The loop owns the account (`reads`, `lists`, `writesRequested`, `writesApplied`, `writesDeclined`,
`opErrors`, `boundHit`), the system prompt (catalog names + triggers, active-note floor, corrections,
verbosity instruction), executors (read → vault reader; list → Muninn `listNotes` through the mirror;
write → `harness.run` per G2-A; respond → terminal), expiry reset at each gate, the bound check,
abort threaded to every call, per-op `clientFailed` inherited from `harness.ts:87` (declared),
`:90` (set when the client returns null), `:171` (corrections suppressed on infra failure) + f26 doctrine.
`chat-view.ts:266-351` is replaced by the loop driver; `dispatch.ts` is subsumed; the command palette
stays single-shot (R10), Scenario J's command-modal leg survives verbatim. `parser.ts` untouched
unless a per-recipe bound is ruled. UI-leg fixtures enter through `src/fixtures/fake-app.ts`.
The turn receipt is not persisted. A partial answer says it is partial: the receipt compares the
door's disclosed set size against the returned count, alongside the bound notice (Muninn `adr-43.md` —
a declared limitation is only legitimate when the result discloses itself). The doctrine is Muninn
`adr-37.md`'s; Stage 11's job is that the receipt renders it.

**Stage 12 — the testing contract, redefined with the loop.**
`docs/TESTING1.md`: Scenarios B, D, F, I plus the E/G chat legs redefined (T20), and a new loop
scenario whose observable is the turn receipt — scope via `list`, serial writes, disclosure
verification, the bound notice, Stop at a gate, Stop between ops, expiry (a read before a gate not
carried forward), the two-tag checks, verbosity re-verification. Scenario A is the precondition for
all scenarios and survives unchanged (measured: the "Scenario A superseded" claim is not in the
repo). Memory assertions stay as gains; the stale-correction precondition is discharged by Dan's
2026-11-17 act (T10 closed).

**Stage 13 — the merged manual smoke, then one release.**
The smoke is the release gate (T9), and the overrule is explicit: **no intermediate
`0.1.0-test.21`**. Everything at `1bbc908` plus the whole loop lands in **one** release with **one**
smoke session that passes everything at once: Scenario F's UI-leg steps, the loop scenario, the
two-tag checks, verbosity re-verification. Accepted cost: one blast radius, one revert point.
Release assets: `main.js`, `manifest.json`, `versions.json`, `styles.css`. Bump, tag, and release
require Dan's explicit authorization, asked for only when the loop is testable and the smoke passes.

## 4. Red taxonomy, as ruled (R14), restated with today's measurements

| # | Invariant | Status | Measured seam |
|---|---|---|---|
| 1 | Disclosure presence | **Red now** | `harness.ts:29-36`, no `contextUsed` |
| 2 | Single-note writes, machine-readable refusal | **Red now** | `dispatch.ts:94, 97, 104` silent nulls |
| 3 | Vault-rooting | **Red now** | `path-utils.ts:8-16`, no traversal check |
| 4 | Expiry | **Staged** | earns red when the account exists (`f34`) |
| 5 | Stop parity | **First-green with written justification** (gate leg) + real red for the between-ops leg | `approval-gate.ts:41-44, 47-50`; `harness.ts:142-143`; f27 legs; Scenario F |
| 6 | Bound | **Staged** | `settings.ts` has no `turnOpBound` (0 hits) |

`f28` (catalog ↔ `.md` sync) and `f30` (non-path params resolve to `null`) stay green through all
six fixtures. `f11` is re-pointed, not deleted.

## 5. Measured corrections to earlier citations (this pass, receipts in §2)

- `dispatch.ts:88-100` → measured **81-106**, with the three silent `return null` at **94, 97, 104**.
- `harness.ts:30-37` → measured `ApprovalRequest` at **29-36**.
- `approval-gate.ts:38-49` → measured Stop handling at **41-44** and the pre-abort check at **47-50**.
- "grow fakes `f22.ts:41`, `f24.ts:56`" is **Muninn** (measured, correct). The Huginn mirror fakes
  are **`f19.ts:20`** and **`f30.ts:37`**; **`f07.ts:41`** is a cast, not a typed fake, and does not
  grow.
- `chat-view.ts:266-351` measured as dispatch entry **266**, `runSkillFromChat` call **284**, body
  **305-351**.
- "`clientFailed` inherited from `harness.ts:96`" → measured at **87** (declared), **90** (set when
  the client returns null), **171** (corrections suppressed on infra failure); the doctrine is f26's
  header itself, `f26.ts:1-11` — "Infra failures do not become corrections (regression guard)".
- `src/main.ts` wiring measured: `getMuninnApi(): MuninnApi | null` at **37**, `MuninnApiInputGatherer`
  constructed at **121** and **248**, `awaitMuninnReady` at **181**, `discoverMuninnApi` at **219**,
  the `typeof muninn.getMuninnApi !== 'function'` guard at **222**, the call at **225**. Scenario F is
  `TESTING1.md:163`; its step 4 and its expected results cover Stop at the approval modal.
- (2026-11-18) The cross-reference list cited **ADR-35 (compute threading)** in the Huginn ADR list:
  that is **Muninn's** ADR-35. Huginn's ADR-35 is the `isDesktopOnly` supersession text
  (`docs/decisions/adr-35.md`). The citation is re-scoped, and Muninn `adr-43.md` is added to the list.

## 6. Authorization gates

Nothing **in the code** is authorized: no coding, no fixture, no code commit, no code push, no bump,
no tag, no release. The docs pass that carries this plan is Dan's authorized act, batched: **one
commit per repo per pass** (Dan, 2026-11-17 — "don't just commit every two seconds for one document"),
so this pass carries the plan, the README bullet, the docket pointer, and the hash-recording lines as
one commit per repo. **T15 ruled 2026-11-18** (Muninn `adr-37.md` **Accepted**; the contract is law, the
code is a separate authorization), so the gates are, in order:
T13 numbering ruling → **authorization to implement the door** → Muninn
f27 red (authorization to build) → Muninn implementation → Muninn release act → Huginn mirror →
`f31`–`f36` (one commit per red, receipts pasted, push asked for each time) → the UI leg →
`TESTING1` redefinition → merged manual smoke → one release with Dan's authorization.

**Cross-references:** `docs/Serial Contextual Operations Design (Ruled).md`; ADR-22 (chain rule),
ADR-25 (Scenario A), ADR-27 (determinism), ADR-28 (base ban, no SQL in doors), ADR-31 (batch
superseded), ADR-33 (mirror, **Accepted** — the ruling is Muninn `adr-37.md`), ADR-34 (fixture plan of record), ADR-36 (prompt budget);
Muninn ADR-7 (earned red), ADR-10 (contract text first), ADR-11 (typecheck
baseline), ADR-14 (mobile), ADR-21 (staffing), ADR-33 (plugin boundary), ADR-34 (Plugin 2 boundary),
ADR-35 (compute threading), ADR-36 (freeze), ADR-37 (`listNotes`, **Accepted** 2026-11-18 — the contract
of record), ADR-38 (named oracle),
ADR-40 (documents live in the repo), ADR-43 (the declared limitation, **T4** closed);
`Muninn/docs/Tracked Issues.md` rows T4, T9, T13, T15 (**closed 2026-11-18**), T20, T37 (the proposed
add-ons list, deferred by Dan's ruling of 2026-11-18) — the docket is canonical for both
projects, Huginn keeps `docs/Tracked Issues -- Pointer.md`).
