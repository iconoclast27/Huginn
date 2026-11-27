// =============================================================================
// Huginn — Curated Manifest (the model-facing verb surface)
// src/manifest/manifest.ts
//
// The curated manifest IS the model-facing surface (Restart Ledger §4; the
// Design Report §4 family table is the map to measured APIs — receipts in
// docs/research/, Muninn root). The client leg hands manifestTools() to
// Ollama /api/chat `tools:`; the validator leg resolves names against
// MANIFEST (known-command, typed params, vault-rooting); the gate leg reads
// `mutation` (D-4: only the write set pauses at the modal). The manifest
// NAMES and SHAPES families — it does not re-implement what a family already
// reaches (Design Report §4); execution lands at the validator/client legs.
//
// Descriptions are the teach layer (D-10; ollama-tool-calling §3.2: the
// schemas' description fields are where teach attaches). Names and
// description text are law-bearing: they do not move without Dan's act.
// Policed by H-f42 (src/fixtures/f42.ts).
// =============================================================================

export interface VerbParamProperty {
    type: string; // JSON-Schema primitive name
    description?: string;
}

export interface VerbParameters {
    type: 'object';
    properties: Record<string, VerbParamProperty>;
    required?: string[];
}

export interface ManifestVerb {
    /** Namespaced model-facing name, connector__tool precedent (external-command-surfaces §2). */
    name: string;
    /** Teach-surface text: payload shaping + family-confusion teaching (D-10). */
    description: string;
    parameters: VerbParameters;
    /** Gate law (D-4): true exactly for the write surface the modal covers (Design Report §1). */
    mutation: boolean;
    /**
     * Mapping-surface flag (obsidian-verb-surface §3 receipts): 'official' =
     * official obsidian.d.ts; 'core-typings' = community core typings type the
     * real core surface (D-9 + Dan's measured act); 'core-untyped' = present
     * at runtime but NOT in the official published typings — R5 finding,
     * runtime verification owed at first green, with written justification;
     * 'door' = the Muninn door (Muninn's narrowed-contract act leads any
     * shape change here — T15 gating; this entry states the model-facing
     * verb only and touches no door code).
     */
    surface: 'official' | 'core-typings' | 'core-untyped' | 'door';
}

