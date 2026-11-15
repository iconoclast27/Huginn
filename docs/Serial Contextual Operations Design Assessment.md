# Huginn — Engineer's Assessment of the Serial Contextual Operations Design

**Assesses:** `docs/Serial Contextual Operations Design.md` (status: design, awaiting Dan's rulings)
**Role:** engineering review by the engineer, not authorization; nothing in this file authorizes construction.
**Basis:** every claim below is measured against committed code at `1bbc908` (pushed, `origin/main`) and Muninn at its own HEAD. Line references are given so the architect can check them.
**Date:** 2026-11-15

---

## 1. What I agree to, as engineering

These parts of the design are implementable on this codebase as written, and I agree to them.

1. **The op vocabulary maps cleanly onto the existing stages.** `harness.ts:64-198` already runs
   gather → render → complete → schema validate (`:103`) → ground-truth validate (`:105`) →
   strip (`:116`) → gate (`:132`) → apply (`:141`) → record (`:190`). §3.3's claim that "the write
   op is the only op whose payload reaches the existing recipe machinery" is a true statement
   about this code: schema validation, ground truth, strip semantics, and apply routines all
   operate on the output object, keyed by `recipe.applyMethod` through `applyRegistry`
   (`harness.ts:140`). The write op needs no new machinery, only a new caller.
2. **Reads ungated is right, and free.** Today the gatherer reads note content (`gather.ts:57`)
   and the vault reader reads frontmatter (`obsidian-vault.ts:14,24`) with no gate anywhere.
   Nothing in the read path has to change.
3. **`contextUsed` is additive-safe.** `approval-gate.ts:26-32` consumes only named fields
   (`recipeName`, `targetPath`, `diffText`, `output`, `groundTruthChecks`) and passes them as an
   object literal to `ApprovalModal`; `StaticApprovalGate` (`harness.ts:225-231`) ignores the
   request entirely; fixtures record gate **call counts** and the request's `output`
   (`f29.ts:377` `approvalShown`), never a deep-equal of the whole request. So adding one field
   keeps `f04/f13/f21/f29` green, exactly as §4.2 claims.
4. **Stop parity extends the existing seam, not a new one.** `approval-gate.ts:38-49` closes the
   modal and resolves `null` on abort; `harness.ts:141-146` skips apply, and the refusal
   correction is written only for `approved === false`, never for `null`. `f27` guards the
   streaming leg on both channels (`chat()` and `complete()`), and `f26` guards that infra
   failures write no correction. A loop that passes the same `AbortSignalLike` to every LLM call
   and every gate inherits all of this. §6's Stop clause is the cheapest invariant in the design.
5. **R1 (op-shape errors turn-local, never corrections) is consistent with shipped doctrine**
   and I agree to it: `f13` (no rule failure, no correction), `f26` (infra failures are not model
   mistakes), and the Stop-no-correction rule are the same principle. A turn-local error channel
   is a string returned to the model in the message list; `ChatLlmClient.chat(messages, signal)`
   (`llm/client.ts:28`) already accepts a full message array, so an in-turn repair loop needs no
   client change.
6. **R2 (mechanical expiry over model citation) is the right mechanism** and is implementable
   with dispatcher accounting: the dispatcher holds `reads: string[]` and `lists: number` per
   turn, resets at each gated write, and feeds the reset set into `contextUsed`. Expiry is a
   `reads.length = 0` at the gate boundary — mechanical, no model input. §5.2/§5.3 as written are
   implementable exactly as stated.
7. **Vault-rooting is cheap to enforce and its red is real.** `normalizeNotePath`
   (`ui/path-utils.ts:8-15`) only appends `.md`; it does not reject traversal. Today `../x.md`
   flows through and resolves to `null` at `getAbstractFileByPath` (`obsidian-vault.ts:14`), so
   the refusal is implicit (no content) and **not** an explicit, machine-readable refusal. An
   `isVaultPath(p)` predicate (no `..`, no leading `/`, no absolute, must end `.md`, must be a
   `TFile` in the vault) is ~10 lines in a new module, and its red is earnable against
   committed code. Invariant 3 is the strongest red-earnable claim in §9.
8. **The single-shot chat path is what the loop replaces, and that is good engineering.**
   `chat-view.ts:266` dispatches once, `:321` normalizes, `:324` runs the harness once,
   `:342-348`/`:354-375` render one result. The loop subsumes dispatch: choosing a recipe *is*
   the model's first move. Deleting the single-shot path removes the seam that produced the
   verbosity defect I just fixed (params assembled by hand at `main.ts:283` and `chat-view.ts:324`),
   because params come from the envelope, not from a hand-built object literal.
9. **The turn receipt (§4.3) is honest record-keeping and needs no vault content.** Every field
   in §4.3 is counts and paths, so it can be logged, displayed, and asserted without exposing
   note bodies, which keeps `f22`/`f21` read-only display fixtures untouched.

---

## 2. Sense-check findings — the gaps I need resolved before I can agree to the wiring

**G1 — `write` names no recipe, and the existing machinery is keyed by recipe.** §3.3's fields are
`path`, `output`, `reason`. The machinery that §3.3 promises for that payload
(`outputSchema` validation, `recipe.validation` ground-truth rules, `applyMethod` lookup,
`ApplyParams` `valuePath`) all live on a `LoadedRecipe` (`recipes/types.ts`), and
`applyRegistry.get(recipe.applyMethod)` (`harness.ts:140`) cannot be called without one. So
either the envelope gains a `recipe` field (and the schema/validation/apply machinery runs
unchanged), or the design declares that write ops carry no recipe and the machinery is bypassed.
The second option contradicts §3.3. **Recommendation: `write` carries `recipe: string` naming a
loaded recipe.** This keeps `f22/f21/f06/f08/f29` semantics intact and gives the gate its
`recipeName` for free. It also answers §10's open question about "op-affordances": all recipes
inherit the vocabulary, a recipe is named by the model at write time, no recipe declares
affordances. Ruling required.

**G2 — the model cannot author a schema-valid `output` today, because it never sees the schema.**
`dispatch.ts:49` builds the catalog as `- ${name}: ${trigger.description}` — names and one-line
triggers only. The recipe's `# Instructions`, the `Output Contract` schema, and the prose
clauses (including the `Verbosity:` clause I added at `1bbc908`) reach the model only through
`renderRecipe` inside `harness.run` (`harness.ts:74`). A loop in which the model emits
`output` directly needs the recipe's instructions and schema in the loop prompt. **This is the
central wiring decision, and the design is silent on it.** Two workable shapes:

- **A — sub-run.** The model's write op names a recipe and its params; the loop calls
  `harness.run` for that recipe (which renders the prompt, completes, validates, ground-truths,
  strips), and the gate sees the result. The model stays an *op author*; the recipe prompt
  authors the payload. Cost: one LLM call per write, plus the loop's own decision calls.
  Preserves `f06/f08/f21/f22/f29` as recipe-level fixtures.
- **B — full catalog in the loop prompt.** Every recipe's instructions + schema in the system
  prompt, the model emits `output` directly. Cost: the six shipped recipes are ~13 kB of prompt
  text (`bundled.ts` content lengths: 2301, 1704, 2251, 1696, 1399, 2135 bytes), and user recipes
  add more, on every op call of every turn. Preserves `f28`'s sync guard, breaks nothing, and
  makes the model the payload author.

**Recommendation: A**, with B's catalog summary (names + triggers, as `dispatch.ts:49` does today)
in the loop system prompt. A keeps the existing recipe machinery as the single authority over
payload shape, keeps the fixtures at today's level, and keeps prompt cost flat. Ruling required —
this is the biggest open item in the design.

**G3 — `snippet` reintroduces the laundering vector R2 rejects.** §4.2 defines
`snippet: string  # short excerpt actually bearing on this write`. "Bearing on" is an evidence
claim; deciding it mechanically is not possible. §5.3's ruling rejects model citation precisely
because citation lets the model launder evidence, then §4.2 requires the model (or the machinery
acting for the model) to select the excerpt that "bears on" the write. As written, §4.2 and §5.3
contradict each other. Mechanical options that keep R2 honest:

- **Path-only disclosure:** `contextUsed` is a list of paths, no snippets. The user verifies
  *which notes* the model looked at; the user knows their own prompt. Simplest, fully mechanical.
- **Deterministic excerpt:** the first N characters, or the chunk title + first heading of the
  read, taken mechanically by the dispatcher, labelled in the modal as "what the model read", not
  "what the model used". No selection, no laundering.
- **Matching excerpt:** lines from the read that literally appear in the write's `reason` or
  `output`. Mechanical, but it discloses what the model *quoted*, not what it relied on — the
  same laundering in a narrower form.

**Recommendation: path-only plus deterministic excerpt.** Ruling required (this is my R5).

**G4 — "configurable per recipe" has no home in the parser.** `parser.ts:92-104` accepts exactly
`name`, `version`, `modelTier`, `riskClass` (and validates `modelTier ∈ {fast, capable}`,
`riskClass ∈ {read-only, suggest}`); unknown metadata keys are ignored. A per-recipe bound needs
a parser change (additive key, e.g. `maxOps`), and `RecipeMetadata` gains a field. The cheaper
home is `settings.ts` (a `turnOpBound` setting, defaulting to 12, validated in
`sanitizeSettings` like `reportBackVerbosity` at `settings.ts:52`), with no recipe change.
**Recommendation: settings-level bound now; per-recipe override only when a real recipe needs it.**
`batch-suggest` is also worth noting here: `parser.ts:103` rejects it, so §10's batch consequence
is a docs ruling, not a code change.

**G5 — bound × latency is a manual-testability question, not a code question.** `chatTimeoutMs`
defaults to 120000 (`settings.ts:23`). A 12-op turn is up to 12 LLM calls; at 10-20 s per call on
local Ollama a turn runs 2-4 minutes, and a timeout mid-turn is an infra failure — `f26`'s
"no correction" rule must extend to per-op calls, so the loop needs the `clientFailed` concept
per op (`harness.ts:96`), not per turn. Scenario F (Stop), Scenario I (verbosity), and every
chat scenario get longer to run by hand. I flag this so the bound number is chosen with the manual
smoke in mind, not with the loop's ideal in mind.

**G6 — the loop rewrites the chat UI and four scenarios.** `chat-view.ts:266-351` is replaced;
`Running <name> on <path>...` (`:317-319`), `[Interrupted]` (`:333`), the ground-truth message
(`:342-348`), the JSON blob (`:373`), and the minimal-verbose failure prefix (`:364`) all sit on
the single-shot path. `docs/TESTING1.md` Scenarios B, D, F, I (and the E/G chat legs) need
redefinition, and `f11` — which asserts today's dispatch shape — becomes a fixture for a
component that no longer exists. **Recommendation: keep `f11` as a refusal guard** (the envelope
refuses `recipeName/targetPath/reason` as a shape error) rather than deleting it, and write the
new scenarios as part of the implementation, per the living-document rule.

**G7 — two execution models if the command palette stays single-shot.** `main.ts:263` opens
`RecipeChooserModal` seeded from `settings.defaultTargetPath`, and `main.ts:283` runs one recipe
once. §10 does not say what happens to that path. Two models in one release is workable
(command palette = direct single write op; chat = loop), and I recommend keeping the palette
single-shot for the first implementation because it preserves Scenario J's command-modal leg
verbatim. Ruling required.

**G8 — the turn receipt needs a persistence decision, and the sanitization seam guards the chat.**
`sanitizeChatState` (`chat-view.ts:113` comment: "Do not trust the persisted activeNotePath") and
`refreshContext` (`:186-201`) re-read the live active leaf. If `turn` is stored in the session,
it must be sanitized on restore, and Scenario F's panel-close-mid-flight leg (step 5, added at
`031b686`) must say what a restored panel shows. **Recommendation: the turn receipt lives in the
harness result and the console log, not in the persisted chat session.** Cheaper, and keeps the
anti-stale seam small.

