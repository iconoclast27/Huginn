# Huginn — Tool Distancing and Recipe Expansion Design

**Status:** design for post-`0.1.0-test.18`  
**Scope:** where the boundary lies between adding more generic apply primitives and giving the model an explicit tool menu; how Huginn stays recipe-driven without turning into a function-calling agent.

## Current doctrine

Huginn’s design principle is: **the model judges; the harness acts**.

- The model fills a declarative Markdown form (the recipe).
- The harness validates, approves, and applies.
- The model never receives a tool menu or executes side effects directly.

This is intentionally different from function-calling agents where the LLM chooses which tool to invoke and with what arguments. Tool distancing is meant to:

1. Keep the model's output simple and inspectable (always JSON).
2. Prevent the model from chaining side effects without human review.
3. Make every mutation auditable through the approval gate.

## Pressure points

As recipes grow, we are hitting cases that look like tools:

- Ground-truth checks need vault access and could be framed as "check whether X exists."
- Apply routines mutate the vault and could be framed as "append tag to frontmatter."
- Input gatherers call Muninn and could be framed as "search vault for related notes."

If we keep adding named primitives and apply routines, the recipe language starts to resemble a tool registry. The question is whether that resemblance is a problem, and where to draw the line.

## Proposed boundary

| Concept | Who defines it | Who invokes it | Human review? | Examples |
|---------|---------------|----------------|---------------|----------|
| **Recipe** | User / bundled | Harness chooses by intent dispatch | Yes, via approval gate | `tag-assignment`, `note-summary` |
| **Apply primitive** | Huginn ships it | Harness invokes it after approval | No (invoked as part of approved recipe) | `append-frontmatter-array`, `set-first-heading` |
| **Ground-truth primitive** | Huginn ships it | Harness invokes it before approval | No (read-only check) | `frontmatter-not-contains`, `note-contains-text` |
| **Tool** | Model selects from menu | Model invokes it directly | Maybe, depending on tool | Not currently used in Huginn |

The key distinction: primitives are selected by the recipe's declarative metadata, not by the model at runtime. The model's only runtime decision is which recipe fits the user's request.

## When to add a new primitive vs. a new recipe

Add a new **apply primitive** when:

1. Multiple recipes would use it.
2. It is a generic vault mutation pattern (append, set, replace, delete in frontmatter/body).
3. It can be fully parameterized from `Apply Params` without recipe-specific code.

Add a new **ground-truth primitive** when:

1. Multiple recipes would use it.
2. It is a generic vault-state check (exists, contains, matches).
3. It does not require model judgment.

Add a new **recipe** when:

1. The task is user-facing and needs its own instructions, output contract, and validation.
2. The task needs a specific dispatch trigger.
3. The task combines primitives in a novel way.

Do **not** add a primitive when:

1. Only one recipe needs it and the logic is specific to that recipe's output shape.
2. The operation requires complex conditional branching that belongs in a recipe prompt.
3. It would require the model to output a primitive name (that crosses the line into tool calling).

## Model-selected tools: why we avoid them

Function calling would let the model say "call `append-frontmatter-array` with `{key: 'tags', value: 'ai'}`". The problems:

1. The model can chain calls without a clear stopping point.
2. Approval becomes either per-call (high friction) or post-hoc (unsafe).
3. Tool output feeds back into the model, creating loops that are hard to debug.
4. Recipes stop being self-contained Markdown documents.

Huginn's recipe model keeps the LLM in a single-shot JSON mode. The harness owns sequencing.

## Recipe-driven expansion model

Instead of giving the model tools, we expand what recipes can declare. This is the current trajectory:

- More input sources (`query`, `path`, `vocabulary`, `content`, `recipe-param`, `constant`).
- More apply primitives (`append-frontmatter-array`, `set-first-heading`, `append-section`, and future ones).
- More ground-truth primitives (`file-exists`, `frontmatter-contains`, `note-contains-text`, etc.).
- More `riskClass` behavior (`suggest`, `batch-suggest`, `auto-apply`).
- More chat-render templates (`paragraph`, `numbered-list`, `bulleted-list`, `json`, and future ones).

This is not tool calling. It is a richer recipe vocabulary that the harness interprets.

## Future primitives that are safely on the recipe side

### Apply primitives

- `replace-frontmatter-value` — set a scalar frontmatter key, replacing any existing value.
- `remove-frontmatter-array-items` — remove one or more items from a frontmatter array.
- `prepend-section` — insert a section at the top of the body.
- `replace-section` — find a heading and replace its content.
- `rename-file` — rename the target note file (high risk; probably stays `suggest`).

### Ground-truth primitives

- `muninn:related-note-exists` — check whether Muninn finds a semantically related note.
- `muninn:chunk-count` — check whether a note has at least N chunks.
- `note-has-heading` — check whether a heading exists in the body.
- `note-links-to` — check whether a wikilink already exists.

The `muninn:` prefix makes the data source explicit and keeps primitives namespaced.

## When we might reconsider tool calling

Tool calling could be appropriate for a future **agent mode** that the user explicitly opts into, with strict guardrails:

1. The user enables an **Agent mode** setting.
2. The model can call a small, fixed set of read-only tools (search, read note, summarize).
3. Write tools remain unavailable; the model still returns a recipe form for mutations.
4. Every tool call is logged and shown in the chat.

Even then, Huginn's default mode should remain recipe-driven.

## Open questions

1. Should the model ever be allowed to request an additional input gatherer dynamically? (This is close to tool calling.)
2. Should recipes be able to declare a sequence of apply primitives, or only one? (Currently one.)
3. How do we document the boundary clearly so third-party recipe authors do not accidentally design recipes that need custom TypeScript?
4. Should there be a `primitive:` prefix convention for all primitive names to avoid collisions with recipe names?
5. At what point does a "recipe vocabulary" become indistinguishable from a "tool menu" in practice?

## Recommended next step

Keep this as a design doc. The next concrete work in this area should be adding one or two new generic apply primitives (`replace-frontmatter-value`, `prepend-section`) and one Muninn-backed ground-truth primitive, each with fixtures. Do not introduce model-selected tool calling until the recipe-driven model is proven by smoke tests.
