# Huginn — Contributing and Conventions

Huginn is Dan's project: Dan is the sole authority for rulings, releases, pushes, tags, model admission,
and deletions. The executor plans, measures, and proposes, and **writes no code, commits nothing, bumps
nothing, tags nothing, and pushes nothing without Dan's explicit go-ahead** (ADR-21). Ask before pushing.
The shared collaboration doctrine (fixture-first, receipts, ask-before-push) is owned by Muninn — see
`docs/LLM Coordination Protocol v1.0.md` (pointer stub).

## Build and verification

```bash
npm install
npm run typecheck   # tsc --noEmit
npm run build       # esbuild, production, writes main.js
npm run fixtures    # F01–F30
```

Fixtures `src/fixtures/f01.ts`–`f30.ts` are **sequential, no gaps**; the next number is **f31** (ADR-11).
The chain is a single `&&` hunk in `package.json` (ending `… && f28.ts && f29.ts && f30.ts`) and **cannot
be split by hunk**; new fixtures enter it in order (the `f31` red for the op loop is measured at
`1bbc908`). Each fixture prints `[F0n] VERDICT: GREEN` and exits nonzero on failure; the printed asserts
plus the exit code are the instrument. Typecheck-green is the baseline for every commit, and the baseline
is proven by pasted terminal output, not by a claim. Muninn's `package.json` has **no** `fixtures` script
— run Muninn fixtures with `for n in $(seq -w 1 26); do npx tsx src/fixtures/f${n}.ts || break; done`
(`f01.ts`–`f26.ts`, next **f27**).

## Fixture discipline (ADR-7, ADR-11, ADR-17, ADR-34)

- **Red must be earned against unfixed committed code at the intended seam** — not at an import, a mock,
  or a compile error. Precedent: f29's red at `754e309` was earned before the strip code existed, and
  f24's `note-not-exists` red was earned at the strip seam. The staged red plan for the op loop is the
  assessment's §4 fixture plan (f31 envelope refusal + `isVaultPath`, f32 `contextUsed`, f34 expiry,
  f36 bound) with **f35 (Stop parity) as first-green, written justification owed before construction**
  (R14). `f11` is re-pointed as a refusal guard, not deleted; `f28` and `f30` stay green throughout.
- **First-green guards need written justification before construction**, carried in the fixture header
  (the `f28.ts:6-12` justification is the precedent).
- To prove a red against a head-only tree: `git worktree add -q --detach <path> HEAD`, copy untracked
  fixtures in, run with `/home/danf/Projects/Muninn/node_modules/.bin/tsx`, then `git worktree remove`.
  Node 26.13.1, tsx 4.23.15.
- `import { … } from 'obsidian'` throws `ERR_MODULE_NOT_FOUND` under tsx; UI-leg fixtures need a mapped
  fake built from `obsidian.d.ts` — `src/fixtures/fake-app.ts` is tracked, test-only, **never bundled**.
- **Gotchas:** backticks inside `bundled.ts` template literals break the esbuild parse; the recipe
  conformer is `/tmp/opencode/sync-recipes.ts`, run with `node_modules/.bin/tsx` from the repo root.
- "Diagnose before you build" (standing rule). Findings go on the tracked-issues docket and **stay there
  until investigated** — no rabbit holes, and no endless measurement loops.
- **Receipts or nothing** (Dan, 2026-11-16): a claim needs pasted terminal output. Every file cited in a
  table, tombstone, or report is a measured `git ls-tree`/`git grep` line, never a name remembered from
  context. Committed-doc claims are ghosts until measured.

## Sequencing (binding)

Muninn leads, Huginn mirrors: Muninn's `src/api.ts` gets `listNotes` **first** (additive, door method,
store SELECT over `files` + chunks join, dark-safe `null` + console reason, no schema change, no version
event); then Huginn's mirror `src/muninn-api.ts:57` grows it, and the fakes grow with it (`f22.ts:41`,
`f24.ts:56`); then `list` enters the loop. **Huginn cannot lead, and no piggybacking.** Vault
enumeration in Huginn is forbidden (ADR-34). `listNotes` is Proposed — Dan's ruling is owed before any
implementation (ADR-33, ADR-37, T15).

## Doctrine of record

