// =============================================================================
// Huginn — F26: Infra failures do not become corrections (regression guard)
// src/fixtures/f26.ts
//
// Regression test: when the LLM client returns null (timeout/abort/HTTP
// failure), the run must report schemaValid === false but must NOT append
// any correction entry — infrastructure failures are not model mistakes.
// Genuine schema errors (model produced invalid output) still write
// corrections; that contract is guarded by F13.
//
// Run: npx tsx src/fixtures/f26.ts
// Exit 0 = guards intact. Nonzero exit = a fix regressed.
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate } from '../harness/harness.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { parseRecipe } from '../recipes/parser.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';
import { CorrectionsMemory } from '../memory/kinds.ts';
import type { LoadedRecipe } from '../recipes/types.ts';

class FakeStorage {
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
  if (!cond) throw new Error(`F26 FAIL: ${msg}`);
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
  console.log('[F26] infra failures do not become corrections');

  const parsed = parseRecipe(recipeSource, 'fixture://tag-suggest-null.md');
  assert(parsed.ok && parsed.recipe !== undefined, 'recipe should parse');
  const recipe: LoadedRecipe = { ...parsed.recipe!, sourcePath: 'fixture://tag-suggest-null.md' };

  const storage = new FakeStorage();
  const corrections = new CorrectionsMemory(storage);
  let appendCallCount = 0;

  // Track every append() call.
  const originalAppend = corrections.append.bind(corrections);
  corrections.append = async function (...args: Parameters<typeof originalAppend>) {
    appendCallCount++;
    console.log(`[F26] append() called (count=${appendCallCount}) with type=${(args[0] as any).type}`);
    return originalAppend.apply(corrections, args);
  };

  // LLM client that simulates infrastructure failure.
  const nullLlmClient = {
    async complete(_prompt: string): Promise<string | null> {
      return null;
    },
  } as any;

  const applyRegistry = createDefaultApplyRegistry(createApplyOptionsForFakeApp({}));

  const harness = new HuginnHarness({
    llmClient: nullLlmClient,
    inputGatherer: new ManualInputGatherer(new Map([['targetPath', 'notes/test.md']])),
                                    approvalGate: new StaticApprovalGate(true),
                                    applyRegistry,
                                    corrections,
  });

  console.log('[F26] Running recipe with null-returning LLM client...');
  const result = await harness.run(recipe, { targetPath: 'notes/test.md' }, {});

  console.log('\n--- Results ---');
  console.log(`schemaValid: ${result.schemaValid} (expected: false)`);
  console.log(`appendCallCount: ${appendCallCount} (expected: 0)`);
  console.log(`schemaErrors: ${JSON.stringify(result.schemaErrors)}`);

  // Guards: throw (nonzero exit) if either regresses.
  assert(result.schemaValid === false, `Expected schemaValid === false but got ${result.schemaValid}`);
  assert(appendCallCount === 0, `Expected appendCallCount === 0 but got ${appendCallCount} — regression: corrections written on infra failure`);

  console.log('\n[F26] VERDICT: GREEN — infra failure reported as invalid, no correction written');
  console.log('[F26] Fixture complete');
  process.exit(0);
}

void main();
