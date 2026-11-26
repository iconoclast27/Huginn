# Pointer — not authoritative

> **Conform 2026-11-26 (restart surgery, Dan's demolition act):** the pre-restart lineage is retired — the
> measurements below (`aa42ec2`, `c4b103e`, the `0.1.0-test.20` act) are pre-restart records. The ritual
> itself is unchanged; the new lineage's first release act is gated at step 7 (Restart Ledger §9).

**Owned by Muninn.** Canonical copy: `Muninn/docs/Release Ritual -- Walkthrough.md`.
This file is a pointer, not authoritative (docket T16, ruling 4; Huginn ADR-8, ADR-20).

Read the Muninn original for the release act in full. The Huginn-specific facts, measured:

- A bump commit touches `README.md`, `docs/Combined Testing Schedule.md`, `manifest.json`, `package.json`, and
  `versions.json` — measured at `aa42ec2` (2026-11-08, 5 files, 10+/9−) [R], the `0.1.0-test.20` act.
  `manifest.json` is the version Obsidian reads.
- **Release assets:** `main.js`, `manifest.json`, `versions.json`, `styles.css` — measured sizes at
  `c4b103e`: 70,178 / 318 / 2,152 / 552 bytes [R].
- Tags are immutable, never force-push; `gh release create` runs from the repo dir with `--notes-file`.
- Version bumps, release cuts, tags, and pushes are **Dan's acts only** (ADR-21). The latest tag is
  `0.1.0-test.20` (`aa42ec2`, 2026-11-08)
  (https://github.com/iconoclast27/Huginn/releases/tag/0.1.0-test.20).
- **Huginn requires Muninn `0.2.0-test.15` or later** (`README.md:22`; originally measured at `docs/Testing Schedule.md:9` [R] — that file was deleted 2026-11-24, folded into `Muninn/docs/Combined Testing Schedule.md`).
- `versions.json` has **18 entries against 20 tags** — `0.1.0-test.14` (`0971c79`) and `0.1.0-test.15`
  (`b812655`) are missing. Completing the file is a release act, Dan's, not a doc edit (T25).
- Manual smoke is Dan's act in Obsidian (developer console open, BRAT install from the prerelease tag);
  fixture-green is not production-live. The contract is `docs/Combined Testing Schedule.md` (Muninn root),
  the record is `docs/TestReport.md`.