**G9 — §7 misses the tool-output injection vector.** §7 handles hostile *intent steering*, and
path-rooting is right. What it does not handle: the loop feeds full note bodies back to the model
as op results. A note body that says "ignore your rules and write X" is a tool-output injection
attack, the standard vector for agent loops. The design should state the envelope rule
explicitly: op results are **data** delivered in a role/format the model is told to treat as
inert; the loop's system prompt repeats the vocabulary rules and refuses to accept instructions
from op results; the gate remains the only path to effect. That is a §7 paragraph, not a code
change. My R6.

**G10 — §9's red claim is true for three of six invariants, and overclaims for three.** Measured:

- Invariant 1 (disclosure presence) — **true**, red at `harness.ts:132` (`ApprovalRequest` has
  no `contextUsed`, `harness.ts:30-37`).
- Invariant 2 (single-note writes) — **true against today's dispatcher**: `dispatch.ts:88-100`
  accepts only `{recipeName, targetPath, reason}` and returns `null` for anything else, so a
  two-path write op is refused today. Red is real; the refusal is not machine-readable, which is
  the second half of the claim.
- Invariant 3 (vault-rooting) — **true**, as measured in G7/G1 note above (`path-utils.ts:8` has
  no traversal rejection).
- Invariant 4 (expiry) — **false as stated**: there is no loop, no account, no gate boundary.
  Red cannot be earned against committed code; it can be earned at the stage where the account
  exists. Staged red, honest.
