# ADR-35: `isDesktopOnly` — the flag blocks activation, not function; `false` is correct, and the "flip owed" doctrine is the stale artifact

**Status:** Accepted as supersession text (recorded 2026-11-16); **no code change** (ruling 11)
**Ruled:** Dan, 2026-11-16, ruling 11: proceed with the supersession text, do not change code. Muninn
ADR-14 owns the clause; the live mobile lane is Muninn's, not Huginn's.

## Context

Archived mobile-era text in Muninn carried the doctrine that the flag was "owed" to be flipped to
`false` pending mobile live receipts. Measurement found the flag already `false` in both projects, and
Muninn's mobile read lane is fixture-proven (M1–M3). The live mobile index receipt is owed on Muninn's
side (T5), parked by Dan as a question, not a bug.

## Decision

- **The flag only blocks activation on a mobile device; it is not necessary when a mobile read-lane
  fallback exists.** An unnecessary restriction, **a parked question, not a bug** (Dan, 2026-11-16).
- **Supersede the text, do not change code:** `isDesktopOnly: false` is measured in both manifests
  (`Huginn/manifest.json:10`, `Muninn/manifest.json:10`) [R]. The archived "flip owed pending mobile live
  receipts" doctrine is the artifact to tombstone.
- **Feature parity on mobile is explicitly not promised** (Muninn ADR-14) and the mobile lane runs with
  zero native imports.

## Consequences

- Huginn has **no mobile code path of its own**: its mobile behaviour is Muninn's door plus the chat
  client. Nothing to build, nothing to flip; the work is Phase 4 wording — tombstone the archived
  doctrine and record the supersession in the ADR set (ADR-32).
- The mobile live receipt stays on the docket (T5, parked by Dan); closing it requires a live index test
  on a mobile device, Muninn's act, not a fixture.
- Scenario D's warmup, the 120 s chat timeout, and a 12-op loop turn (minutes on local Ollama) are the
  mobile-adjacent facts the loop's smoke plan must account for by design (ADR-36).

## Sources

`Huginn/manifest.json:10` (`"isDesktopOnly": false`) [R]; `Muninn/manifest.json:10` (same) [R];
`/tmp/opencode/rationalisation/rulings-2026-11-16.md` ruling 11; Muninn ADR-14
(`/tmp/opencode/rationalisation/muninn/adrs/adr-14.md`); Muninn `docs/ARCHIVE/` mobile-era session notes
(measured, 23 files, all mined); `/tmp/opencode/rationalisation/docket-2026-11-16.md` T5.

**Cross-references:** Muninn ADR-14, Muninn ADR-30, ADR-1, ADR-32, ADR-36.
