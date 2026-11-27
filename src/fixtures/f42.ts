// =============================================================================
// Huginn — F42: The curated manifest (model-facing verb surface)
// src/fixtures/f42.ts
//
// POLICED: src/manifest/manifest.ts (the curated manifest = the model-facing
// surface, Restart Ledger §4; the Design Report §4 family table is the map).
//
// CONTRACT TEXT:
//   V1  Every verb name is namespaced (connector__tool precedent,
//       external-command-surfaces.md §2) and unique.
//   V2  Exactly one muninn__ verb exists, and it is muninn__notesLike —
//       D-2: the door is ONE verb family in the manifest; door expansion
//       deferred (OQ-G).
//   V3  The verbs marked mutation are EXACTLY the write surface the gate
//       law covers (Design Report §1: create, write(modify), append,
//       delete, rename, createFolder) — none missing, none extra.
//   V4  Read/tool-family verbs are not marked mutation (reads ungated,
//       §3 gate law).
//   V5  manifestTools() compiles the Ollama /api/chat tools-element shape
//       (ollama-tool-calling.md §1): {type:'function', function:{name,
//       description, parameters}}; every parameters is a JSON-Schema
//       object literal; mutation verbs require 'path'.
//   V6  muninn__notesLike carries the honest label in its description —
//       the law sentence is Restart Ledger §2.2 ("a similarity match,
//       not a lexical hit, not freshness"); the exact phrase is pinned.
//   V7  The teach layer rides the descriptions (D-10; ollama-tool-calling
//       §3.2): the two retrieval families name each other — searchVault's
//       description reaches the notesLike class and vice versa.
//   V8  Surface flags are machine-readable receipts for the mapping
//       (obsidian-verb-surface.md §3): exactly one core-untyped verb,
//       and it is vault__searchVault (the R5 finding — runtime
//       verification is owed at first green, at the client leg); the
//       command verbs flag core-typings (community core typings — Dan's
//       measured act, D-9); muninn__notesLike flags door; the rest
//       flag official (obsidian.d.ts).
//   V9  No Huginn-owned verb claims the semantic family — no non-muninn
//       name matching /like|semantic|embed|neighbor/; no muninn__ verb
//       for paths, tags, or lexical search (the manifest must NOT
//       re-implement what a family already reaches, Design Report §4).
//
// CHOICES (disclosed, Dan's to fix at review — not smuggled as fidelity):
//   - Number H-f42 continues the survivor chain (f41 was the highest number
//     ever issued); retired numbers f21–f38 gaps are record, not slots.
//   - Namespaces: vault__/command__ for Obsidian families, muninn__ for the
//     door. Verb naming follows the Design Report §4 table names
//     (readNote, create/write/append/delete/rename/createFolder, searchVault,
//     tags/properties/links/headings) with __ prefixing.
//   - Palette verbs named command__list/command__execute, after the
//     ecosystem precedent command_list/command_execute
//     (external-command-surfaces.md §1 L454/455 + §2 naming note).
//
// RED AT THE COMMITTED HEAD (measured in a scratch copy of the HEAD tree):
//   the module src/manifest/manifest.ts does not exist at HEAD — the fixture
//   throws at the seam (MODULE_NOT_FOUND), exit 1. The seam itself is the
//   subject: no leg can pass against code that is absent (the f31-import-absence
//   precedent). F02's S6 legs below red at HEAD the same way: old settings.ts
//   has no approvalMode, so sanitize drops it and the enum legs fail per-leg.
//
// RUNNER: npx tsx src/fixtures/f42.ts
// =============================================================================

