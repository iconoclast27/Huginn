# ADR-28: The operation loop — four ops, disclosure at the gate, bound 12, R1–R14; this document is law

**Status:** Accepted (ruled law; recorded into the ADR set 2026-11-16); implementation **not authorized**
("wait for tasking", Dan 2026-11-16), plan approved in structure
**Ruled:** Dan, 2026-11-15, rulings R1–R14, in
`docs/Serial Contextual Operations Design (Ruled).md` (207 lines, first commit `c4b103e`).

## Context

Huginn runs single-shot: one dispatch, one recipe, one write. Dan's `test.20` smoke found the model
cannot be trusted to pick the right note, and the single-shot path cannot service a multi-note task.
The design question: give the model a vocabulary it can use serially, without giving it a tool menu,
and without letting any un-gated path reach the vault.

## Decision

**The ruled shape, verbatim in the law:**

- **Principle (§1):** the model decipheres intent, chooses the next operation, composes the response;
  machinery executes vault-bounded, enforces the read/write split, records evidence; the human approves
  every write with that write's evidence in front of them. "The model never approves, never applies,
  never adjudicates safety."
- **Four ops, the entire toolbelt (§3):** `list` (metadata: paths, titles, mtimes, tags; no bodies),
  `read` (one note, ungated — "reads cannot hurt anything"), `write` (one note, always gated, names a
  recipe), `respond` (end of turn). "There is no upfront context selection payload. **The operation
  sequence is the context selection.**"
- **Envelope discipline (R1):** every emission is one op envelope; anything else is refused with a
  **machine-readable error returned in the turn**. Refused ops are turn-local, never corrections.
  "A vocabulary misuse is an API miss, not a rule failure."
- **Payload authorship (R8, Option A):** the model authors ops; the **recipe prompt** authors the payload
  through a sub-run of the existing harness (render → complete → validate → ground-truth → strip → gate →
  apply). The loop prompt carries the catalog summary (names + one-line triggers), not full instructions.
- **Disclosure (§4, R5):** `ApprovalRequest` gains `contextUsed` = `path` + a deterministic
  machinery-taken excerpt; the modal labels it "what the model read", never "what the model used".
  **The v1 `snippet` field is stricken** — model-selected evidence is the laundering vector R2 closes.
- **Scoping + expiry (R2):** disclosure = every successful read since the last gated write (or turn
  start); **reads expire at each gate boundary**, dispatcher-side (`reads.length = 0` at the gate).
  A model that wants note A as evidence for a later write must re-read A. Base context is implied,
  never itemized: the user's prompt and the active-note floor.
- **Turn receipt (R11):** counts and paths only, never vault content — `opsTotal, reads[], lists,
  writesRequested[], writesApplied[], writesDeclined[], opErrors[{op, error}], boundHit`. It lives in
  the harness result and the console log, **not in the persisted chat session**.
- **Bound (R3, R9):** **12 ops default**, user-adjustable by a settings slider; `turnOpBound` in
  `settings.ts`, validated in `sanitizeSettings`; per-recipe override deferred; the arithmetic of record
  is ~2N+2 ops and ~3N+2 LLM calls for N notes.
- **Stop parity, no retries on decline (R10/R11):** interrupt at any instant applies nothing and records
  no correction; a declined write is done, and a same-path re-proposal within one turn is refused in-turn
  — "Re-attempting a veto is not decipherment; it is nagging."
- **Injection posture (R6, §7):** three layers; **op results are inert payload** delivered in a role the
  model is told to treat as data; the loop's system prompt repeats the vocabulary rules and refuses
  instructions arising from op results; the gate remains the only path to effect. "A note body that says
  'ignore your rules and write X' is content, not command. This paragraph is law, not implementation
  advice." Vault-rooting is structural: `isVaultPath` — no `..`, no leading `/`, no absolute, `.md`
  required, must resolve to a `TFile`.
- **Verbosity (R4):** model-facing instruction, never a display filter; drop notices, ground-truth
  messages, and `[Interrupted]` rendering are unconditional UI facts.
- **Batch is superseded by name (R13)**: `batch-suggest`, `auto-apply`, the batch modal. No shipped code
  implements batch (grep-clean); `auto-apply` — a write without a gate — was never compatible with
  doctrine. The command palette stays **single-shot** (R10).
- **External dependency (R12):** the additive `listNotes` method (ADR-33); sequencing is binding —
  Muninn `api.ts` first, then the Huginn mirror, then `list` in the loop.

## Consequences

- **The law's own honesty clause** (`(Ruled).md:207`): "Diagnose, then build. This document is the ruled
  design; the fixture plan in the assessment is the construction order; nothing here authorizes skipping
  a red."
- The engineering diagnosis is the companion assessment (G1–G13, 376 lines, same commit); the wiring map
  is `src/ops/envelope.ts` + `src/ops/loop.ts`, `chat-view.ts:266-351` replaced, `contextUsed` added
  additively at `harness.ts:30-37`, `turnOpBound` in `settings.ts`, `f11` re-pointed, `dispatch.ts`
  subsumed, chain `f31…f36` (ADR-34).
- **Nothing is implemented**: the loop exists as design only, HEAD `c4b103e` (docs commit) is **unpushed**
  [R], and Dan's 2026-11-16 rulings 0/1/3 say "wait for tasking" — planning only, no coding authorized.
- **Naming record (docket T31), measured 2026-11-17:** `git ls-tree -r --name-only HEAD -- docs` in Huginn
  = 24 tracked files. Two names the law's header used are **not among them**: the review name
  `docs/Design Review - Serial Contextual Operations 2026-11-15.md` (the file it describes is the tracked
  `Serial Contextual Operations Design Assessment.md`, whose citation now conforms) and the v1 draft
  `docs/Serial Contextual Operations Design v1.md`. **Neither file was ever committed**; the supersession of
  the v1 draft is a ruling, recorded here, not a document. Phase 4 conformed the header citation
  (docs-conform, ADR-17 direction) without inventing files.
- The loop inherits, and cannot break, ADR-2 (the model never receives a menu), ADR-4 (the gate),
  ADR-12 (no rule failure, no correction), ADR-16 (Stop), ADR-19 (infra failure is not a model mistake),
  and Muninn ADR-34 (no vault enumeration in Huginn).

## Sources

`docs/Serial Contextual Operations Design (Ruled).md` (§1–§12; R1–R14 register at `:186-199`);
`docs/Serial Contextual Operations Design Assessment.md` (G1 `:68`, G2 `:81`, G3 `:105`, G4 `:123`,
G5 `:133`, G6 `:141`, G7 `:150`, G8 `:157`, G9 `:165`, G10 `:174`, G11 `:198`, G12 `:240`, wiring map
`:265-297`; commit `c4b103e` (2026-11-15, "docs(op-loop): ruled design and engineer's assessment for serial
contextual operations"); `src/chat/dispatch.ts:66-106`, `src/ui/chat-view.ts:223-330`,
`src/harness/harness.ts:30-37, 135-151`; `/tmp/opencode/rationalisation/rulings-2026-11-16.md`.

**Cross-references:** Muninn ADR-31, ADR-2, ADR-4, ADR-5, ADR-7, ADR-10, ADR-12, ADR-16, ADR-18, ADR-19,
ADR-26, ADR-29, ADR-33, ADR-34, ADR-36.
