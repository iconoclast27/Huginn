# Huginn — Ground-Truth Checks as API-Style Primitives

## Status

Design draft for review. Not yet implemented. The goal is to replace the closed `switch` statement in `VaultGroundTruthValidator` with a registry of small, composable, recipe-addressable primitives, so new checks can be added by registering a function rather than editing a central validator.

## Current state

`src/harness/ground-truth.ts` hard-codes four checks driven by YAML in recipes:

| `check` value | behavior |
|---------------|----------|
| `exists` | `vault.getFileFrontmatter(filePath)` is non-null |
| `not-exists` | `vault.getFileFrontmatter(filePath)` is null |
| `matches-frontmatter` | output value equals an entry in `frontmatter[key]` |
| `not-in-frontmatter` | output value is absent from `frontmatter[key]` |

Recipes declare these in `# Validation`:

```markdown
# Validation
- path: /tag
  source: vault-file
  check: not-in-frontmatter
  params: {"key":"tags"}
```

This is already declarative, but the set of checks is closed. A user writing a new skill cannot introduce a new ground-truth primitive without editing TypeScript.

## Proposed design

### 1. Primitive interface

A primitive is a pure function with a small, stable context:

```typescript
export interface GroundTruthContext {
  recipe: LoadedRecipe;
  output: unknown;
  inputs: GatheredInput[];
  vault: VaultReader;
}

export interface GroundTruthPrimitive {
  name: string;
  validate(ctx: GroundTruthContext, params: Record<string, unknown>): ValidationError[];
}
```

Primitives return an array of errors. Empty array means the check passed.

### 2. Built-in primitives

The existing four checks become built-ins:

```typescript
const fileExistsPrimitive: GroundTruthPrimitive = {
  name: 'file-exists',
  validate({ vault, output }, params) {
    const filePath = String(output);
    return vault.getFileFrontmatter(filePath) !== null ? []
      : [{ path: String(params.path ?? '/'), message: `file does not exist: ${filePath}` }];
  },
};

const fileNotExistsPrimitive: GroundTruthPrimitive = {
  name: 'file-not-exists',
  validate({ vault, output }, params) {
    const filePath = String(output);
    return vault.getFileFrontmatter(filePath) === null ? []
      : [{ path: String(params.path ?? '/'), message: `file already exists: ${filePath}` }];
  },
};

const frontmatterContainsPrimitive: GroundTruthPrimitive = {
  name: 'frontmatter-contains',
  validate({ vault, output, inputs }, params) {
    const targetPath = findInputString(inputs, String(params.targetPathInput ?? 'targetPath'));
    if (!targetPath) return [{ path: String(params.path ?? '/'), message: 'missing targetPath input for frontmatter check' }];
    const frontmatter = vault.getFileFrontmatter(targetPath);
    if (frontmatter === null) return [{ path: String(params.path ?? '/'), message: `target file not found: ${targetPath}` }];
    const key = String(params.key ?? 'tags');
    const fmValue = frontmatter[key];
    const matched = valuesMatch(fmValue, output);
    return matched ? []
      : [{ path: String(params.path ?? '/'), message: `value does not match frontmatter key '${key}'` }];
  },
};

const frontmatterNotContainsPrimitive: GroundTruthPrimitive = {
  name: 'frontmatter-not-contains',
  validate({ vault, output, inputs }, params) {
    // analogous to above
  },
};
```

### 3. Registry

`GroundTruthValidator` receives a registry at construction:

```typescript
export class GroundTruthRegistry {
  private primitives = new Map<string, GroundTruthPrimitive>();

  register(primitive: GroundTruthPrimitive): this {
    this.primitives.set(primitive.name, primitive);
    return this;
  }

  get(name: string): GroundTruthPrimitive | undefined {
    return this.primitives.get(name);
  }

  createDefault(vault: VaultReader): GroundTruthRegistry {
    return new GroundTruthRegistry()
      .register(fileExistsPrimitive)
      .register(fileNotExistsPrimitive)
      .register(frontmatterContainsPrimitive)
      .register(frontmatterNotContainsPrimitive);
  }
}
```