`docs/Initial Design Report.md` is the canonical as-built description (as-built at `c4b103e` /
`0.1.0-test.20`, recorded 2026-11-16). `docs/decisions/` holds the ADRs, numbered from 1. **An ADR is
never edited after acceptance** (ADR-6): a changed decision is a new ADR marking the old one Superseded.
`docs/Serial Contextual Operations Design (Ruled).md` is **the law** (R1–R14); `docs/Serial Contextual
Operations Design Assessment.md` is the engineering diagnosis of record (living: line citations conform to
code as code moves, ADR-17). `docs/Huginn Plugin 2 Harness.md` is the canonical recipe-format reference
(`# Validation`, field table `:60-71`). `docs/TESTING1.md` is the living manual-smoke contract,
version-pinned; `docs/TestReport.md` is the smoke record of record. Manual smoke is Dan's act in Obsidian;
fixture-green is not production-live. **The tracked-issues docket is canonical in Muninn**
(`Muninn/docs/Tracked Issues.md`); Huginn keeps `docs/Tracked Issues -- Pointer.md` and no issue list of its
own. **A working document that outlives one task lives in the repo; nothing is kept twice for provenance,
because stating a fact twice is a drift opportunity** (Muninn `docs/decisions/adr-40.md`).
Every durable fact is mined into the canonical set; `docs/archive/`
**was deleted 2026-11-17** (Phase 5, Dan's authorization) — the record is `docs/Initial Design Report.md`
§21 and `CHANGELOG.md`, and the deleted files are recoverable from the git history. **Evidence lines in
ADRs and design docs cite files that existed at acceptance/ruling time** and are never edited after
acceptance (ruling 2, ADR-6); deletion was never the executor's act — it was Dan's, on written
authorization.

**Docs conform to code, never the reverse.** A fact lives in exactly one canonical doc across both projects
— cross-reference, never copy. Shared docs (the LLM Coordination Protocol, the Unified Project Definition,
the Release Ritual) are owned by Muninn; Huginn keeps pointer stubs.

## Release act (ADR-8, ADR-20)

A bump commit touches `README.md`, `docs/TESTING1.md`, `manifest.json`, `package.json`, and
`versions.json`; `manifest.json` is the version Obsidian reads (measured at `aa42ec2`). Release assets are
`main.js`, `manifest.json`, `versions.json`, `styles.css`. Tags are immutable, never force-push;
`gh release create` runs from the repo dir with `--notes-file`. Version bumps, release cuts, tags, and
pushes are **Dan's acts only**. `versions.json` has 18 entries against 20 tags (missing `0.1.0-test.14`,
`0.1.0-test.15`) — T25, a release-hygiene ruling owed to Dan. The op loop ships in **one** release with
**one** merged manual smoke (the release overrule, 2026-11-15).

## Code seams, measured

`src/harness/harness.ts`: `run()` `64`, `complete(rendered.prompt, signal)` `77`, `clientFailed` `87`/`90`,
`validate` `108`, `stripGroundTruthDrops` `119`, gate `135-141`, `approval === null → approved = null`
`142-143`, apply `147-151`, refusal `154-162` (guard `!clientFailed` `171`), result `189-201`
(`groundTruthDropped` `197`), `warmup()` `205`. `src/llm/client.ts`: `chat()` `67`, `AbortController` `68`,
timeout abort `69` (default 60000), `onExternalAbort` `71-72`, `fetch` `75`,
`readStreamingResponse(res, controller.signal)` `102`, listener removal `117`.
`src/harness/approval-gate.ts`: `approve` `18`, `resolve(null)` `44`, `signal?.aborted` `50`.
`src/ui/approval-modal.ts`: `activeModal` `26`, `closeActive()` `34`, `onClose` `131`.
`src/harness/ground-truth.ts` six primitives (see `SECURITY.md`), `PrimitiveResult` `60`, registry `82`,
`frontmatterValues` `320` (used `172`/`179`), `valuesMatch` `307`, `stripGroundTruthDrops` `335`.
`src/harness/gather.ts`: source switch `44` (cases `recipe-param` `45`, `content`, `vocabulary`, `query`,
`path`, `constant` — **no `list`** yet), fallbacks `51`/`57`/`68`.
`src/chat/dispatch.ts`: `parseDispatch` `80-106`, system prompt `66`, `getContext(undefined, 5)` `55`.
`src/ui/chat-view.ts`: `session` `42`, `handleSend` `223`, Stop-as-Send `233`, `dispatch` `266`,
`[No response from model]` `299`, `runSkillFromChat` `305`, `renderRunResult` `354` — the chat UI rewrite
replaces `:266-351`. `src/main.ts`: `registerView` `94-96`, ribbon `99`, harness wiring `119-123` and
`242-250`, warmup at init `148-149` → `203-215`, `getMuninnApi()` probe `222-225`, `RecipeChooserModal`
`263` seeded from `defaultTargetPath`. `src/memory/kinds.ts`: `CorrectionsMemory` `34` → `corrections.md`,
`UserMemory` `75` → **`user.md`**, `ChatSummaryMemory` `110` → `chat-summaries.md`.
The op-loop seams are `src/chat/dispatch.ts`, `src/ui/chat-view.ts`, `src/harness/harness.ts`, with new
`src/ops/envelope.ts` and `src/ops/loop.ts`.

## Model layer

The model never receives a tool menu, never approves, never applies, never adjudicates safety. Model
output is inert payload, never an instruction. Roster closures (qwen closed, Gemma4:12b retired) rest on
committed handover narratives, not store transcripts (ADR-21, T22); reading Qwen3.5:12b's chats is
permitted and bounded, reading Gemma4:12b's is out of bounds (Dan, 2026-11-16). Auditions are paused;
interim staffing is Dan-and-infra. There is no `num_ctx`, `temperature`, or `top_p` setting (grep: 0 hits).
