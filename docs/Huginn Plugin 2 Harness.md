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
| `Apply Method` | Name of a harness-registered apply routine. Ships with `noop` and read-only `suggest-tags`. |
| `Validation` | Ground-truth checks against vault state via `VaultGroundTruthValidator` (`vault-file` source) |

## Harness flow

1. **Load** — `loadRecipes(source)` discovers `.md` recipes and parses them. Malformed recipes are reported but do not stop the others.
2. **Gather** — `InputGatherer` assembles inputs before the model sees anything (e.g., tag vocabulary from `MuninnApi.tagVocabulary()` via `MuninnApiInputGatherer`).
3. **Render** — `renderRecipe()` replaces `{{key}}` placeholders and appends the JSON output contract.
4. **Complete** — `LlmClient.complete(prompt)` returns raw text.
5. **Parse + schema validate** — output must be valid JSON and match the recipe's output schema. Violations are returned as typed `ValidationError`s.
6. **Ground-truth validate** — `VaultGroundTruthValidator` checks the output against the actual vault file (e.g., the proposed tag must not already be in the note's frontmatter `tags`).
7. **Diff** — `computeDiff(beforeState, afterState)` lists every change for human review.
8. **Approve** — `ApprovalGate` returns `true`, `false`, or `null`. Write-class recipes are deferred; the skeleton defaults to reject.
9. **Apply** — the routine named by `Apply Method` runs only after approval. The model cannot invoke routines directly.

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
| `src/llm/client.ts` | `LlmClient` interface + `OllamaChatClient` with response-body logging |
| `src/harness/harness.ts` | `HuginnHarness` orchestrator |
| `src/harness/gather.ts` | `MuninnApiInputGatherer` |
| `src/harness/ground-truth.ts` | `VaultGroundTruthValidator` + fake-friendly `VaultReader` interface |
| `src/harness/obsidian-vault.ts` | `ObsidianVaultReader` backed by Obsidian's metadata cache |
| `src/fixtures/f01.ts` | Fixture policing the harness end-to-end with a fake LLM |
| `src/fixtures/f02.ts` | Fixture policing Huginn settings sanitization |
| `src/fixtures/f03.ts` | Fixture policing ground-truth validation against a fake vault |

## Wiring into Obsidian

The harness lives as a private `HuginnHarness` property on `HuginnPlugin` in `src/main.ts`. It discovers Muninn via `app.plugins.plugins['muninn'].getMuninnApi()`, polling until the API door is ready. The command **"Huginn: Run Huginn skill"** opens a modal (`src/ui/recipe-modal.ts`) that lets the user pick a recipe and enter a target note path, then logs the `RecipeRunResult` to the console.

## Model warmup

`HuginnHarness.warmup()` sends a trivial `/api/chat` completion to pull the configured model back into memory. It is triggered automatically on initialization if the **Warm up chat model on load** setting is enabled.

## What is owed

- ✅ Real input gatherers that call `MuninnApi.searchText`, `searchSemantic`, `relatedChunks`, and `tagVocabulary` — `MuninnApiInputGatherer` in `src/harness/gather.ts`.
- ✅ Ground-truth validation against vault files and frontmatter — `VaultGroundTruthValidator` in `src/harness/ground-truth.ts`.
- ✅ A real `LlmClient` adapter — `OllamaChatClient` in `src/llm/client.ts`.
- ✅ First skill end-to-end — tag assignment recipe.
- ✅ Obsidian command to run a chosen recipe with a user-supplied target path.
- Human approval UI.
