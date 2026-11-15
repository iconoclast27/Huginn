// =============================================================================
// Huginn — F29: tag-assignment proposes up to two tags
// src/fixtures/f29.ts
//
// Dan's ruling (2026-11-14): the model instruction says "up to two tags"; the
// harness accepts 1-2 and enforces no ceiling; when one proposed tag is already
// in the note's frontmatter, the harness STRIPS that proposal and applies the
// rest; `reason` stays one sentence covering the whole proposal.
//
// Two seams, kept separate so one red names one cause:
//
// A. Strip seam (fixture-local array recipe, `two-tag-strip-test`)
//    The array shape is schema-valid under the pre-fix validator, so the harness
//    reaches ground truth and the strip state is what gets tested, not the schema.
//    Pre-fix behaviour, traced: valuesMatch compares the frontmatter array against
//    the proposal ARRAY with `some(v === outputValue)`, which is false for
//    array-vs-array, so frontmatter-not-contains reports NO error. The vault-truth
//    check is blind to array output: duplicates pass, nothing is dropped, the
//    approval modal shows the already-true tag, and the apply message claims
//    'Added existing, fresh' when only fresh was written.
//      S2 — ['existing','fresh'] vs a note tagged 'existing': ground truth must
//           pass with 'existing' recorded as dropped; approval must show 'fresh'
//           and NOT 'existing'; only 'fresh' is written; 'existing' stays present
//           exactly once; no correction (a vault-truth drop is not a model mistake).
//      S3 — ['existing','otherExisting'] vs a note tagged with both: ground truth
//           must FAIL (the run says "already reflected"), the approval gate must
//           never be consulted, nothing is applied, no correction written (f13 S2
//           invariant).
//
// B. Contract seam (the shipped recipe loaded from src/recipes)
//      S1 — two new tags: schema-valid, both appended, apply message names both.
//      S4 — one tag in the array is a complete run (prose allows one).
//      S5 — the old {"tag": string} shape must be schema-INVALID, so the change
//           cannot pass by silently accepting the old proposal shape. Guard leg:
//           green is the post-fix expectation; today it passes, so the contract
//           is not yet strict in the direction that matters.
//      S6 — the prompt the model actually sees must ask for two tags. The Output
//           Contract never reaches the prompt (renderer.ts returns
//           outputSchemaText; harness.ts:76 sends only `prompt`), so prose is the
//           model-facing contract. Pre-fix: "propose exactly one tag".
//      S7 — apply reads the proposal through valuePath, and valuePath must name
//           the array field. Pre-fix: valuePath 'tag' resolves to undefined for an
//           array proposal, so the array is invisible to the write.
//      S8 — the shipped contract's applyParams and validation path point at
//           `tags`, not the single-tag field.
//
// Red must fail at the intended seams, not at an import/mock error. All legs run
// and report before any assert, so one receipt shows the whole picture.
//
// Run: npx tsx src/fixtures/f29.ts
// Exit 0 = two-tag proposals run, vault-truth drops are stripped, approval sees
// survivors. Nonzero exit = tag-assignment is still single-tag and/or array
// output is not stripped.
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate, type ApprovalGate, type ApprovalRequest, type ApprovalResult } from '../harness/harness.ts';
import { VaultGroundTruthValidator, createDefaultGroundTruthRegistry, type VaultReader } from '../harness/ground-truth.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { parseRecipe } from '../recipes/parser.ts';
import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { resolveOutputField } from '../ui/render-utils.ts';
import { createApplyOptionsForFakeApp } from './fake-app.ts';
import { CorrectionsMemory } from '../memory/kinds.ts';
import type { MemoryStorage } from '../memory/store.ts';
import type { LoadedRecipe } from '../recipes/types.ts';

function assert(cond: boolean, msg: string): asserts cond {
    if (!cond) throw new Error(`F29 FAIL: ${msg}`);
}

const TARGET = 'notes/TagMe.md';
const EXISTING = 'existing';
const OTHER_EXISTING = 'otherExisting';
const CORRECTIONS = 'Agents/Huginn/MEMORY/corrections.md';

