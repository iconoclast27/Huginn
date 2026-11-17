# Huginn ADR index (retrospective set, recorded 2026-11-16)

Huginn ADRs live in `docs/decisions/`, numbered from 1, one file per ADR. **An ADR is never edited after
acceptance** (Muninn ADR-6, adopted for Huginn by ruling 2, 2026-11-16): a changed decision is a new ADR
marking the old one Superseded. Status values: **Accepted**, **Proposed** (ruling owed), **Superseded**,
**Accepted with deviation** (invariant stands, as-built contradicts it), **Partly superseded**,
**Accepted as design** (design of record, unimplemented).

| # | Title | Status | Ruled | Decision, one line |
|---|---|---|---|---|
| 1 | Plugin 2 identity and boundary | Accepted | 2026-11-06 (`7d9688d`, `dd6efff`) | Huginn owns chat/harness/recipes/gate; vault state only through Muninn's frozen door; vault enumeration forbidden |
| 2 | The model judges, the harness acts | Accepted, cross-project | Muninn 10-19/10-20, ported 11-06/07 | Declarative Markdown recipes, raw JSON only, no tool menu, every mutation gated |
| 3 | Muninn discovery; warmup behind a setting | Accepted, warmup naming drift ledgered | 2026-11-06 (`a9b071b`, `f659881`) | Readiness poll, quiet per-poll warnings, warmup fires at initialization, best-effort |
| 4 | The approval gate | Accepted | 2026-11-06 (`54f4d53`, `9da4cd9`) | Full serialized diff, one-off Approve/Reject, refusals as corrections, abort = not approved |
| 5 | Risk classes as-built; policy knobs superseded by name | Accepted (knobs R13-dead) | 11-06 binary, design 11-07, R13 11-15 | `read-only` skips the gate with `noop`; `suggest` is always gated; human oversight is not a knob |
| 6 | Write-class suggest routines re-admitted | Accepted | 2026-11-06 (`73a615e`), two-tag ceiling 11-15 | Tags, title, links, through the gate only; `tag-assignment` proposes up to two |
| 7 | Gatherer contract — six sources | Accepted | 11-06 (`dc75104`, `94537ec`), 11-07 (`f2def43`), 11-15 (`1bbc908`) | `recipe-param`, `content`, `vocabulary`, `query`, `path`, `constant`; no `list` source; `.md` normalized |
| 8 | Apply registry — four named routines | Accepted | 11-06 (`73a615e`), scalar/array 11-07 (`f2def43`) | `noop`, `append-frontmatter-array`, `set-first-heading`, `append-section`; scalar **or** array |
| 9 | Chat in a sidebar `ItemView` | Accepted | 11-06 (`1ab6bb4`, `0a0c2ca`), history fix 11-07 (`0a066d7`) | Ribbon icon, `getState`/`setState`, `ChatSession` explicit param, New chat |
| 10 | Chat skill dispatch — strict three-field envelope | Accepted, silence deviation ledgered | 2026-11-06 (`8513794`) | `recipeName`/`targetPath`/`reason` only; unmatched → plain chat; refusal is silent today (f31 red seam) |
| 11 | Stream chat responses; retry once on ground-truth failure | **Partly superseded** (by ADR-12) | 11-07 (`db73c1d`), superseded 11-07 (`f2def43`) | Streaming stands; the retry half is dead |
| 12 | Ground-truth failures are vault state | Accepted, drop-display debt ledgered | 11-07 (`f2def43`), strip 11-15 (`30db86b`) | Not retried, not corrections, stripped before approval; `f13` S2 governs |
| 13 | Ground truth as a registry of named primitives | Accepted, seam `f17` | 11-07 (`c49a09a`, `c39bd3d`) | Exactly six primitives; `PrimitiveResult` union is the third-party seam |
| 14 | Schema keyword whitelist; arrays made comparable | Accepted | Dan 11-14 (`915451b`), shipped 11-15 (`30db86b`) | `minItems`/`maxItems` rejected as rule enforcement; finding 7 fixed by `frontmatterValues` |
| 15 | Three append-only memory kinds; `Remember` gate | Accepted, filename deviation ledgered | 11-07 (`a2c9429`, `f2def43`, `5be252d`) | `corrections.md`, `user.md`, `chat-summaries.md`; a message must begin with `Remember` |
| 16 | Stop semantics; Stop parity | Accepted, parity ruled 11-15 | 11-07 (`5be252d`, `0a066d7`), R10/R11 11-15 | Stop closes the modal and aborts in flight; parity is the loop rule; first-green justification owed |
| 17 | Bundled recipes are authoritative | Accepted, drift guard `f28` | 11-07 (`648f7b9`, `c505c63`, `75075c3`), `f28` 11-15 (`a6b4500`) | `.md` mirrors are conformed to `bundled.ts`, never the reverse |
| 18 | Verbosity is model-facing, never a display filter | Accepted | 11-07 (`75075c3`), all six 11-15 (`3f34605`), R4 11-15 | All six recipes carry the input; plain chat adapts length; Scenario I inconclusive |
| 19 | LLM infra failure is not a model mistake | Accepted, manual cleanup owed | 11-08 (`01497d3`), bundle 11-13 (`240b688`) | `clientFailed`; no corrections on infra failure |
| 20 | Handovers committed once superseded; now archive material | Accepted | Dan 11-08; ruling 3, 11-16 | Uncommitted doctrine retired (origin: a mis-paraphrase); handovers → `docs/archive/` |
| 21 | Model roster — qwen closed, Gemma retired, kimi known-good | Accepted | Dan 11-08/11-10/11-13; chat-read rule 11-16 | Closures rest on committed narratives; store transcripts are not recoverable; ~$120 declared cap |
| 22 | Fixture discipline — single-hunk chain, next number f31 | Accepted | 11-06 (`f659881`), lessons 11-08/10/13, restated 11-15 | No gaps; asserts + exit code are the instrument; `obsidian` needs a mapped fake under tsx |
| 23 | Scenario F fixed — abort reaches the streaming loop | Accepted, **manual smoke owed** (T9) | diagnosis 11-10, fix 11-13 (`69a4b45`), UI legs 11-15 (`031b686`) | User abort routed into the client controller; f27 two legs; red earned at the seam |
| 24 | Release discipline (Muninn doctrine, applied) | Accepted, `versions.json` drift ledgered (T25) | Muninn 10-26→11-05, applied 11-06; overrule 11-15 | Quartet assets; 5-file bump shape; immutable tags; `main.js` churn is real content |
| 25 | TESTING1 is the living manual-smoke contract | Accepted, redefinition owed (T20) | 11-06; redefinition ruling 11-15 | Eleven scenarios; A is the precondition for all; B/D/F/I + E/G chat legs redefined; J survives verbatim |
| 26 | Non-path `recipe-param` inputs never borrow the note path | Accepted | 2026-11-15 (`1bbc908`, f30) | They resolve to `null`; f30 guards the rendered prompt |
| 27 | Diagnose before you build; red earned at the seam; first-green needs justification | Accepted, standing rule | Muninn 10-24→11-01 (ADR-7), R14 11-15, standing rule 11-16 | Overclaimed reds corrected on the record; justification text lives in the fixture header |
| 28 | The operation loop — four ops, disclosure, bound 12, R1–R14 | Accepted as **ruled law**; implementation not authorized | Dan 11-15 (`c4b103e`) | The operation sequence is the context selection; `write` always gated and names a recipe; `contextUsed` at the gate |
| 29 | Release overrule — `1bbc908` + the whole loop in one release | Accepted, release act Dan's | Dan 11-15 | No `test.21` cut; one merged manual smoke; bounded tag retry deferred |
| 30 | Memory Feedback Loop | **Accepted as design, unimplemented** | design + guide 11-07 (`0a066d7`); ruling owed (T13) | Ranking/scoring unimplemented; the guide's F26–F30 plan collides with shipped fixtures |
| 31 | Design tenants die by name | Accepted | R13 11-15; living-doc rule | Supersession recorded in the ruled header; docs conform to code; unimplemented vocabularies measured 0 hits |
| 32 | Document rationalisation law | Accepted (rulings 1–14), Phase 3/4 owed | Dan 11-16 | Canonical categories; `docs/archive/` + tombstones in both; ADR immutability; **receipts or nothing** |
| 33 | `listNotes` in the mirror | **Proposed — ruling owed** (T15) | R12 11-15; contract drafted 11-16 | Sixth door, additive, read-only, dark-safe; Muninn first, then mirror, then `list` |
| 34 | Op-loop fixture plan `f31`–`f36` | Accepted as construction order, nothing built | R14 11-15 | Three reds at `1bbc908`, two staged, one first-green with written justification; f11 re-pointed |
| 35 | `isDesktopOnly` — activation flag, not a function gate | Accepted as supersession text, no code change | Dan 11-16, ruling 11 | `false` is correct in both manifests; the "flip owed" doctrine is the stale artifact |
| 36 | Prompt budget and context floor | Accepted | R8/R11/§6 11-15, G5 11-15, as-built 11-07 | Loop prompt carries names + triggers, not recipe text; base context implied; latency accounted by design |

