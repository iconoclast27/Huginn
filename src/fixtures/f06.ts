// =============================================================================
// Huginn — F06: New Skill End-to-End with Fake LLM
// src/fixtures/f06.ts
//
// Runs title-suggestion, link-suggestion, summary-generation, and task-extraction
// through the harness with a fake LLM and a manual input gatherer. Verifies
// schema validation and read-only apply messages.
//
// Run: npx tsx src/fixtures/f06.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate } from '../harness/harness.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';

interface TestCase {
    raw: string;
    expectApproved: boolean | null;
    expectApplied: boolean | null;
}

const TEST_CASES: Record<string, TestCase> = {
    'title-suggestion': { raw: JSON.stringify({ title: 'Better Home Note', reason: 'more descriptive', confidence: 0.8 }), expectApproved: true, expectApplied: true },
    'link-suggestion': { raw: JSON.stringify({ links: ['notes/alpha.md', 'notes/beta.md'], confidence: 0.7 }), expectApproved: true, expectApplied: true },
    'summary-generation': { raw: JSON.stringify({ summary: 'A concise overview of the home note.', confidence: 0.9 }), expectApproved: null, expectApplied: null },
    'task-extraction': { raw: JSON.stringify({ tasks: ['Review home note structure', 'Add missing links'], confidence: 0.8 }), expectApproved: null, expectApplied: null },
};

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F06] new skill end-to-end with fake LLM');

    const source = new NodeRecipeSource('src/recipes');
    const result = await loadRecipes(source);

    for (const [name, testCase] of Object.entries(TEST_CASES)) {
        const recipe = result.recipes.find((r) => r.metadata.name === name);
        if (!recipe) {
            failures++;
            console.log(`[F06] RED: recipe ${name} not found`);
            continue;
        }

        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(testCase.raw),
            inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
                ['targetPath', 'notes/Home.md'],
                ['content', 'This is the home note. It links to alpha and beta.'],
                ['vocabulary', { tags: [{ tag: 'index', files: 1, chunks: 1 }] }],
                ['relatedChunks', { neighbors: [] }],
                ['relatedTextHits', { hits: [] }],
                ['titleQuery', 'home'],
            ])),
            approvalGate: new StaticApprovalGate(true), // approve to exercise apply routine
            applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/Home.md': 'This is the home note. It links to alpha and beta.' })),
        });

        const runResult = await harness.run(recipe, { targetPath: 'notes/Home.md' }, {});

        if (!runResult.schemaValid) {
            failures++;
            console.log(`[F06] RED: ${name} schema invalid:`, JSON.stringify(runResult.schemaErrors));
        } else if (runResult.approved !== testCase.expectApproved) {
            failures++;
            console.log(`[F06] RED: ${name} expected approved ${JSON.stringify(testCase.expectApproved)}, got`, runResult.approved);
        } else if (testCase.expectApplied === null) {
            if (runResult.applyResult !== null) {
                failures++;
                console.log(`[F06] RED: ${name} expected no applyResult, got`, runResult.applyResult);
            } else {
                console.log(`[F06] PASS: ${name} ran end-to-end`);
            }
        } else if (runResult.applyResult === null || runResult.applyResult.applied !== testCase.expectApplied) {
            failures++;
            console.log(`[F06] RED: ${name} expected applyResult.applied ${testCase.expectApplied}, got`, runResult.applyResult);
        } else {
            console.log(`[F06] PASS: ${name} ran end-to-end`);
        }
    }

    console.log(
        failures === 0
            ? '[F06] VERDICT: GREEN'
            : `[F06] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
