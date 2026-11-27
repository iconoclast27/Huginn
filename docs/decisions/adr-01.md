# ADR 01 — Approval-mode routing (NEVER auto-refuses, YOLO auto-approves)

Status: **Accepted 2026-11-27** (Dan's ruling act, verbatim below; recorded same day).
Huginn-owned law (gate mechanics). Set of modes and the AUTOAPPROVE detector are prior
law: Restart Ledger §2.2 D-4 (enum is law, from the first commit) and D-13 (detector =
a web-tool-class call present in the current turn history; downgrades that turn's
mutation approvals from AUTOAPPROVE to ASK; no NLP, no content tracking).

## Ruling (verbatim)

> Never is an auto-refuse, and any feedback to the model should say so. Model can
> then complain to the user if it wants to, but that's its problem.
>
> YOLO is an auto-approve, and any tool user notice to the user should say so if
> reasonable practicable.

## What it fixes

- `NEVER`: a mutation verdict arriving in NEVER mode is **refused without pausing** —
  no modal, nothing applied — and the model-facing feedback (the validator-class
  `is_error` tool result) **says it was an auto-refuse**. Whether the model tells the
  user anything is the model's choice, not apparatus law.
- `YOLO`: a mutation verdict is **applied without pausing**; any user-facing tool-use
  notice should say the change was auto-approved, "if reasonable practicable" (a
  surfacing obligation bounded by what the client UI can honestly show — the notice
  half lands at the client-wiring leg; its smoke observable is schedule H3.8).
- `AUTOAPPROVE` (per D-13, unchanged): auto-approve unless the current turn history
  already made a web-tool-class (external-reading) call — then that turn's mutations
  route to ASK (the modal) again.
- `ASK` (default): every mutation pauses at the modal (what H-f44 policed at the gate
  leg landing).

Read families are never gated under ANY mode (Design Report §2, D-1/D-4) — mode
routing is mutation-only; the router enforces the refusal of non-mutation calls first.

## Mechanism (consequences, executor's within the ruling)

- Modes are enforced by the ROUTER (`src/harness/gate.ts` `routeThroughGate`, policy
  param), not by the client loop: no wiring edit can bypass a mode or gate a read.
- `GateOutcome.notice` carries the auto-decision wording the client surfaces where
  it can; `NEVER` declines ride the same `toolError` anatomy as user declines, with
  content naming the auto-refuse and the mode.
- The detector input is a boolean the client loop computes per D-13 (the manifest has
  no web-tool verbs today — the detector rides whatever external tools exist at
  wiring time; no NLP, no content tracking, per D-13).

## Addendum (dated 2026-11-27, client-wiring leg measured — no decision changed)

- The D-13 detector's `externalReadingThisTurn` rides `runTurn` as a caller-supplied
  `webToolClass?: (name: string) => boolean` predicate over EXECUTED call names
  (`src/chat/turn.ts:227`, applied at `:339`): the plumbing shape only. Measured at this
  leg, the manifest still names no external-reading verb (`vault__*` structure reads,
  `vault__searchVault` lexical, `command__*` palette, `muninn__notesLike` door — the door
  reads the vault, not the web), so the downgrade stays dormant until an external-reading
  family exists. The ruling's semantics are untouched; the gap is disclosed where the
  smoke can see it (schedule block H4, item 6).
