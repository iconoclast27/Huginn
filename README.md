# Huginn

AI assistant plugin for Obsidian — chat and skills. Huginn (Plugin 2) consumes the frozen Muninn API door for vault state and provides the LLM chat client, skill harness, recipe loader, and approval gate.

## Current status

Latest test release: `0.1.0-test.17`. Huginn provides a vault-aware sidebar chat plus a skill harness with human approval.

- **Chat:** `Huginn: Open Huginn chat` opens a sidebar view that sends the active note body to the configured Ollama chat model as context. A message-square ribbon icon is also provided. The chat resets when Obsidian reloads or the workspace is restored. Use **New chat** to clear the transcript without reloading Obsidian.
- **Skill dispatch from chat:** User messages in the sidebar are first dispatched to the loaded recipe catalog; matched recipes run through the harness, while unmatched messages fall back to plain chat.
- **Read-only skills inline:** `task-extraction` generates an actionable TODO list implied by the note and returns it directly in the chat without opening the approval modal.
- **Skills:** `Huginn: Run Huginn skill` discovers `.md` recipes in `Agents/Huginn/SKILLS/`, renders them, validates the model's JSON output, shows a diff approval modal, and applies write-class suggestions for tag, title, and link recipes.
- **Memory:** `Agents/Huginn/MEMORY/` stores corrections, user memory, and chat summaries. Corrections are written when schema validation, apply routines, or user rejection fail, then fed back into dispatcher and recipe prompts. Ground-truth failures (e.g., a tag already exists) are reported to the user but not treated as corrections.
- **User memory commands:** In chat, type a message beginning with **Remember** (e.g., `Remember that I prefer qwen2.5:14b` or `Remember don't suggest tags already in the note`) to add an explicit note that is injected into the chat system prompt. Ordinary chat containing "don't" or "avoid" is not captured.
- **Chat summaries:** Click the **Remember chat** button in the sidebar header to summarize the current conversation; summaries are stored in `Agents/Huginn/MEMORY/chat-summaries.md` and recalled in future chat sessions.
- **Frontmatter handling:** `tag-assignment` uses Obsidian's `fileManager.processFrontMatter` to add tags. `title-suggestion` sets both the first `# ` heading and the `title` frontmatter property, creating frontmatter when necessary.
- **Target path normalization:** note paths entered without `.md` are automatically normalized to `.md` before the skill runs, including paths supplied by the chat dispatcher or recipe inputs.
- **Streaming chat abort:** The **Stop** button cancels in-flight Ollama `/api/chat` generation promptly.

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

Runs F01–F20, covering harness end-to-end, settings, ground truth, approval, recipe parsing, the five shipped skills, content gathering, write-class apply routines, `.md` path normalization, chat-state sanitization, chat skill-dispatch intent parsing, vault memory store, corrections wiring, user memory commands, chat summary memory, default recipe install, ground-truth primitive registry, legacy-format rejection, gatherer path normalization, and generic array-valued apply.

## Commands

- **Huginn: Open Huginn chat** — open a chat session about the active note.
- **Huginn: Run Huginn skill** — choose a recipe and target note, then approve or reject the model's suggestion.

## Vault layout

```text
Agents/
  Huginn/
    SKILLS/      # skill recipes
    MEMORY/      # corrections.md, user-memory.md, chat-summaries.md
```
