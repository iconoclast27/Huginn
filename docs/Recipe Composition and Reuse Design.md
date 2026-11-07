# Huginn — Recipe Composition and Reuse Design

**Status:** design for post-`0.1.0-test.18`  
**Scope:** how recipes can share fragments, how the recipe catalog is discovered and indexed, and how recipe versions are migrated in user vaults.

## Current state

A recipe is a single Markdown note with YAML frontmatter and H1 sections. Recipes live in `Agents/Huginn/SKILLS/`. `loadRecipes()` scans the folder, `parseRecipe()` parses each file, and malformed recipes are reported but do not stop the others.

Every recipe currently duplicates:

- Output-contract JSON shape for common fields (`confidence`, `reason`, arrays of strings).
- Instruction boilerplate ("Do not return markdown, commentary, or code fences. Return raw JSON only.")
- Validation rules for common checks.
- Apply params for generic primitives.

There is no shared library, no versioning, and no index. When Huginn updates a bundled recipe, existing user vaults keep the stale copy unless the user runs **Reset default Huginn skills**.

## Goals

1. Reduce duplication across recipes without breaking the single-file recipe model.
2. Make bundled recipe updates discoverable and easy to apply.
3. Allow users to write new recipes by referencing reusable fragments.
4. Keep recipes human-readable as Markdown notes.
5. Avoid making the recipe loader depend on a database or hidden state.

## Option A: recipe fragments (recommended)

Introduce a new vault folder: `Agents/Huginn/SKILL_FRAGMENTS/`.

A fragment is a Markdown note with H1 sections but no frontmatter metadata. It is not a runnable recipe on its own. Recipes include fragments by name in a new `# Fragments` section:

```markdown
# Fragments
- common-json-instructions
- common-confidence-schema
```

Fragment resolution:

- The loader looks in `Agents/Huginn/SKILL_FRAGMENTS/` for `<name>.md`.
- If found, the fragment's sections are merged into the recipe before parsing.
- If a fragment section conflicts with an explicit recipe section, the recipe wins.
- Missing fragments are reported as load errors but do not stop other recipes.

### Example fragment: `common-json-instructions.md`

```markdown
# Instructions (append)
Do not return markdown, commentary, or code fences. Return raw JSON only.
```

The `(append)` marker means the fragment text is appended to the recipe's own `# Instructions` section rather than replacing it.

### Example fragment: `common-confidence-schema.md`

```markdown
# Output Contract (merge)
{
  "confidence": { "type": "number", "minimum": 0, "maximum": 1 }
}
```

The `(merge)` marker means the fragment's JSON object is deep-merged into the recipe's output contract. (This requires the schema parser to support merge markers, which is a nontrivial extension.)

### Pros and cons

- Pros: keeps recipes as files; users can inspect fragments; bundled updates to fragments apply to all recipes that use them.
- Cons: merge semantics for sections like output contract are tricky; requires fragment dependency tracking in the file watcher.

## Option B: built-in named templates

Instead of user-visible fragments, define a small set of built-in templates in TypeScript:

- `json-only-instructions`
- `confidence-property`
- `frontmatter-tag-validation`

Recipes reference them by name:

```yaml
---
name: my-recipe
version: 0.1.0
modelTier: fast
riskClass: suggest
templates:
  - json-only-instructions
  - confidence-property
---
```

The parser inserts the template content at parse time.

### Pros and cons

- Pros: simpler implementation; no new vault folder; no merge semantics in user space.
- Cons: less extensible by users; Huginn must ship every reusable snippet; goes against the goal of minimizing hard-wiring.

## Recommended hybrid

Use **Option A for user-defined fragments** and keep **Option B minimal** (only for truly universal boilerplate like the JSON-only footer). This lets users compose recipes without waiting for Huginn releases, while Huginn still ships a small core library.

## Recipe catalog index

Add an optional `index.md` in `Agents/Huginn/SKILLS/`:

```yaml
---
name: Huginn Skill Index
version: 0.1.0
---

# Recipes
- tag-assignment.md
- title-suggestion.md
- link-suggestion.md
- task-extraction.md
- note-summary.md
- related-notes.md
```

When `index.md` exists, the loader uses it as the authoritative recipe list instead of scanning the folder. This allows:

- Ordering recipes for display in chooser/dispatcher prompts.
- Excluding draft recipes without deleting them.
- Pinning a specific bundled version.

If `index.md` is missing, the loader falls back to scanning the folder (current behavior).

## Recipe versioning and migration

### Bundled recipe fingerprinting

Each bundled recipe gets an implicit `bundledVersion` derived from the Huginn plugin version that shipped it. When Huginn loads recipes from the vault, it compares each bundled recipe's content to the bundled copy:

- If identical → mark `state: clean`.
- If different but recipe name/version match → mark `state: modified`.
- If missing → mark `state: missing`.

This information is surfaced in a new command: **Huginn: Check default skill status**. It shows a table:

| Recipe | State | Action |
|--------|-------|--------|
| tag-assignment.md | modified | Reset |
| note-summary.md | missing | Install |
| related-notes.md | clean | — |

### Migration prompts

When Huginn detects a bundled recipe is `modified` or `missing`, it can show a notice:

> "Huginn default skills are out of sync. Run **Reset default Huginn skills** to restore the bundled versions."

This notice is best-effort and not shown more than once per session to avoid nagging.

### Per-recipe changelog

Each bundled recipe's top comment or frontmatter can include a `bundledSince` field:

```yaml
---
name: task-extraction
version: 0.1.0
bundledSince: 0.1.0-test.18
---
```

This helps users understand when a recipe first appeared and whether their version is current.

## Recipe chooser ordering

The `RecipeChooserModal` and `ChatSkillDispatcher` should order recipes by:

1. Explicit order in `index.md`, if present.
2. Alphabetically by name otherwise.
3. `riskClass` grouping (read-only first, then suggest) as a secondary sort.

## Recipe validation at load time

Extend `loadRecipes()` to report richer errors:

- Missing required sections.
- Unknown `source` values.
- Unknown `riskClass` values.
- Fragments that fail to resolve.
- Output contract that is not valid JSON Schema subset.
- Validation rules that reference unknown primitives.

Malformed recipes are still skipped so the rest of the catalog loads.

## File watcher updates

The existing watcher reloads recipes on `create/modify/delete/rename` in `Agents/Huginn/SKILLS/`. Extend it to also watch `Agents/Huginn/SKILL_FRAGMENTS/` so fragment changes trigger a reload.

## Backward compatibility

- Recipes without `# Fragments` or `templates` keep working exactly as today.
- The folder scan fallback means existing vaults do not need an `index.md`.
- No change to the `Recipe` type shape beyond optional new fields.

## Open questions

1. Should fragments be scoped to `Agents/Huginn/SKILL_FRAGMENTS/` or allowed anywhere in `Agents/Huginn/`?
2. How do we handle fragment loops (A includes B includes A)?
3. Should the output-contract merge support JSON Schema `$ref` instead of ad-hoc merging?
4. Should users be able to override bundled fragments by placing a same-named file in `SKILL_FRAGMENTS/`?
5. Should the loader cache parsed recipes, or is re-parsing on every dispatch cheap enough?
6. How do we represent the recipe index in the dispatcher prompt when `index.md` is present?

## Recommended next step

Keep this as a design doc. The lowest-risk first implementation is the `index.md` recipe list, because it is purely additive and optional. Fragment composition should follow in a separate design + fixture pass after the index is proven.
