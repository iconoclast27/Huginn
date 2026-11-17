# Huginn Initial Design Report

**Recorded:** 2026-11-16 (body revision date; frontmatter `modified:` is not evidence — Muninn ADR-6).
**Describes as-built at:** HEAD `c4b103e`, version `0.1.0-test.20` [R] (code unchanged by the Phase 4
docs commit `2eb0c29`; the as-built basis is `c4b103e`). **Pushed 2026-11-17:**
`1bbc908..2eb0c29 main -> main` — `origin/main` is `2eb0c29` [R]. Push authorization is Dan's and is
discharged.
**Method:** retrospective, paired with the Muninn Initial Design Report (same corpus, same rules, 2026-11-16).
Canonical single-source-of-truth document for Huginn. Facts owned by Muninn are cross-referenced, never
copied (ruling 4, ADR-32).
**Labels:** **[R]** = measured in the repo this pass; **[U]** = untracked-on-disk; **[H]** = quoted from a
committed doc; **[GHOST]** = a name cited by a committed doc that is not in the repo.
**Receipts:** `/tmp/opencode/rationalisation/huginn-receipt-typecheck.txt` (`TYPECHECK EXIT:0` at `c4b103e`)
and `/tmp/opencode/rationalisation/huginn-receipt-fixtures.txt` (F01–F30 all `VERDICT: GREEN`,
`FIXTURES EXIT:0`) [R]. Standing rule: **receipts or nothing** (ADR-32).

---

## 1. Purpose and non-goals

**Huginn is Plugin 2: a vault-aware chat plus a skill harness with human approval** (`README.md:7` [R];
`docs/Huginn Plugin 2 Definition v0.1.md`, 50 lines, first commit 2026-11-06 [R]).

- **Goal:** the model decipheres intent; governed machinery executes vault-bounded work; a human approves
  every write with that write's evidence (`docs/Serial Contextual Operations Design (Ruled).md §1` [H], ADR-28).
- **Non-goals (the inherited Muninn doctrine, ADR-2):** the model never receives a tool menu, never
  approves, never applies, never adjudicates safety. Huginn never reads vault state except through
  Muninn's door, and never enumerates the vault (`app.vault.getMarkdownFiles()` is forbidden, Muninn ADR-34).
- **Non-goal, measured:** no RAG in chat — vault-wide search results never enter the chat prompt
  (`docs/Huginn Plugin 2 Harness.md:187` [H]); chat injects the active note only (`:180` [H]).
- **Non-goal:** no release, no version, no commit, no push, no fixture, no code written by this report.
  ADR-32 records the gate: "No commits, version bumps, release cuts, or tags without Dan's explicit
  authorization; ask before pushing."

