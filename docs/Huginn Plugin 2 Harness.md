# Huginn — Plugin 2 Harness

**Status:** ported to Huginn 2026-11-06  
**Scope:** recipe loader, renderer, JSON-schema validator, diff gate, apply registry, LLM client abstraction, harness orchestrator. Consumes the frozen Plugin 1 API via `MuninnApi`.

This harness enforces the project doctrine: **the model judges; the harness acts**. No LLM receives a tool menu. Recipes are declarative Markdown forms with a strict JSON output contract; the harness validates the model's output against schema and (eventually) vault truth before any apply routine runs.

## Recipe format

A recipe is a Markdown note with YAML frontmatter for metadata and H1 sections for the remaining fields.

```markdown
---
name: tag-test-skill
version: 0.1.0
modelTier: fast
riskClass: read-only
---

# Trigger
One-line description of when to run this recipe.

# Inputs
- key: targetPath
  description: Path of the note to examine
  source: recipe-param
- key: candidateTags
  description: Available tag vocabulary
  source: constant

# Instructions
Given note {{targetPath}} and tags: {{candidateTags}}, choose the best tag.
Return JSON only.

# Output Contract
{
  "type": "object",
  "required": ["tag", "confidence"],
  "properties": {
    "tag": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Validation
- path: /tag
  source: vault-file
  check: not-in-frontmatter
  params: {"key":"tags"}
```

### Field reference

| Section | Purpose |
|---------|---------|
| `metadata` | `name`, `version`, `modelTier` (`fast` \| `capable`), `riskClass` (`read-only` \| `suggest`) |
| `Trigger` | Human-readable dispatch condition |
| `Inputs` | List of `{ key, description, source }`. Source may be `query`, `path`, `vocabulary`, `constant`, or `recipe-param`. |
| `Instructions` | Prompt body with `{{key}}` placeholders substituted by the harness |
| `Output Contract` | JSON Schema object constraining the model's response |
| `Apply Method` | Name of a harness-registered apply routine. Ships with `noop` for read-only skills and `suggest-tags`, `suggest-title`, `suggest-links` for write-class skills. |
| `Validation` | Ground-truth checks against vault state via `VaultGroundTruthValidator` (`vault-file` source) |

## Harness flow

