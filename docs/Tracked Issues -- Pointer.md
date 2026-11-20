# Tracked Issues — pointer stub

**The tracked-issues docket lives in Muninn:** [`Muninn/docs/Tracked Issues.md`]
(Muninn repo, `docs/Tracked Issues.md`). It is **canonical for both projects** — the issues, their measured
receipts, and Dan's rulings live in one place, so nothing drifts between two copies.

Huginn issues are tracked in that docket, not here. Rows that bear on Huginn: **T5** (mobile live
receipt), **T6** (folder-rename child paths), **T7** (`onunload` durability), **T8** (ANN / vector
index), **T9** (Scenario F never smoked — the merged manual
smoke is the release gate), **T11** (verbose coverage for the four channel-less recipes), **T12** (bounded
tag-assignment retry), **T13** (Memory Feedback Loop release —
**closed 2026-11-20 by Dan's ruling**: the two projects' fixture chains are **independent**, so no
numbering collision ever existed — the guide's draft "F26–F30" were Huginn-sequence numbers misread as
cross-project; **standing convention: every cited fixture number carries its project prefix, `M-fNN`
(Muninn) or `H-fNN` (Huginn)**; release slotting: Memory Loop ranking fixtures follow the op loop's
H-f31–H-f36 and start at **H-f37**),
**T14** (null-failure cause, blocked on recurrence), **T20** (Scenarios B, D, F, I and the E/G chat legs to
be redefined for the op loop), **T37** (the proposed add-ons list — Dataview integration and structural
predicates, deferred by Dan's ruling of 2026-11-18, "much, much later").

**Closed by Dan's rulings of 2026-11-17:** **T10** — Dan deleted all the vault memory files himself,
"T10 done, I deleted all memories to avoid prejudicing future testing", so the memory scenarios in
`docs/TESTING1.md` run against a clean slate; **T17/T18** — "T17/18 -- agreed, root" (Muninn
`docs/decisions/adr-42.md`); **T24/T25** — the executor completed `versions.json` on Dan's request (Huginn
**18 → 20** entries, `minAppVersion` read from each tag's own `manifest.json`); **T33** — Dan ruled the
finding a misunderstanding, "The closed models are closed on the coding/production side, not the user side.
The vault plugin is going to rely on small models, and qwen3.5:4b is a popular default for users" (Muninn
`docs/decisions/adr-41.md`), so `DEFAULT_SETTINGS` (`src/settings.ts:20-27`) is **unchanged** and
`SECURITY.md` is conformed to the scope; **T36** — `.qwen` removed from Muninn's tree.
**Closed by Dan's ruling of 2026-11-18:** **T4** — declared limitation, Muninn
`docs/decisions/adr-43.md`; the loop inherits it, and the obligation that lands in this repo is the
turn-receipt disclosure, `docs/Op Loop Red Plan.md` Stage 11. **T15** — the enumeration door ruled, the
contract of record is Muninn `docs/decisions/adr-37.md` (**Accepted**, implementation owed); `adr-33.md`'s
status follows the ruling, and the code gates for the loop are **T13** alone. **Parked by Dan, not
open for the executor:** T5 (ruling 11). **Named debts needing a ruling that is not cheap:** T7, T8.

name-collision was a documentation-convention failure by merged documentation, now reconciled (Dan,
2026-11-20): **the two chains are independent — M-f01–M-f26 in Muninn, H-f01–H-f30 in Huginn, each its
own `package.json` chain [R] — and every cited fixture number carries its project prefix (`M-fNN` /
`H-fNN`) in all documentation. The guide's draft "F26–F30" were Huginn-sequence numbers (H-f26–H-f30,
already shipped), never a collision. Standing convention in force from this pass forward; live text is
conformed, history stays history.**

**T13's ruling also settles release slotting** (Dan, 2026-11-20, confirmed): the Memory Feedback Loop's
ranking fixtures **follow the op loop's H-f31–H-f36 and start at H-f37** — f37 as the first newly-authored
Huginn number after the loop reserves f31–f36.

**Huginn keeps no issue list of its own.** If a finding is raised in Huginn, it goes on the Muninn docket and
stays there until investigated.

*Stub added 2026-11-17 (ruling 40, Muninn `docs/decisions/adr-40.md`): a document that outlives one task
lives in the repo, and stating a fact twice is a drift opportunity.*
