# ADR-29: Release overrule — `1bbc908` plus the entire op loop land in one release, one merged manual smoke

**Status:** Accepted (ruled; recorded 2026-11-16); the release act itself is **Dan's authorization only**
**Ruled:** Dan, 2026-11-15 (overrule of the assessment's `test.21` split), reaffirmed under the merged
plan; the release-21 content ruling 2026-11-15 (`c4b103e` context).

## Context

The assessment recommended cutting `0.1.0-test.21` from the committed tree (the release-21 content is
"committed and pushed (`031b686`, `3f34605`, `1bbc908`) and is manually testable as written") and putting
the op loop in `test.22` (`:361-368`). Dan overruled the split.

## Decision

- **There is no intermediate `0.1.0-test.21` cut.** Everything committed at `1bbc908` and the entire op
  loop land in **one release** (ruled §10, `c4b103e`).
- **Staged build order, as ruled:** Muninn `listNotes` → Huginn mirror → `f31`–`f36` → chat UI.
- **One merged manual smoke before the cut:** the Scenario F UI-leg steps, the loop scenario (scope via
  `list`, serial writes, disclosure verification, receipt observable), the two-tag checks, and
  re-verification of the verbosity fixes.
- **Recorded cost, accepted:** "one big blast radius, one revert point, one smoke session that must pass
  everything at once."
- **Pre-release manual step:** delete the stale `LLM client returned null` correction from
  `Agents/Huginn/MEMORY/corrections.md` — keyed by `tag-assignment`, injected into every such prompt.
  Manual vault edit, unfixtureable, carried as a smoke precondition (ADR-19, T10).
- **Bounded tag-assignment retry does not ride this release** (overruled out of scope-hiding); it
  schedules for the release after, with its Scenario B retry expectations written when the work is
  scheduled (T12).

## Consequences

- The version at HEAD is `0.1.0-test.20` (`package.json:3`, `manifest.json:4`, `README.md:7`), and the
  tag set ends at `0.1.0-test.20` [R] — the release-21 content sits in `main`, unreleased. Nothing is
  bumped, tagged, cut, or pushed without Dan's explicit authorization; HEAD `c4b103e` is unpushed
  (`origin/main` = `1bbc908`) and push authorization is in Dan's hands.
- The merged smoke is the release gate, and T9 (Scenario F never smoked in Obsidian) is closed by it,
  not by fixture-green.
- The bump-commit shape and the release-assets quartet are ADR-24.

## Sources

`docs/Serial Contextual Operations Design (Ruled).md:178-180`;
`docs/Serial Contextual Operations Design Assessment.md:361-368`; commits `031b686`, `3f34605`,
`1bbc908`, `c4b103e` (all 2026-11-15); `package.json:3`, `manifest.json:4`, `README.md:7`;
`git tag --sort=creatordate | tail -1` → `0.1.0-test.20` [R];
`docs/Handover 2026-11-13.md` (release-hygiene lines);
`/tmp/opencode/rationalisation/docket-2026-11-16.md` T9, T10, T12.

**Cross-references:** ADR-24, ADR-25, ADR-28, Muninn ADR-8, Muninn ADR-20.