/** Array-shaped recipe used to test the strip seam without touching the shipped contract. */
const STRIP_RECIPE_SOURCE = `---
name: two-tag-strip-test
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
Suggest up to two tags for the target note.

# Inputs
- key: targetPath
  description: Path to the note to tag.
  source: recipe-param

# Instructions
Target note: {{targetPath}}
Return JSON with tags (array), reason, and confidence.

# Output Contract
{
  "type": "object",
  "required": ["tags", "reason", "confidence"],
  "properties": {
    "tags": { "type": "array", "items": { "type": "string" } },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-frontmatter-array

# Apply Params
{
  "key": "tags",
  "valuePath": "tags"
}

# Validation
- primitive: frontmatter-not-contains
  path: /tags
  description: The proposed tags must not already be in the target note's frontmatter tags.
  params: {"key":"tags"}
`;

function loadStripRecipe(): LoadedRecipe {
    const parsed = parseRecipe(STRIP_RECIPE_SOURCE, 'fixture://two-tag-strip-test.md');
    assert(parsed.ok && parsed.recipe !== undefined, `fixture seam: strip recipe must parse (not a red) — ${parsed.errors.join('; ')}`);
    return { ...parsed.recipe!, sourcePath: 'fixture://two-tag-strip-test.md' };
}

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

/** Frontmatter reader for the target note; body text is trivial. */
function vaultReader(frontmatter: Record<string, Record<string, unknown>>): VaultReader {
    return {
        getFileFrontmatter(path: string) {
            return frontmatter[path] ?? null;
        },
        async readFile(path: string) {
            return frontmatter[path] ? `Body of ${path}` : null;
        },
    };
}

/** Records whether the approval gate was consulted, and the last request it saw. */
class RecordingGate implements ApprovalGate {
    calls = 0;
    request: ApprovalRequest | null = null;

    async approve(request: ApprovalRequest): Promise<ApprovalResult | null> {
        this.calls += 1;
        this.request = request;
        return { approved: true };
    }
}

function inputs(map: Record<string, unknown>): ManualInputGatherer {
    return new ManualInputGatherer(new Map<string, unknown>(Object.entries(map)));
}

interface RunOutcome {
    schemaValid: boolean;
    schemaErrors: string;
    gtValid: boolean;
    gtErrors: string;
    dropped: string[];
    applied: boolean | null;
    message: string | null;
    gateCalls: number;
    approvalShown: string;
    approvalTags: string;
    corrections: boolean;
    content: string;
}

function report(name: string, o: RunOutcome): void {
    console.log(
        `[F29] ${name}: schemaValid=${o.schemaValid} gtValid=${o.gtValid} dropped=${JSON.stringify(o.dropped)} ` +
        `applied=${o.applied} gateCalls=${o.gateCalls} corrections=${o.corrections} msg=${JSON.stringify(o.message)} ` +
        `approvalShown=${o.approvalShown} content=${JSON.stringify(o.content)}`,
    );
    if (o.schemaErrors !== '[]') console.log(`[F29] ${name} schemaErrors: ${o.schemaErrors}`);
    if (o.gtErrors !== '[]') console.log(`[F29] ${name} gtErrors: ${o.gtErrors}`);
}