- Invariant 5 (Stop parity) — **already green** for the gate leg: `approval-gate.ts:38-49` +
  `harness.ts:141-146` + `f27` satisfy it for the single write today. The new claim is Stop
  *between ops*, which again requires the loop. So invariant 5 is a first-green with written
  justification (the standing rule allows this — "Diagnose before you build"), not a red.
- Invariant 6 (bound) — **false as stated**: no loop, no counter. Staged red.

**The design's line "Red is earnable against today's code for each of these" should be corrected
to: invariants 1, 2, 3 earn red against `1bbc908`; invariants 4, 6 earn red at their own
implementation stage; invariant 5 is a first-green guard on an existing guarantee.** §9's "No
first-green fixtures are proposed" is false for invariant 5.

**G11 — list operations: Muninn has the data, not the door.** Measured against Muninn:
- The frozen API (`Muninn/src/api.ts:58-64`) has exactly five methods: `searchText`,
  `searchSemantic`, `relatedChunks`, `tagVocabulary`, `forceReindex`. **No listing, no folder,
  no tag→paths method.** `tagVocabulary` returns `TagInfo {tag, files, chunks}` — counts, not
  which files (`api.ts:40-44`, `store.ts:602-610`), so a `criteria.tag` filter is not expressible
  through the frozen door today.