export const MANIFEST: readonly ManifestVerb[] = [
    // --- Structure reads — Obsidian is the source (D-1; verb-surface §1/§2) ---
    {
        name: 'vault__listFolder',
        description: 'List a folder: the direct children (names and paths) of one vault-relative folder path. Obsidian owns paths and structure.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative folder path' } }, required: ['path'] },
        mutation: false,
        surface: 'official',
    },
    {
        name: 'vault__readNote',
        description: 'Read a note: the full body of one note at a vault-relative path (note paths end .md). Obsidian owns paths and structure.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative note path, .md' } }, required: ['path'] },
        mutation: false,
        surface: 'official',
    },
    {
        name: 'vault__tags',
        description: 'Answer the tags of one note at a vault-relative path, from Obsidian\'s own metadata cache — Obsidian owns tags.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative note path' } }, required: ['path'] },
        mutation: false,
        surface: 'official',
    },
    {
        name: 'vault__properties',
        description: 'Answer the frontmatter properties of one note at a vault-relative path — Obsidian owns frontmatter.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative note path' } }, required: ['path'] },
        mutation: false,
        surface: 'official',
    },
    {
        name: 'vault__links',
        description: 'Answer the outgoing links of one note at a vault-relative path — Obsidian owns links.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative note path' } }, required: ['path'] },
        mutation: false,
        surface: 'official',
    },
    {
        name: 'vault__headings',
        description: 'Answer the heading outline of one note at a vault-relative path — Obsidian owns structure.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative note path' } }, required: ['path'] },
        mutation: false,
        surface: 'official',
    },

    // --- Lexical retrieval (verb-surface §3: core search, NOT officially typed) ---
    {
        name: 'vault__searchVault',
        description: 'Find notes containing exact words (lexical search through Obsidian\'s own index — cheap and exact). For questions of meaning or similarity — "notes like X" — call muninn__notesLike instead; never use this family for similarity.',
        parameters: { type: 'object', properties: { query: { type: 'string', description: 'exact words / Obsidian search query' } }, required: ['query'] },
        mutation: false,
        surface: 'core-untyped',
    },

    // --- Palette commands (D-9 + Dan's measured act: executeCommandById, ids namespace:name) ---
    {
        name: 'command__list',
        description: 'List the callable Obsidian palette command ids (format namespace:name, e.g. daily-notes:show-today). The palette is Obsidian\'s addressed surface.',
        parameters: { type: 'object', properties: {} },
        mutation: false,
        surface: 'core-typings',
    },
    {
        name: 'command__execute',
        description: 'Execute one Obsidian palette command by its exact id (format namespace:name, e.g. daily-notes:show-today). The palette is Obsidian\'s addressed surface.',
        parameters: { type: 'object', properties: { id: { type: 'string', description: 'command id, namespace:name' } }, required: ['id'] },
        mutation: false,
        surface: 'core-typings',
    },

    // --- The door family (D-2: exactly one verb; honest label is law, Ledger §2.2) ---
    {
        name: 'muninn__notesLike',
        description: 'Find notes like the given text: ranked semantic results with similarity scores. Results are a similarity match, not a lexical hit, not freshness. For exact words call vault__searchVault instead; never treat these scores as exactness or recency.',
        parameters: {
            type: 'object',
            properties: {
                text: { type: 'string', description: 'what the notes should be like' },
                limit: { type: 'integer', description: 'max results (optional)' },
            },
            required: ['text'],
        },
        mutation: false,
        surface: 'door',
    },

    // --- Write set: EXACTLY the families D-4's gate law covers (Design Report §1) ---
    {
        name: 'vault__create',
        description: 'Create a NEW note at a vault-relative path (.md) with the given content — fails if the path already exists. Gated: the approval modal pauses before apply.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative new note path, .md' }, content: { type: 'string', description: 'whole note body' } }, required: ['path', 'content'] },
        mutation: true,
        surface: 'official',
    },
    {
        name: 'vault__write',
        description: 'Overwrite (modify) the whole body of an existing note at a vault-relative path. Gated: the diff against the note\'s current content shows at the approval modal before apply.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative note path, .md' }, content: { type: 'string', description: 'new whole body' } }, required: ['path', 'content'] },
        mutation: true,
        surface: 'official',
    },
    {
        name: 'vault__append',
        description: 'Append content to the end of a note at a vault-relative path (memory stores append this way). Gated.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative note path, .md' }, content: { type: 'string', description: 'content to append' } }, required: ['path', 'content'] },
        mutation: true,
        surface: 'official',
    },
    {
        name: 'vault__delete',
        description: 'Delete the note at a vault-relative path. Gated.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative note path, .md' } }, required: ['path'] },
        mutation: true,
        surface: 'official',
    },
    {
        name: 'vault__rename',
        description: 'Rename a note from one vault-relative path to another (both .md). Gated: a rename\'s whole diff is its path change — old path -> new path shows at the modal.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'existing vault-relative note path' }, newPath: { type: 'string', description: 'new vault-relative note path, .md' } }, required: ['path', 'newPath'] },
        mutation: true,
        surface: 'official',
    },
    {
        name: 'vault__createFolder',
        description: 'Create a folder at a vault-relative path. Gated.',
        parameters: { type: 'object', properties: { path: { type: 'string', description: 'vault-relative folder path' } }, required: ['path'] },
        mutation: true,
        surface: 'official',
    },
];

/**
 * Compile to the Ollama /api/chat `tools:` element shape
 * (ollama-tool-calling.md §1): {type:'function', function:{name, description, parameters}}.
 * The client leg sends this array; nothing else re-declares the surface.
 */
export function manifestTools(): Array<{
    type: 'function';
    function: { name: string; description: string; parameters: VerbParameters };
}> {
    return MANIFEST.map((verb) => ({
        type: 'function',
        function: {
            name: verb.name,
            description: verb.description,
            parameters: verb.parameters,
        },
    }));
}

/** The gate leg's read of the law: which verbs pause at the modal (D-4). */
export function mutationVerbs(): string[] {
    return MANIFEST.filter((verb) => verb.mutation).map((verb) => verb.name);
}