1. **Load** — `loadRecipes(source)` discovers `.md` recipes and parses them. Malformed recipes are reported but do not stop the others.
2. **Gather** — `InputGatherer` assembles inputs before the model sees anything (e.g., tag vocabulary from `MuninnApi.tagVocabulary()` via `MuninnApiInputGatherer`).
3. **Render** — `renderRecipe()` replaces `{{key}}` placeholders and appends the JSON output contract.
4. **Complete** — `LlmClient.complete(prompt)` returns raw text.
5. **Parse + schema validate** — output must be valid JSON and match the recipe's output schema. Violations are returned as typed `ValidationError`s.
6. **Ground-truth validate** — `VaultGroundTruthValidator` checks the output against the actual vault file (e.g., the proposed tag must not already be in the note's frontmatter `tags`).
7. **Diff** — `computeDiff(beforeState, afterState)` lists every change for human review.
8. **Approve** — `ObsidianApprovalGate` opens a modal showing the diff and target; the user clicks **Approve** or **Reject**. Recipes with `Apply Method: noop` (read-only skills) skip this step.
9. **Apply** — the routine named by `Apply Method` runs only after approval. The model cannot invoke routines directly. Read-only skills do not run an apply routine.

## Source modules

| Module | Responsibility |
|--------|----------------|
| `src/recipes/types.ts` | Recipe shapes, JSON schema subset, run result types |
| `src/recipes/parser.ts` | Parse Markdown recipe into `Recipe` |
| `src/recipes/loader.ts` | Source-agnostic loader + `findRecipe` |
| `src/recipes/obsidian-source.ts` | `RecipeSource` for Obsidian vault folders |
| `src/recipes/renderer.ts` | Substitute inputs into instructions and output schema |
| `src/harness/validator.ts` | Minimal JSON-schema validator |
| `src/harness/diff.ts` | Value diff gate + text render |
| `src/harness/apply.ts` | Apply-routine registry |
| `src/llm/client.ts` | `LlmClient` / `ChatLlmClient` interfaces + `OllamaChatClient` with response-body logging |
| `src/harness/harness.ts` | `HuginnHarness` orchestrator |
| `src/harness/gather.ts` | `MuninnApiInputGatherer` |
| `src/harness/ground-truth.ts` | `VaultGroundTruthValidator` + fake-friendly `VaultReader` interface |
| `src/harness/obsidian-vault.ts` | `ObsidianVaultReader` backed by Obsidian's metadata cache |
| `src/harness/approval-gate.ts` | `ObsidianApprovalGate` that opens `ApprovalModal` |
| `src/ui/approval-modal.ts` | Modal UI for diff review and approve/reject |
| `src/chat/chat.ts` | `ChatController`: active-note context, system prompt, message history |
| `src/chat/dispatch.ts` | `ChatSkillDispatcher`: model maps user request to recipe + target path |
| `src/ui/chat-view.ts` | `HuginnChatView`: sidebar `ItemView` with bubble UI, input, and state |
| `src/ui/chat-state.ts` | Serializable chat state + sanitization for view persistence |
| `src/fixtures/f01.ts` | Fixture policing the harness end-to-end with a fake LLM |
| `src/fixtures/f02.ts` | Fixture policing Huginn settings sanitization |
| `src/fixtures/f03.ts` | Fixture policing ground-truth validation against a fake vault |
| `src/fixtures/f04.ts` | Fixture policing the approval request shape |
| `src/fixtures/f05.ts` | Recipe catalog parses |
| `src/fixtures/f06.ts` | New skill end-to-end with fake LLM |
| `src/fixtures/f07.ts` | `MuninnApiInputGatherer` content source end-to-end |
| `src/fixtures/f08.ts` | Write-class suggest routines mutate the note body |
| `src/fixtures/f09.ts` | Target path `.md` normalization |
| `src/fixtures/f10.ts` | Chat-state sanitization and round-trip |
| `src/fixtures/f11.ts` | `ChatSkillDispatcher` intent parsing |

## Wiring into Obsidian

The harness lives as a private `HuginnHarness` property on `HuginnPlugin` in `src/main.ts`. It discovers Muninn via `app.plugins.plugins['muninn'].getMuninnApi()`, polling until the API door is ready.

Two commands are registered:

- **"Huginn: Run Huginn skill"** opens a modal (`src/ui/recipe-modal.ts`) that lets the user pick a recipe and enter a target note path, then logs the `RecipeRunResult` to the console.
- **"Huginn: Open Huginn chat"** opens `HuginnChatView` in the right sidebar with a fresh `ChatController` backed by the same `OllamaChatClient` instance used by the harness. A message-square ribbon icon is also registered.

## Model warmup

`HuginnHarness.warmup()` sends a trivial `/api/chat` completion to pull the configured model back into memory. It is triggered automatically on initialization if the **Warm up chat model on load** setting is enabled.

## Chat interface

The chat path is intentionally minimal in this first cut. It is not a recipe; it uses the same `OllamaChatClient` but sends full message histories.

1. **Context strategy — active note only.** `ChatController.createSession()` reads `app.workspace.getActiveFile()` via `vault.cachedRead()` and injects the note path and body into a `system` message. The model is instructed to answer based on the active note but to fall back to general knowledge if the question is unrelated.
2. **Message history.** `ChatSession.messages` carries `system`, `user`, and `assistant` messages. `ChatController.sendMessage()` appends the user's message, calls `ChatLlmClient.chat(messages)`, and appends the assistant reply.
3. **UI.** `HuginnChatView` renders user/assistant bubbles, keeps the active note path in a header, provides a textarea where **Enter** sends and **Shift+Enter** inserts a newline, and shows a loading state while waiting for Ollama. A **Refresh context** button re-reads the active note and starts a new session.
4. **Persistence across sidebar close/reopen.** The view implements `getState`/`setState` so Obsidian restores the sidebar layout, but Huginn intentionally resets both the message history and the active note path on reload/workspace restore to avoid stale context. The active note is always re-read from Obsidian's current workspace. Clicking **Refresh context** updates the system context to the currently active note without clearing the conversation history.
5. **Skill dispatch.** When the user sends a message, `ChatSkillDispatcher` asks the model to pick a recipe and a target note path. If a valid recipe is selected, `HuginnHarness.run()` executes it and the result is rendered in the chat. If no recipe matches, the message falls back to a plain chat completion.
6. **Read-only skills inline.** Recipes with `Apply Method: noop` skip the approval gate. Their structured output is rendered as a friendly inline message: `task-extraction` shows a numbered TODO list generated from the note.
7. **No RAG yet.** The chat does not inject vault-wide search results; skill dispatch uses the recipe's own input gatherer for vocabulary/related content.

## What is owed

- ✅ Real input gatherers that call `MuninnApi.searchText`, `searchSemantic`, `relatedChunks`, and `tagVocabulary` — `MuninnApiInputGatherer` in `src/harness/gather.ts`.
- ✅ Ground-truth validation against vault files and frontmatter — `VaultGroundTruthValidator` in `src/harness/ground-truth.ts`.
- ✅ A real `LlmClient` adapter — `OllamaChatClient` in `src/llm/client.ts`.
- ✅ First skill end-to-end — tag assignment recipe.
- ✅ Obsidian command to run a chosen recipe with a user-supplied target path.
- ✅ Human approval UI (`ApprovalModal` + `ObsidianApprovalGate`).
- ✅ Write-class apply routines for `suggest-tags`, `suggest-title`, and `suggest-links` — `createDefaultApplyRegistry` in `src/harness/apply.ts`.
- ✅ Chat modal using active-note context.
- Richer chat context (linked/related notes, full vault RAG) — deferred until active-note smoke test passes.
