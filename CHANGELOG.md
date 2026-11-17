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

## Docs record (not a release act)

**2026-11-17, Phase 4** — commit `2eb0c29`, `docs(rationalisation): phase 4 canonical set — ADRs, Design
Report, archive, pointer stubs, doc-conform`: **84 files, 2586+/3077−** [R], pushed
`1bbc908..2eb0c29 main -> main` [R]. Written: `docs/decisions/` ADR-1 … ADR-36 + `index.md`,
`docs/Initial Design Report.md`, `CHANGELOG.md`, `SECURITY.md`, `CONTRIBUTING.md` (repo root), `README.md`
Docs section, three pointer stubs (`LLM Coordination Protocol v1.0.md`, `Unified Project Definition v0.2.md`,
`docs/Release Ritual -- Pointer.md`), `docs/archive/` (17 `git mv` + the committed
`docs/archive/Handover 2026-11-15.md` [U] + `docs/archive/README.md`, all tombstoned *Archived 2026-11-17*),
and the doc-conform fixes (fixture table f01–F30, `user-memory.md` → `user.md`, warmup wording, the
assessment citations, `(Ruled).md`'s header citation). Receipts tied to the commit: `TYPECHECK EXIT:0`,
**30 `VERDICT: GREEN`**, `FIXTURES EXIT:0` [R].

**2026-11-17, the conform pass** — commit `968c7f4` (3 files, 26+/9− [R]), pushed
`2eb0c29..968c7f4 main -> main` [R]: the push/commit state record in `CHANGELOG.md`, the Design Report
(header, §14, §20) and `docs/decisions/index.md`'s dated addendum. **No ADR body edited** (ruling 2, ADR-6).
Receipts measured before the commit: `TYPECHECK EXIT:0`, **30 `VERDICT: GREEN`**, `FIXTURES EXIT:0` [R].

**2026-11-17, Phase 5** — archive→delete, Dan's act on Dan's authorization (ruling 13): `git rm -r
docs/archive` = **19 tracked files** [R], every tombstone dated 2026-11-17; content recoverable from the git
history. Live docs conformed in the same commit: `README.md` (lines 64, 84-85), `CONTRIBUTING.md` (lines
69-70), `docs/Initial Design Report.md` (header, §19, §20, new §21), `CHANGELOG.md` (this record),
`docs/decisions/index.md`'s dated addendum, and `docs/Serial Contextual Operations Design Assessment.md`'s
header conform note. **`docs/Serial Contextual Operations Design (Ruled).md` is not edited** (it is law), and
**no ADR body is edited**: 60 lines in `docs/decisions/` cite archived names as acceptance-time evidence [R].
Live doc set after: **50 tracked doc files** [R]. No bump, no tag, no release.