## Supersession map

| Superseded | Superseding | What changed |
|---|---|---|
| Retry once on ground-truth failure (ADR-11) | ADR-12 | Vault state is not a model mistake; no retry, no correction |
| The v1 `snippet` disclosure field | ADR-28 (R5) | Stricken; model-selected evidence is the laundering vector R2 closes |
| The v1 claim "no first-green fixtures are proposed" | ADR-27, ADR-34 (R14) | Stricken as false for invariant 5; written justification is the standing requirement |
| Active-note-only gather baseline; the knife-switch default-target model | ADR-28 (ruled header §6) | The operation sequence is the context selection; `defaultTargetPath` never production-set (ADR-26) |
| `batch-suggest`, `auto-apply`, `approvalPolicy`, `autoApplyConfidence`, the batch modal | ADR-5, ADR-28, ADR-31 (R13) | Superseded by name; no shipped code implements batch (grep-clean); `auto-apply` was never compatible with doctrine |
| The uncommitted-handover doctrine (`fb90ecf`, `c3c30a1`) | ADR-20 | Retired; origin recorded as a mis-paraphrase; handovers are archive material from 11-16 |
| `isDesktopOnly` "flip owed pending mobile live receipts" | ADR-35, Muninn ADR-14 | The flag blocks activation only; `false` is correct; text supersession, no code change |
| Model auditions (qwen relay, Gemma4:12b run, context-window tuning) | ADR-21 | Auditions paused; Gemma retired; qwen closed; kimi inherits with a declared cap |
| `minItems`/`maxItems` as enforcement furniture | ADR-14 | Rejected as rule enforcement; the memory-pollution vector closed |
| Scenario B's "previously-unachievable" verbosity expectation | ADR-18, ADR-25 (R4 corollary) | Drop notices always display; no `verbose` recipe input needed |
| "Scenario A superseded by name" (a claim, not a doc) | ADR-25, docket T26 | Measured: the claim is not in the repo; Scenario A is the precondition for all eleven scenarios and survives unchanged |
| Frozen five-door surface (Muninn 2026-11-06) | ADR-33 **if Muninn ADR-37 is accepted** | Becomes six doors; ruling owed, nothing implemented |

