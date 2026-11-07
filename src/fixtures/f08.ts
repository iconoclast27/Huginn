// =============================================================================
// Huginn — F08: Write-class suggest routines mutate the note body
// src/fixtures/f08.ts
//
// Exercises the generic apply primitives (append-frontmatter-array, set-first-heading,
// append-section) against an in-memory fake vault and verifies the resulting file contents.
//
// Run: npx tsx src/fixtures/f08.ts
// =============================================================================

import { HuginnHarness, ManualInputGatherer, StaticApprovalGate } from '../harness/harness.ts';
import { FakeLlmClient } from '../llm/client.ts';
import { createDefaultApplyRegistry } from '../harness/apply.ts';
import { loadRecipes } from '../recipes/loader.ts';
import { NodeRecipeSource } from '../recipes/node-source.ts';
import { createApplyOptionsForFakeApp, createFakeApp } from './fake-app.ts';

async function main(): Promise<void> {
    let failures = 0;
    console.log('[F08] write-class suggest routines mutate the note body');

    const files: Record<string, string> = {
        'notes/TagMe.md': 'No frontmatter yet.\n\nSome body text.',
        'notes/TitleMe.md': 'Old first heading\n\nBody paragraph.',
        'notes/LinkMe.md': 'This note should link elsewhere.\n\nMore text.',
    };
    const fakeApp = createFakeApp(files);
    const applyOptions = createApplyOptionsForFakeApp(files);

    const source = new NodeRecipeSource('src/recipes');
    const loadResult = await loadRecipes(source);

    const tagRecipe = loadResult.recipes.find((r) => r.metadata.name === 'tag-assignment');
    const titleRecipe = loadResult.recipes.find((r) => r.metadata.name === 'title-suggestion');
    const linkRecipe = loadResult.recipes.find((r) => r.metadata.name === 'link-suggestion');

    // append-frontmatter-array
    if (tagRecipe) {
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(JSON.stringify({ tag: 'index', reason: 'test', confidence: 0.8 })),
            inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
                ['targetPath', 'notes/TagMe.md'],
                ['vocabulary', { tags: [{ tag: 'index', files: 1, chunks: 1 }] }],
                ['relatedChunks', { neighbors: [] }],
                ['titleQuery', 'tag'],
                ['relatedTextHits', { hits: [] }],
            ])),
            approvalGate: new StaticApprovalGate(true),
            applyRegistry: createDefaultApplyRegistry(applyOptions),
        });
        const result = await harness.run(tagRecipe, { targetPath: 'notes/TagMe.md' }, {});
        const content = files['notes/TagMe.md'];
        if (!result.applyResult?.applied || !content.includes('tags:') || !content.includes('- index')) {
            failures++;
            console.log('[F08] RED: tag-assignment did not write expected frontmatter');
            console.log('[F08]   content:', JSON.stringify(content));
        } else {
            console.log('[F08] PASS: tag-assignment wrote frontmatter tag');
        }
    } else {
        failures++;
        console.log('[F08] RED: tag-assignment recipe not found');
    }

    // set-first-heading
    if (titleRecipe) {
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(JSON.stringify({ title: 'Better Title', reason: 'test', confidence: 0.8 })),
            inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
                ['targetPath', 'notes/TitleMe.md'],
                ['content', files['notes/TitleMe.md']],
                ['vocabulary', { tags: [] }],
            ])),
            approvalGate: new StaticApprovalGate(true),
            applyRegistry: createDefaultApplyRegistry(applyOptions),
        });
        const result = await harness.run(titleRecipe, { targetPath: 'notes/TitleMe.md' }, {});
        const content = files['notes/TitleMe.md'];
        const hasHeading = content.includes('# Better Title\n');
        const hasFrontmatterTitle = content.includes('---\ntitle: Better Title\n') || content.includes('\ntitle: Better Title\n');
        if (!result.applyResult?.applied || !hasHeading || !hasFrontmatterTitle) {
            failures++;
            console.log('[F08] RED: title-suggestion did not set heading and frontmatter title');
            console.log('[F08]   content:', JSON.stringify(content));
        } else {
            console.log('[F08] PASS: title-suggestion set heading and frontmatter title');
        }
    } else {
        failures++;
        console.log('[F08] RED: title-suggestion recipe not found');
    }

    // append-section
    if (linkRecipe) {
        const harness = new HuginnHarness({
            llmClient: new FakeLlmClient(JSON.stringify({ links: ['notes/alpha.md', 'notes/beta.md'], confidence: 0.7 })),
            inputGatherer: new ManualInputGatherer(new Map<string, unknown>([
                ['targetPath', 'notes/LinkMe.md'],
                ['content', files['notes/LinkMe.md']],
                ['relatedChunks', { neighbors: [] }],
                ['titleQuery', 'link'],
                ['relatedTextHits', { hits: [] }],
            ])),
            approvalGate: new StaticApprovalGate(true),
            applyRegistry: createDefaultApplyRegistry(applyOptions),
        });
        const result = await harness.run(linkRecipe, { targetPath: 'notes/LinkMe.md' }, {});
        const content = files['notes/LinkMe.md'];
        if (!result.applyResult?.applied || !content.includes('[[notes/alpha]]') || !content.includes('[[notes/beta]]')) {
            failures++;
            console.log('[F08] RED: link-suggestion did not append links');
            console.log('[F08]   content:', JSON.stringify(content));
        } else {
            console.log('[F08] PASS: link-suggestion appended wikilinks');
        }
    } else {
        failures++;
        console.log('[F08] RED: link-suggestion recipe not found');
    }

    console.log(
        failures === 0
            ? '[F08] VERDICT: GREEN'
            : `[F08] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

void main();
