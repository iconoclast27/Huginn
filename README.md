# Huginn

AI assistant plugin for Obsidian — chat and skills. Huginn (Plugin 2) consumes the frozen Muninn API door for vault state and provides the LLM chat client, skill harness, recipe loader, and approval gate.

## Current status

Latest test release: `0.1.0-test.8`. Huginn now provides a vault-aware chat interface plus a skill harness with human approval.

- **Chat:** `Huginn: Open Huginn chat` opens a modal that sends the active note body to the configured Ollama chat model as context.
- **Skills:** `Huginn: Run Huginn skill` discovers `.md` recipes in `Agents/Huginn/SKILLS/`, renders them, validates the model's JSON output, shows a diff approval modal, and applies write-class suggestions for tag, title, and link recipes.
- **Target path normalization:** note paths entered without `.md` are automatically normalized to `.md` before the skill runs.

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

Runs F01–F09, covering harness end-to-end, settings, ground truth, approval, recipe parsing, the five shipped skills, content gathering, write-class apply routines, and `.md` path normalization.

## Commands

- **Huginn: Open Huginn chat** — open a chat session about the active note.
- **Huginn: Run Huginn skill** — choose a recipe and target note, then approve or reject the model's suggestion.

## Vault layout

Skill recipes live in `Agents/Huginn/SKILLS/` inside the vault.
