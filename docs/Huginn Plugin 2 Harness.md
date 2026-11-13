# Huginn — Plugin 2 Harness

**Status:** ported to Huginn 2026-11-07  
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

# Chat Render
template: numbered-list
field: todos
message: No actionable TODOs found.

# Validation
- primitive: frontmatter-not-contains
  path: /tag
  description: The proposed tag must not already be in the target note's frontmatter tags.
  params: {"key":"tags"}
```

### Field reference

| Section | Purpose |
|---------|---------|
| `metadata` | `name`, `version`, `modelTier` (`fast` \| `capable`), `riskClass` (`read-only` \| `suggest`) |
| `Trigger` | Human-readable dispatch condition |
| `Inputs` | List of `{ key, description, source }`. Source may be `query`, `path`, `vocabulary`, `constant`, `recipe-param`, or `content`. |
| `Instructions` | Prompt body with `{{key}}` placeholders substituted by the harness |
| `Output Contract` | JSON Schema object constraining the model's response |
| `Apply Method` | Name of a harness-registered apply routine. Ships with `noop` for read-only skills and generic write-class primitives: `append-frontmatter-array`, `set-first-heading`, `append-section`. |
| `Apply Params` | Optional JSON object consumed by generic apply routines (e.g., `{"key": "tags", "valuePath": "tag"}`). |
| `Chat Render` | Optional read-only rendering hint for the chat sidebar (`paragraph`, `numbered-list`, `bulleted-list`, `json`). |
| `Validation` | Ground-truth checks via registered primitives in `GroundTruthRegistry` |

## Harness flow

1. **Load** — `loadRecipes(source)` discovers `.md` recipes and parses them. Malformed recipes are reported but do not stop the others.
2. **Gather** — `InputGatherer` assembles inputs before the model sees anything (e.g., tag vocabulary from `MuninnApi.tagVocabulary()` via `MuninnApiInputGatherer`).
3. **Render** — `renderRecipe()` replaces `{{key}}` placeholders and appends the JSON output contract.
4. **Complete** — `LlmClient.complete(prompt)` returns raw text.
5. **Parse + schema validate** — output must be valid JSON and match the recipe's output schema. Violations are returned as typed `ValidationError`s.
6. **Ground-truth validate** — `VaultGroundTruthValidator` checks the output against the actual vault file using registered primitives (e.g., the proposed tag must not already be in the note's frontmatter `tags`). If a validation rule has a `description`, that description is surfaced in the error message shown in chat and console output.
7. **Diff** — `computeDiff(beforeState, afterState)` lists every change for human review.
8. **Approve** — `ObsidianApprovalGate` opens a modal showing the diff and target. The user clicks **Approve**, or **Reject** and optionally enters a reason. Rejection reasons are recorded in `corrections.md` as `refusal` entries. Recipes with `Apply Method: noop` (read-only skills) skip this step.
9. **Apply** — the routine named by `Apply Method` runs only after approval. Generic write-class primitives read their parameters from `# Apply Params`. The model cannot invoke routines directly. Read-only skills do not run an apply routine.
10. **Learn** — if a `CorrectionsMemory` is configured, schema errors, apply failures, and rejected suggestions are appended to `Agents/Huginn/MEMORY/corrections.md`. Recent corrections are injected into the dispatcher prompt and the recipe prompt so the model is less likely to repeat the mistake. Ground-truth failures are *not* written to corrections: a duplicate tag or existing file is vault state, not a model mistake.

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
| `src/harness/ground-truth.ts` | `GroundTruthRegistry`, `GroundTruthPrimitive`, `VaultGroundTruthValidator`, and fake-friendly `VaultReader` interface |
| `src/harness/obsidian-vault.ts` | `ObsidianVaultReader` backed by Obsidian's metadata cache |
| `src/harness/approval-gate.ts` | `ObsidianApprovalGate` that opens `ApprovalModal` |
| `src/ui/approval-modal.ts` | Modal UI for diff review and approve/reject |
| `src/chat/chat.ts` | `ChatController`: active-note context, system prompt, message history |
| `src/chat/dispatch.ts` | `ChatSkillDispatcher`: model maps user request to recipe + target path |
| `src/ui/chat-view.ts` | `HuginnChatView`: sidebar `ItemView` with bubble UI, input, and state |
| `src/ui/chat-state.ts` | Serializable chat state + sanitization for view persistence |
| `src/memory/store.ts` | `VaultMemoryStore`: append-only Markdown memory with recurrence tracking |
| `src/memory/kinds.ts` | `CorrectionsMemory`, `UserMemory`, `ChatSummaryMemory` wrappers |
| `src/memory/obsidian-storage.ts` | Obsidian-backed `MemoryStorage` implementation |
| `src/memory/commands.ts` | Parser for explicit user memory commands |
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
| `src/fixtures/f12.ts` | `VaultMemoryStore` + all three memory-kind wrappers |
| `src/fixtures/f13.ts` | Harness appends corrections on schema and apply failures, but not on ground-truth failures |
| `src/fixtures/f14.ts` | User memory command parsing and context framing |
| `src/fixtures/f15.ts` | Chat summary memory: append, summarize, and prompt injection |
| `src/fixtures/f16.ts` | Default recipe installer seeds `Agents/Huginn/SKILLS/` |
| `src/fixtures/f17.ts` | Ground-truth primitive registry accepts custom primitives |
| `src/fixtures/f18.ts` | Legacy `source`/`check` validation format is rejected |
| `src/fixtures/f19.ts` | `MuninnApiInputGatherer` normalizes missing `.md` suffix on note paths |
| `src/fixtures/f20.ts` | `append-frontmatter-array` accepts a single value or an array of values |
| `src/fixtures/f21.ts` | `note-summary` read-only recipe end-to-end |
| `src/fixtures/f22.ts` | `related-notes` read-only recipe end-to-end |
| `src/fixtures/f23.ts` | `task-extraction` uses the chat `verbosity` setting to tune output detail |
| `src/fixtures/f24.ts` | Built-in `note-contains-text` and `note-not-contains-text` ground-truth primitives |
| `src/fixtures/f25.ts` | Ground-truth rule descriptions reach the approval gate |
| `src/fixtures/f26.ts` | Infra failures (null LLM client) are reported as invalid but never recorded as corrections |
| `src/fixtures/f27.ts` | Scenario F: the abort reaches the stream loop — both the chat leg and the harness `complete()` leg |

