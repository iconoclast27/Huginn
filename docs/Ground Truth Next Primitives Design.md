# Huginn — Ground Truth Next Primitives Design

**Status:** design for post-`0.1.0-test.18`  
**Scope:** which new ground-truth primitives should be added to the registry, how they fit the existing interface, and which should wait for Muninn API changes.

## Current primitives

As of `0.1.0-test.18`:

- `file-exists`
- `file-not-exists`
- `frontmatter-contains`
- `frontmatter-not-contains`
- `note-contains-text`
- `note-not-contains-text`

All primitives implement `GroundTruthPrimitive.validate(ctx, params)` and return `ValidationError[]`.

## Candidates for near-term addition

These can be implemented without Muninn API changes or with only small extensions.

### `note-has-heading`

Checks whether the target note body contains a heading at a specific level matching a string or regex.

```yaml
# Validation
- primitive: note-has-heading
  path: /title
  description: The proposed title must already match an H1 heading in the note.
  params:
    level: 1
    normalize: true
```

Useful for `title-suggestion` to avoid proposing a title that is already the first heading.

### `note-links-to`

Checks whether the target note body already contains a wikilink to a given path.

```yaml
# Validation
- primitive: note-links-to
  path: /links
  description: The proposed link must already exist in the note body.
  params:
    stripMd: true
```

Useful for `link-suggestion` to avoid duplicate wikilinks.

### `frontmatter-has-key`

Checks whether the target note frontmatter has a specific key, regardless of value.

```yaml
# Validation
- primitive: frontmatter-has-key
  path: /
  description: The target note must already have a title frontmatter key.
  params:
    key: title
```

### `frontmatter-key-matches`

Checks whether a frontmatter key matches a specific value or one of a set.

```yaml
# Validation
- primitive: frontmatter-key-matches
  path: /status
  description: The proposed status must match allowed values.
  params:
    key: status
    values: [todo, in-progress, done]
```

### `path-is-under-folder`

Checks whether a vault path is under a given folder prefix.

```yaml
# Validation
- primitive: path-is-under-folder
  path: /targetPath
  description: The target path must be under the daily notes folder.
  params:
    folder: notes/daily
```

## Candidates requiring Muninn API changes

These should be deferred until Muninn exposes the needed index data.

### `muninn:related-note-exists`

Checks whether Muninn can find a note related to the target note with a given name/path.

```yaml
# Validation
- primitive: muninn:related-note-exists
  path: /links
  description: Every proposed link must exist in the Muninn index.
  params:
    minSimilarity: 0.7
```

Requires: Muninn `searchSemantic` or `relatedChunks` to return a path list.

### `muninn:chunk-count`

Checks whether the target note has been indexed with at least N chunks.

```yaml
# Validation
- primitive: muninn:chunk-count
  path: /
  description: The target note must be indexed before suggesting links.
  params:
    min: 3
```

Requires: Muninn to expose chunk counts per file.

### `muninn:tag-exists`

Checks whether a proposed tag string exists in the Muninn tag vocabulary.

```yaml
# Validation
- primitive: muninn:tag-exists
  path: /tag
  description: The proposed tag must already exist in the Muninn tag vocabulary.
```

Requires: Muninn `tagVocabulary()` already returns this, but a primitive would wrap the API call cleanly.

## Candidates requiring post-apply state

These compare the proposed output against the state *after* a previous apply step rather than the current vault state.

### `frontmatter-will-contain`

Useful when a recipe has multiple apply primitives or when validation needs to check the cumulative result.

This complicates the harness flow because ground-truth validation currently runs before apply. It should be deferred until we have a clear need.

## Primitive naming convention

To keep the registry organized, adopt these prefixes:

| Prefix | Meaning | Examples |
|--------|---------|----------|
| (none) | Vault file/frontmatter/body check | `file-exists`, `frontmatter-contains`, `note-has-heading` |
| `muninn:` | Muninn index-backed check | `muninn:related-note-exists`, `muninn:tag-exists` |
| `post-apply:` | Check against state after apply | `post-apply:frontmatter-will-contain` |

The parser should accept colons in primitive names. The registry dispatch uses the full string.

## Interface changes

The existing `GroundTruthPrimitive` interface is:

```typescript
export interface GroundTruthPrimitive {
    name: string;
    validate(ctx: GroundTruthContext, params: Record<string, unknown>): Promise<ValidationError[]>;
}
```

No interface change is needed for the near-term candidates. Muninn-backed primitives will need `ctx` to include an optional `MuninnApi` reference, which can be added as an optional field on `GroundTruthContext`.

## Error message conventions

To keep ground-truth failures readable in chat, standardize message prefixes:

| Primitive family | Success | Failure |
|------------------|---------|---------|
| `file-*` | (empty) | `file does not exist: ...` / `file already exists: ...` |
| `frontmatter-*` | (empty) | `value already present in frontmatter key '...'` |
| `note-*` | (empty) | `text not found in note body: ...` |
| `muninn:*` | (empty) | `Muninn index does not contain ...` |

If a rule has a `description`, the harness already prepends it: `${description}: ${primitiveMessage}`.

## Registry registration order

The registry in `createDefaultGroundTruthRegistry()` is a flat list. As it grows, group registrations by family and add a brief comment:

```typescript
// File-level primitives
.register(fileExistsPrimitive)
.register(fileNotExistsPrimitive)
// Frontmatter primitives
.register(frontmatterContainsPrimitive)
.register(frontmatterNotContainsPrimitive)
// Note body primitives
.register(noteContainsTextPrimitive)
.register(noteNotContainsTextPrimitive)
.register(noteHasHeadingPrimitive)
// Muninn-backed primitives
.register(muninnTagExistsPrimitive)
```

## Testing strategy

Every new primitive gets:

1. A dedicated fixture in `src/fixtures/fNN.ts`.
2. At least one success case, one failure case, and one missing-input case.
3. A description-surfacing case if the primitive is likely to be used in chat.
4. An update to `docs/Huginn Plugin 2 Harness.md` source-module table.
5. A note in `docs/Ground Truth Refactor Design.md` if the primitive introduces a new family.

## Open questions

1. Should primitives receive the rendered prompt or just the output + inputs? (Could help `note-has-heading` know which heading level the recipe expects.)
2. Should primitives be allowed to declare their own required params and fail fast if missing?
3. Should there be a primitive composition mechanism (e.g., `all-of` / `any-of`) so recipes can combine primitives without adding new ones?
4. How do Muninn-backed primitives handle the case where Muninn is still indexing?
5. Should `note-links-to` normalize `[[path]]` vs. `[[path|alias]]` vs. `[text](path)`?

## Recommended next step

Implement `note-has-heading` first. It is useful for the existing `title-suggestion` recipe, requires no new dependencies, and exercises body parsing with heading levels. Follow with `note-links-to` to close the loop on the current three write-class recipes.
