# Huginn

AI assistant plugin for Obsidian — chat and skills. Huginn (Plugin 2) consumes the frozen Muninn API door for vault state and provides the LLM chat client, skill harness, recipe loader, and approval gate.

## Current status

Plugin skeleton and generic harness modules ported from Muninn. Requires Muninn (Plugin 1) to be installed and enabled.

## Build

```bash
npm install
npm run typecheck
npm run build
```

The production bundle is written to `main.js`.

## Fixtures

```bash
npx tsx src/fixtures/f01.ts
```

## Vault layout

Skill recipes live in `Agents/Huginn/SKILLS/` inside the vault.