import { MANIFEST, manifestTools } from '../manifest/manifest.ts';

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
    if (cond) {
        console.log(`  PASS  ${name}`);
    } else {
        failures++;
        console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

const NAMESPACED = /^[a-z]+__[a-z][A-Za-z0-9]*$/;

const GATED_SET = [
    'vault__create',
    'vault__write',
    'vault__append',
    'vault__delete',
    'vault__rename',
    'vault__createFolder',
];

function main(): void {
    console.log('[F42] Huginn — curated manifest verb surface');

    // V1
    const names = MANIFEST.map((v) => v.name);
    check('V1 namespaced', names.every((n) => NAMESPACED.test(n)),
        names.filter((n) => !NAMESPACED.test(n)).join(','));
    check('V1 unique names', new Set(names).size === names.length);

    // V2
    const muninn = names.filter((n) => n.startsWith('muninn__'));
    check('V2 exactly one muninn__ verb', muninn.length === 1, `found: ${muninn.join(',')}`);
    check('V2 it is muninn__notesLike', muninn.length === 1 && muninn[0] === 'muninn__notesLike');

    // V3 + V4 (the gate law's write set, exactly)
    const gated = MANIFEST.filter((v) => v.mutation).map((v) => v.name).sort();
    check('V3 gated set exact', gated.join('|') === GATED_SET.slice().sort().join('|'),
        `got: ${gated.join('|')}`);
    check('V4 ungated families present', MANIFEST.filter((v) => !v.mutation).map((v) => v.name).sort().join('|') === [
        'command__execute', 'command__list', 'muninn__notesLike',
        'vault__headings', 'vault__links', 'vault__listFolder', 'vault__properties',
        'vault__readNote', 'vault__searchVault', 'vault__tags',
    ].join('|'));

    // V5
    const tools = manifestTools();
    check('V5 one tool per verb', tools.length === MANIFEST.length);
    check('V5 element shape', tools.every((t) =>
        t.type === 'function' &&
        NAMESPACED.test(t.function.name) &&
        typeof t.function.description === 'string' &&
        t.function.parameters.type === 'object' &&
        typeof t.function.parameters.properties === 'object'));
    check('V5 mutation verbs require path', MANIFEST.every((v) =>
        !v.mutation || (v.parameters.required ?? []).includes('path')));

    // V6 (the law sentence, Restart Ledger §2.2, pinned verbatim)
    const nl = MANIFEST.find((v) => v.name === 'muninn__notesLike');
    check('V6 honest label verbatim',
        nl !== undefined && nl.description.includes('similarity match, not a lexical hit, not freshness'),
        nl && nl.description);

    // V7 (teach pair — the two retrieval families name each other)
    const sv = MANIFEST.find((v) => v.name === 'vault__searchVault');
    check('V7 searchVault reaches the notesLike class',
        sv !== undefined && /notesLike/.test(sv.description));
    check('V7 notesLike reaches the lexical class',
        nl !== undefined && /searchVault/.test(nl.description));

    // V8 (surface flags as receipts)
    const surfaceOf = (n: string) => MANIFEST.find((v) => v.name === n)?.surface;
    check('V8 searchVault is the only core-untyped verb',
        names.filter((n) => surfaceOf(n) === 'core-untyped').join('|') === 'vault__searchVault');
    check('V8 command verbs flag core-typings',
        surfaceOf('command__execute') === 'core-typings' && surfaceOf('command__list') === 'core-typings');
    check('V8 notesLike flags door', surfaceOf('muninn__notesLike') === 'door');
    check('V8 the rest flag official',
        MANIFEST.every((v) =>
            v.name === 'vault__searchVault' || v.name.startsWith('command__') ||
            v.name === 'muninn__notesLike' || v.surface === 'official'));

    // V9 (no second source of semantic truth; no door re-implementation)
    check('V9 no Huginn verb claims semantics',
        names.filter((n) => !n.startsWith('muninn__')).every((n) => !/like|semantic|embed|neighbor/.test(n)));
    check('V9 no muninn__ verb for reached families',
        muninn.every((n) => !/path|folder|tag|link|heading|lexical|search|read|write/.test(n.slice(7))));

    console.log(
        failures === 0
            ? '[F42] VERDICT: GREEN'
            : `[F42] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

main();
