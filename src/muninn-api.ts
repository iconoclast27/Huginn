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

// T58 Stage A mirror conform (2026-11-26 — follows Muninn's src/api.ts door;
// Muninn leads, this mirrors). No ADR yet: the docket row stays OPEN and the
// field names below are the design draft's proposal, Dan's to fix at ruling.
export interface TieDisclosure {
    score: number;            // the score the cut sits at
    atScore: number;          // scored candidates sitting at that score
    returnedAtScore: number;  // how many of those the cut returned
}

export interface SemanticSearchResult {
    hits: Hit[];
    tie: TieDisclosure | null;
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
    embedNew: number;   // conformed 2026-11-23 per Muninn docs/decisions/adr-51.md (T47: the door renamed the field; pointer only — the law lives there)
    durationMs: number;
}

// Shapes authored from Muninn docs/decisions/adr-37.md (Accepted) — the contract of record.
export interface ListNotesFilter {
    folder?: string;    // vault-relative path prefix
    filename?: string;  // basename substring
    tag?: string;       // exact vocabulary tag, no prefix match
    lexical?: string;   // body words → FTS5 MATCH, mode 'bm25' — mirror conform 2026-11-23 (T38-(c) convention): an exactly-2-character lexical selector delegates to the scan lane and answers mode: 'scan' (mode names the mechanism that answered, Muninn docs/decisions/adr-50.md; the pre-conform wording is this line's authoring time)
    scan?: string;      // body substring → LIKE, mode 'scan'
    like?: string;      // semantic → embedded query + capped brute-force kNN, mode 'semantic'
    limit?: number;     // transport cap: rows handed back, optional, per recipe
    offset?: number;    // paging cursor over the same ORDER BY
}

export interface ListNotesRow {
    path: string;
    filename: string;
    header: string;
    mtime: number;
    tags: string[];
}

export interface ListNotesResult {
    notes: ListNotesRow[];
    total?: number; // set size counted before limit/offset — absent for the semantic lane (ADR-48: per-lane, optional on the type; Muninn-side law docs/decisions/adr-48.md, mirror-noted per T38-(c))
    mode: 'path' | 'tag' | 'bm25' | 'scan' | 'semantic';
}

export interface MuninnApi {
    searchText(query: string): TextSearchResult | null;
    searchSemantic(text: string): Promise<SemanticSearchResult | null>;
    relatedChunks(path: string, k: number): { neighbors: ChunkRef[] } | null;
    tagVocabulary(): { tags: TagInfo[] } | null;
    // T58 (2026-11-26), Dan's ruling: manual reindex = FULL re-embed. rebuild
    // rides the frozen door shape as a defaulted trailing option — callers
    // that pass onProgress stay source-compatible; the startup walk stays delta.
    forceReindex(onProgress?: (p: ReindexProgress) => void, rebuild?: boolean): Promise<ReindexResult | null>;
    listNotes(filter: ListNotesFilter): Promise<ListNotesResult | null>;
}
