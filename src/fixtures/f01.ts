// =============================================================================
// Huginn — F01: Harness End-to-End (Fake LLM)
// src/fixtures/f01.ts
//
// Runs a tag-suggestion recipe through the full harness using a fake LLM and
// a manual input gatherer. Verifies schema validation, diff computation, and
// the read-only approval gate.
//
// Run: npx tsx src/fixtures/f01.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate } from '../harness/harness.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { parseRecipe } from '../recipes/parser.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';
import type { LoadedRecipe } from '../recipes/types.ts';

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
- key: candidates
  description: Existing tags in the vault.
  source: vocabulary

# Instructions
Target note: {{targetPath}}
Candidate tags: {{candidates}}
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
suggest-tags

# Validation
`;

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F01] harness end-to-end with fake LLM');

    const parsed = parseRecipe(recipeSource, 'fixture://tag-suggest-test.md');
    if (!parsed.ok || !parsed.recipe) {
        failures++;
        console.log('[F01] RED: failed to parse fixture recipe:', parsed.errors.join('; '));
        console.log(`[F01] VERDICT: RED — ${failures} failure(s)`);
        process.exit(1);
    }

    const recipe: LoadedRecipe = { ...parsed.recipe, sourcePath: 'fixture://tag-suggest-test.md' };
    const harness = new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ tag: 'index', reason: 'mentions indexing', confidence: 0.7 })),
        inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
            ['targetPath', 'notes/gamma.md'],
            ['candidates', { tags: [{ tag: 'index', files: 5, chunks: 12 }] }],
        ])),
        approvalGate: new StaticApprovalGate(false), // read-only skeleton: reject
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/gamma.md': '' })),
    });

    const result = await harness.run(recipe, { targetPath: 'notes/gamma.md' }, {});

    if (!result.schemaValid) {
        failures++;
        console.log('[F01] RED: schema invalid:', JSON.stringify(result.schemaErrors));
    } else {
        console.log('[F01] schema valid');
    }

    const json = result.parsedOutput.json as Record<string, unknown> | undefined;
    if (json?.tag !== 'index') {
        failures++;
        console.log('[F01] RED: expected tag "index", got', json?.tag);
    }

    if (result.approved !== false) {
        failures++;
        console.log('[F01] RED: expected approval gate to reject (false), got', result.approved);
    }

    if (result.applyResult?.applied !== false) {
        failures++;
        console.log('[F01] RED: expected applyResult.applied false, got', result.applyResult);
    }

    if (result.groundTruthValid !== true) {
        failures++;
        console.log('[F01] RED: expected groundTruthValid true, got', result.groundTruthValid);
    }

    console.log(
        failures === 0
            ? '[F01] VERDICT: GREEN'
            : `[F01] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