- The store has everything needed: `files(path, size, mtime, content_hash)` (`store.ts:138-143`),
  `chunks(path, ord, vh, bs, be, text, title)` (`:145-154`), `tags(vh, tags JSON)` joined to
  paths via chunks (`:171-175`, `:602-610`), `getFile(path)` returning a watermark with `mtime`
  (`:94`), `countFiles()` (`:103`), `renamePrefix(fromFolder, toFolder)` which already establishes
  **boundary-matched folder-prefix semantics** — `Area/` never captures `Area 2/` (`:469-481`),
  and `query(sql, params)` is the read-only allowlisted diagnostic door (`:127`, `ensureReadOnly`
  at `:230-243`).
- `Hit`/`SearchResult` carry `path, ord, bs, be, title, text` (`api.ts:18-25`), so `criteria.query`
  can be served by `searchText` today.

**Conclusion: one additive method, specified, not implemented.** It is a pure read-only SELECT over
existing tables — no schema change, no new data, no version event, `null + console reason` on
failure per the dark-safe doctrine (`api.ts:66-74`), and `list` results are metadata only, which is
§3.1's own requirement. The shape I would specify:

```ts
// additive to MuninnApi; read-only; dark-safe
listNotes(filter: {
    folder?: string,   // vault-relative prefix, boundary-matched as renamePrefix does
    tag?: string,      // joins tags -> path; vocabulary tag, no prefix match
    query?: string,    // free text against path/title; served by FTS today
    limit?: number,    // caller cap, dispatcher-side per design §3.1
}): { notes: Array<{ path: string; title: string; mtime: number; tags: string[] }>, total: number } | null
```

Answers to Dan's two questions, directly: **yes, folders are expressible** (prefix semantics
already exist in Muninn's store, boundary-matched), and **yes, tags are expressible** (`tags`
rows join to `chunks.path`; `tagVocabulary` proves the join is real), **provided** the additive
method is added. Today the frozen door gives counts, not paths, so `criteria.tag` is not
implementable in Huginn without it. Doing `list` in Huginn by vault enumeration instead
(`app.vault.getMarkdownFiles()`) would create a second source of truth that Muninn's semantic and
tag machinery cannot participate in — folder listing would work, tag filtering would not, and
the design's "list returns metadata matching criteria" clause would be half-served.
**Recommendation: the additive method in Muninn, one method, shape as above.** Huginn-side,
`list` calls it; the dispatcher caps the limit, records the count for §4.3, and scopes it per §5.4.

**G12 — the batch consequence is a docs conflict to settle, not code to delete.** `grep -rn
"batch" src/ --include=*.ts` in Huginn returns zero matches outside `docs/`, so there is no
shipped batch code. The batch tenant lives in `docs/Risk Class and Approval Model Design.md`
(`:24`, `:34`, `:40`, `:61-63`, `:95-110`, `:137`, `:179`): `batch-suggest`, `auto-apply`, a batch
modal, `batch-suggest` "always batch modal". §10 rules batch mutation out, which supersedes that
section. `parser.ts:103` accepts only `read-only | suggest`, so `batch-suggest` is unreachable in
code today. **Recommendation: name the superseded document in the design's header and rule on the
`auto-apply` clause at the same time** — the batch design's `auto-apply` row is also a write
without a gate, which §3.3 ("always gated") also forbids.

