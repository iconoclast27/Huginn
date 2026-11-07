// =============================================================================
// Huginn — F23: Task-extraction verbosity input
// src/fixtures/f23.ts
//
// Verifies that the task-extraction recipe accepts a verbosity input and
// substitutes it into the rendered prompt. The model output should still pass
// schema validation regardless of verbosity level.
//
// Run: npx tsx src/fixtures/f23.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate } from '../harness/harness.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F23] task-extraction verbosity input');

    const source = new NodeRecipeSource('src/recipes');
    const result = await loadRecipes(source);
    const recipe = result.recipes.find((r) => r.metadata.name === 'task-extraction');
    if (!recipe) {
        failures++;
        console.log('[F23] RED: task-extraction recipe not found');
        console.log(`[F23] VERDICT: RED — ${failures} failure(s)`);
        process.exit(1);
    }

    const raw = JSON.stringify({ todos: ['Review home note structure'], confidence: 0.8 });

    for (const verbosity of ['verbose', 'minimal']) {
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(raw),
            inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
                ['targetPath', 'notes/Home.md'],
                ['content', 'This is the home note.'],
                ['verbosity', verbosity],
            ])),
            approvalGate: new StaticApprovalGate(true),
            applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/Home.md': 'This is the home note.' })),
        });

        const runResult = await harness.run(recipe, { targetPath: 'notes/Home.md', verbosity }, {});

        if (!runResult.schemaValid) {
            failures++;
            console.log(`[F23] RED: ${verbosity} mode schema invalid:`, JSON.stringify(runResult.schemaErrors));
            continue;
        }
        if (!runResult.renderedPrompt.includes(`Verbosity: ${verbosity}`)) {
            failures++;
            console.log(`[F23] RED: ${verbosity} mode did not substitute verbosity into prompt`);
            continue;
        }
        console.log(`[F23] PASS: ${verbosity} mode rendered and validated`);
    }

    console.log(
        failures === 0
            ? '[F23] VERDICT: GREEN'
            : `[F23] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
