// =============================================================================
// Huginn — Frozen Muninn API Door (mirror)
// src/muninn-api.ts
//
// This file mirrors the frozen public API surface exported by Muninn (Plugin 1).
// It is a compile-time contract only; at runtime Huginn obtains the live API
// object from the Muninn plugin instance. Do not extend or rename shapes here
// without first changing Muninn's src/api.ts.
// =============================================================================

export interface Hit {
    path: string;
    ord: number;
    bs: number;
    be: number;
    title: string;
    text: string;
}

export interface TextSearchResult {
    hits: Hit[];
    mode: 'bm25' | 'scan';
}

export interface SemanticSearchResult {
    hits: Hit[];
}

export interface ChunkRef {
    path: string;
    ord: number;
    bs: number;
    be: number;
    title: string;
    text: string;
}

export interface TagInfo {
    tag: string;
    files: number;
    chunks: number;
}

export interface ReindexProgress {
    phase: 'wipe' | 'walk' | 'embed';
    done: number;
    total: number;
}

export interface ReindexResult {
    files: number;
    chunks: number;
    embedded: number;
    durationMs: number;
}

export interface MuninnApi {
    searchText(query: string): TextSearchResult | null;
    searchSemantic(text: string): Promise<SemanticSearchResult | null>;
    relatedChunks(path: string, k: number): { neighbors: ChunkRef[] } | null;
    tagVocabulary(): { tags: TagInfo[] } | null;
    forceReindex(onProgress?: (p: ReindexProgress) => void): Promise<ReindexResult | null>;
}
