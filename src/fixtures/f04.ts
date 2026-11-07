// =============================================================================
// Huginn — F04: Approval Gate Request Shape
// src/fixtures/f04.ts
//
// Verifies that the harness packages the diff, output, recipe name, and
// target path into the ApprovalRequest passed to the gate.
//
// Run: npx tsx src/fixtures/f04.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, type ApprovalGate, type ApprovalRequest } from '../harness/harness.ts';
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
append-frontmatter-array

# Apply Params
{
  "key": "tags",
  "valuePath": "tag"
}

# Validation
`;

class RecordingApprovalGate implements ApprovalGate {
    request: ApprovalRequest | null = null;

    async approve(request: ApprovalRequest): Promise<boolean | null> {
        this.request = request;
        return false; // reject for safety; we only inspect the request shape
    }
}

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F04] approval gate request shape');

    const parsed = parseRecipe(recipeSource, 'fixture://tag-suggest-test.md');
    if (!parsed.ok || !parsed.recipe) {
        failures++;
        console.log('[F04] RED: failed to parse fixture recipe:', parsed.errors.join('; '));
        console.log(`[F04] VERDICT: RED — ${failures} failure(s)`);
        process.exit(1);
    }

    const recipe: LoadedRecipe = { ...parsed.recipe, sourcePath: 'fixture://tag-suggest-test.md' };
    const gate = new RecordingApprovalGate();
    const harness = new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ tag: 'index', reason: 'mentions indexing', confidence: 0.7 })),
        inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
            ['targetPath', 'notes/gamma.md'],
            ['candidates', { tags: [{ tag: 'index', files: 5, chunks: 12 }] }],
        ])),
        approvalGate: gate,
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/gamma.md': '' })),
    });

    const result = await harness.run(recipe, { targetPath: 'notes/gamma.md' }, {});

    if (!result.schemaValid) {
        failures++;
        console.log('[F04] RED: schema invalid:', JSON.stringify(result.schemaErrors));
    }

    if (gate.request === null) {
        failures++;
        console.log('[F04] RED: approval gate was not called');
    } else {
        const req = gate.request;
        if (req.recipeName !== recipe.metadata.name) {
            failures++;
            console.log('[F04] RED: expected recipeName', recipe.metadata.name, 'got', req.recipeName);
        }
        if (req.targetPath !== 'notes/gamma.md') {
            failures++;
            console.log('[F04] RED: expected targetPath notes/gamma.md, got', req.targetPath);
        }
        try {
            const parsedDiff = JSON.parse(req.diffText) as { changes: unknown[] };
            if (!Array.isArray(parsedDiff.changes) || parsedDiff.changes.length === 0) {
                failures++;
                console.log('[F04] RED: diffText did not contain changes');
            }
        } catch {
            failures++;
            console.log('[F04] RED: diffText was not valid JSON:', req.diffText);
        }
        const out = req.output as Record<string, unknown> | undefined;
        if (out?.tag !== 'index') {
            failures++;
            console.log('[F04] RED: expected output.tag index, got', out?.tag);
        }
    }

    console.log(
        failures === 0
            ? '[F04] VERDICT: GREEN'
            : `[F04] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
