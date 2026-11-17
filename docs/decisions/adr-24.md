# ADR-24: Release discipline — the shipped quartet, the bump-commit shape, immutable tags, and `versions.json` completeness

**Status:** Accepted (retrospective; recorded 2026-11-16) — doctrine owned by Muninn; `versions.json`
completeness **ledgered as drift** (docket T25)
**Ruled:** Muninn release doctrine 2026-10-26 → 11-05, applied in Huginn from 2026-11-06; the release
overrule 2026-11-15.

## Context

Huginn has no release doc; Muninn's `docs/Release Ritual -- Walkthrough.md` is the doctrine for both
(docket T16). The shipped artefacts, the bump-commit shape, and the tag rules are inherited.

## Decision

- Release assets are exactly **`main.js`, `manifest.json`, `versions.json`, `styles.css`**
  (measured at HEAD: 70,178 / 318 / 552 / 2,152 bytes).
- A bump commit touches **`README.md`, `docs/TESTING1.md`, `manifest.json`, `package.json`** (and
  `versions.json`) — the shape is measurable: `aa42ec2` (2026-11-08) changed exactly those five.
- **Tags are immutable; never force-push.** `gh release create` runs from the repo directory with
  `--notes-file`.
- `manifest.json` is the version authority (Muninn ADR-8); never release from a dirty tree; the tag must
  resolve.
- **`main.js` churn is real content, not inert** — the `240b688` receipt (the shipped bundle had to be
  rebuilt for the F26 guard to reach the plugin, ADR-19).

## Consequences

- **Drift ledgered:** `versions.json` at HEAD carries 18 entries against 20 tags —
  `0.1.0-test.14` and `0.1.0-test.15` are **missing** (measured loop over tags; the tag
  `0.1.0-test.14` resolves at `dda5fa4`, `0.1.0-test.15` at `0e16115`). Muninn has the same class of
  drift: 13 entries against 15 tags, missing `0.2.0-test.1` and `0.2.0-test.2` (docket T24). Fixing
  either file is a release-hygiene ruling, owed to Dan, not an implementation decision.
- `package.json:3` and `manifest.json:4` both read `0.1.0-test.20`; `README.md:7` pins the same version,
  plus the Muninn floor `0.2.0-test.15`.
- **The release overrule (2026-11-15):** no intermediate `0.1.0-test.21` cut. `1bbc908` plus the entire
  op loop land in one release with one merged manual smoke (ADR-29).
- Push authorization for `1bbc908..c4b103e` is in Dan's hands; HEAD `c4b103e` is unpushed [R].

## Sources

Commits `aa42ec2` (2026-11-08, the bump shape, 5 files), `dda5fa4` and `0e16115` (2026-11-07, the
missing versions entries' releases), `240b688` (2026-11-13), `69a4b45` (2026-11-13), `1bbc908` and
`c4b103e` (2026-11-15); `package.json:3`, `manifest.json:4`, `versions.json`, `README.md:7`;
`docs/Handover 2026-11-13.md` (release hygiene lines);
`/tmp/opencode/rationalisation/docket-2026-11-16.md` T24, T25.

**Cross-references:** Muninn ADR-8 (release doctrine), Muninn ADR-20 (packaging), ADR-19, ADR-29.
