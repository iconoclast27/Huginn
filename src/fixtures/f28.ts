// =============================================================================
// Huginn — F28: Bundled Catalog Matches src/recipes
// src/fixtures/f28.ts
//
// The header claim at src/recipes/bundled.ts:7 ("the same recipes kept in
// src/recipes/*.md, kept in sync manually") is the duplication liability: the
// installer ships BUNDLED_RECIPES (installer.ts:36,60), f05 parses the .md files,
// and nothing compared the two. A one-sided edit used to ship a vault recipe that
// the development contract did not describe.
//
// This is a drift guard, not a red-earning fixture: there is no bug today (the
// copies are identical), so the red it prevents is a future drift. Its green is
// honest, and it was run against the pre-change copies in a HEAD worktree to prove
// that the green is not manufactured by the edit it guards.
//
// Legs:
//   S1 — every catalog entry parses as a recipe (catches rot inside bundled.ts).
//   S2 — every .md file parses as a recipe (f05's own expectation, restated).
//   S3 — for every recipe name, the parsed catalog Recipe and the parsed .md
//        Recipe are deep-equal, ignoring sourcePath (the parser records where it
//        read from; that is not recipe content).
//   S4 — the catalog name set equals the .md name set in BOTH directions, so a
//        recipe added to one side alone fails.
//   S5 — the catalog name set equals EXPECTED_RECIPE_NAMES, the list f05 asserts
//        against the .md files.
//
// Run: npx tsx src/fixtures/f28.ts
// Exit 0 = the two copies describe the same six recipes. Nonzero = drift.
// =============================================================================

import { BUNDLED_RECIPES } from '../recipes/bundled.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { loadRecipes } from '../recipes/loader.ts';
import { parseRecipe } from '../recipes/parser.ts';

const EXPECTED_RECIPE_NAMES = [
    'tag-assignment',
    'title-suggestion',
    'link-suggestion',
    'task-extraction',
    'note-summary',
    'related-notes',
];

/** Key-ordered stringify, so deep equality does not depend on key insertion order. */
function stableStringify(value: unknown): string {
    return JSON.stringify(normalize(value));

    function normalize(v: unknown): unknown {
        if (Array.isArray(v)) return v.map(normalize);
        if (v !== null && typeof v === 'object') {
            const out: Record<string, unknown> = {};
            for (const key of Object.keys(v as Record<string, unknown>).sort()) {
                out[key] = normalize((v as Record<string, unknown>)[key]);
            }
            return out;
        }
        return v;
    }
}

function stripSourcePath(recipe: unknown): Record<string, unknown> {
    const copy: Record<string, unknown> = { ...(recipe as Record<string, unknown>) };
    delete copy.sourcePath;
    return copy;
}

async function main(): Promise<void> {
    console.log('[F28] bundled catalog matches src/recipes');
    const failures: string[] = [];

    // S1: catalog entries parse.
    const catalogRecipes = new Map<string, Record<string, unknown>>();
    for (const entry of BUNDLED_RECIPES) {
        const parsed = parseRecipe(entry.content, `bundled://${entry.fileName}`);
        if (!parsed.ok || parsed.recipe === undefined) {
            failures.push(`S1: bundled entry ${entry.fileName} does not parse: ${parsed.errors.join('; ')}`);
            continue;
        }
        catalogRecipes.set(parsed.recipe.metadata.name, stripSourcePath(parsed.recipe));
    }

    // S2: .md files parse.
    const source = new NodeRecipeSource('src/recipes');
    const loaded = await loadRecipes(source);
    if (loaded.errors.length > 0) {
        failures.push(`S2: src/recipes has parse errors: ${loaded.errors.join('; ')}`);
    }
    const mdRecipes = new Map<string, Record<string, unknown>>();
    for (const recipe of loaded.recipes) {
        mdRecipes.set(recipe.metadata.name, stripSourcePath(recipe));
    }

    // S3: deep equality per recipe name.
    for (const name of EXPECTED_RECIPE_NAMES) {
        const catalog = catalogRecipes.get(name);
        const md = mdRecipes.get(name);
        if (catalog === undefined || md === undefined) {
            failures.push(`S3: ${name} missing from catalog=${catalog !== undefined} md=${md !== undefined}`);
            continue;
        }
        const a = stableStringify(catalog);
        const b = stableStringify(md);
        if (a !== b) {
            failures.push(`S3: ${name} catalog and .md disagree`);
            for (let i = 0; i < Math.max(a.length, b.length); i++) {
                if (a[i] !== b[i]) {
                    console.log(`[F28] ${name} first divergence at ${i}: catalog ${JSON.stringify(a.slice(i, i + 90))} md ${JSON.stringify(b.slice(i, i + 90))}`);
                    break;
                }
            }
        }
    }

    // S4: name sets, both directions.
    const catalogNames = [...catalogRecipes.keys()].sort();
    const mdNames = [...mdRecipes.keys()].sort();
    const onlyCatalog = catalogNames.filter((n) => !mdNames.includes(n));
    const onlyMd = mdNames.filter((n) => !catalogNames.includes(n));
    console.log(`[F28] S4: catalog=${JSON.stringify(catalogNames)} md=${JSON.stringify(mdNames)}`);
    if (onlyCatalog.length > 0) failures.push(`S4: in catalog only: ${onlyCatalog.join(', ')}`);
    if (onlyMd.length > 0) failures.push(`S4: in src/recipes only: ${onlyMd.join(', ')}`);

    // S5: catalog equals the list f05 asserts against the .md files.
    const expected = [...EXPECTED_RECIPE_NAMES].sort();
    console.log(`[F28] S5: expected=${JSON.stringify(expected)}`);
    if (catalogNames.join(',') !== expected.join(',')) {
        failures.push(`S5: catalog names ${JSON.stringify(catalogNames)} != EXPECTED_RECIPE_NAMES ${JSON.stringify(expected)}`);
    }

    if (failures.length > 0) {
        console.log(`[F28] RED: ${failures.length} failure(s)`);
        for (const f of failures) console.log(`[F28]   ${f}`);
        process.exit(1);
    }

    console.log('[F28] VERDICT: GREEN — the bundled catalog and src/recipes describe the same six recipes');
    console.log('[F28] Fixture complete');
}

void main();
