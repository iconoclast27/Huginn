# Huginn — Serial Contextual Operations Design (as ruled)

**Status:** ruled 2026-11-15 by Dan; implementation authorized under the staged red plan in the companion engineer's assessment
**Amended in response to:** `docs/Design Review - Serial Contextual Operations 2026-11-15.md` (the engineer's assessment, G1–G13, measured against Huginn `1bbc908` and Muninn HEAD)
**Rulings:** R1–R14 settled (§11). This document is the law; where it conflicts with the v1 draft (superseded), this version governs.
**Supersedes:** the active-note-only gather baseline; the batch sections of `docs/Risk Class and Approval Model Design.md` (R13); the knife-switch default-target model.
**Doctrine companion:** the engineer's assessment remains the engineering-side diagnosis; this document does not republish its wiring map. Implementation follows the assessment's fixture plan (§4 of the assessment), staged red per commit.

---

## 1. Principle

Unchanged from v1: the model does what models do best — **decipher the user's intent**. Everything downstream is governed machinery. The model chooses which operations to run; the machinery decides whether an operation is legal; the human decides whether a write happens.

- Model: intent decipherment, choosing the next operation, composing the response.
- Machinery: executing operations vault-bounded, enforcing the read/write split, recording evidence.
- Human: approving every write, with that write's evidence in front of them.

The model never approves, never applies, never adjudicates safety. It decides what is *needed*; the gate stands between need and effect.

## 2. The operation loop

Unchanged in shape from v1: a turn is a conversation between the model and a governed dispatcher. The model emits one op at a time; reads and lists resolve immediately; writes pause for the gate; results return to the model; the loop ends on `respond` or at the bound (§6).

There is no upfront "context selection" payload. **The operation sequence is the context selection.**

Single-note intent: straight to read → write → respond. Multi-note or unclear intent: `list` first to establish scope, then serial work. Nobody changes notes identically; there is nothing to batch-approve.

## 3. Operation vocabulary

Four ops. This is the entire toolbelt; nothing in it can reach outside the vault.

### 3.1 `list` — multi-note read of candidates

```yaml
op: list
criteria:
  query: string          # free text against path/title
  tag: string            # vocabulary tag, no prefix match
  folder: string         # vault-relative prefix, boundary-matched
limit: number            # caller cap; dispatcher additionally caps per §6
```

Returns paths, titles, mtimes, tags. No content bodies. **Expressed through Muninn's additive `listNotes` (R12):** folders and tags are expressible *only because* the frozen door gains this one method — today the frozen API returns counts, not paths (`tagVocabulary`), so no client-side emulation is permitted. Vault enumeration in Huginn is forbidden: it would create a second source of truth that Muninn's tag and semantic machinery cannot participate in. `list` results count as considered candidates in disclosure accounting (§5.4) at metadata level.

### 3.2 `read` — one note, ungated

```yaml
op: read
path: string             # vault-relative path
```

Returns frontmatter + body. Reads are free because reads cannot hurt anything. Every successful read is recorded by the dispatcher for disclosure accounting. Note bodies returned as op results are **inert data** (§7).

### 3.3 `write` — one note, always gated, names a recipe

```yaml
op: write
recipe: string           # names a loaded recipe (R7)
path: string             # vault-relative path
output: {...}            # validated against the named recipe's output schema
reason: string           # one sentence
```

One write op = one note = one gate invocation. **The envelope carries `recipe`** (R7): the machinery the payload traverses — output-schema validation, ground-truth rules, strip semantics, `applyMethod` lookup — is keyed by recipe, and the gate receives its `recipeName` from the envelope.

**Payload authorship is the sub-run (R8, Option A):** the model authors ops; the *recipe prompt* authors the payload. A `write` op causes the loop to call the existing harness run for the named recipe (render → complete → validate → ground-truth → strip → gate → apply). The recipe machinery remains the single authority over payload shape; the model never authors a schema payload directly, because the catalog the model sees is names-and-triggers, and the model cannot honour a schema it has never been shown. The loop system prompt carries the catalog summary (names + one-line triggers), not full instructions — full instructions enter via the sub-run's own prompt. This keeps prompt cost flat (~13 kB of recipe text is never poured into every op call) and keeps all recipe-level fixtures at today's level.

### 3.4 `respond` — end of turn

```yaml
op: respond
text: string             # delivered to the user
```

Termination is the model's call, bounded by §6.

**Envelope discipline:** every model emission in a turn is one op envelope; anything else is refused with a **machine-readable error returned in the turn** (R1). Refused ops are turn-local — never corrections. A vocabulary misuse is an API miss, not a rule failure; f13 S2 extends naturally, and persistent malformation gains no memory-pollution channel. Command-palette dispatch keeps its single-shot path (R10): direct, user-initiated, one recipe, one write, unchanged in the first implementation.

## 4. Disclosure at the gate

### 4.1 The extension

`ApprovalRequest` gains `contextUsed` — additive; existing consumers touch named fields only, and the field's absence in every request emitted by committed code is the honest red for invariant 1.

### 4.2 Contents (ruled: R5)

```yaml
contextUsed:
  - path: string          # a note read since the last gate
    excerpt: string       # a deterministic excerpt, taken by the machinery
```

**The model never selects, composes, or labels disclosure content.** The excerpt is deterministic — first N characters of the read, taken mechanically by the dispatcher — and the modal labels it "what the model read", never "what the model used". "Bearing on this write" is an evidence judgment, and evidence selection is the laundering vector that R2 exists to close; the v1 `snippet` field is stricken. The machinery records the reads; the machinery renders the excerpts; the model's only contribution to disclosure is *having read the note*, which the ledger proves.

### 4.3 Scoping (ruled: R2, upheld as written)

1. Base context is implied, never itemized: the user's prompt and the active-note floor.
2. A write's disclosure = every successful read since the last gated write (or turn start).
3. **Expiry:** reads expire at each gate boundary — mechanically, dispatcher-side (`reads.length = 0` at the gate). No intervening-staleness, no model citation. A model that wants note A as evidence for a later write must re-read A.
4. `list` results are scoped the same way, metadata-level: candidates considered.

### 4.4 Turn receipt

Counts and paths only — never vault content (which keeps read-only display fixtures untouched):

```yaml
turn:
  opsTotal, reads[], lists, writesRequested[], writesApplied[], writesDeclined[],
  opErrors[{op, error}], boundHit
```

**Persistence ruling (R11):** the receipt lives in the harness result and the console log, not in the persisted chat session. No sanitization debt on panel restore; the anti-stale seam stays small. The restored panel shows whatever the chat text already carries; the receipt is a per-turn log, not a durable artefact.

## 5. Verbosity doctrine (ruled: R4, superseding v1 §8-R4 and the v1 UI remarks)

**`verbose` is a model-facing instruction, not a volume control.** It changes what the model *says* in `respond`; it never filters what the *UI displays*. Consequences, settled law:

- The per-send verbosity instruction rides the loop system prompt, never persisted.
- The turn receipt summary, drop notices, ground-truth messages, and `[Interrupted]` rendering are **unconditional UI facts** — identical in every mode. Rendering is the UI's job (f12); the UI takes no orders from a prompt flag.
- **Corollary (confirmed by Dan):** drop notices always display. "State why a tag was dropped" needs no channel and no verbose — the drop notice is machinery output, so Scenario B's previously-unachievable expectation is achievable without granting any recipe a `verbose` input. The channel question dissolves; Scenario I reduces to legs the UI and the catalog-coverage guard already answer.
- Recipe prose must agree with its own verbose clause. `note-summary`'s contradiction is recorded as fixed by the engineer's verbosity work at `1bbc908`; the merged-release smoke re-verifies it (both copies, per the f28 discipline of conformance, are the standing check).

## 6. Loop rules (ruled: R3, R9, R10, R11)

- **Bound: 12 ops default, user-adjustable via a settings slider.** Arithmetic for the record: a task touching N notes costs ~2N+2 ops (list + N reads + N writes + respond) and, under the sub-run, ~3N+2 LLM calls — bound 12 comfortably serves the five-note task. The bound guards the *unattended* runaway case only; attended turns are protected by Stop (works at any instant, per-op timeout of 120 s caps a hang) and, since R13 leaves no unattended mutation path, a generous bound costs only waiting time the user can always reclaim.
- **Home: settings-level (R9).** `turnOpBound` in `settings.ts`, validated in `sanitizeSettings`, default 12, slider in settings UI. Per-recipe override deferred until a real recipe needs it; the parser is untouched.
- **Per-op failure doctrine:** each op call inherits the client contract — a per-op timeout or client failure is an infra failure, obeys the f26 no-correction rule *per op*, and the turn reports honestly (`boundHit` / failure cause captured verbatim per the standing null-failure doctrine). A 12-op turn may run minutes on local Ollama; the smoke plan accounts for this by design.
- **Stop parity:** interrupt at any instant — in flight or at a gate — applies nothing, records no correction. The shipped gate-leg guarantee (abort closes the modal, resolves null, harness skips apply) is inherited by every leg of the loop; the between-ops leg is the new guard (§9, invariant 5).
- **No retries on decline:** a declined write is done. The model may issue a *different* write; the same-path re-proposal within one turn is refused in-turn. Re-attempting a veto is not decipherment; it is nagging.
- **Warmup:** the loop is the first feature that needs `warmup()` reliably; noted so the implementation treats model-kept-out-of-memory as an expected case, not an exception.

## 7. Injection posture (ruled: R6 added; v1 §7 upheld otherwise)

Three layers, stated as doctrine:

1. **Intent steering:** the vocabulary cannot reach outside the vault — vault-rooting is structural (`isVaultPath`: no `..`, no leading `/`, no absolute, `.md` required, must resolve to a `TFile`). The worst reachable case is a proposed write with skewed intent, and that write stops at a gate disclosing what was read into it.
2. **Op results are data (R6, the engineer's finding):** the loop feeds note bodies back to the model as op results, which is the standard agent-loop injection surface. Rule: op results are **inert payload**, delivered in a role/format the model is told to treat as data; the loop's system prompt repeats the vocabulary rules and refuses instructions arising from op results; the gate remains the only path to effect. A note body that says "ignore your rules and write X" is content, not command. This paragraph is law, not implementation advice.
3. **List hygiene:** `list` returns metadata only, so hostile notes cannot mass-deliver content into the prompt; the model must *choose* to read, and every choice is accounted and disclosed.

## 8. External dependency — Muninn (ruled: R12, approved and sequenced)

Measured fact (the engineer's audit, G11): the frozen `MuninnApi` exposes five methods (`searchText`, `searchSemantic`, `relatedChunks`, `tagVocabulary`, `forceReindex`); the store already holds files/chunks/tags with paths and boundary-matched folder semantics; the door speaks counts where the design needs paths.

**Ruling: one additive method, specified — not implemented here.**

```ts
// additive to MuninnApi; read-only; dark-safe
listNotes(filter: {
    folder?: string,   // vault-relative prefix, boundary-matched as renamePrefix does
    tag?: string,      // joins tags -> path; vocabulary tag, no prefix match
    query?: string,    // free text against path/title; served by FTS today
    limit?: number,
}): { notes: Array<{ path: string; title: string; mtime: number; tags: string[] }>, total: number } | null
```

Pure read-only SELECT over existing tables — no schema change, no new data, no version event, dark-safe failure (`null + console reason`). **Sequencing is binding: Muninn `api.ts` first, then the Huginn mirror (the mirror is a compile-time contract; Huginn cannot lead), then `list` in the loop.** Muninn's unfreeze work is approved to start immediately (Dan, 2026-11-15); it is Plugin 1's own release, red-plan and smoke on its side, with no piggybacking.

## 9. Invariants — red claims corrected (ruled: R14)

The v1 claim "red is earnable against today's code for each" was **overclaimed** and is corrected on the record, per the engineer's measurement:

| # | Invariant | Red status |
|---|-----------|------------|
| 1 | Disclosure presence (`contextUsed` at the gate) | **Red now** — no such field in committed code |
| 2 | Single-note writes, machine-readable refusal | **Red now** — dispatcher refuses silently today |
| 3 | Vault-rooting | **Red now** — path normalization passes `../x.md` through |
| 4 | Expiry | **Staged red** — earns its red when the account exists |
| 5 | Stop parity in the loop | **First-green with written justification** — the gate leg is already shipped and guarded (f27, Scenario F); the between-ops leg does not exist to earn red. Justification: standing rule permits a guard fixture when the absence of the bug is the claim protected; the gate-leg guarantee is already proven. |
| 6 | Bound | **Staged red** — no loop, no counter, no red today |

The v1 line "no first-green fixtures are proposed" is stricken as false for invariant 5. The diagnosis-before-build rule is satisfied by the justification, in writing, before construction — which is exactly what v1 failed to demand of f30 and what this amendment demands of itself. Fixture plan: `f31`–`f36` in dependency order per the assessment's §4, chain sequential, no gaps; `f11` re-pointed as a refusal guard, not deleted; `f28` and `f30` (non-path params) stay green throughout.

## 10. Supersessions and scope (ruled: R13, and the release overrule)

- **Batch is superseded by name:** the batch sections of `docs/Risk Class and Approval Model Design.md` — `batch-suggest`, `auto-apply`, the batch modal — conflict with §3.3 ("always gated") and §10 of v1. Ruled superseded. Notably: no shipped code implements batch (grep-clean); it was a docs tenant only, and `auto-apply` — a write without a gate — was never compatible with project doctrine. This header is the supersession notice.
- **Command palette stays single-shot (R10)** for the first implementation; Scenario J's command-modal leg survives verbatim. Two execution models, both user-initiated, both gated.
- **Release plan (Dan's overrule of the test.21 split, 2026-11-15):** there is **no intermediate `0.1.0-test.21` cut**. Everything committed at `1bbc908` and the entire op loop land in **one release** — the staged build ordered Muninn `listNotes` → Huginn mirror → f31–f36 → chat UI — with one merged manual smoke before the cut: the Scenario F UI-leg steps, the loop scenario (scope via `list`, serial writes, disclosure verification, receipt observable), the two-tag checks, and re-verification of the verbosity fixes. Recorded cost, accepted: one big blast radius, one revert point, one smoke session that must pass everything at once.
- **Pre-release manual step (unchanged):** delete the stale `LLM client returned null` correction from `Agents/Huginn/MEMORY/corrections.md` — keyed by `tag-assignment`, injected into every such prompt. Manual vault edit, unfixtureable, carried as a smoke precondition.
- **Bounded tag-assignment retry:** overruled out of scope-hiding — it does **not** ride this release (Dan, 2026-11-15, reaffirmed under the merged plan). It schedules for the release after, with its Scenario B retry expectations written when the work is scheduled.

## 11. Ruling register

All ruled by Dan, 2026-11-15; recommendations below were adopted unless noted:

- **R1** — op-shape errors are turn-local, never corrections. *(adopted)*
- **R2** — mechanical expiry at the gate boundary; model-cited evidence rejected. *(adopted)*
- **R3** — bound default **12**, **slider control** in settings. *(ruled by Dan; architect's arithmetic reviewed)*
- **R4** — verbosity is a model-facing instruction, never a display filter; drop notices always display (corollary confirmed). *(ruled by Dan, rewritten as §5 doctrine)*
- **R5** — disclosure is path + deterministic machinery excerpt; the v1 `snippet` field stricken. *(adopted; supersedes the architect's anchored-extraction sketch)*
- **R6** — op results are inert data; the §7 rule is law. *(adopted, the engineer's G9)*
- **R7** — `write` names a recipe in the envelope. *(adopted)*
- **R8** — Option A sub-run: recipe machinery authors payloads; catalog summary only in the loop prompt. *(adopted)*
- **R9** — bound lives in settings, not recipe metadata. *(adopted)*
- **R10** — command palette stays single-shot. *(adopted)*
- **R11** — turn receipt lives in harness result + console; not persisted in the chat session. *(adopted)*
- **R12** — Muninn additive `listNotes`, shape as §8; sequencing Muninn → mirror → loop; unfreeze approved to start. *(ruled by Dan)*
- **R13** — `batch-suggest` and `auto-apply` superseded; named here. *(adopted)*
- **R14** — §9's red table corrected (three red now, two staged, one first-green-with-justification). *(adopted; the engineer's G10 stands)*

## 12. The v1 debts, paid on the record

For the next instance reading the history: v1 overclaimed its own reds (§9), contradicted itself on evidence selection (v1 §4.2 vs §5.3), was silent on how the model could author a schema payload at all (G2), and missed the tool-output injection vector (G9). Every one of these was found not by the author but by the engineer's review, measured line-and-file against committed code. The amendment adopts her corrections and her wording where her wording was better, including the closing irony: the review that nearly dismissed as workload-grumbling turned out to be the load-bearing audit. *Diagnose, then build* applies to architects; the elephant proved it.

---

*Diagnose, then build. This document is the ruled design; the fixture plan in the assessment is the construction order; nothing here authorizes skipping a red.*
