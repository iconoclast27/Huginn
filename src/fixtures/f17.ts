// =============================================================================
// Huginn — F17: Ground-Truth Primitive Registry
//
// Verifies that the validator dispatches to named primitives and that new
// primitives can be registered without modifying the validator.
//
// Run: npx tsx src/fixtures/f17.ts
// =============================================================================

import {
    VaultGroundTruthValidator,
    GroundTruthRegistry,
    type VaultReader,
    type GroundTruthPrimitive,
} from '../harness/ground-truth.ts';
import { parseRecipe } from '../recipes/parser.ts';
import type { GatheredInput, LoadedRecipe } from '../recipes/types.ts';

const recipeSource = `---
name: primitive-registry-test
version: 0.1.0
modelTier: fast
riskClass: read-only
---

# Trigger
Test custom primitive dispatch.

# Inputs
- key: targetPath
  description: Path to the note
  source: recipe-param

# Instructions
Return JSON.

# Output Contract
{
  "type": "object",
  "required": ["word"],
  "properties": {
    "word": { "type": "string" }
  }
}

# Apply Method
noop

# Validation
- primitive: note-contains-text
  path: /word
  description: The output word must appear in the target note body.
  params: {"targetPathInput":"targetPath"}
`;

class FakeVaultReader implements VaultReader {
    constructor(private files: Map<string, { frontmatter: Record<string, unknown>; body: string }>) {}

    getFileFrontmatter(path: string): Record<string, unknown> | null {
        return this.files.get(path)?.frontmatter ?? null;
    }

    async readFile(path: string): Promise<string | null> {
        return this.files.get(path)?.body ?? null;
    }
}

const noteContainsTextPrimitive: GroundTruthPrimitive = {
    name: 'note-contains-text',
    async validate({ vault, output, inputs }, params) {
        const targetPath = inputs.find((i) => i.key === String(params.targetPathInput ?? 'targetPath'))?.value as string | undefined;
        if (!targetPath) return [{ path: '/', message: 'missing targetPath' }];
        const content = await vault.readFile(targetPath);
        if (typeof content !== 'string') return [{ path: '/', message: 'could not read file' }];
        const needle = String(output);
        return content.includes(needle) ? []
            : [{ path: '/', message: `note does not contain ${needle}` }];
    },
};

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F17 FAIL: ${msg}`);
}

async function main(): Promise<void> {
    console.log('[F17] ground-truth primitive registry');

    const parsed = parseRecipe(recipeSource, 'fixture://primitive-registry-test.md');
    assert(parsed.ok && parsed.recipe !== undefined, 'recipe should parse');
    const recipe: LoadedRecipe = { ...parsed.recipe!, sourcePath: 'fixture://primitive-registry-test.md' };
    assert(recipe.validation[0].description === 'The output word must appear in the target note body.', 'description should be parsed');

    const vault = new FakeVaultReader(new Map([
        ['notes/alpha.md', { frontmatter: {}, body: 'hello world' }],
    ]));

    const registry = new GroundTruthRegistry().register(noteContainsTextPrimitive);
    const validator = new VaultGroundTruthValidator(registry, vault);

    const inputs: GatheredInput[] = [{ key: 'targetPath', value: 'notes/alpha.md' }];

    // Case 1: word present -> valid.
    const r1 = await validator.validate(recipe, inputs, { word: 'world' });
    assert(r1.ok, `S1 expected valid, got ${JSON.stringify(r1.errors)}`);
    console.log('[F17] PASS: S1 custom primitive accepts matching output');

    // Case 2: word absent -> invalid.
    const r2 = await validator.validate(recipe, inputs, { word: 'missing' });
    assert(!r2.ok, 'S2 expected invalid');
    assert(r2.errors.some((e) => e.message.includes('does not contain missing')), `S2 wrong error: ${JSON.stringify(r2.errors)}`);
    console.log('[F17] PASS: S2 custom primitive rejects non-matching output');

    // Case 3: unknown primitive -> invalid.
    const badRecipe: LoadedRecipe = {
        ...recipe,
        validation: [{ primitive: 'no-such-primitive', path: '/word' }],
    };
    const r3 = await validator.validate(badRecipe, inputs, { word: 'world' });
    assert(!r3.ok, 'S3 expected invalid for unknown primitive');
    assert(r3.errors.some((e) => e.message.includes('unsupported ground-truth primitive: no-such-primitive')), `S3 wrong error: ${JSON.stringify(r3.errors)}`);
    console.log('[F17] PASS: S3 unknown primitive rejected');

    console.log('[F17] VERDICT: GREEN');
}

void main();
