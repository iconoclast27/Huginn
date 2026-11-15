// =============================================================================
// Huginn — F30: recipe-param inputs never borrow the note path as a fallback
// src/fixtures/f30.ts
//
// Suspected defect, stated before the fixture was written: `gather.ts:46`
// resolves every `recipe-param` input as `params[input.key] ??
// defaultTargetPath`, so a param that is not a path — `verbosity` — silently
// resolves to the TARGET NOTE PATH when the caller does not pass it.
// `main.ts:283` (the command-modal path) passes `{ targetPath, titleQuery }`
// with no `verbosity`, so `task-extraction`'s prompt renders
// `Verbosity: notes/gamma.md`: the model is told a file path is a verbosity
// setting. This fixture asserts the contract the rule demands: a non-path
// recipe-param must resolve to null, never to the note path, and the rendered
// prompt must never carry a note path in a non-path param slot.
//
// Legs:
//   S1 — a param the caller supplies resolves to the supplied value.
//   S2 — a param the caller does NOT supply, that is not targetPath, resolves
//        to null, not to defaultTargetPath (the red).
//   S3 — targetPath itself keeps the documented fallback to defaultTargetPath,
//        normalized with .md (the f15/f19 contract, guarded against over-correction).
//   S4 — the rendered prompt's Verbosity line contains no note path.
//
// Run: npx tsx src/fixtures/f30.ts
// Exit 0 = the gatherer does not borrow the note path for non-path params.
// =============================================================================

import { MuninnApiInputGatherer, type MuninnVaultLike } from '../harness/gather.ts';
import { createRenderContext, renderRecipe } from '../recipes/renderer.ts';
import type { LoadedRecipe } from '../recipes/types.ts';
import type { MuninnApi, ChunkRef, TagInfo } from '../muninn-api.ts';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F30 FAIL: ${msg}`);
}

const fakeApi: MuninnApi = {
    searchText(_query: string): import('../muninn-api.ts').TextSearchResult | null {
        return null;
    },
    searchSemantic(_text: string): Promise<import('../muninn-api.ts').SemanticSearchResult | null> {
        return Promise.resolve(null);
    },
    relatedChunks(_path: string, _k: number): { neighbors: ChunkRef[] } | null {
        return { neighbors: [] };
    },
    tagVocabulary(): { tags: TagInfo[] } | null {
        return { tags: [{ tag: 'ai', files: 1, chunks: 1 }] };
    },
    forceReindex(_onProgress?: (p: import('../muninn-api.ts').ReindexProgress) => void): Promise<import('../muninn-api.ts').ReindexResult | null> {
        return Promise.resolve({ files: 1, chunks: 1, embedded: 1, durationMs: 1 });
    },
};

const fakeVault: MuninnVaultLike = {
    getAbstractFileByPath(path: string): unknown {
        return path === 'notes/gamma.md' ? { path, extension: 'md' } : null;
    },
    async cachedRead(file: unknown): Promise<string> {
        const f = file as { path: string };
        return f.path === 'notes/gamma.md' ? '# Gamma\nBody.' : '';
    },
};

// A fixture recipe with the same input shape task-extraction uses: targetPath
// and a non-path recipe-param named verbosity, referenced in the prompt body.
const VERBOSITY_RECIPE: LoadedRecipe = {
    metadata: { name: 'verbosity-test', version: '0.1.0', modelTier: 'fast', riskClass: 'read-only' },
    trigger: { description: 'test' },
    sourcePath: 'fixture://verbosity-test.md',
    inputs: [
        { key: 'targetPath', description: 'target', source: 'recipe-param' },
        { key: 'verbosity', description: 'How verbose the returned text should be (minimal, normal, verbose)', source: 'recipe-param' },
    ],
    instructions: 'Target note path: {{targetPath}}\n\nVerbosity: {{verbosity}}\n\nReturn raw JSON only.',
    outputSchema: { type: 'object', properties: {} },
    applyMethod: 'noop',
    validation: [],
};

async function main(): Promise<void> {
    console.log('[F30] recipe-param inputs never borrow the note path');

    const gatherer = new MuninnApiInputGatherer({
        api: fakeApi,
        app: { vault: fakeVault },
        defaultTargetPath: 'notes/gamma',
    });

    // S1: the caller supplies verbosity (the chat path does) — the setting wins.
    const supplied = await gatherer.gather(VERBOSITY_RECIPE, { targetPath: 'notes/gamma.md', verbosity: 'verbose' });
    const verbositySupplied = supplied.find((i) => i.key === 'verbosity')?.value;
    assert(verbositySupplied === 'verbose', `S1: supplied verbosity must be used, got ${JSON.stringify(verbositySupplied)}`);

    // S2: the caller does not supply verbosity (the command-modal path does not)
    // — verbosity must NOT resolve to the note path. This is the red.
    const missing = await gatherer.gather(VERBOSITY_RECIPE, { targetPath: 'notes/gamma.md' });
    const verbosityMissing = missing.find((i) => i.key === 'verbosity')?.value;
    assert(
        verbosityMissing !== 'notes/gamma.md' && verbosityMissing !== 'notes/gamma',
        `S2: verbosity must not borrow the note path as fallback, got ${JSON.stringify(verbosityMissing)}`,
    );
    assert(
        verbosityMissing === null || verbosityMissing === undefined,
        `S2: a non-path recipe-param with no caller value must resolve to null, got ${JSON.stringify(verbosityMissing)}`,
    );

    // S3: targetPath keeps its documented fallback, normalized with .md.
    const noTarget = await gatherer.gather(VERBOSITY_RECIPE, { verbosity: 'minimal' });
    const targetFallback = noTarget.find((i) => i.key === 'targetPath')?.value;
    assert(
        targetFallback === 'notes/gamma.md',
        `S3: targetPath must keep the normalized defaultTargetPath fallback, got ${JSON.stringify(targetFallback)}`,
    );

    // S4: the rendered prompt must never show a note path in the Verbosity slot.
    const rendered = renderRecipe(createRenderContext(VERBOSITY_RECIPE, missing), '');
    const verbosityLine = rendered.prompt.split('\n').find((l) => l.startsWith('Verbosity:')) ?? '';
    assert(
        !verbosityLine.includes('notes/gamma'),
        `S4: rendered prompt leaks the note path into the Verbosity slot: ${JSON.stringify(verbosityLine)}`,
    );

    console.log('[F30] S1 ok · S2 verbosityMissing=' + JSON.stringify(verbosityMissing) + ' · S3 targetFallback=' + JSON.stringify(targetFallback) + ' · S4 line=' + JSON.stringify(verbosityLine));
    console.log('[F30] VERDICT: GREEN — non-path recipe-params resolve to null, the prompt never carries a note path as a setting');
}

main().then(() => {
    process.exit(0);
}).catch((err) => {
    console.log('[F30] VERDICT: RED — ' + (err as Error).message);
    process.exit(1);
});
