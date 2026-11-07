// =============================================================================
// Huginn — F25: Ground-Truth Descriptions Reach Approval Gate
// src/fixtures/f25.ts
//
// Verifies that recipe validation-rule descriptions are collected and passed
// through to the approval gate as human-readable "Checks passed" context.
//
// Run: npx tsx src/fixtures/f25.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, type ApprovalGate, type ApprovalRequest } from '../harness/harness.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { parseRecipe } from '../recipes/parser.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';
import type { LoadedRecipe } from '../recipes/types.ts';

const recipeSource = `---
name: title-suggest-test
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
Suggest a title for the target note.

# Inputs
- key: targetPath
  description: Path to the note to retitle.
  source: recipe-param

# Instructions
Target note: {{targetPath}}
Return JSON with title and reason.

# Output Contract
{
  "type": "object",
  "required": ["title", "reason"],
  "properties": {
    "title": { "type": "string" },
    "reason": { "type": "string" }
  }
}

# Apply Method
set-frontmatter-value

# Apply Params
{
  "key": "title"
}

# Validation
- primitive: file-exists
  path: /title
  description: The target note exists in the vault
- primitive: file-not-exists
  path: /title
  description: The proposed title does not already name another note
`;

class RecordingApprovalGate implements ApprovalGate {
    request: ApprovalRequest | null = null;

    async approve(request: ApprovalRequest): Promise<import('../harness/harness.ts').ApprovalResult | null> {
        this.request = request;
        return { approved: false };
    }
}

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F25] ground-truth descriptions reach approval gate');

    const parsed = parseRecipe(recipeSource, 'fixture://title-suggest-test.md');
    if (!parsed.ok || !parsed.recipe) {
        failures++;
        console.log('[F25] RED: failed to parse fixture recipe:', parsed.errors.join('; '));
        console.log(`[F25] VERDICT: RED — ${failures} failure(s)`);
        process.exit(1);
    }

    const recipe: LoadedRecipe = { ...parsed.recipe, sourcePath: 'fixture://title-suggest-test.md' };
    const gate = new RecordingApprovalGate();
    const harness = new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ title: 'New Title', reason: 'better fit' })),
        inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
            ['targetPath', 'notes/gamma.md'],
        ])),
        approvalGate: gate,
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/gamma.md': '' })),
        groundTruthValidator: {
            async validate() {
                return { ok: true, errors: [] };
            },
        },
    });

    const result = await harness.run(recipe, { targetPath: 'notes/gamma.md' }, {});

    if (!result.schemaValid) {
        failures++;
        console.log('[F25] RED: schema invalid:', JSON.stringify(result.schemaErrors));
    }
    if (!result.groundTruthValid) {
        failures++;
        console.log('[F25] RED: ground truth invalid:', JSON.stringify(result.groundTruthErrors));
    }

    if (gate.request === null) {
        failures++;
        console.log('[F25] RED: approval gate was not called');
    } else {
        const checks = gate.request.groundTruthChecks;
        if (!checks || checks.length !== 2) {
            failures++;
            console.log('[F25] RED: expected 2 groundTruthChecks, got', JSON.stringify(checks));
        } else {
            if (!checks.includes('The target note exists in the vault')) {
                failures++;
                console.log('[F25] RED: missing first description in', JSON.stringify(checks));
            }
            if (!checks.includes('The proposed title does not already name another note')) {
                failures++;
                console.log('[F25] RED: missing second description in', JSON.stringify(checks));
            }
        }
    }

    console.log(
        failures === 0
            ? '[F25] VERDICT: GREEN'
            : `[F25] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
