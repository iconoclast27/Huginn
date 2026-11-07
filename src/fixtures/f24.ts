// =============================================================================
// Huginn — F24: Ground-truth note-text primitives
// src/fixtures/f24.ts
//
// Verifies the built-in note-contains-text and note-not-contains-text
// ground-truth primitives against a fake vault reader.
//
// Run: npx tsx src/fixtures/f24.ts
// =============================================================================

import { VaultGroundTruthValidator, createDefaultGroundTruthRegistry, type VaultReader } from '../harness/ground-truth.ts';
import { parseRecipe } from '../recipes/parser.ts';
import type { GatheredInput, LoadedRecipe } from '../recipes/types.ts';

const CONTAINS_RECIPE_SOURCE = `---
name: note-contains-text-test
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
Test note-contains-text primitive.

# Inputs
- key: targetPath
  description: Path to the note to check.
  source: recipe-param

# Instructions
Target: {{targetPath}}

# Output Contract
{
  "type": "object",
  "required": ["text"],
  "properties": {
    "text": { "type": "string" }
  }
}

# Apply Method
noop

# Validation
- primitive: note-contains-text
  path: /text
  description: The output text must already appear in the target note body.
`;

const NOT_CONTAINS_RECIPE_SOURCE = `---
name: note-not-contains-text-test
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
Test note-not-contains-text primitive.

# Inputs
- key: targetPath
  description: Path to the note to check.
  source: recipe-param

# Instructions
Target: {{targetPath}}

# Output Contract
{
  "type": "object",
  "required": ["text"],
  "properties": {
    "text": { "type": "string" }
  }
}

# Apply Method
noop

# Validation
- primitive: note-not-contains-text
  path: /text
  description: The output text must not already appear in the target note body.
`;

class FakeVaultReader implements VaultReader {
    constructor(private files: Map<string, { frontmatter?: Record<string, unknown>; body: string }>) {}

    getFileFrontmatter(path: string): Record<string, unknown> | null {
        return this.files.get(path)?.frontmatter ?? null;
    }

    async readFile(path: string): Promise<string | null> {
        return this.files.get(path)?.body ?? null;
    }
}

function inputsFor(path: string): GatheredInput[] {
    return [{ key: 'targetPath', value: path }];
}

function loadRecipe(source: string, name: string): LoadedRecipe {
    const parsed = parseRecipe(source, `fixture://${name}.md`);
    if (!parsed.ok || !parsed.recipe) {
        throw new Error(`Failed to parse ${name}: ${parsed.errors.join('; ')}`);
    }
    return { ...parsed.recipe, sourcePath: `fixture://${name}.md` };
}

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F24] ground-truth note-text primitives');

    const containsRecipe = loadRecipe(CONTAINS_RECIPE_SOURCE, 'note-contains-text-test');
    const notContainsRecipe = loadRecipe(NOT_CONTAINS_RECIPE_SOURCE, 'note-not-contains-text-test');

    const vault = new FakeVaultReader(new Map([
        ['notes/alpha.md', { body: 'This note contains indexing details.' }],
        ['notes/beta.md', { body: 'A completely different note.' }],
    ]));

    const validator = new VaultGroundTruthValidator(createDefaultGroundTruthRegistry(), vault);

    // note-contains-text: existing text passes.
    const r1 = await validator.validate(containsRecipe, inputsFor('notes/alpha.md'), { text: 'indexing' });
    if (!r1.ok) {
        failures++;
        console.log('[F24] RED: expected existing text to pass note-contains-text, got', JSON.stringify(r1.errors));
    } else {
        console.log('[F24] PASS: note-contains-text accepts existing text');
    }

    // note-contains-text: missing text fails.
    const r2 = await validator.validate(containsRecipe, inputsFor('notes/beta.md'), { text: 'indexing' });
    if (r2.ok) {
        failures++;
        console.log('[F24] RED: expected missing text to fail note-contains-text');
    } else if (!r2.errors.some((e) => e.message.includes('text not found'))) {
        failures++;
        console.log('[F24] RED: expected text-not-found error, got', JSON.stringify(r2.errors));
    } else {
        console.log('[F24] PASS: note-contains-text rejects missing text');
    }

    // note-not-contains-text: existing text fails.
    const r3 = await validator.validate(notContainsRecipe, inputsFor('notes/alpha.md'), { text: 'indexing' });
    if (r3.ok) {
        failures++;
        console.log('[F24] RED: expected existing text to fail note-not-contains-text');
    } else if (!r3.errors.some((e) => e.message.includes('text already present'))) {
        failures++;
        console.log('[F24] RED: expected text-already-present error, got', JSON.stringify(r3.errors));
    } else {
        console.log('[F24] PASS: note-not-contains-text rejects existing text');
    }

    // note-not-contains-text: missing text passes.
    const r4 = await validator.validate(notContainsRecipe, inputsFor('notes/beta.md'), { text: 'indexing' });
    if (!r4.ok) {
        failures++;
        console.log('[F24] RED: expected missing text to pass note-not-contains-text, got', JSON.stringify(r4.errors));
    } else {
        console.log('[F24] PASS: note-not-contains-text accepts missing text');
    }

    // Descriptions are surfaced in errors.
    if (!r2.errors.some((e) => e.message.startsWith('The output text must already appear'))) {
        failures++;
        console.log('[F24] RED: expected surfaced description for note-contains-text, got', JSON.stringify(r2.errors));
    } else {
        console.log('[F24] PASS: rule description surfaced in error message');
    }

    console.log(
        failures === 0
            ? '[F24] VERDICT: GREEN'
            : `[F24] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
