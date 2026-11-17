# Huginn Changelog

Entries by release tag. Dates and the tag-target commit are measured from
`git for-each-ref --format='%(refname:short) %(creatordate:short) %(objectname:short)' refs/tags`
(2026-11-17) [R]; headlines are the tag commit's subject, measured with `git log -1 --format=%s` [R].
Release assets are `main.js`, `manifest.json`, `versions.json`, `styles.css` (Huginn ADR-8, ADR-20; the
release doctrine is owned by Muninn, `Muninn/docs/Release Ritual -- Walkthrough.md` — see
`docs/Release Ritual -- Pointer.md`). Tags are immutable; never force-push.

**Latest release:** `0.1.0-test.20` — https://github.com/iconoclast27/Huginn/releases/tag/0.1.0-test.20

| Tag | Date | Headline [R] |
|---|---|---|
| `0.1.0-test.1` | 2026-11-06 | `dd6efff` feat: scaffold Obsidian plugin and port harness modules from Muninn |
| `0.1.0-test.2` | 2026-11-06 | `a9b071b` feat: Muninn readiness poll, recipe chooser, and chat model warmup |
| `0.1.0-test.3` | 2026-11-06 | `f659881` fix(discovery): quiet per-poll Muninn warnings, add fixtures npm script |
| `0.1.0-test.4` | 2026-11-06 | `8c5b766` chore(release): bump for approval UI and ground-truth validation |
| `0.1.0-test.5` | 2026-11-06 | `9da4cd9` fix(approval): serialize full DiffResult so modal can render changes |
| `0.1.0-test.6` | 2026-11-06 | `1685a66` feat(skills): add title/link/summary/task recipes, content input source |
| `0.1.0-test.7` | 2026-11-06 | `5b2288d` feat(apply): implement write-class suggest routines for tags, title, links |
| `0.1.0-test.8` | 2026-11-06 | `2048a64` feat(chat): vault-aware chat interface with active-note context |
| `0.1.0-test.9` | 2026-11-06 | `0a0c2ca` chore(release): bump for sidebar chat and skill dispatch |
| `0.1.0-test.10` | 2026-11-06 | `73d72e0` fix(chat): read-only skills inline, selectable chat text, robust frontmatter writes |
| `0.1.0-test.11` | 2026-11-07 | `e5478e8` feat(chat): markdown rendering, chat styling, stop button, richer prompt |
| `0.1.0-test.12` | 2026-11-07 | `edc3f5e` fix(chat): live harness and active-note getters for restored sidebar views |
| `0.1.0-test.13` | 2026-11-07 | `486d9d6` feat(chat): context follows active note, refresh preserves history |
| `0.1.0-test.14` | 2026-11-07 | `0971c79` chore(release): bump to 0.1.0-test.14 |
| `0.1.0-test.15` | 2026-11-07 | `b812655` chore(release): bump to 0.1.0-test.15 |
| `0.1.0-test.16` | 2026-11-07 | `e5d828b` chore(release): bump to 0.1.0-test.16 |
| `0.1.0-test.17` | 2026-11-07 | `e7bdf27` chore(release): bump to 0.1.0-test.17 |
| `0.1.0-test.18` | 2026-11-07 | `75075c3` feat(recipes,chat,ground-truth): note-summary, related-notes, task-extraction verbosity, note-text primitives |
| `0.1.0-test.19` | 2026-11-07 | `0a066d7` fix(chat,ui,harness): preserve chat history, Stop abort race, ground-truth checks in approval modal |
| `0.1.0-test.20` | 2026-11-08 | `aa42ec2` chore(release): bump to 0.1.0-test.20 and update docs for release-hygiene test release |

**Facts of record:**
- `aa42ec2` is the `test.20` release act: 5 files (`README.md`, `docs/TESTING1.md`, `manifest.json`,
  `package.json`, `versions.json`), 10+/9− [R].
- **Huginn requires Muninn `0.2.0-test.15` or later** (`README.md:22`, `docs/TESTING1.md:9` [R]).
- **Release hygiene, ruling owed (T25):** `versions.json` has **18 entries against 20 tags** —
  `0.1.0-test.14` (`0971c79`) and `0.1.0-test.15` (`b812655`) are missing. Completing the file is a
  release act, Dan's, not a doc edit.
- **Committed and pushed 2026-11-17:** `2eb0c29` (Phase 4 docs), pushed `1bbc908..2eb0c29 main -> main`
  [R]. The serial contextual operations work, `1bbc908` plus the op loop, lands in **one** release with
  **one** merged manual smoke (the release overrule, 2026-11-15) — no intermediate `0.1.0-test.21` cut.
- `docs/TestReport.md` is the smoke record of record: Dan's `test.18` run — Scenario A PASS, F FAIL,
  I inconclusive.