async function main(): Promise<void> {
    console.log('[F29] tag-assignment proposes up to two tags');

    const loadResult = await loadRecipes(new NodeRecipeSource('src/recipes'));
    assert(loadResult.errors.length === 0, `fixture seam: shipped recipes must parse (not a red) — ${loadResult.errors.join('; ')}`);
    const found = loadResult.recipes.find((r) => r.metadata.name === 'tag-assignment');
    assert(found !== undefined, 'fixture seam: tag-assignment must exist in src/recipes (not a red)');
    const shipped: LoadedRecipe = found!;
    const stripRecipe = loadStripRecipe();

    // ---------- A. strip seam ----------

    // S2: one proposal is already true in the vault; the survivor must run.
    const s2Files: Record<string, string> = { [TARGET]: '---\ntags:\n  - existing\n---\nBody.' };
    const s2Gate = new RecordingGate();
    const s2Storage = new FakeStorage();
    const s2 = await new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ tags: [EXISTING, 'fresh'], reason: 'existing is already on the note, fresh is the missing facet', confidence: 0.8 })),
        inputGatherer: inputs({ targetPath: TARGET }),
        approvalGate: s2Gate,
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp(s2Files)),
        groundTruthValidator: new VaultGroundTruthValidator(createDefaultGroundTruthRegistry(), vaultReader({ [TARGET]: { tags: [EXISTING] } })),
        corrections: new CorrectionsMemory(s2Storage),
    }).run(stripRecipe, { targetPath: TARGET }, {});

    const s2out = outcome(s2, s2Gate, s2Storage, s2Files);
    report('S2 (strip seam, array recipe)', s2out);

    // S3: every proposal is already true; the run must stop before approval.
    const s3Files: Record<string, string> = { [TARGET]: '---\ntags:\n  - existing\n  - otherExisting\n---\nBody.' };
    const s3Gate = new RecordingGate();
    const s3Storage = new FakeStorage();
    const s3 = await new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ tags: [EXISTING, OTHER_EXISTING], reason: 'both tags already describe this note', confidence: 0.9 })),
        inputGatherer: inputs({ targetPath: TARGET }),
        approvalGate: s3Gate,
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp(s3Files)),
        groundTruthValidator: new VaultGroundTruthValidator(createDefaultGroundTruthRegistry(), vaultReader({ [TARGET]: { tags: [EXISTING, OTHER_EXISTING] } })),
        corrections: new CorrectionsMemory(s3Storage),
    }).run(stripRecipe, { targetPath: TARGET }, {});

    const s3out = outcome(s3, s3Gate, s3Storage, s3Files);
    report('S3 (strip seam, all duplicates)', s3out);

    // ---------- B. contract seam ----------

    // S1: two new tags are a complete run against the shipped recipe.
    const s1Files: Record<string, string> = { [TARGET]: '---\ntags:\n  - otherExisting\n---\nBody.' };
    const s1Gate = new RecordingGate();
    const s1 = await new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ tags: ['index', 'taxonomy'], reason: 'note is about indexing, both fit the vocabulary', confidence: 0.8 })),
        inputGatherer: inputs({
            targetPath: TARGET,
            vocabulary: { tags: [{ tag: 'index', files: 3, chunks: 4 }, { tag: 'taxonomy', files: 2, chunks: 2 }] },
            relatedChunks: { neighbors: [] },
            titleQuery: 'tag-assignment',
            relatedTextHits: { hits: [] },
        }),
        approvalGate: s1Gate,
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp(s1Files)),
        groundTruthValidator: new VaultGroundTruthValidator(createDefaultGroundTruthRegistry(), vaultReader({ [TARGET]: { tags: ['otherExisting'] } })),
    }).run(shipped, { targetPath: TARGET }, {});

    const s1out = outcome(s1, s1Gate, new FakeStorage(), s1Files);
    report('S1 (contract, shipped recipe)', s1out);

    // S4: a single tag in the array is a complete run.
    const s4Files: Record<string, string> = { [TARGET]: '---\ntags:\n  - otherExisting\n---\nBody.' };
    const s4 = await new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ tags: ['solo'], reason: 'one clear facet', confidence: 0.7 })),
        inputGatherer: inputs({
            targetPath: TARGET,
            vocabulary: { tags: [{ tag: 'solo', files: 2, chunks: 2 }] },
            relatedChunks: { neighbors: [] },
            titleQuery: 'tag-assignment',
            relatedTextHits: { hits: [] },
        }),
        approvalGate: new StaticApprovalGate(true),
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp(s4Files)),
        groundTruthValidator: new VaultGroundTruthValidator(createDefaultGroundTruthRegistry(), vaultReader({ [TARGET]: { tags: ['otherExisting'] } })),
    }).run(shipped, { targetPath: TARGET }, {});

    const s4out = outcome(s4, new RecordingGate(), new FakeStorage(), s4Files);
    report('S4 (contract, single tag)', s4out);

    // S5: the old single-string shape must be rejected by the two-tag contract.
    const s5Files: Record<string, string> = { [TARGET]: '---\ntags:\n  - otherExisting\n---\nBody.' };
    const s5 = await new HuginnHarness({
        llmClient: new FakeLlmClient(JSON.stringify({ tag: 'index', reason: 'old shape', confidence: 0.8 })),
        inputGatherer: inputs({
            targetPath: TARGET,
            vocabulary: { tags: [] },
            relatedChunks: { neighbors: [] },
            titleQuery: 'tag-assignment',
            relatedTextHits: { hits: [] },
        }),
        approvalGate: new StaticApprovalGate(true),
        applyRegistry: createDefaultApplyRegistry(createApplyOptionsForFakeApp(s5Files)),
        groundTruthValidator: new VaultGroundTruthValidator(createDefaultGroundTruthRegistry(), vaultReader({ [TARGET]: { tags: ['otherExisting'] } })),
    }).run(shipped, { targetPath: TARGET }, {});

    const s5out = outcome(s5, new RecordingGate(), new FakeStorage(), s5Files);
    report('S5 (contract, old shape rejected)', s5out);

    // S7/S8: the shipped contract's own pointers.
    const valuePath = String(shipped.applyParams?.valuePath ?? null);
    const s7Values = resolveOutputField({ tags: ['index', 'taxonomy'], reason: 'x', confidence: 0.8 }, valuePath);
    const s8Paths = shipped.validation.map((r) => r.path);
    console.log(`[F29] S7: valuePath=${JSON.stringify(valuePath)} resolved=${JSON.stringify(s7Values)}`);
    console.log(`[F29] S8: validationPaths=${JSON.stringify(s8Paths)} applyParams=${JSON.stringify(shipped.applyParams ?? null)}`);

    // ---------- asserts ----------

    // A. strip seam: vault truth drops the duplicate, the survivor runs.
    assert(s2out.schemaValid, `S2: array proposal must be schema-valid — ${s2out.schemaErrors}`);
    assert(s2out.gtValid, `S2: ground truth must pass when a survivor remains — ${s2out.gtErrors}`);
    assert(s2out.dropped.includes(EXISTING), `S2: ${EXISTING} must be recorded as dropped (strip stage missing?), got ${JSON.stringify(s2out.dropped)}`);
    assert(s2out.dropped.length === 1, `S2: exactly one proposal dropped, got ${JSON.stringify(s2out.dropped)}`);
    assert(s2out.gateCalls === 1, `S2: approval must be consulted for the survivor, got ${s2out.gateCalls} calls`);
    assert(s2out.approvalTags.includes('fresh'), `S2: approval must show the survivor, got ${s2out.approvalTags}`);
    assert(!s2out.approvalTags.includes(EXISTING), `S2: approval must NOT show the dropped proposal, got ${s2out.approvalTags}`);
    assert(s2out.applied === true, `S2: the survivor must be applied — ${JSON.stringify(s2out.message)}`);
    assert(s2Files[TARGET].includes('- fresh'), `S2: frontmatter must gain fresh, content ${JSON.stringify(s2Files[TARGET])}`);
    assert((s2Files[TARGET].match(/\n  - existing/g) ?? []).length === 1, `S2: existing present exactly once, content ${JSON.stringify(s2Files[TARGET])}`);
    assert(s2out.corrections === false, `S2: a vault-truth drop is not a model mistake, no correction, got ${JSON.stringify(s2Storage.files.get(CORRECTIONS) ?? '')}`);

    // A. strip seam: all duplicates stop before approval.
    assert(s3out.gtValid === false, `S3: all proposals already true must fail ground truth, got valid with dropped=${JSON.stringify(s3out.dropped)} — the check is blind to array output`);
    assert(s3out.dropped.includes(EXISTING) && s3out.dropped.includes(OTHER_EXISTING), `S3: both proposals recorded as dropped, got ${JSON.stringify(s3out.dropped)}`);
    assert(s3out.gateCalls === 0, `S3: approval gate must not be consulted, got ${s3out.gateCalls} calls`);
    assert(s3out.applied === null, `S3: nothing applied, got ${JSON.stringify(s3out.applied)} / ${JSON.stringify(s3out.message)}`);
    assert(s3out.corrections === false, `S3: ground-truth failure writes no correction, got ${JSON.stringify(s3Storage.files.get(CORRECTIONS) ?? '')}`);

    // B. contract seam: two new tags run against the shipped recipe.
    assert(s1out.schemaValid, `S1: two-tag proposal must be schema-valid against the shipped recipe — ${s1out.schemaErrors}`);
    assert(s1out.gtValid, `S1: ground truth must pass — ${s1out.gtErrors}`);
    assert(s1out.applied === true, `S1: apply must run — ${JSON.stringify(s1out.message)}`);
    assert(s1Files[TARGET].includes('- index'), `S1: frontmatter must gain index, content ${JSON.stringify(s1Files[TARGET])}`);
    assert(s1Files[TARGET].includes('- taxonomy'), `S1: frontmatter must gain taxonomy, content ${JSON.stringify(s1Files[TARGET])}`);
    assert(s1out.gateCalls === 1, `S1: approval must be consulted once, got ${s1out.gateCalls} calls`);
    assert(String(s1out.message).includes('index'), `S1: apply message must name index, got ${JSON.stringify(s1out.message)}`);
    assert(String(s1out.message).includes('taxonomy'), `S1: apply message must name taxonomy, got ${JSON.stringify(s1out.message)}`);

    // B. contract seam: one tag is a complete run.
    assert(s4out.schemaValid, `S4: single-tag array must be schema-valid — ${s4out.schemaErrors}`);
    assert(s4out.applied === true, `S4: single tag must be applied — ${JSON.stringify(s4out.message)}`);
    assert(s4Files[TARGET].includes('- solo'), `S4: frontmatter must gain solo, content ${JSON.stringify(s4Files[TARGET])}`);

    // B. contract seam: the old shape is rejected, nothing applied.
    assert(s5out.schemaValid === false, `S5: {"tag": string} must be schema-invalid under the two-tag contract, got valid`);
    assert(s5out.applied === null, `S5: nothing applied for an invalid proposal, got ${JSON.stringify(s5out.message)}`);

    // B. contract seam: the model-facing prompt asks for two tags.
    assert(/two/.test(s1.renderedPrompt), `S6: the prompt the model sees must ask for two tags, got ${JSON.stringify(s1.renderedPrompt.slice(0, 240))}`);
    assert(!/exactly one tag/.test(s1.renderedPrompt), `S6: the prompt must not say "exactly one tag", got ${JSON.stringify(s1.renderedPrompt.slice(0, 240))}`);

    // B. contract seam: apply and validation point at the array field.
    assert(Array.isArray(s7Values) && (s7Values as string[]).length === 2, `S7: valuePath ${JSON.stringify(valuePath)} must resolve the 2-tag array, got ${JSON.stringify(s7Values)}`);
    assert(shipped.applyParams?.valuePath === 'tags', `S8: apply valuePath must be tags, got ${JSON.stringify(shipped.applyParams ?? null)}`);
    assert(shipped.validation.some((r) => r.path === '/tags'), `S8: validation must check /tags, got ${JSON.stringify(s8Paths)}`);

    console.log('\n[F29] VERDICT: GREEN — array proposals run, vault-truth drops are stripped, approval sees survivors, shipped contract points at tags');
    console.log('[F29] Fixture complete');
    process.exit(0);
}

function outcome(result: { schemaValid: boolean; schemaErrors: { message: string }[]; groundTruthValid: boolean; groundTruthErrors: { message: string }[]; applyResult: { applied: boolean; message: string } | null; parsedOutput: { json: unknown } }, gate: RecordingGate, storage: FakeStorage, files: Record<string, string>): RunOutcome {
    const dropped = (result as { groundTruthDropped?: string[] }).groundTruthDropped ?? [];
    return {
        schemaValid: result.schemaValid,
        schemaErrors: JSON.stringify(result.schemaErrors),
        gtValid: result.groundTruthValid,
        gtErrors: JSON.stringify(result.groundTruthErrors),
        dropped,
        applied: result.applyResult ? result.applyResult.applied : null,
        message: result.applyResult ? result.applyResult.message : null,
        gateCalls: gate.calls,
        approvalShown: JSON.stringify(gate.request?.output ?? null),
        approvalTags: JSON.stringify((gate.request?.output as { tags?: string[] } | undefined)?.tags ?? null),
        corrections: storage.files.has(CORRECTIONS),
        content: files[TARGET],
    };
}

void main();
