# Huginn Plugin 2 Definition v0.1

## Purpose

Huginn is Plugin 2 of Vault Overseer: the AI assistant for Obsidian. It owns the chat client, skill harness, recipe loader, and approval gate. It consumes vault state through Muninn's frozen `MuninnApi` door.

## Responsibilities

- Configure and call the LLM chat endpoint (`/api/chat`).
- Load Markdown skill recipes from `Agents/Huginn/SKILLS/`.
- Render recipe prompts and gather inputs from Muninn's vault index.
- Validate model output against recipe JSON schemas.
- Compute diffs and route apply routines after approval.
- Store and recall corrections, user memory, and chat summaries in `Agents/Huginn/MEMORY/`.
- Provide the user-facing skill/chat UI.

## Dependencies

- Muninn (Plugin 1) must be installed and enabled.
- A local or remote Ollama instance with a chat-capable model.

## Vault-resident layout

```text
Agents/
  Huginn/
    SKILLS/      # skill recipes
    MEMORY/      # corrections.md, user-memory.md, chat-summaries.md
```

## Public surface

Huginn does not expose a stable public API in v0.1.0-test.x. The only integration point is its dependency on Muninn's `getMuninnApi()` method.

## Build

```bash
npm install
npm run typecheck
npm run build
```

The production bundle is `main.js`.

## Release artifacts

GitHub releases attach:
- `main.js`
- `manifest.json`
- `versions.json`