## Memory system

Huginn stores machine-readable, append-only memory in `Agents/Huginn/MEMORY/`. Memory files are Markdown notes with YAML frontmatter entries, one per fence block. They are appended by the model or harness when it is corrected, refused, or explicitly told something by the user.

Three memory kinds share the same underlying `VaultMemoryStore`:

| Kind | File | Writer | Reader | Purpose |
|------|------|--------|--------|---------|
| **Corrections** | `corrections.md` | harness + chat UI | dispatcher + recipe renderer | Mistakes the model made and should not repeat |
| **User memory** | `user-memory.md` | chat UI | chat system prompt | Things the user explicitly told Huginn to remember |
| **Chat summary** | `chat-summaries.md` | chat UI "Remember chat" button | chat system prompt | Condensed history from long conversations |

Corrections are appended when: the model returns JSON that fails schema validation; an apply routine fails; or the user rejects a suggestion in the approval gate (including the optional rejection reason). Each entry records the recipe name, failure type, affected key/value, and a short note. Recent corrections are injected into the dispatcher system prompt and into the recipe prompt before the model runs.

Ground-truth failures (e.g., a proposed tag already exists, or a file to create already exists) are reported to the user as vault state, not as model mistakes, and are not written to corrections. In the chat path this means the assistant says "already present — no change needed" rather than retrying.

User memory is appended when the user types an explicit command in chat that begins with the keyword **Remember**, such as `Remember that I prefer qwen2.5:14b` or `Remember don't suggest tags that are already in the note`. Ordinary chat that contains "don't" or "avoid" but does not begin with "Remember" is not captured. These memories are parsed by `parseUserMemoryCommand` and read back into the chat system prompt as `Things the user has told you`.

Chat summaries are appended when the user clicks the **Remember chat** button in the sidebar header. The conversation (excluding system context) is sent to the LLM with a summarization prompt; the returned summary is stored in `chat-summaries.md` and read back into future chat system prompts as `Summaries of earlier conversations`.

## Wiring into Obsidian

The harness lives as a private `HuginnHarness` property on `HuginnPlugin` in `src/main.ts`. It discovers Muninn via `app.plugins.plugins['muninn'].getMuninnApi()`, polling until the API door is ready.

Three commands are registered:

- **"Huginn: Run Huginn skill"** opens a modal (`src/ui/recipe-modal.ts`) that lets the user pick a recipe and enter a target note path, then logs the `RecipeRunResult` to the console.
- **"Huginn: Open Huginn chat"** opens `HuginnChatView` in the right sidebar with a fresh `ChatController` backed by the same `OllamaChatClient` instance used by the harness. A message-square ribbon icon is also registered.
- **"Huginn: Install default Huginn skills"** seeds `Agents/Huginn/SKILLS/` with the bundled recipes on first run. **"Huginn: Reset default Huginn skills"** force-overwrites the same files to recover from stale or hand-edited recipes.