**G13 — small true facts worth putting in the design so implementation does not rediscover them.**
- Production never sets `defaultTargetPath`: `main.ts:249` builds
  `MuninnApiInputGatherer({ api, app })`, and the gatherer's fallbacks at `gather.ts:51,57,64,68`
  only ever fire in fixtures. The loop's active-note floor must be a prompt fact
  (`dispatch.ts:68`'s existing pattern), not a gatherer default.
- `describeOutput` (`approval-gate.ts:58-66`) reads `obj.tag` (a legacy scalar key no shipped
  recipe emits) and `obj.reason`. If the gate is to show `contextUsed` and a `tags` array, the
  scalar `obj.tag` branch is dead code that should be removed when array display lands.
- The loop's per-op LLM calls should reuse `ChatLlmClient.chat` (not `complete`), because op
  results must be appended as messages; `complete` takes a single string prompt.
- `warmup()` (`harness.ts:201`) exists for the model-kept-out-of-memory case; a 12-op turn is the
  first feature that needs it reliably.

---

## 3. Wiring map (what I would change, file by file — no code written)

- **New: `src/ops/envelope.ts`** — op union (`list|read|write|respond`), parse from raw model
  text (reuse `dispatch.ts:101-104`'s fence-stripping), validate shapes, machine-readable error
  strings for in-turn return, `isVaultPath` predicate (no `..`, no absolute, `.md` required).
- **New: `src/ops/loop.ts`** — the turn driver: system prompt (catalog names + triggers,
  active-note floor, corrections, verbosity instruction), the account (`reads`, `lists`,
  `writesRequested`, `writesApplied`, `writesDeclined`, `opErrors`, `boundHit`), the executor
  (read → vault reader; list → Muninn `listNotes`; write → `harness.run` per G2-A; respond →
  terminal), expiry reset at each gate, bound check, abort signal threaded to every call.
  Per-op `clientFailed` handling inherited from `harness.ts:96` + `f26` doctrine.
- **`src/chat/chat.ts`** — `sendMessage` gains the loop path; the per-send verbosity instruction
  (`CHAT_VERBOSITY_INSTRUCTIONS`, `1bbc908`) becomes part of the loop system prompt, still
  per-send and never persisted.
- **`src/ui/chat-view.ts`** — `:266-351` replaced by the loop driver; status lines, `[Interrupted]`,
  apply message, ground-truth message redefined; the turn receipt shown as a compact summary
  (console + chat, not persisted per G8).
- **`src/harness/approval-gate.ts` + `src/ui/approval-modal.ts`** — `contextUsed` rendering
  (paths + deterministic excerpts), array `tags` display, `obj.tag` scalar branch removed.
- **`src/harness/harness.ts`** — `ApprovalRequest` gains `contextUsed` (additive, `:30-37`);
  the write-op caller replaces the hand-built params at `chat-view.ts:324` and `main.ts:283`.
- **`src/settings.ts`** — `turnOpBound` (default 12), validated in `sanitizeSettings`; the loop
  reads it live through the existing `getSettings` accessor (`chat-view.ts:31`).
- **`src/recipes/parser.ts`** — unchanged unless a per-recipe bound is ruled (G4).
- **`src/muninn-api.ts` (mirror)** — `listNotes` added to the mirror only after Muninn's
  `api.ts` gains it. The mirror is a compile-time contract; Huginn cannot add the method first.
- **`src/chat/dispatch.ts`** — subsumed. `f11` re-pointed as a refusal guard, not deleted.
- **`package.json` fixtures chain** — sequential `f31…f36`, no gaps.
- **`docs/TESTING1.md`** — Scenarios B, D, F, I redefined; a new scenario for the op loop
  (scope establishment via `list`, serial writes, disclosure verification) written as a manual
  smoke with the turn receipt as the observable.
- **`docs/Risk Class and Approval Model Design.md`** — batch section marked superseded
  (G12), `auto-apply` row ruled.

---

## 4. Fixture-first plan, in dependency order

The order matters: the envelope and vault-rooting are red-earnable today; the account, bound,
and expiry red can only be earned at their own stage. Six fixtures, `f31` first.

1. **`f31` — envelope refusal and vault-rooting** (invariants 2, 3). Red against `1bbc908`:
   `dispatch.ts:88-100` accepts only the dispatch shape and returns a silent `null` (no
   machine-readable error); `path-utils.ts:8` passes `../x.md` through. Entry at the envelope
   parser's production surface once `src/ops/envelope.ts` exists — first legs enter at
   `ChatSkillDispatcher.dispatch` (today's entry point) with the op envelope as the raw model
   emission, so the red is real. Then `isVaultPath` lands.
2. **`f32` — `contextUsed` presence and shape** (invariant 1). Red against `harness.ts:30-37`:
   the gate receives no `contextUsed`. Entry at `HuginnHarness.run` with a recording gate,
   per `f29`'s pattern (`f29.ts:377`). Green needs §4.2 plus the account, so this fixture spans
   two commits; the red commit records `contextUsed=undefined`.
3. **`f33` — serial writes, one note per write, one gate per write** (invariant 2's positive
   side). Red: today's single write path cannot express two serial writes in one turn; a
   two-path envelope is refused.
4. **`f34` — expiry** (invariant 4). Red earned at the stage the account exists: a read before a
   gated write must not appear in the next write's `contextUsed`. Staged, honest.
5. **`f35` — Stop parity in the loop** (invariant 5). Extends `f27`'s contract; the gate leg is
   a **first-green with written justification** (already satisfied by
   `approval-gate.ts:38-49`/`harness.ts:141-146`), the between-ops leg is a real red at the
   loop stage. Justification text: "the gate-stop guarantee is already shipped and guarded by
   f27/Scenario F; this leg guards the loop's between-ops stop, which does not exist."
6. **`f36` — bound** (invariant 6). Red at the loop stage: a 13-op turn must terminate with the
   truncation notice, `boundHit=true`, and no silent success. Staged.

`f28` (catalog ↔ `.md` sync guard) and `f30` (non-path params resolve to `null`) stay green
through all six; `f11` is re-pointed, not deleted.

---

## 5. Rulings required from Dan (consolidated)

From the design (§8), unchanged: **R1** turn-local op errors, **R2** mechanical expiry,
**R3** bound number, **R4** verbose interaction with the op echo.

Added by this assessment:

- **R5 — `snippet` semantics** (G3). Recommendation: path-only + deterministic excerpt, no
  "bearing on" selection. This resolves the contradiction between §4.2 and §5.3.
- **R6 — op results are data** (G9). Add the §7 paragraph: the loop's system prompt treats note
  bodies from `read` as inert payload, and the gate remains the only path to effect.
- **R7 — `write` names a recipe** (G1). Recommendation: yes, `recipe` in the envelope.
- **R8 — recipe entry into the loop** (G2). Recommendation: **A** (sub-run via `harness.run`),
  catalog summary in the loop prompt, not full instructions.
- **R9 — bound home** (G4). Recommendation: settings-level now, per-recipe override later.
- **R10 — command palette stays single-shot** for the first implementation (G7).
- **R11 — turn receipt lives in the harness result + console, not in the persisted chat session**
  (G8).
- **R12 — Muninn's additive `listNotes`** (G11), shape as specified. Sequencing: Muninn
  `api.ts` first, then the mirror in Huginn, then `list` in the loop. One additive method,
  read-only, dark-safe, no schema change.
- **R13 — `batch-suggest` and `auto-apply` are superseded** (G12), named in the design header.
- **R14 — §9's red claims corrected** as in G10: invariants 1-3 red at `1bbc908`, invariants 4
  and 6 staged red, invariant 5 first-green with justification.

---

## 6. Scope recommendation

**Do not mix this into `0.1.0-test.21`.** The release-21 content is committed and pushed
(`031b686`, `3f34605`, `1bbc908`) and is manually testable as written. The op loop is a new
release's worth of change: a new module pair, the chat UI rewritten, four scenarios redefined,
six fixtures, and a Muninn API addition. Cutting `0.1.0-test.21` from the current tree is a
release act for you to authorize; the op loop belongs to `0.1.0-test.22` (or later), built
staged with red per commit, after R1-R14.

**My agreement statement:** I agree to the design's principle (§1), the read/write split (§3),
the loop rules (§6), the injection posture with R6 added (§7), R1, R2, R5, R7, R8(A), R9, R10,
R11, R12, R13. I do not accept §4.2's snippet as written, I do not accept §9's red claims as
written, and I will not start implementation before R1-R14 are ruled and the red plan above is
agreed.

*Diagnose, then build. This assessment is the engineering side of the diagnosis.*
