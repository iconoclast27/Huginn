// =============================================================================
// Huginn — F03: Ground-Truth Validator
// src/fixtures/f03.ts
//
// Runs the VaultGroundTruthValidator against a fake vault reader. Verifies
// that the harness rejects a tag suggestion when the target note already
// carries the proposed tag.
//
// Run: npx tsx src/fixtures/f03.ts
// =============================================================================

import { VaultGroundTruthValidator, createDefaultGroundTruthRegistry, type VaultReader } from '../harness/ground-truth.ts';
import { parseRecipe } from '../recipes/parser.ts';
import type { GatheredInput, LoadedRecipe } from '../recipes/types.ts';

const recipeSource = `---
name: tag-suggest-test
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
Suggest a tag for the target note.

# Inputs
- key: targetPath
  description: Path to the note to tag.
  source: recipe-param

# Instructions
Target note: {{targetPath}}
Return JSON with tag, reason, and confidence.

# Output Contract
{
  "type": "object",
  "required": ["tag", "reason", "confidence"],
  "properties": {
    "tag": { "type": "string" },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-frontmatter-array

# Apply Params
{
  "key": "tags",
  "valuePath": "tag"
}

# Validation
- primitive: frontmatter-not-contains
  path: /tag
  params: {"key":"tags"}
`;

class FakeVaultReader implements VaultReader {
    constructor(private files: Map<string, Record<string, unknown>>) {}

    getFileFrontmatter(path: string): Record<string, unknown> | null {
        return this.files.get(path) ?? null;
    }

    async readFile(_path: string): Promise<string | null> {
        return null;
    }
}

function inputsFor(path: string): GatheredInput[] {
    return [{ key: 'targetPath', value: path }];
}

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F03] ground-truth validator against fake vault');

    const parsed = parseRecipe(recipeSource, 'fixture://tag-suggest-test.md');
    if (!parsed.ok || !parsed.recipe) {
        failures++;
        console.log('[F03] RED: failed to parse fixture recipe:', parsed.errors.join('; '));
        console.log(`[F03] VERDICT: RED — ${failures} failure(s)`);
        process.exit(1);
    }
    const recipe: LoadedRecipe = { ...parsed.recipe, sourcePath: 'fixture://tag-suggest-test.md' };

    const vault = new FakeVaultReader(new Map([
        ['notes/empty.md', {}],
        ['notes/tagged.md', { tags: ['index', 'taxonomy'] }],
        ['notes/single-tag.md', { tags: 'taxonomy' }],
    ]));

    const validator = new VaultGroundTruthValidator(createDefaultGroundTruthRegistry(), vault);

    // Case 1: proposed tag not present -> valid.
    const r1 = await validator.validate(recipe, inputsFor('notes/empty.md'), { tag: 'new-tag', reason: 'fresh', confidence: 0.8 });
    if (!r1.ok) {
        failures++;
        console.log('[F03] RED: expected valid for empty note, got', JSON.stringify(r1.errors));
    } else {
        console.log('[F03] PASS: empty note accepts new tag');
    }

    // Case 2: proposed tag already in array -> invalid.
    const r2 = await validator.validate(recipe, inputsFor('notes/tagged.md'), { tag: 'taxonomy', reason: 'already there', confidence: 0.9 });
    if (r2.ok) {
        failures++;
        console.log('[F03] RED: expected invalid for duplicate array tag');
    } else if (!r2.errors.some((e) => e.message.includes("already present"))) {
        failures++;
        console.log('[F03] RED: expected duplicate-array error, got', JSON.stringify(r2.errors));
    } else {
        console.log('[F03] PASS: duplicate array tag rejected');
    }

    // Case 3: proposed tag already present as string -> invalid.
    const r3 = await validator.validate(recipe, inputsFor('notes/single-tag.md'), { tag: 'taxonomy', reason: 'already there', confidence: 0.9 });
    if (r3.ok) {
        failures++;
        console.log('[F03] RED: expected invalid for duplicate string tag');
    } else if (!r3.errors.some((e) => e.message.includes("already present"))) {
        failures++;
        console.log('[F03] RED: expected duplicate-string error, got', JSON.stringify(r3.errors));
    } else {
        console.log('[F03] PASS: duplicate string tag rejected');
    }

    // Case 4: missing targetPath input -> invalid.
    const r4 = await validator.validate(recipe, [], { tag: 'new-tag', reason: 'no path', confidence: 0.8 });
    if (r4.ok) {
        failures++;
        console.log('[F03] RED: expected invalid when targetPath missing');
    } else {
        console.log('[F03] PASS: missing targetPath rejected');
    }

    // Case 5: target file does not exist -> invalid.
    const r5 = await validator.validate(recipe, inputsFor('notes/missing.md'), { tag: 'new-tag', reason: 'missing file', confidence: 0.8 });
    if (r5.ok) {
        failures++;
        console.log('[F03] RED: expected invalid when target file missing');
    } else {
        console.log('[F03] PASS: missing target file rejected');
    }

    console.log(
        failures === 0
            ? '[F03] VERDICT: GREEN'
            : `[F03] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
