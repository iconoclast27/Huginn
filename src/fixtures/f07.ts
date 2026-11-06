// =============================================================================
// Huginn — F07: MuninnApiInputGatherer content source end-to-end
// src/fixtures/f07.ts
//
// Verifies that the content input source actually reads the target note body
// through app.vault.cachedRead and returns the raw string for the recipe
// template. This fixture uses a minimal fake App so it cannot pass with
// injected manual inputs.
//
// Run: npx tsx src/fixtures/f07.ts
// =============================================================================

import { MuninnApiInputGatherer } from '../harness/gather.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { HuginnHarness, StaticApprovalGate } from '../harness/harness.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { createApplyOptionsForFakeApp, createFakeApp } from './fake-app.ts';
import type { MuninnApi } from '../muninn-api.ts';

const NOTE_BODY = 'This home note discusses daily planning and links to notes/alpha.md.';

function createFakeApi(): MuninnApi {
    return {
        tagVocabulary() {
            return { tags: [{ tag: 'daily', files: 1, chunks: 1 }] };
        },
        searchText() {
            return { hits: [] };
        },
        searchSemantic() {
            return { hits: [] };
        },
        relatedChunks() {
            return { neighbors: [] };
        },
        forceReindex() {
            // no-op in fixture
        },
    } as unknown as MuninnApi;
}

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F07] MuninnApiInputGatherer content source end-to-end');

    const files: Record<string, string> = { 'notes/Home.md': NOTE_BODY };
    const fakeApp = createFakeApp(files);
    const api = createFakeApi();
    const gatherer = new MuninnApiInputGatherer({ api, app: fakeApp as unknown as import('obsidian').App });

    const source = new NodeRecipeSource('src/recipes');
    const loadResult = await loadRecipes(source);
    const recipesNeedingContent = loadResult.recipes.filter((r) =>
        r.inputs.some((i) => i.source === 'content'),
    );

    for (const recipe of recipesNeedingContent) {
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(JSON.stringify({
                summary: 'placeholder',
                confidence: 0.5,
            })),
            inputGatherer: gatherer,
            approvalGate: new StaticApprovalGate(false),
            applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp(files)),
        });

        const result = await harness.run(recipe, { targetPath: 'notes/Home.md' }, {});

        if (!result.renderedPrompt.includes(NOTE_BODY)) {
            failures++;
            console.log(`[F07] RED: ${recipe.metadata.name} prompt does not contain note body`);
            console.log(`[F07]   rendered prompt length: ${result.renderedPrompt.length}`);
        } else {
            console.log(`[F07] PASS: ${recipe.metadata.name} received note body`);
        }
    }

    console.log(
        failures === 0
            ? '[F07] VERDICT: GREEN'
            : `[F07] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