## Model warmup

`HuginnHarness.warmup()` sends a trivial `/api/chat` completion to pull the configured model back into memory. It is triggered automatically on initialization if the **Warm up chat model on load** setting is enabled.

## Chat interface

The chat path is intentionally minimal in this first cut. It is not a recipe; it uses the same `OllamaChatClient` but sends full message histories.

1. **Context strategy — active note only.** `ChatController.createSession()` reads `app.workspace.getActiveFile()` via `vault.cachedRead()` and injects the note path and body into a `system` message. The model is instructed to answer based on the active note but to fall back to general knowledge if the question is unrelated.
2. **Message history.** `ChatSession.messages` carries `system`, `user`, and `assistant` messages. `ChatController.sendMessage()` appends the user's message, calls `ChatLlmClient.chat(messages)`, and appends the assistant reply.
3. **UI.** `HuginnChatView` renders user/assistant bubbles, keeps the active note path in a header, provides a textarea where **Enter** sends and **Shift+Enter** inserts a newline, and shows a loading state while waiting for Ollama. A **Stop** button replaces **Send** during an in-flight request; because Ollama `/api/chat` responses are streamed, the abort is honored promptly. If the request has already opened the approval modal, **Stop** closes the modal and treats the suggestion as rejected. **Refresh context** re-reads the active note and updates the system context without clearing the conversation. **New chat** clears the transcript while keeping the active-note context.
4. **Persistence across sidebar close/reopen.** The view implements `getState`/`setState` so Obsidian restores the sidebar layout, but Huginn intentionally resets both the message history and the active note path on reload/workspace restore to avoid stale context. The active note is always re-read from Obsidian's current workspace. Clicking **Refresh context** updates the system context to the currently active note without clearing the conversation history.
5. **Skill dispatch.** When the user sends a message, `ChatSkillDispatcher` asks the model to pick a recipe and a target note path. If a valid recipe is selected, `HuginnHarness.run()` executes it and the result is rendered in the chat. If no recipe matches, the message falls back to a plain chat completion.
6. **Ground-truth reporting in chat.** If a dispatched skill fails ground-truth validation, the chat UI explains that the suggestion is already present in the vault and that no change is needed. It does not retry, because a duplicate tag or existing file is vault state rather than a model mistake.
7. **Read-only skills inline.** Recipes with `Apply Method: noop` skip the approval gate. Their structured output is rendered as a friendly inline message: `task-extraction` shows a numbered TODO list, `note-summary` shows a paragraph summary, and `related-notes` shows a bulleted list of vault paths. The chat passes the current `reportBackVerbosity` setting to `task-extraction` so verbose mode can request rationales.
8. **No RAG yet.** The chat does not inject vault-wide search results; skill dispatch uses the recipe's own input gatherer for vocabulary/related content.

## What is owed

- ✅ Real input gatherers that call `MuninnApi.searchText`, `searchSemantic`, `relatedChunks`, and `tagVocabulary` — `MuninnApiInputGatherer` in `src/harness/gather.ts`.
- ✅ Ground-truth validation against vault files and frontmatter — `VaultGroundTruthValidator` in `src/harness/ground-truth.ts`.
- ✅ A real `LlmClient` adapter — `OllamaChatClient` in `src/llm/client.ts`.
- ✅ First skill end-to-end — tag assignment recipe.
- ✅ Obsidian command to run a chosen recipe with a user-supplied target path.
- ✅ Human approval UI (`ApprovalModal` + `ObsidianApprovalGate`).
- ✅ Write-class apply routines for `suggest-tags`, `suggest-title`, and `suggest-links` — `createDefaultApplyRegistry` in `src/harness/apply.ts`.
- ✅ Chat modal using active-note context.
- ✅ Shared memory store (`VaultMemoryStore`) and three memory-kind wrappers in `src/memory/`.
- ✅ Corrections notebook wiring into dispatcher, recipe prompts, and failure/rejection paths.
- ✅ Explicit user memory commands parsed in chat and injected into the chat system prompt.
- ✅ Chat-summary "Remember chat content" button that summarizes the conversation and injects saved summaries into future chat prompts.
- ✅ Default recipe install/reset commands seeded from bundled recipes.
- ✅ Read-only `note-summary` and `related-notes` recipes for inline chat use.
- ✅ `task-extraction` verbosity input driven by the chat `reportBackVerbosity` setting.
- ✅ Ground-truth checks as fully API-style primitives with `description` surfaced in error messages.
- ✅ Additional built-in ground-truth primitives: `note-contains-text`, `note-not-contains-text`.
- Richer chat context (linked/related notes, full vault RAG) — deferred until active-note smoke test passes.
