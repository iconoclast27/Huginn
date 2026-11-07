// =============================================================================
// Huginn — F13: Harness writes corrections on failures
// src/fixtures/f13.ts
//
// Runs a fake recipe through the harness with a fake LLM and a fake
// CorrectionsMemory. Verifies that schema errors and apply failures produce a
// correction entry, and that ground-truth failures ("already true in vault")
// do NOT produce a correction.
//
// Run: npx tsx src/fixtures/f13.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate } from '../harness/harness.ts';
import { VaultGroundTruthValidator, createDefaultGroundTruthRegistry, type VaultReader } from '../harness/ground-truth.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { parseRecipe } from '../recipes/parser.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';
import { CorrectionsMemory } from '../memory/kinds.ts';
import type { MemoryEntry, MemoryStorage } from '../memory/store.ts';
import type { LoadedRecipe } from '../recipes/types.ts';

class FakeStorage implements MemoryStorage {
    files = new Map<string, string>();

    async read(path: string): Promise<string> {
        if (!this.files.has(path)) throw new Error(`File not found: ${path}`);
        return this.files.get(path)!;
    }

    async write(path: string, content: string): Promise<void> {
        this.files.set(path, content);
    }

    async exists(path: string): Promise<boolean> {
        return this.files.has(path);
    }
}

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F13 FAIL: ${msg}`);
}

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

# Instructions
Target note: {{targetPath}}
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
- primitive: frontmatter-not-contains
  path: /tag
  params: {"key":"tags"}
`;

async function main(): Promise<void> {
    console.log('[F13] harness writes corrections on failures');

    const parsed = parseRecipe(recipeSource, 'fixture://tag-suggest-test.md');
    assert(parsed.ok && parsed.recipe !== undefined, 'recipe should parse');
    const recipe: LoadedRecipe = { ...parsed.recipe!, sourcePath: 'fixture://tag-suggest-test.md' };

    const storage = new FakeStorage();
    const corrections = new CorrectionsMemory(storage);

    // S1: schema error -> correction written.
    {
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient('this is not json'),
            inputGatherer: new ManualInputGatherer(new Map([['targetPath', 'notes/empty.md']])),
            approvalGate: new StaticApprovalGate(true),
            applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/empty.md': '' })),
            corrections,
        });
        await harness.run(recipe, { targetPath: 'notes/empty.md' }, {});
        const ctx = await corrections.getContext('tag-suggest-test', 5);
        assert(ctx.text.includes('schema-error'), 'S1 correction should record schema-error');
        console.log('[F13] PASS: S1 schema error correction');
    }

    // S2: ground-truth failure -> NO correction written (it is vault state, not a
    // model mistake).
    {
        const vaultReader: VaultReader = {
            getFileFrontmatter(path: string) {
                if (path === 'notes/tagged.md') return { tags: ['existing'] };
                return null;
            },
            async readFile(_path: string) {
                return null;
            },
        };
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(JSON.stringify({ tag: 'existing', reason: 'already there', confidence: 0.9 })),
            inputGatherer: new ManualInputGatherer(new Map([['targetPath', 'notes/tagged.md']])),
            approvalGate: new StaticApprovalGate(true),
            applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/tagged.md': '---\ntags:\n  - existing\n---\nBody.' })),
            groundTruthValidator: new VaultGroundTruthValidator(createDefaultGroundTruthRegistry(), vaultReader),
            corrections,
        });
        await harness.run(recipe, { targetPath: 'notes/tagged.md' }, {});
        const ctx = await corrections.getContext('tag-suggest-test', 5);
        assert(!ctx.text.includes('ground-truth'), 'S2 should NOT record ground-truth correction');
        console.log('[F13] PASS: S2 ground-truth failure does not write correction');
    }

    // S3: apply failure -> correction written.
    {
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(JSON.stringify({ tag: 'new-tag', reason: 'fresh', confidence: 0.8 })),
            inputGatherer: new ManualInputGatherer(new Map([['targetPath', 'notes/missing.md']])),
            approvalGate: new StaticApprovalGate(true),
            applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({})),
            corrections,
        });
        await harness.run(recipe, { targetPath: 'notes/missing.md' }, {});
        const ctx = await corrections.getContext('tag-suggest-test', 5);
        assert(ctx.text.includes('apply-failed'), 'S3 correction should record apply-failed');
        console.log('[F13] PASS: S3 apply failure correction');
    }

    // S4: corrections persisted.
    const content = storage.files.get('Agents/Huginn/MEMORY/corrections.md') ?? '';
    assert(content.includes('tag-suggest-test'), 'S4 corrections file should mention recipe');
    console.log('[F13] PASS: S4 corrections persisted');

    // S5: rejection with reason writes a refusal correction.
    {
        const freshStorage = new FakeStorage();
        const freshCorrections = new CorrectionsMemory(freshStorage);
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(JSON.stringify({ tag: 'new-tag', reason: 'fresh', confidence: 0.8 })),
            inputGatherer: new ManualInputGatherer(new Map([['targetPath', 'notes/empty.md']])),
            approvalGate: new StaticApprovalGate(false, 'tag is too vague'),
            applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp({ 'notes/empty.md': '' })),
            corrections: freshCorrections,
        });
        await harness.run(recipe, { targetPath: 'notes/empty.md' }, {});
        const ctx = await freshCorrections.getContext('tag-suggest-test', 5);
        assert(ctx.text.includes('refusal'), 'S5 should record refusal correction');
        assert(ctx.text.includes('too vague'), 'S5 should include the rejection reason');
        console.log('[F13] PASS: S5 rejection reason recorded');
    }

    console.log('[F13] VERDICT: GREEN');
}

void main();
