# Huginn

AI assistant plugin for Obsidian — chat and skills. Huginn (Plugin 2) consumes the frozen Muninn API door for vault state and provides the LLM chat client, skill harness, recipe loader, and approval gate.

## Current status

Latest test release: `0.1.0-test.20`. Huginn provides a vault-aware sidebar chat plus a skill harness with human approval.

- **Chat:** `Huginn: Open Huginn chat` opens a sidebar view that sends the active note body to the configured Ollama chat model as context. A message-square ribbon icon is also provided. The chat resets when Obsidian reloads or the workspace is restored. Use **New chat** to clear the transcript without reloading Obsidian.
- **Skill dispatch from chat:** User messages in the sidebar are first dispatched to the loaded recipe catalog; matched recipes run through the harness, while unmatched messages fall back to plain chat.
- **Read-only skills inline:** `task-extraction` generates an actionable TODO list implied by the note, `note-summary` returns a concise paragraph summary, and `related-notes` returns a list of related vault note paths. All three render directly in the chat without opening the approval modal.
- **Skills:** `Huginn: Run Huginn skill` discovers `.md` recipes in `Agents/Huginn/SKILLS/`, renders them, validates the model's JSON output, shows a diff approval modal, and applies write-class suggestions for tag, title, and link recipes.
- **Memory:** `Agents/Huginn/MEMORY/` stores corrections, user memory, and chat summaries. Corrections are written when schema validation, apply routines, or user rejection fail, then fed back into dispatcher and recipe prompts. Ground-truth failures (e.g., a tag already exists) are reported to the user but not treated as corrections. Rejection reasons are captured and stored as `refusal` entries.
- **User memory commands:** In chat, type a message beginning with **Remember** (e.g., `Remember that I prefer qwen2.5:14b` or `Remember don't suggest tags already in the note`) to add an explicit note that is injected into the chat system prompt. Ordinary chat containing "don't" or "avoid" is not captured.
- **Chat summaries:** Click the **Remember chat** button in the sidebar header to summarize the current conversation; summaries are stored in `Agents/Huginn/MEMORY/chat-summaries.md` and recalled in future chat sessions.
- **Default skills:** `Huginn: Install default Huginn skills` seeds `Agents/Huginn/SKILLS/` with the bundled recipes on first run. `Huginn: Reset default Huginn skills` force-overwrites existing recipe files when they become stale.
- **Frontmatter handling:** `tag-assignment` uses Obsidian's `fileManager.processFrontMatter` to add tags. `title-suggestion` sets both the first `# ` heading and the `title` frontmatter property, creating frontmatter when necessary.
- **Target path normalization:** note paths entered without `.md` are automatically normalized to `.md` before the skill runs, including paths supplied by the chat dispatcher or recipe inputs.
- **Streaming chat abort:** The **Stop** button cancels in-flight Ollama `/api/chat` generation promptly and closes the approval modal if it is open.
- **Ground-truth registry:** Built-in primitives include `file-exists`, `file-not-exists`, `frontmatter-contains`, `frontmatter-not-contains`, `note-contains-text`, and `note-not-contains-text`. Recipe-provided `description` fields are surfaced in ground-truth error messages shown in chat and console.

Requires Muninn `0.2.0-test.15` or later to be installed and enabled.

## Build

```bash
npm install
npm run typecheck
npm run build
```

The production bundle is written to `main.js`.

## Fixtures

```bash
npm run fixtures
```

Runs F01–F30, covering harness end-to-end, settings, ground truth, approval, recipe parsing, the six shipped skills, content gathering, write-class apply routines, `.md` path normalization, chat-state sanitization, chat skill-dispatch intent parsing, vault memory store, corrections wiring, user memory commands, chat summary memory, default recipe install/reset, ground-truth primitive registry, legacy-format rejection, gatherer path normalization, generic array-valued apply, new read-only recipes, task-extraction verbosity, note-text primitives, ground-truth descriptions in the approval gate, infra failures never recorded as corrections, the **Stop** abort reaching the streaming loop on both the chat path and the harness `complete()` path, the bundled catalog ↔ `src/recipes/*.md` sync guard, the two-tag strip seam (array frontmatter values read by the vault-truth check, dropped values stripped before approval, drops never recorded as corrections), and the gatherer rule that non-path `recipe-param` inputs resolve to `null` and never borrow the note path as a setting.

## Commands

- **Huginn: Open Huginn chat** — open a chat session about the active note.
- **Huginn: Run Huginn skill** — choose a recipe and target note, then approve or reject the model's suggestion.
- **Huginn: Install default Huginn skills** — create bundled recipe files if they are missing.
- **Huginn: Reset default Huginn skills** — force-overwrite bundled recipe files to restore the shipped versions.

## Vault layout

```text
Agents/
  Huginn/
    SKILLS/      # skill recipes
    MEMORY/      # corrections.md, user.md, chat-summaries.md
```

The memory file names are measured in code: `CorrectionsMemory` → `corrections.md`
(`src/memory/kinds.ts:34`), `UserMemory` → **`user.md`** (`:75`), `ChatSummaryMemory` →
`chat-summaries.md` (`:110`).

## Docs

Canonical set (single source of truth; history lives in `docs/archive/` with tombstones):

- [`docs/Serial Contextual Operations Design (Ruled).md`](docs/Serial%20Contextual%20Operations%20Design%20(Ruled).md) —
  **the law**: R1–R14, the four ops (`list`, `read`, `write`, `respond`), disclosure, the op bound.
- [`docs/Serial Contextual Operations Design Assessment.md`](docs/Serial%20Contextual%20Operations%20Design%20Assessment.md) —
  the engineering diagnosis of record (G1–G13, wiring map, staged fixture plan f31–f36).
- [`docs/Initial Design Report.md`](docs/Initial%20Design%20Report.md) — the as-built description at
  `c4b103e` / `0.1.0-test.20` (recorded 2026-11-16).
- [`docs/decisions/index.md`](docs/decisions/index.md) — the 36 ADRs, numbered from 1, status table and
  supersession map. **An ADR is never edited after acceptance.**
- [`docs/Huginn Plugin 2 Harness.md`](docs/Huginn%20Plugin%202%20Harness.md) — the canonical recipe-format
  reference (`# Validation`, field table `:60-71`), harness flow, module map, fixture table F01–F30.
- [`docs/TESTING1.md`](docs/TESTING1.md) — the living manual-smoke contract, version-pinned;
  [`docs/TestReport.md`](docs/TestReport.md) — the smoke record of record.
- [`CONTRIBUTING.md`](CONTRIBUTING.md) — conventions, fixture discipline, the authorization chain.
- [`CHANGELOG.md`](CHANGELOG.md) — entries by release tag, dates and tag commits measured.
- [`SECURITY.md`](SECURITY.md) — write lane, approval model, model layer.
- Pointer stubs (Muninn owns the originals): [`docs/LLM Coordination Protocol v1.0.md`](docs/LLM%20Coordination%20Protocol%20v1.0.md),
  [`docs/Unified Project Definition v0.2.md`](docs/Unified%20Project%20Definition%20v0.2.md),
  [`docs/Release Ritual -- Pointer.md`](docs/Release%20Ritual%20--%20Pointer.md).
- [`docs/archive/README.md`](docs/archive/README.md) — the archive rule, the index, and the tombstone
  format. Archive material is not authoritative.
