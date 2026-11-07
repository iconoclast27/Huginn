// =============================================================================
// Huginn — F19: Input gatherer normalizes missing .md suffix
// src/fixtures/f19.ts
//
// Verifies that MuninnApiInputGatherer adds .md to note paths before calling
// the Muninn API or reading the vault, so user and dispatcher paths that omit
// the extension still resolve.
//
// Run: npx tsx src/fixtures/f19.ts
// =============================================================================

import { MuninnApiInputGatherer, type MuninnVaultLike } from '../harness/gather.ts';
import type { LoadedRecipe } from '../recipes/types.ts';
import type { MuninnApi, TagInfo, ChunkRef } from '../muninn-api.ts';

function assert(cond: boolean, msg: string): void {
    if (!cond) throw new Error(`F19 FAIL: ${msg}`);
}

const fakeApi: MuninnApi = {
    searchText(_query: string): import('../muninn-api.ts').TextSearchResult | null {
        return null;
    },
    searchSemantic(_text: string): Promise<import('../muninn-api.ts').SemanticSearchResult | null> {
        return Promise.resolve(null);
    },
    relatedChunks(_path: string, _k: number): { neighbors: ChunkRef[] } | null {
        return { neighbors: [{ path: 'notes/gamma.md', ord: 0, bs: 0, be: 5, title: 'Gamma', text: 'chunk' }] };
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

async function main(): Promise<void> {
    console.log('[F19] input gatherer normalizes missing .md suffix');

    const gatherer = new MuninnApiInputGatherer({ api: fakeApi, app: { vault: fakeVault }, defaultTargetPath: 'notes/gamma' });

    const recipe: LoadedRecipe = {
        metadata: { name: 'path-test', version: '0.1.0', modelTier: 'fast', riskClass: 'suggest' },
        trigger: { description: 'test' },
        sourcePath: 'fixture://path-test.md',
        inputs: [
            { key: 'targetPath', description: 'target', source: 'recipe-param' },
            { key: 'body', description: 'content', source: 'content' },
            { key: 'related', description: 'related chunks', source: 'path' },
        ],
        instructions: '',
        outputSchema: { type: 'object', properties: {} },
        applyMethod: 'noop',
        validation: [],
    };

    const inputs = await gatherer.gather(recipe, { targetPath: 'notes/gamma' });

    const targetPath = inputs.find((i) => i.key === 'targetPath')?.value;
    const body = inputs.find((i) => i.key === 'body')?.value;
    const related = inputs.find((i) => i.key === 'related')?.value;

    assert(targetPath === 'notes/gamma.md', `S1 targetPath should be normalized to .md, got ${JSON.stringify(targetPath)}`);
    assert(typeof body === 'string' && body.includes('Gamma'), `S2 content read should return note body, got ${JSON.stringify(body)}`);
    assert(
        related !== null && typeof related === 'object' && Array.isArray((related as { neighbors?: unknown }).neighbors),
        'S3 path input should normalize and return related chunks',
    );

    console.log('[F19] PASS: S1 target path normalized');
    console.log('[F19] PASS: S2 content read resolved normalized path');
    console.log('[F19] PASS: S3 path-input resolved normalized path');
    console.log('[F19] VERDICT: GREEN');
}

void main();
