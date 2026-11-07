// =============================================================================
// Huginn — F05: Recipe Catalog Parses
// src/fixtures/f05.ts
//
// Loads every recipe shipped under src/recipes/ and verifies it parses without
// errors. This catches schema/output-contract/validation mistakes in new
// recipes before they reach Obsidian.
//
// Run: npx tsx src/fixtures/f05.ts
// =============================================================================

import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';

const EXPECTED_RECIPE_NAMES = [
    'tag-assignment',
    'title-suggestion',
    'link-suggestion',
    'task-extraction',
    'note-summary',
    'related-notes',
];

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F05] recipe catalog parses');

    const source = new NodeRecipeSource('src/recipes');
    const result = await loadRecipes(source);

    if (result.errors.length > 0) {
        failures++;
        for (const err of result.errors) {
            console.log('[F05] RED:', err);
        }
    }

    const foundNames = new Set(result.recipes.map((r) => r.metadata.name));
    for (const name of EXPECTED_RECIPE_NAMES) {
        if (!foundNames.has(name)) {
            failures++;
            console.log(`[F05] RED: missing recipe ${name}`);
        } else {
            console.log(`[F05] PASS: ${name} parsed`);
        }
    }

    console.log(
        failures === 0
            ? '[F05] VERDICT: GREEN'
            : `[F05] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