## Cross-project acknowledgements (Muninn owns, Huginn consumes)

- **Muninn ADR-32** owns the doctrine Huginn inherits (ADR-2); Muninn's `docs/tool-skill-strategy.md` is
  archived with a tombstone pointing here (ruling 7).
- **Muninn ADR-34** (plugin boundary) and **Muninn ADR-36** (the five-door freeze) bind
  `src/muninn-api.ts:57` and forbid vault enumeration in Huginn (ADR-1).
- **Muninn ADR-37** (`listNotes`, **Proposed**) is the dependency of ADR-33 and the op loop; sequencing is
  binding: Muninn `api.ts` → Huginn mirror → `list` in the loop. **Huginn cannot lead.**
- **Muninn ADR-31** is the base ban; Huginn's `docs/Serial Contextual Operations Design (Ruled).md`
  (R1–R14, 2026-11-15) is the gated re-admission of a write op. **That document is law for Huginn.**
- **Muninn ADR-6** (ADR immutability), **ADR-7** (earned red), **ADR-8** (release doctrine),
  **ADR-11** (typecheck baseline), **ADR-14** (mobile), **ADR-20** (packaging), **ADR-21** (staffing and
  the executor contract) apply to both projects.
- **Shared docs owned by Muninn** (ruling 4): `LLM Coordination Protocol v1.0.md` and
  `Unified Project Definition v0.2.md`. Huginn keeps **pointer stubs** (Phase 4).
- Huginn has no release doc; Muninn's `docs/Release Ritual -- Walkthrough.md` is the doctrine of record
  and needs a pointer stub (T16).