**The op loop is the design of record and is not implemented.** Ruled law:
`docs/Serial Contextual Operations Design (Ruled).md` (207 lines, first commit `c4b103e`, 2026-11-15) [R];
engineering diagnosis: `docs/Serial Contextual Operations Design Assessment.md` (376 lines, same commit) [R].
Implementation is not authorized (Dan's rulings 0/1/3, 2026-11-16: "wait for tasking").

## 2. Plugin 2 boundary and the frozen dependency

Measured, as-built [R]:
- **69 tracked `.ts` files in `src/`**: `chat` 2, `fixtures` 31, `harness` 8, `llm` 1, `main.ts` 1,
  `memory` 4, `muninn-api.ts` 1, `recipes` 14, `settings.ts` 1, `ui` 6.
- **105 tracked files total; 24 tracked files under `docs/` + `README.md` = 25 tracked** [R]. On disk:
  25, including the untracked `docs/Handover 2026-11-15.md` [U]. `docs/archive/` exists and is **empty
  (0 tracked files)** — Phase 2 for Huginn is a file inventory only, no mining (ruling 1).
- **The dependency surface is `src/muninn-api.ts:57-62`** — the mirror type `MuninnApi`, five doors
  (Muninn ADR-36), plus `forceReindex` at `:62`. `forceReindex` has **no production caller**; its call
  sites are fixture stubs `f07.ts:38`, `f19.ts:33`, `f30.ts:50` [R].
- Readiness gate: `src/main.ts:222-225` probes `typeof muninn.getMuninnApi !== 'function'` → null;
  wiring at `:119-123` and `:242-250`; readiness log `[Huginn] harness initialized against Muninn API`
  at `:147` [R].
- **The sixth door is owed to Muninn's ruling** (Muninn ADR-37, `listNotes`, Proposed). Sequencing is
  binding: Muninn `api.ts` → Huginn mirror → `list` in the loop. Huginn cannot lead (ADR-33).
- Floor: Muninn `0.2.0-test.15` (or later) (`docs/TESTING1.md:9`, `README.md:22` [R]).

## 3. The harness as-built

`src/harness/harness.ts`, measured [R]: `run()` at `:64`; the completion call
`complete(rendered.prompt, signal)` at `:77`; corrections read at `:72` (`getContext(recipe, 5)`);
`clientFailed` declared at `:87` and set at `:90` when raw is null; `validate` at `:108`;
`stripGroundTruthDrops` at `:119`; the gate call at `:135-141`; `approval === null → approved = null`
at `:142-143`; apply at `:147-151`; refusal recorded at `:154-162` (guarded by `!clientFailed` at `:171`);
the result object at `:189-201`, `groundTruthDropped` at `:197`; `warmup()` at `:205` (the assessment
cites `:201` [H]).

The pipeline order is the doctrine made mechanical: render → complete → parse/validate → ground truth →
strip drops → gate → apply → corrections. The gate sits between validation and effect, and nothing that
fails validation reaches it (`f29`'s S4 leg asserts `request === null` on a failed ground truth).

`ApprovalRequest` is `src/harness/harness.ts:30-37` — `diffText`, `output`, `recipeName`, `targetPath?`,
`groundTruthChecks?` [R]. **It has no `contextUsed` field** (invariant 1 red seam, ADR-34).

## 4. Ground truth as-built

`src/harness/ground-truth.ts` (395 lines), measured [R]: `PrimitiveResult` union at `:60`; the registry
at `:82`; six primitives — `file-exists` `:135`, `file-not-exists` `:145`, `frontmatter-contains` `:156`,
`frontmatter-not-contains` `:186`, `note-contains-text` `:222`, `note-not-contains-text` `:249`;
`normalizePrimitiveResult` `:290`, `valuesMatch` `:307`, `frontmatterValues` `:320` (used `:172`/`:179`),
`stripGroundTruthDrops` `:335`.

- Registry + primitives + strip are live **only** through `harness.ts` [R] — the seams the ruled design
  inherits unchanged (R10/R11 preserve ground-truth machinery; R13 is docs-side).
- The array-blind comparison (finding 7) is fixed by `frontmatterValues` (ADR-14); `minItems`/`maxItems`
  are rejected as rule enforcement, measured 0 hits in `src` [R].
- Ground-truth failures are vault state: not retried, not corrections, stripped before approval, and the
  notices must display unconditionally (ADR-12; `groundTruthDropped` has **no UI consumer today** [R]).

## 5. Gather and apply as-built

`src/harness/gather.ts`, measured [R]: the source switch at `:44`, cases `recipe-param` `:45`,
`content`, `vocabulary`, `query`, `path`, `constant` — **there is no `list` source** (the `list` op lives
in `src/ops/loop.ts`, not in the recipe format, ADR-34). `defaultTargetPath` fallbacks at `:51`, `:57`,
`:68`; production never sets the setting, so every fallback fires only in fixtures [R]. Non-path
`recipe-param` inputs resolve to `null` and never borrow the note path (ADR-26, `1bbc908`, guarded by
f30 on the rendered prompt).

`src/harness/apply.ts`, measured [R]: `createDefaultApplyRegistry` at `:51`, `noop` `:55`,
`append-frontmatter-array` `:63`, `set-first-heading` `:107`, `append-section` `:137`, `parseSimpleYaml`
`:249`. `append-frontmatter-array` accepts scalar **or** array (ADR-8); the array branch shipped with the
two-tag ceiling (ADR-6, `f2def43`).

## 6. The recipe catalog as-built

Six recipes, bundled in `src/recipes/bundled.ts` (511 lines), measured [R]: `tag-assignment`
(name `:19`, risk `:22`), `title-suggestion` (`:109`/`:112`), `link-suggestion` (`:183`/`:186`),
`task-extraction` (`:273`/`:276`), `note-summary` (`:345`/`:348`), `related-notes` (`:410`/`:413`).
Three write-class, three read-only (`docs/TESTING1.md:313` [R]).

- `bundled.ts` is authoritative; `Agents/Huginn/SKILLS/` `.md` mirrors are conformed to it, never the
  reverse (ADR-17). `f28` is the drift guard with written first-green justification in its header
  (`src/fixtures/f28.ts:6-12` [R]); its green was proven against pre-change copies in a HEAD worktree.
- The recipe format reference of record is `docs/Huginn Plugin 2 Harness.md` §Validation and the field
  table at `:60-71` [R] — `metadata`, `Trigger`, `Inputs`, `Instructions`, `Output Contract`,
  `Apply Method`, `Apply Params`, `Chat Render`. Sources named there: `query`, `path`, `vocabulary`,
  `constant`, `recipe-param`, `content` [R] — matching `gather.ts:44` measured [R].
- `f05` guards the parser; `parser.ts` is unchanged by the loop ruling (`parser.ts` keyword whitelist at
  `:274-330`; `minItems`/`maxItems` have no case, measured [R]; a per-recipe bound is deferred, G4).
- Design-only vocabulary measured 0 hits in `src` [R]: `clarify`/`none`, `SKILL_FRAGMENTS/`,
  `index.md`, `fingerprint`, `muninn:`, `post-apply:`, `note-has-heading`, `note-links-to`,
  `batch-suggest`, `auto-apply`, `approvalPolicy`, `autoApplyConfidence` (ADR-31).
- **Stale by measurement [R]:** `docs/Huginn Plugin 2 Harness.md`'s fixture table runs f01–**f27**
  (`:114-140`); shipped fixtures are f01–f30. The table is not canonical (canonical = `package.json:11`).

## 7. Chat as-built

**UI:** `src/ui/chat-view.ts` is a sidebar `ItemView` registered at `src/main.ts:94-96` with ribbon `:99`
[README.md:15] [R]. Measured seams [R]: `session: ChatSession` `:42`; verbosity reads `:54` and `:296`;
`handleSend` `:223` — when a request is in flight the Send button acts as Stop (`:233` closes
`ApprovalModal.closeActive()` and aborts); `dispatch` `:266`; `[No response from model]` `:299`;
`runSkillFromChat` `:305`; params built at `:324`; `renderRunResult` `:354`; minimal-verbose failure
prefix `:364`; `Running <name> on <path>...` `:317-319`; `[Interrupted]` `:333`; ground-truth message
`:342-348` (assessment citations [H]).

**Dispatch:** `src/chat/dispatch.ts`, measured [R]: `parseDispatch` at `:80-106` — fence strip `:82-84`,
all-three-fields-non-empty `:88-93`, unmatched → `null` `:96`; system prompt at `:66`; corrections read
`getContext(undefined, 5)` at `:55`. `f11` asserts the dispatch shape (legs S1–S8 at `:53-88`).

**The single-shot path is what the loop replaces.** The ruled law does not abolish the gate, the
ground-truth machinery, the apply registry, `clientFailed` semantics, or the corrections rule; it
replaces the chat path (`chat-view.ts:266-351`) and adds the envelope/account/expiry/bound layer above
the existing harness (`src/ops/envelope.ts`, `src/ops/loop.ts`, ADR-34). **The command palette stays
single-shot** (R10): `main.ts:263` opens `RecipeChooserModal` seeded from `settings.defaultTargetPath`
and `main.ts:283` runs one recipe once [R]; Scenario J's command-modal leg survives verbatim (ADR-25).

**Prompt floor (ADR-36):** catalog names + one-line triggers, active-note floor, corrections, the per-send
verbosity instruction; `num_ctx` is not set in the client (`grep -n "num_ctx" src/llm/client.ts` → 0 hits) [R].

## 8. The approval gate as-built

`src/harness/approval-gate.ts` `approve` at `:18`; `resolve(null)` at `:44`; `signal?.aborted` check at
`:50` [R]. `src/ui/approval-modal.ts`: `activeModal` `:26`, `closeActive()` `:34`, `onClose` `:131` [R].
The gate's Stop parity is measured in code as a comment plus `onAbort` (`approval-gate.ts:38-49`): the
modal closes and the request resolves `null` — **not a correction** [R]. The loop's between-ops stop does
not exist yet (f35, ADR-34, first-green justification text in the assessment).

**Disclosure is the loop's addition:** `contextUsed` = `path` + a deterministic machinery-taken excerpt;
the v1 `snippet` field is stricken (R5, ADR-28). Reads expire at each gate boundary, dispatcher-side.

## 9. Memory as-built

`src/memory/`: 4 tracked files — `commands.ts`, `kinds.ts`, `obsidian-storage.ts`, `store.ts` [R].
`store.ts:56` is `readContext`; `recurrenceKey` at `:166` [R] (the recurrence key exists in the store;
the ranking that would use it does not).

Three append-only kinds, measured [R]: `CorrectionsMemory` `:34` → `corrections.md`; `UserMemory` `:75`
→ **`'user.md'`** (append `:89`, read `:93`); `ChatSummaryMemory` `:110` → `chat-summaries.md`.
Reads enter prompts at `getContext(..., 5)` (`harness.ts:72`, `dispatch.ts:55`, `main.ts:313, 317` [R]).
The `Remember` gate: a message must begin with `Remember` for the append path (ADR-15, `f14`).
`UserMemory`'s filename is `user.md` in code, `user-memory.md` in two docs — naming drift ledgered (§15),
docket T14-adjacent.

**The Memory Feedback Loop is design, unimplemented** (ADR-30, measured [R]): no `ranker.ts`;
`grep -r "scoreEntry|reinforce|memoryBudget|rank" src` → 0 hits; no memory sub-object in `settings.ts`
(grep `memory`/`Memory` → 0 hits). Its Implementation Guide plans fixtures **F26–F30** (`:442-446`, `:485`)
against a chain whose shipped numbers f26–f30 are taken (`package.json:11` [R]) — the loop fixtures are
f31–f36, ranking fixtures **f37+** if built (numbering ruling owed to Dan, T13).

## 10. Settings and LLM client as-built

`src/settings.ts`: `DEFAULT_SETTINGS` at `:20-27` — `ollamaUrl: 'http://localhost:11434'`,
`ollamaChatModel: 'qwen3.5:4b'`, `chatTimeoutMs: 120000`, `warmupOnFocus: false`,
`defaultTargetPath: 'notes/gamma.md'`, `reportBackVerbosity: 'verbose'`; `ReportBackVerbosity` at `:11`;
validated in `sanitizeSettings` (`:30+`) [R]. **`turnOpBound` does not exist yet** (default 12 ruled,
settings-level slider, ADR-28/ADR-34).

`src/llm/client.ts`: `chat()` at `:67`, `AbortController` `:68`, timeout abort `:69` (client default
60000), `onExternalAbort` `:71-72`, `fetch` `:75`, `readStreamingResponse(res, controller.signal)` `:102`,
listener removal `:117` [R]. `complete()` routes external aborts into the controller's own signal — the
`69a4b45` fix (ADR-23, f27's two legs `:17-19` [R]).

No `num_ctx`, no `temperature`, no `top_p` in the client (grep → 0 hits) [R]: context window is the
model's business, closed as model-layer work (ADR-21).

## 11. Model roster (consumed; Muninn owns staffing doctrine)

Owned by Muninn ADR-21 (staffing, executor contract, tool-discancing). Huginn's roster facts, all
resting on **committed handover narratives** (ADR-21, ruling 9, T22):
- `docs/HANDOVER - 2026-11-08.md:40-41` [H] — `qwen2.5-coder:7b` "declared victory without doing the
  work"; `qwen3.5:9b-32k` "died repeatedly: context starvation as agent, then commit-substitute-for-action,
  then terminal dithering/timeout… corrupted `harness.ts`".
- `docs/Handover 2026-11-13.md:52, 55, 126` [H] — "**qwen is closed**".
- Gemma4:12b retired; kimi (paid plugin) is the known-good path with a ~$120 declared cap; auditions
  paused; interim staffing is Dan-and-infra only (ruling 9, T23).
- **Store measurement (2026-11-16)**: the OpenCode store has 9 swift, 3 `gemma4:12b`, 1 `qwen3.8:27b`
  sessions, **no qwen3.5 session**; `session_part`/`event`/`blob` = 0 rows, assistant `$.text` empty →
  transcripts are unrecoverable; the store's oldest session is **2026-11-10 13:38**, after the audition
  window the docs describe. **Tombstones cite committed handover lines, never store receipts** (T22).
- Reading **Qwen3.5:12b**'s chats is permitted, not prohibited (Dan, 2026-11-16); the check is bounded,
  never a rabbit hole. Reading **Gemma4:12b**'s chats stays out of bounds.

## 12. Fixture and test discipline as-built

`package.json:11` is the `fixtures` script — a **single hunk**, `tsx f01.ts && … && f30.ts`, that cannot
be split by hunk [R]. Chain rule: new fixtures append sequentially, no gaps; **the next number is f31**
(ADR-22, ADR-34). Muninn's chain ends at f26 (no `fixtures` script in Muninn's `package.json`; run-all is
the `seq -w 1 26` loop, Muninn ADR-11).

`src/fixtures/` = **31 tracked files**: f01–f30 + `fake-app.ts` (test-only, never bundled) [R]. UI-leg
fixtures need the mapped `obsidian` fake, because `import … from 'obsidian'` throws
`ERR_MODULE_NOT_FOUND` under tsx (ADR-22). Node 26.13.1, tsx 4.23.15, `npx tsx` runner [R].

Discipline facts: asserts printed plus exit code are the instrument; the instrument is proven red against
unfixed committed code at the intended seam (f27 at `69a4b45`; f29 red at `754e309`); first-green guards
carry written justification in their header (f28 `:6-12` [R], f35 planned); head-only worktree red-proof
recipe is documented in Muninn ADR-11. `docs/Muninn Fixture Discipline.md` is owned by Muninn, not mirrored
(ruling 4).

Measured baseline at HEAD, receipts 2026-11-16 [R]: `npm run typecheck` → `TYPECHECK EXIT:0`;
`npm run fixtures` → **F01–F30 all GREEN**, `FIXTURES EXIT:0`. Adding `listNotes` to the mirror breaks
typecheck at `f22.ts:41` and `f24.ts:56` until both fakes grow [R] (ADR-33).

## 13. Manual smoke as-built (Dan's act, in Obsidian)

`docs/TESTING1.md` (333 lines, first commit 2026-11-06, last 2026-11-15) — the version-pinned living
manual: header pins Huginn `0.1.0-test.20`, Muninn floor `0.2.0-test.15` [R]. Eleven scenarios A–K at
`:44, 63, 92, 108, 126, 163, 193, 213, 234, 273, 293` [R]; Scenario A is the named precondition of all ten
others (`:66, 111, 129, 166, 196, 216, 243, 276, 296` [R]) — **Scenario A survives unchanged** (the "A
superseded" claim is not in the repo, T26). Redefinition for the loop is owed: **B, D, F, I** plus the E/G
chat legs, and a new loop scenario with the turn receipt as the observable (G6, T20, ADR-25).

`docs/TestReport.md` (17 lines, first and last commit 2026-11-08) is Dan's `test.18` smoke record:
Scenario A **PASS** (`:1`); F **FAIL**; I inconclusive [H]. Scenario F was diagnosed 2026-11-10 and fixed
red-first at `69a4b45` (f27, 210 lines added); `031b686` completed its UI legs in TESTING1 (7 lines) [R].
**Scenario F has never been smoked in Obsidian** (T9): fixture-green is not production-live. The merged
manual smoke (ADR-29) is its closure path.

`README.md` prose claims (measured [R]): latest test release `0.1.0-test.20` (`:7`), Muninn floor
`0.2.0-test.15` (`:22`), F01–F30 coverage in the README fixture line (`:40`), sidebar chat, approval
modal, six skills, memory, verbosity, warmup, ground truth, ground-truth registry (`:15-60`). README
prose stays behind `TESTING1.md` as the manual's pointer, and is part of the bump-commit shape (ADR-24).

## 14. Release as-built (Muninn doctrine applied, ADR-24)

- 56 commits [R]; **20 tags** ending `0.1.0-test.20`; `versions.json` has **18 entries** — `0.1.0-test.1`–
  `13` and `16`–`20`, **missing `14` and `15`** [R]. Both projects carry this incompleteness (Muninn: 13
  entries vs 15 tags, missing `0.2.0-test.1` and `2`). Fixing it is a release-hygiene ruling owed to Dan
  (T24, T25).
- Release assets are exactly `main.js` (70,178 B), `manifest.json` (318 B), `versions.json` (552 B),
  `styles.css` (2,152 B) [R]; `main.js` churn is real bundled content, not noise.
- Bump-commit shape measured: 5 files (`README.md`, `docs/TESTING1.md`, `manifest.json`, `package.json`,
  `versions.json`), `aa42ec2` 2026-11-08, 10+/9− [R]. Tags immutable, never force-push;
  `gh release create` from the repo dir with `--notes-file` (Muninn ADR-8, `docs/Release Ritual --
  Walkthrough.md` owns the ritual; Huginn needs a pointer stub, T16).
- `isDesktopOnly: false` at `manifest.json:10` [R] — correct, not owed (ADR-35).
- **Release overrule (ADR-29, Dan 2026-11-15):** no `0.1.0-test.21` cut; `1bbc908` plus the whole loop
  land in one release with one merged manual smoke. The release-21 content (`031b686`, `3f34605`,
  `1bbc908`) sits in `main`, unreleased. Bounded tag-assignment retry is deferred to the release after
  (T12). Pre-release manual step: delete the stale `LLM client returned null` correction from the vault's
  `Agents/Huginn/MEMORY/corrections.md` (keyed `tag-assignment`, injected into every such prompt), a
  manual act outside the repo (ADR-19, T10).
- Ask before pushing. **Discharged 2026-11-17:** `1bbc908..2eb0c29 main -> main` (measured push line [R]);
  `origin/main` is `2eb0c29`, `git rev-list --count origin/main..HEAD` = 0.

## 15. Known drift register (doc ↔ code)

All measured 2026-11-16; none is fixed by this report; all are Phase 4/5 actions under Dan's rulings.

1. **`warmupOnFocus` naming drift [R]** — warmup fires at initialization (`main.ts:148-149` →
   `warmupChatModel()` `:203-215`); UI description says "when Huginn initializes" (`main.ts:448`);
   `TESTING1.md:318` states the fact. The setting **name** is the drift. (ADR-3)
2. **`UserMemory` filename [R]** — code writes `user.md` (`src/memory/kinds.ts:89`); `TESTING1.md:203, 208`
   and the Implementation Guide `:196` say `user.md` (agree with code), while `README.md:55`,
   `docs/Huginn Plugin 2 Definition v0.1.md:28`, `docs/Huginn Plugin 2 Harness.md:151` and
   `docs/Memory Feedback Loop Design.md:13` say **`user-memory.md`** [R] — four docs against the code.
   Naming drift, ledgered; conform the four docs to the code in Phase 4 (ADR-17 direction). (ADR-15)
   **Phase 4 state (2026-11-17):** the two live docs conform — `README.md` and
   `Huginn Plugin 2 Harness.md` now read `user.md` with the code citation (`src/memory/kinds.ts:75`).
   The other two are archive material (moved 2026-11-17, tombstoned, not authoritative) and keep their
   text as history; editing archive material is not a docs-conform act. **No vault file is renamed** —
   a rename is a ruling with a migration, Dan's (ADR-15); the code already writes `user.md`.
3. **Harness doc fixture table stale at f27 [R]** — shipped f01–f30; canonical = `package.json:11`. (ADR-22)
   **Phase 4 state (2026-11-17):** the table lists `f01.ts`–`f30.ts`; the added rows are f28 (bundled
   catalog ↔ `src/recipes/*.md` sync guard), f29 (two-tag strip seam), f30 (non-path `recipe-param`
   inputs resolve to `null`).
4. **Scenario I inconclusive [H]** — `docs/TestReport.md` (the `verbose`/`minimal` chat leg); the ruled
   corollary makes it achievable without a `verbose` recipe input (ADR-18).
5. **`groundTruthDropped` has no UI consumer [R]** — drop notices must display unconditionally (R4
   corollary); this is the UI-side Phase 4 fact. (ADR-12)
6. **Assessment line citations drift [H/R]** — `harness.ts:201` (cited) vs `:205` (measured);
   `src/utils/path-utils.ts` (cited) vs `src/ui/path-utils.ts` (measured); `harness.ts:96` (cited) vs
   `:87-91` (measured). Docs conform to code, never the reverse (ADR-17, `031b686` precedent).
   **Phase 4 state (2026-11-17):** all three citations conform — `warmup()` is cited as `harness.ts:205`,
   `clientFailed` as `harness.ts:87-91` (two sites), and the path module as `src/ui/path-utils.ts:8`
   (two sites). The warmup wording in `Huginn Plugin 2 Harness.md` now names the init trigger
   (`main.ts:148`) and the legacy setting key `warmupOnFocus` (`settings.ts:15`), matching the UI label
   "Warm up chat model on load" (`main.ts:447`) and `TESTING1.md:318`.
7. **TESTING1 version pins** are correct today at `test.20` [R] and need the loop redefinition (T20) —
   pins move with the release act, not with a doc edit.
8. **Ghost names cited by committed docs** [GHOST] — `docs/Handover 2026-11-14.md:6` lists
   `docs/Chat Context Architecture.md`, `docs/Code Review Plugin 2.txt`,
   `docs/Huginn Plugin 2 Memory Feedback Loop.md`: **none is tracked** (`git ls-tree -r --name-only HEAD
   -- docs | grep -i "chat-context|code review|Plugin 2 Memory"` → 0 hits) [R]; the guide is tracked as
   `Memory Feedback Loop Implementation Guide.md`. Docket T27.
9. **The "Scenario A superseded" claim** [GHOST] — not in the repo (T26).
10. **The two Muninn qwen verdict docs I quoted** [GHOST] — do not exist in Muninn (T23, closed by
    measurement; the rule it produced, "receipts or nothing", is ADR-32).
11. **Ghost doc names in committed headers [GHOST]** [R] — `git ls-tree -r --name-only HEAD -- docs` in
    Huginn = **24 tracked files**; none of these names is among them:
    `docs/Design Review - Serial Contextual Operations 2026-11-15.md` (cited as the ruled header's
    `Amended in response to:` at `(Ruled).md:4` — the tracked file it describes is
    `Serial Contextual Operations Design Assessment.md`), the v1 draft
    `docs/Serial Contextual Operations Design v1.md` (the ruled header's supersession target),
    `docs/Plugin 2 Chat View UX Design.md`, `docs/Plugin 2 Code Review 2026-11-07.md`,
    `docs/Code Review 2026-11-06.md`, `docs/Code Review 2026-11-07.md` — **the last four were rows in my
    own registry draft** — plus drift 8's three names.
    **The registry above lists only measured `git ls-tree` lines** (ADR-32). Docket T31.
    **Phase 4 state (2026-11-17):** `(Ruled).md`'s header citation now names the tracked Assessment, the
    naming fact is recorded in `docs/decisions/adr-28.md`, the ghost rows are removed from this registry,
    and no ghost file was created.

## 16. Staffing, executor contract, and the authorization chain (Muninn-owned, consumed)

Muninn ADR-21 owns the doctrine; Huginn inherits it. The operative facts for Huginn: Dan is the sole
authority for rulings, releases, pushes, tags, and model admission; the executor plans, measures, and
proposes, **writes no code, commits nothing, bumps nothing, tags nothing, pushes nothing without Dan's
explicit go-ahead**; a raised finding goes on the tracked-issues docket and **stays there until
investigated** — no rabbit holes (Dan 2026-11-16). Tool-discancing and the model-layer closures live in
Muninn's roster, not in Huginn's code (ADR-21). The uncommitted-handover doctrine was retired 2026-11-10
with the origin recorded as a mis-paraphrase (ADR-20); handovers are archive material from 2026-11-16
(ruling 3). "Diagnose before you build" is standing law in both projects (ADR-27).

## 17. Environment (measured)

Node 26.13.1, tsx 4.23.15 (`node_modules/.bin/tsx`), `npm run typecheck` = `tsc --noEmit`,
`npm run build` = `node esbuild.config.mjs production` [R, `package.json:7-10`]. Dev deps:
`@types/node`, `builtin-modules`, `esbuild`, `obsidian`, `tsx`, `typescript` [R].
`manifest.json` fields: `minAppVersion` and `isDesktopOnly: false` at `:10` [R].
Local Ollama at the configured base URL, chat-capable model pulled (`docs/TESTING1.md:5-7` [R]).
Vault fixtures: `Agents/Huginn/SKILLS/` (recipes), `Agents/Huginn/MEMORY/` (`corrections.md`,
`user.md`, `chat-summaries.md`) [R, `TESTING1.md:21-43, 324-333` report contract].
Repo gotchas: backticks inside `bundled.ts` template literals break the esbuild parse; the fixtures chain
is a single hunk; the conformer `/tmp/opencode/sync-recipes.ts` runs with `node_modules/.bin/tsx` from
repo root (ADR-17, `f2def43`); `fake-app.ts` maps `obsidian` for tsx (ADR-22).

## 18. Deferred, parked, and owed (the standing ledger)

**Owed rulings (Dan's, not the executor's):**
1. **Muninn ADR-37 (`listNotes`) ruling** — the sixth door; gates the loop's `list` op and the
   `muninn:`/`note-has-heading` primitives. ADR-33; T15.
2. **Memory Feedback Loop ruling + release slot** (T13, ADR-30) — ranking/scoring unimplemented; the
   guide's F26–F30 numbering collides with the shipped chain (next: f31 for the loop, f37+ for ranking).
3. **`versions.json` completeness in both projects** (T24, T25) — release-hygiene ruling.
4. **Bounded tag-assignment retry** (T12, ADR-19) — schedules after the merged release with Scenario B
   expectations.
5. **`turnOpBound` UI (settings slider, default 12)** — ruled in law, owed as implementation tasking.
6. **`f11` re-point** — refusal guard, not deletion (G6, ADR-34).
7. **TESTING1 redefinition (B, D, F, I, E/G chat legs) + the new loop scenario** (T20, ADR-25) — written
   with the implementation, per the living-document rule.
8. **Mobile live index receipt on Muninn's side** (T5, parked by Dan as a question, not a bug); the
   `isDesktopOnly` supersession is text only, no code change (ADR-35, ruling 11).
9. **Pre-release vault edit**: delete the stale `LLM client returned null` entry from
   `Agents/Huginn/MEMORY/corrections.md` (ADR-19, T10).
10. **Push authorization for `1bbc908..c4b103e`** and the merged release bump/tag — Dan's acts, only when
    the loop is testable and the merged smoke passes (ADR-29).

**Parked by Dan (not owed work):** model auditions; the `f30` plan in Muninn (deleted,
`dev/parked-ui-stop-fixture/` measured absent [R]); kimi as paid-plugin staffing (the known-good path,
~$120 cap); the `defaultTargetPath` setting (never production-set, never prompt-visible).

**Closed by measurement:** T23 (the two qwen docs do not exist); T27 (the three ghost names listed by
`Handover 2026-11-14.md`); T26 (the "Scenario A superseded" claim is not in the repo, measured).

## 19. Source registry (mining destinations)

Huginn's `docs/archive/` measured **2026-11-16 as empty (0 tracked files)** [R] — no mining was required.
The live set's destinations:

| Tracked file [R] | Destination |
|---|---|
| `README.md` | Canonical README, prose conformed to code; stays the manual's pointer |
| `docs/Huginn Plugin 2 Harness.md` (208) | Canonical recipe-format + harness reference; fixture table fixed to f01–f30 (drift 3) |
| `docs/TESTING1.md` (333) | Canonical living manual; B/D/F/I + E/G chat legs redefined (T20), new loop scenario |
| `docs/TestReport.md` (17) | Living smoke record, dated at `test.18`; F FAIL, I inconclusive |
| `docs/Huginn Plugin 2 Definition v0.1.md` (50) | Historical definition; canonical facts → Design Report; `user-memory.md` naming fixed (drift 2) |
| `docs/LLM Coordination Protocol v1.0.md` (187) | **Pointer stub** — Muninn owns the doc (ruling 4) |
| `docs/Unified Project Definition v0.2.md` (118) | **Pointer stub** — Muninn owns the doc (ruling 4) |
| `docs/Chat Skill Dispatcher Design.md` (164) | Design of record, as-built; supersession notes for `clarify`/`none`; archive after ADR set |
| `docs/Ground Truth Refactor Design.md` (239) | Design of record, "Implemented in `main`"; archive after ADR set |
| `docs/Ground Truth Next Primitives Design.md` (228) | Design, unimplemented, blocked by ADR-37; archive |
| `docs/Memory Feedback Loop Design.md` (215) + `…Implementation Guide.md` (494) | Design of record, unimplemented; fixture-number collision ledgered (ADR-30) |
| `docs/Recipe Composition and Reuse Design.md` (213) | Design, unimplemented (`SKILL_FRAGMENTS/`, `index.md`, fingerprinting, 0 hits); archive |
| `docs/Risk Class and Approval Model Design.md` (193) | Batch section marked superseded by R13 (assessment `:296-297`); archive |
| `docs/Tool Distancing and Recipe Expansion Design.md` (130) | Design; Muninn-owned vocabulary (`post-apply:`, `note-has-heading`, `note-links-to`); archive |
| `docs/Serial Contextual Operations Design (Ruled).md` (207) | **Law.** Canonical for Huginn; ADR-28 records it; stays live |
| `docs/Serial Contextual Operations Design Assessment.md` (376) | **Engineering diagnosis of record** (living, canonical companion); stays live. The ruled header cites it as `docs/Design Review - Serial Contextual Operations 2026-11-15.md` — **that name is not in the repo** (drift 11) |
| `docs/Never Try To Teach A Pig To Sing.md` (65) | **Straight to archive** (ruling 9): model-roster material, tracked in **Huginn** [R]; facts live in ADR-21; tombstone → `docs/decisions/adr-21.md` |
| `docs/HANDOVER - 2026-11-06.md` (92), `… - 2026-11-07.md` (131), `… - 2026-11-08.md` (91), `docs/Handover 2026-11-10 Scenario F.md` (99), `docs/Handover 2026-11-13.md` (148), `docs/Handover 2026-11-14.md` (144) | **Archive material** (ruling 3); roster paragraphs inside them are archive material per ruling 9 (Phase 3 triage) |
| `docs/Architect Response To Handover 2026-11-15.md` (72) | Archive with tombstone → the ruled doc (it is answered by law) |
| `docs/Handover 2026-11-15.md` [U] | Untracked; archive material, not canonical (ruling 3). Committing it is Dan's act |
| `docs/decisions/` (empty, both projects) | **ADR home**, numbered from 1; Phase 4 writes the approved 36-ADR set + `index.md` (T21) |
| **owed, canonical, absent** | `CHANGELOG.md` (T17), `SECURITY.md` (T18), Contributing/conventions doc, release-doc pointer stub (T16), `docs/archive/README` (ruling 1) |

**All rows marked archive above** were moved into `docs/archive/` on 2026-11-17 (17 `git mv` + the
untracked `Handover 2026-11-15.md` [U] = 18 files, plus `docs/archive/README.md` = **19 tracked files**),
each with the tombstone *"Archived 2026-11-17. Superseded by <doc>. Not authoritative."*, and **all archive
material was deleted 2026-11-17** (Phase 5, Dan's authorization) [R]. The destinations named in each row are
where the facts live now. Evidence lines in ADRs and design docs that cite the archived names are **dated
statements at acceptance/ruling time** and are not edited (ruling 2, ADR-6); the deleted files are
recoverable from the git history.

**Ghosts recorded, not moved:** the three names in drift 8; the "Scenario A superseded" claim; the two
Muninn qwen verdict docs; the four review/UX names (drift 11). Every row above is a measured `git ls-tree`
line (ADR-32).

## 20. One next action

**Phase 3 approved (both tables, 2026-11-16) and Phase 4 executed 2026-11-17** under Dan's authorization
("Approved and proceed on phase 4"). Executed in Huginn: the 36 ADRs + `index.md` written into
`docs/decisions/`; this Design Report written into `docs/Initial Design Report.md`; 17 tracked files
`git mv`'d plus the untracked `docs/Handover 2026-11-15.md` [U] moved = **18 files** in `docs/archive/`,
all tombstoned *Archived 2026-11-17*; `docs/archive/README.md`; `README.md` (canonical links, `user.md`);
`CHANGELOG.md` (20 tags, dates and tag commits measured); `SECURITY.md`; `CONTRIBUTING.md`; pointer stubs
for `LLM Coordination Protocol v1.0.md`, `Unified Project Definition v0.2.md` (ruling 4) and the new
`docs/Release Ritual -- Pointer.md` (T16); and the doc-conform fixes: harness fixture table f01–f30 (T28),
`user-memory.md` → `user.md` in the live docs (T29), the warmup wording, the assessment citations (drift 6),
and `(Ruled).md`'s header citation (drift 11 / T31). `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md` are at
the repo **root**, matching Muninn's Phase 4 placement (the triage table named `docs/`; the location was an
open item, so one placement across both projects, reported for the record).

**State (2026-11-17):** **committed and pushed** — `2eb0c29` (`docs(rationalisation): phase 4 canonical
set — ADRs, Design Report, archive, pointer stubs, doc-conform`, 84 files, 2586+/3077− [R]); the untracked
`docs/archive/Handover 2026-11-15.md` [U] is committed on Dan's word (ruling 3); tree clean after the commit.
The push line is `1bbc908..2eb0c29 main -> main` [R]. Muninn's matching commit is `9b2a2bd`
(111 files, 2391+/5526−), pushed `b75c408..9b2a2bd` [R]. Receipts tied to the commits: Muninn
`TYPECHECK EXIT:0`, 26 `VERDICT: GREEN`, `FIXTURES LOOP DONE`; Huginn `TYPECHECK EXIT:0`, 30
`VERDICT: GREEN`, `FIXTURES EXIT:0` (`muninn-receipt-commit.txt`, `huginn-receipt-commit.txt`).
No version bump, no tag, no release cut. **Phase 5, archive→delete, executed 2026-11-17 on Dan's
authorization** (ruling 13, Dan's act) — see §21.

**The commit decision is Dan's.** The code thread stays behind its gate, in binding order, once Dan tasks it: Muninn `listNotes` red at
`f24` P1 (Muninn f27, chain to 27) → Muninn `api.ts` → Huginn mirror `src/muninn-api.ts:57` (+ fakes at
`f22.ts:41`, `f24.ts:56`) → `f31` red at `1bbc908` (envelope refusal, `src/ui/path-utils.ts:8`) →
`src/ops/envelope.ts` → `f32` `contextUsed` → `src/ops/loop.ts` with staged reds `f34` expiry, `f35`
Stop parity (first-green with the written justification), `f36` bound → chat UI rewrite
(`chat-view.ts:266-351` replaced) → TESTING1 B/D/F/I + E/G chat legs redefined + the new loop scenario →
one merged manual smoke (T9 closed) → then, and only then, ask Dan for the push and the single
release cut (ADR-29). **Nothing in this paragraph is authorized today** (rulings 0/1/3: "wait for
tasking"; ADR-37's ruling is owed before any implementation).

## 21. Phase 5 record, and the conform pass after the Phase 4 push (dated 2026-11-17)

**The docs conform pass** — commit `968c7f4` (`docs(rationalisation): conform the push/commit state record
(2026-11-17)`, 3 files, 26+/9− [R]), pushed `2eb0c29..968c7f4 main -> main` [R]: `CHANGELOG.md`, this report
(header, §14 push line, §20 state) and `docs/decisions/index.md`'s dated addendum. **No ADR body edited**
(ruling 2, ADR-6): `adr-24.md:37`, `adr-28.md:72`, `adr-29.md:34` stay as dated statements at acceptance.
Receipts measured before that commit: `TYPECHECK EXIT:0`, **30 `VERDICT: GREEN`**, `FIXTURES EXIT:0` [R]
(`huginn-receipt-pushstate.txt`).

**Phase 5 executed 2026-11-17** on Dan's authorization ("Phaswe 5 and the docs commit pushed", Dan verbatim,
2026-11-17): `git rm -r docs/archive` = **19 tracked files** [R], the measured `git ls-files docs/archive`
count taken immediately before the deletion (17 `git mv`'d Phase 4 moves + the committed
`Handover 2026-11-15.md` + `docs/archive/README.md`). Every file carried the tombstone *Archived 2026-11-17*;
the content is recoverable from the git history. Muninn's Phase 5 deletes **34 tracked files** in the same
act, and its commit is `6b76e41`, pushed `9b2a2bd..6b76e41 main -> main` [R].

**Live-doc conform in the Phase 5 commit** (every citation measured, not remembered): `README.md` (line 64
canonical-set line; lines 84-85, the archive bullet → the deletion record), `CONTRIBUTING.md` (lines 69-70),
this report (header, §19 line 387, the §19 registry conform note, §20 state, this §21), `CHANGELOG.md`'s docs
record, `docs/decisions/index.md`'s dated addendum, and `docs/Serial Contextual Operations Design Assessment.md`
(the `Risk Class and Approval Model Design.md` citations at lines 242 and 296). **`docs/Serial Contextual
Operations Design (Ruled).md` is not edited** — it is law; its lines 12 and 182 cite
`docs/Risk Class and Approval Model Design.md` as ruling-time statements, and the batch facts are R13 in the
ruled doc itself and `adr-28.md`. **No ADR body is edited** (ruling 2, ADR-6): **60 lines in
`docs/decisions/`** cite archived names and `docs/archive/` [R] as acceptance-time evidence.

**Live doc set measured after Phase 5:** `git ls-files docs README.md CHANGELOG.md SECURITY.md CONTRIBUTING.md`
= **50 tracked files** [R]: `README.md`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md` at the root;
`docs/Huginn Plugin 2 Harness.md`, `docs/Initial Design Report.md`, `docs/LLM Coordination Protocol v1.0.md`
(pointer stub), `docs/Release Ritual -- Pointer.md`, `docs/Serial Contextual Operations Design (Ruled).md`,
`docs/Serial Contextual Operations Design Assessment.md`, `docs/TESTING1.md`, `docs/TestReport.md`,
`docs/Unified Project Definition v0.2.md` (pointer stub); `docs/decisions/` (36 ADRs + `index.md` = 37).
`docs/archive/` is gone from the index.

**Dated 2026-11-17 (second pass):** `docs/Tracked Issues -- Pointer.md` is added. Measured **before** this
pass the live doc set was **50 tracked files** [R] (`git ls-files docs README.md CHANGELOG.md SECURITY.md
CONTRIBUTING.md`); the stub is **untracked until the docs commit**, so the count after this pass is 51 —
4 at the root, **10** live `docs/`, `docs/decisions/` (37). The docket itself is
canonical in Muninn (`Muninn/docs/Tracked Issues.md`); Huginn keeps no issue list (Muninn
`docs/decisions/adr-40.md`: a document that outlives one task lives in the repo, and stating a fact twice is
a drift opportunity). Muninn's rulings `adr-38.md` (Plugin 2 corpus kept as a named oracle), `adr-39.md`
(the empty `src/` directories removed), and `adr-40.md` (the storage rule) are the new ADRs; **no Huginn ADR
is added and no Huginn ADR body is edited.** Muninn receipts for the pass: `HEAD: 6b76e41`,
`TYPECHECK EXIT:0`, **26 `VERDICT: GREEN`**, `FIXTURES LOOP DONE` [R]. Huginn measured at HEAD `9030196`:
`TYPECHECK EXIT:0`, `FIXTURES EXIT:0`, **30 `VERDICT: GREEN`** [R].

**Next action:** the code thread behind its gate, in binding order, once Dan tasks it (rulings 0/1/3) —
Muninn `listNotes` (ADR-37, **Proposed, ruling owed**) first, then Huginn's mirror, then `list` in the loop.
**Huginn cannot lead.** No bump, tag, release cut, or release push is authorized. The pre-release manual act
stays owed: delete the stale `LLM client returned null` entry (keyed `tag-assignment`) from the vault's
`Agents/Huginn/MEMORY/corrections.md` (ADR-19, T10).

**Dated 2026-11-17, later in the same day — the pass is committed and pushed.** The second-pass docs commit is
`cce37c9` (5 files: `docs/Tracked Issues -- Pointer.md`, `README.md`, `CONTRIBUTING.md`, this report,
`docs/decisions/index.md`), pushed `9030196..cce37c9 main -> main` [R]; `origin/main` = `cce37c9`,
`git rev-list --count origin/main..HEAD` = 0, tree clean [R], live doc set = **51** tracked files [R]
(`git ls-files docs README.md CHANGELOG.md SECURITY.md CONTRIBUTING.md`). The hash is recorded by the next
pass, because a commit cannot contain its own hash.
**T25 closed** on Dan's request 2026-11-17: `versions.json` measured **18** entries against **20** tags
before, **20** entries after the pass, `node -e` parse OK and `tags not in entries: []`; the added
`0.1.0-test.14` and `0.1.0-test.15` entries use `minAppVersion` read from each tag's own `manifest.json`
(`git show 0.1.0-test.14:manifest.json` → `0.15.0`), inserted between `test.13` and `test.16` to keep the
file's chronological order. The commits the tags peel to are `dda5fa4c14e4…` and `0e1611548d…` (the
annotated **tag objects** are `0971c79`/`b812655` — the earlier note that named them as commits was
imprecise). **T10 closed by Dan's vault act** ("I deleted all memories"), **T33 closed as a
misunderstanding** — closures are coding/production-side; the chat default is user-side and stays
`qwen3.5:4b`; `SECURITY.md` is conformed to that scope. **T17/T18 closed: root placement agreed.** No
version, tag, or release was touched. Receipts at `9030196` before the commit: `TYPECHECK EXIT:0`,
`FIXTURES EXIT:0`, **30 `VERDICT: GREEN`** [R].

**Dated 2026-11-17 — the third pass is committed and pushed.** The pass's docs commit is `a541f68`
(5 files: `SECURITY.md`, `versions.json`, this report, `docs/Tracked Issues -- Pointer.md`,
`docs/decisions/index.md`), **52 insertions / 9 deletions**, pushed `cce37c9..a541f68 main -> main`
[R]. Post-push measured: `git rev-parse --short origin/main` = `a541f68`; `git rev-list --count
origin/main..HEAD` = **0**; `git status --porcelain` = **no output**; live doc set = **51** tracked
files; `git ls-files docs/decisions | wc -l` = **37** (the **36** index rows plus `index.md`).
Receipts at HEAD `cce37c9` before the commit: `TYPECHECK EXIT:0`, `FIXTURES EXIT:0`, 30 `VERDICT:
GREEN` (f01-f30). A commit cannot carry its own hash, so `a541f68` is recorded here, in the next pass.

**Dated 2026-11-17 — the red plan is written (Dan: "Go ahead with the red plan document").**
`docs/Op Loop Red Plan.md`, 237 lines, **planning only**: no fixture built, no `.ts` file edited,
rulings 0/1/3 ("wait for tasking") and ADR-34's status ("no fixture built, no code written") stand.
It re-measures every seam at HEAD `de228d0` (Muninn) and `a541f68` (Huginn) and corrects six citation
drifts in its §5: `dispatch.ts` measured 81-106 with the silent refusals at 94, 97, 104;
`ApprovalRequest` at `harness.ts:29-36`; Stop parity at `approval-gate.ts:41-44, 47-50`; the typed
Muninn fakes at `f22.ts:41`/`f24.ts:56` (Muninn, measured correct) and the Huginn mirror fakes at
`f19.ts:20`/`f30.ts:37`, with `f07.ts:41` a cast (`as unknown as MuninnApi`) that does not grow and is
recorded as a hole; `clientFailed` measured at `harness.ts:87/90/171` with f26's header
(`f26.ts:1-11`, "Infra failures do not become corrections") as the doctrine; and `main.ts` wiring
measured at 37/121/181/219/222/225, Scenario F at `TESTING1.md:163`. Sequence: Muninn f27 red at the five-door surface, implementation with fakes grown
and P1 moved to 6, Muninn's own release act, the Huginn mirror, f31-f36 in ADR-34's order, the loop and
UI leg, TESTING1 redefinition, one merged smoke, one release. Cross-references verified by
`git ls-files --error-unmatch`: 13 Muninn files tracked, 13 Huginn files tracked; `src/ops/envelope.ts`
and `src/ops/loop.ts` measured **absent**, as planned. The canonical pointer to the plan is in
`Muninn/docs/Tracked Issues.md`; Huginn's stub stays a stub, and this report is the second place the
plan is named, as the work record — no issue list, no duplicate statuses.
