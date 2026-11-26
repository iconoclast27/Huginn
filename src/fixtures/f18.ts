// =============================================================================
// Huginn — F18: Reject Legacy Ground-Truth Recipe Format
//
// Verifies that recipes using the deprecated `source`/`check` validation
// format fail to parse after the refactor.
//
// Run: npx tsx src/fixtures/f18.ts
// =============================================================================

import { parseRecipe } from '../recipes/parser.ts';

const legacyRecipeSource = `---
name: legacy-validation-test
version: 0.1.0
modelTier: fast
riskClass: read-only
---

# Trigger
Test legacy validation rejection.

# Inputs
- key: targetPath
  description: Path to the note
  source: recipe-param

# Instructions
Return JSON.

# Output Contract
{
  "type": "object",
  "required": ["tag"],
  "properties": {
    "tag": { "type": "string" }
  }
}

# Apply Method
noop

# Validation
- path: /tag
  source: vault-file
  check: not-in-frontmatter
  params: {"key":"tags"}
`;

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F18 FAIL: ${msg}`);
}

async function main(): Promise<void> {
    console.log('[F18] reject legacy ground-truth format');

    const parsed = parseRecipe(legacyRecipeSource, 'fixture://legacy-validation-test.md');
    assert(!parsed.ok, 'legacy recipe should fail to parse');
    assert(parsed.errors.some((e) => e.includes("deprecated 'source'/'check'")), `expected deprecation error, got ${JSON.stringify(parsed.errors)}`);
    console.log('[F18] PASS: legacy source/check rejected');

    console.log('[F18] VERDICT: GREEN');
}

void main();
