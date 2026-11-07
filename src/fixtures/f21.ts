// =============================================================================
// Huginn — F21: Note-summary recipe end-to-end
// src/fixtures/f21.ts
//
// Runs the bundled note-summary recipe through the harness with a fake LLM.
// Verifies that the read-only recipe parses, gathers content, and returns a
// summary without opening the approval gate.
//
// Run: npx tsx src/fixtures/f21.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate } from '../harness/harness.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F21] note-summary recipe end-to-end');

    const source = new NodeRecipeSource('src/recipes');
    const result = await loadRecipes(source);
    const recipe = result.recipes.find((r) => r.metadata.name === 'note-summary');
    if (!recipe) {
        failures++;
        console.log('[F21] RED: note-summary recipe not found');
        console.log(`[F21] VERDICT: RED — ${failures} failure(s)`);
        process.exit(1);
    }

    const harness = new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ summary: 'The home note links to alpha and beta.', confidence: 0.9 })),
        inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
            ['targetPath', 'notes/Home.md'],
            ['content', 'This is the home note. It links to alpha and beta.'],
        ])),
        approvalGate: new StaticApprovalGate(true),
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/Home.md': 'This is the home note. It links to alpha and beta.' })),
    });

    const runResult = await harness.run(recipe, { targetPath: 'notes/Home.md' }, {});

    if (!runResult.schemaValid) {
        failures++;
        console.log('[F21] RED: schema invalid:', JSON.stringify(runResult.schemaErrors));
    }
    if (runResult.approved !== null) {
        failures++;
        console.log('[F21] RED: expected no approval for read-only recipe, got', runResult.approved);
    }
    if (runResult.applyResult !== null) {
        failures++;
        console.log('[F21] RED: expected no applyResult for read-only recipe, got', runResult.applyResult);
    }
    const summary = (runResult.parsedOutput.json as Record<string, unknown> | undefined)?.summary;
    if (summary !== 'The home note links to alpha and beta.') {
        failures++;
        console.log('[F21] RED: expected summary output, got', summary);
    }

    console.log(
        failures === 0
            ? '[F21] VERDICT: GREEN'
            : `[F21] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
