# Huginn Security Policy

> **Conform 2026-11-26 (restart surgery, Dan's demolition act):** carried into the reborn canon with this
> dated note. ADR citations in the body name law as it existed at acceptance; the pre-restart ADR set was
> retired by Dan's history-surgery act (the disposition record: `docs/Restart Ledger.md`, Muninn root).
> The write-machinery receipts below (`src/harness/apply.ts`, gate, diff) stand **at the baseline** and
> remain reproducible; the excised islands were the harness driver, gather, ground-truth, the op-loop
> envelope machinery, and chat dispatch (disposition §5.1). The posture is otherwise unchanged: all vault
mutation stays gated, always — the new-world shape is `docs/Design Report -- Pointer.md` → Muninn root §6.

**Private, experimental software. No warranty. No public issue channel.** Huginn is a personal plugin for
a personal vault, developed for local use with Dan as the sole maintainer and ruling authority (ADR-21).
There is no security bounty programme, no embargo process, and no promise of timely response. Report
problems to Dan directly.

## What Huginn touches

- **Vault content is read from the active note and sent to local Ollama** for chat and recipe runs
  (default model `qwen3.5:4b`, base URL is a user setting). Nothing is sent to any hosted API.
- **Huginn writes to the vault.** All mutation is write-class recipe output applied through the approval
  gate: `src/harness/harness.ts` gates before apply (measured `135-141`, `approval === null → approved =
  null` `142-143`), and `src/harness/apply.ts` carries `createDefaultApplyRegistry` (`:51`), `noop`
  (`:55`), `append-frontmatter-array` (`:63`), `set-first-heading` (`:107`), `append-section` (`:137`).
  Every write is gated, **always** — no exceptions, no auto-apply, no batch-suggest (`docs/Serial
  Contextual Operations Design (Ruled).md` R5, R10, R13; ADR-31 records `auto-apply` as ruled out).
- **The approver sees the write's evidence.** Ground-truth primitives run before the modal renders
  (`src/harness/ground-truth.ts`, six primitives: `file-exists` `135`, `file-not-exists` `145`,
  `frontmatter-contains` `156`, `frontmatter-not-contains` `186`, `note-contains-text` `222`,
  `note-not-contains-text` `249`); the modal renders the serialized `DiffResult` (ADR-12), and rule
  `description` fields reach the message (`f25`).
- **Vault enumeration is forbidden in Huginn.** `app.vault.getMarkdownFiles()` is not used: vault state
  comes through the frozen Muninn door, and a second source of truth is a safety defect, not a
  convenience (ADR-34). `listNotes` is **Proposed** (Huginn ADR-33 / Muninn ADR-37, ruling owed): it
  must go through Muninn, additively, and breaks no existing door semantics.
- **No secrets are stored by Huginn.** The memory files (`Agents/Huginn/MEMORY/corrections.md`,
  `user.md`, `chat-summaries.md`) are vault notes, and a note containing a secret is indexed by Muninn,
  embedded, and searchable, and can be sent to Ollama as chat context. There is no redaction layer.

## The approval model (law)

Four ops only: `list`, `read` (ungated, inert), `write` (one note, always gated, names a recipe),
`respond` (R1–R14). Payload is authored by the recipe sub-run via `harness.run` (R8, Option A).
`ApprovalRequest` gains `contextUsed` = `path` + a deterministic machinery-taken excerpt; the v1 `snippet`
is stricken. **Reads expire at each gate** (`reads.length = 0`) — evidence shown for a write is that
gate's evidence, not a stale read. The op bound is 12 via the `turnOpBound` setting; op-shape errors are
turn-local machine-readable strings, never corrections; no retries on decline; Stop parity across the chat
and harness paths; the turn receipt is not persisted; the command palette stays single-shot.
Verbosity is model-facing, never a display filter (R4).

## Model layer

Model output is **inert payload, never an instruction** (Muninn ADR-31; Huginn R6). Instructions arising
from tool output are refused: the op loop's system prompt states the rule and op results ride a data
channel marked as vault data (`src/ops/loop.ts`), the envelope vocabulary cannot reach outside the vault
(`src/ops/envelope.ts` `isVaultPath` `59-64`), and the harness refuses unvalidated output
(`harness.ts:147-165` [R @ Huginn 9d26177], re-measured at the 2026-11-22 chat wiring; the row cited
`:154-162` at the report's own HEAD, shifted by T12's Design A retry). `src/chat/dispatch.ts` `parseDispatch` (`90-130`) still requires all three fields
non-empty and returns `null` on no match (`111`) — it is fixture-policed only since the 2026-11-22 chat
wiring, no production seam. Infra failures are never recorded as corrections (`f26`). No model has approval
authority, no model receives a tool menu, and no model can reach the vault.

**Roster (ADR-21):** Gemma4:12b retired, qwen closed, the paid `kimi` plugin is known-good with a declared
~$120 cap; auditions paused, interim staffing is Dan-and-infra. Closures rest on Dan's ruling and
committed handover narratives, never store transcripts (T22). Reading Qwen3.5:12b's chats is permitted and
bounded; reading Gemma4:12b's is out of bounds (Dan, 2026-11-16). **Scope of the closures (Dan, 2026-11-17,
closing T33):** the roster closures are **staffing rulings for the coding/production side**. They do not
prohibit a model for the user side: the vault plugin is built to rely on small models, and
`DEFAULT_SETTINGS` (`settings.ts:20-27`) shipping `qwen3.5:4b` as the chat default is a **popular user-side
default**, not a contradiction of the closure. No default change, no code change.

## External requirements

Obsidian desktop; `minAppVersion 0.15.0` (`manifest.json:4`). `isDesktopOnly: false` (`manifest.json:10`)
is correct: the flag blocks activation on mobile, not function (ADR-14; the mobile read lane runs with zero
native imports). Muninn `0.2.0-test.15` or later, installed and enabled (`README.md:22`; the `docs/Testing Schedule.md:9`
citation was measured there before the file was deleted 2026-11-24, folded into
`Muninn/docs/Combined Testing Schedule.md`). Local Ollama with the chat model pulled; Node and tsx for development. There is no
`num_ctx`, `temperature`, or `top_p` setting in Huginn (grep: 0 hits) — context control is the harness's,
not the model's (T12, ruling owed).
