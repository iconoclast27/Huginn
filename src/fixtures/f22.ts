// =============================================================================
// Huginn — F22: Related-notes recipe end-to-end
// src/fixtures/f22.ts
//
// Runs the bundled related-notes recipe through the harness with a fake LLM.
// Verifies that the read-only recipe returns a list of related note paths and
// does not run an apply routine.
//
// Run: npx tsx src/fixtures/f22.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate } from '../harness/harness.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F22] related-notes recipe end-to-end');

    const source = new NodeRecipeSource('src/recipes');
    const result = await loadRecipes(source);
    const recipe = result.recipes.find((r) => r.metadata.name === 'related-notes');
    if (!recipe) {
        failures++;
        console.log('[F22] RED: related-notes recipe not found');
        console.log(`[F22] VERDICT: RED — ${failures} failure(s)`);
        process.exit(1);
    }

    const harness = new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ notes: ['notes/alpha.md', 'notes/beta.md'], confidence: 0.75 })),
        inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
            ['targetPath', 'notes/Home.md'],
            ['content', 'This is the home note. It links to alpha and beta.'],
            ['relatedChunks', { neighbors: [] }],
            ['titleQuery', 'home'],
            ['relatedTextHits', { hits: [] }],
        ])),
        approvalGate: new StaticApprovalGate(true),
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/Home.md': 'This is the home note. It links to alpha and beta.' })),
    });

    const runResult = await harness.run(recipe, { targetPath: 'notes/Home.md' }, {});

    if (!runResult.schemaValid) {
        failures++;
        console.log('[F22] RED: schema invalid:', JSON.stringify(runResult.schemaErrors));
    }
    if (runResult.approved !== null) {
        failures++;
        console.log('[F22] RED: expected no approval for read-only recipe, got', runResult.approved);
    }
    if (runResult.applyResult !== null) {
        failures++;
        console.log('[F22] RED: expected no applyResult for read-only recipe, got', runResult.applyResult);
    }
    const notes = (runResult.parsedOutput.json as Record<string, unknown> | undefined)?.notes;
    if (!Array.isArray(notes) || notes.length !== 2) {
        failures++;
        console.log('[F22] RED: expected two related notes, got', notes);
    }

    console.log(
        failures === 0
            ? '[F22] VERDICT: GREEN'
            : `[F22] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