`VaultGroundTruthValidator` changes to dispatch by name:

```typescript
export class VaultGroundTruthValidator implements GroundTruthValidator {
  constructor(private registry: GroundTruthRegistry, private vault: VaultReader) {}

  async validate(recipe, inputs, output) {
    const errors: ValidationError[] = [];
    for (const rule of recipe.validation) {
      const primitive = this.registry.get(rule.primitive);
      if (!primitive) {
        errors.push({ path: rule.path, message: `unsupported ground-truth primitive: ${rule.primitive}` });
        continue;
      }
      const value = getValueAtPointer(output, rule.path);
      if (value === undefined) {
        errors.push({ path: rule.path, message: 'output value missing for ground-truth check' });
        continue;
      }
      errors.push(...primitive.validate({ recipe, output: value, inputs, vault: this.vault }, rule.params ?? {}));
    }
    return { ok: errors.length === 0, errors };
  }
}
```

### 4. Recipe format change

Replace `source` + `check` with a single `primitive` field:

```markdown
# Validation
- primitive: frontmatter-not-contains
  path: /tag
  params: {"key":"tags","targetPathInput":"targetPath"}
- primitive: file-exists
  path: /targetPath
```

This removes the `source` abstraction unless we later add non-vault sources (e.g. Muninn index, external API). If non-vault sources arrive later, `source` can be reintroduced as a primitive namespace or as a separate dispatch layer.

### 5. Migration path

The existing four `check` values are already a de facto primitive namespace. The refactor is therefore:

1. Add the registry and primitives alongside the existing `switch`.
2. Update `RecipeValidationRule` to include `primitive`.
3. Update the parser to accept either `primitive` (new) or `source`+`check` (legacy) for one release cycle.
4. Migrate shipped recipes to the new format.
5. After one release, drop the legacy parser path and the `check` enum.

### 6. Extension point

A user plugin or future Huginn code can add a primitive without touching the validator:

```typescript
registry.register({
  name: 'note-contains-text',
  validate({ vault, output, inputs }, params) {
    const targetPath = findInputString(inputs, String(params.targetPathInput ?? 'targetPath'));
    if (!targetPath) return [{ path: '/', message: 'missing targetPath' }];
    const content = vault.readFile?.(targetPath);
    if (typeof content !== 'string') return [{ path: '/', message: 'could not read file' }];
    const needle = String(output);
    return content.includes(needle) ? []
      : [{ path: '/', message: `note does not contain ${needle}` }];
  },
});
```

This may require widening `VaultReader` to include file-body reads.

## Open questions

1. Should the `VaultReader` interface gain a `readFile(path): string | null` method so primitives can inspect note bodies, or keep ground-truth scoped to frontmatter and file existence?
2. Should primitives be async? All current checks are synchronous, but index-backed semantic checks may need async later.
3. Should recipe validation rules carry an optional `description` so the approval modal can explain why a check failed in friendlier prose?
4. Is the `source` field worth preserving for non-vault primitives, or should every primitive fully own its data source?

## Compatibility

- `RecipeRunResult.groundTruthValid` / `groundTruthErrors` remain unchanged.
- Fixtures F03 and F08 will need their recipe YAML updated and a legacy-parser test added.
- No change to the Muninn API.

## Files to touch

- `src/recipes/types.ts` — add `primitive` to `RecipeValidationRule`, deprecate `source`/`check`.
- `src/recipes/parser.ts` — parse `primitive`, support legacy `source`+`check` mapping.
- `src/harness/ground-truth.ts` — add `GroundTruthPrimitive`, `GroundTruthRegistry`, rewrite validator to dispatch.
- `src/main.ts` — construct registry with defaults and pass to `VaultGroundTruthValidator`.
- `src/recipes/tag-assignment.md`, `title-suggestion.md`, `link-suggestion.md` — migrate validation sections.
- `src/fixtures/f03.ts`, `f08.ts` — update recipes and add legacy-mapping assertion.
- `docs/Huginn Plugin 2 Harness.md` — update `# Validation` field reference.
