// =============================================================================
// Huginn — Verb Surface: the manifest verbs' executors (step 6, leg 4: client wiring)
// src/harness/surface.ts
//
// Design Report §4's mapping made real: each manifest verb family reaches the
// measured API, nothing re-implemented (obsidian-verb-surface.md receipts live
// in the Muninn root's docs/research/; the manifest is the verb authority and
// H-f42 polices its set). Obsidian answers paths/folders/structure/lexical
// search/palette commands (D-1, Design §3); the door answers exactly "notes
// like X" (D-2). The write verbs land here ONLY as executors the gate has
// already approved (D-4: runTurn routes mutations through the gate before any
// executor is reached — gate.ts is the router; this file never gates).
//
// Disclosed at the leg (2026-11-27, client-wiring seam):
//  - Only the OFFICIAL typings are installed (`obsidian` latest, official
//    obsidian.d.ts — measured). Design §4's core-typings rows (palette
//    commands, `search.query`) are runtime-reached through feature-detected
//    casts, honest tool-errors when absent. Docket row "search.query runtime
//    verify" stays OPEN: the lexical shape here is shape-tolerant, verified
//    only at the merged smoke, NOT ruled.
//  - Vault enumeration: ONLY through Obsidian's own folder objects in-process
//    (getFolderByPath + TFolder.children — official, obsidian.d.ts:9959);
//    app.vault.getMarkdownFiles() never appears (no second source of truth).
//  - Honest labels are law: the notesLike block says similarity-not-lexical-
//    not-freshness (the manifest description teaches the model; the RESULT
//    says it too, so a quoted answer cannot launder it away).
//  - Cap numbers (folder listings 200, search/note-body 8000 chars) are the
//    executor's plumbing choice, disclosed; Dan's to fix at ruling.
// =============================================================================

import { App, TFile, TFolder } from 'obsidian';
import { ObsidianVaultReader } from './obsidian-vault.ts';
import type { VaultReader } from './obsidian-vault.ts';
import type { MuninnApi, SemanticSearchResult, Hit } from '../muninn-api.ts';
import type { TurnExecutor } from '../chat/turn.ts';

const FOLDER_LIST_CAP = 200;
const BODY_CAP = 8000;

function clip(text: string): string {
    return text.length <= BODY_CAP ? text : `${text.slice(0, BODY_CAP)}\n… [truncated at ${BODY_CAP} characters]`;
}

// A tag entry is a string or {tag} (Obsidian's frontmatter shape varies —
// measured in this vault's metadata cache, not the typings).
function tagLine(t: unknown): string {
    if (typeof t === 'string') return t;
    if (t && typeof t === 'object' && typeof (t as Record<string, unknown>).tag === 'string') {
        return String((t as Record<string, unknown>).tag);
    }
    return '';
}

export interface SurfaceRead {
    /** The client's read seam for the gate's modal diff (executor plumbing). */
    readCurrent(path: string): Promise<string | null>;
}

/**
 * The verb surface as `runTurn`'s executor map (Design Report §1: execute →
 * role:"tool" results; is_error on rejects). Every executor answers
 * {content} or {content, isError} — never throws: a failure is a machine-
 * readable tool error on the wire (Design :43, no exceptions).
 *
 * @param app The Obsidian app (structure/paths/palette authority).
 * @param muninnApi The live door object from Muninn's getMuninnApi(), or null
 *   when the door is absent (version skew): the verb then answers honestly.
 */
export function createVerbExecutors(app: App, muninnApi: MuninnApi | null): Record<string, TurnExecutor> {
    const reader: VaultReader = new ObsidianVaultReader(app);

    const guard = (name: string, body: () => Promise<{ content: string; isError?: boolean }>): Promise<{ content: string; isError?: boolean }> => {
        try {
            return body();
        } catch (e) {
            return Promise.resolve({ content: `'${name}' failed: ${(e as Error).message} — nothing was applied beyond this point.`, isError: true });
        }
    };

    const fileAt = (path: string): TFile | null => {
        const f = app.vault.getAbstractFileByPath(path);
        return f && f instanceof TFile ? f : null;
    };

    // Impl shape: every impl answers {content[, isError]} and never gates —
    // gating is the router's (gate.ts); this map is the surface's reach.
    const impls: Record<string, (a: Record<string, unknown>) => Promise<{ content: string; isError?: boolean }>> = {};

    // --- structure reads (verb-surface §1/§2) ---
    impls['vault__listFolder'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const folder = app.vault.getFolderByPath(String(a.path));
        if (!folder || !(folder instanceof TFolder)) {
            return { content: `no folder '${String(a.path)}' in the vault — Obsidian says it does not exist.`, isError: true };
        }
        const kids = folder.children.slice(0, FOLDER_LIST_CAP);
        const lines = kids.map((c) => `${c instanceof TFolder ? 'folder' : 'file'}\t${c.path}`);
        const more = folder.children.length - kids.length;
        return { content: clip(`Children of '${folder.path}' (${folder.children.length} total${more > 0 ? `, ${more} not shown` : ''})\n${lines.join('\n')}`) };
    };
    impls['vault__readNote'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const body = await reader.readFile(String(a.path));
        if (body === null) return { content: `no note '${String(a.path)}' in the vault.`, isError: true };
        return { content: clip(body) };
    };

    const cacheOf = async (path: string): Promise<Record<string, unknown> | null> => {
        const f = fileAt(path);
        if (!f) return null;
        const cache = app.metadataCache.getFileCache(f);
        return cache as Record<string, unknown> | null;
    };

    impls['vault__tags'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const cache = await cacheOf(String(a.path));
        if (!cache) return { content: `no note '${String(a.path)}' in the vault.`, isError: true };
        const raw = (cache.tags as unknown[]) ?? [];
        const tags = raw.map(tagLine).filter((t) => t.length > 0);
        return { content: `Tags of '${String(a.path)}' (Obsidian's own metadata cache): ${tags.join(', ') || 'none'}` };
    };
    impls['vault__properties'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const cache = await cacheOf(String(a.path));
        if (!cache) return { content: `no note '${String(a.path)}' in the vault.`, isError: true };
        const fm = cache.frontmatter as Record<string, unknown> | undefined;
        return { content: `Frontmatter properties of '${String(a.path)}' (Obsidian's own metadata cache): ${JSON.stringify(fm ?? {})}` };
    };
    impls['vault__links'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const cache = await cacheOf(String(a.path));
        if (!cache) return { content: `no note '${String(a.path)}' in the vault.`, isError: true };
        const links = ((cache.links as unknown[]) ?? []).map((l) => {
            const o = (l && typeof l === 'object' ? l : null) as Record<string, unknown> | null;
            const target = o && typeof o.link === 'string' ? String(o.link) : '';
            const original = o && typeof o.original === 'string' ? ` (as written: ${String(o.original)})` : '';
            return `${target}${original}`;
        });
        return { content: clip(`Outgoing links of '${String(a.path)}': ${links.join('\n') || 'none'}`) };
    };
    impls['vault__headings'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const cache = await cacheOf(String(a.path));
        if (!cache) return { content: `no note '${String(a.path)}' in the vault.`, isError: true };
        const heads = ((cache.headings as unknown[]) ?? []).map((h) => {
            const o = (h && typeof h === 'object' ? h : null) as Record<string, unknown> | null;
            const text = o && typeof o.heading === 'string' ? String(o.heading) : '';
            const level = o && typeof o.level === 'number' ? ` (h${String(o.level)})` : '';
            return `${text}${level}`;
        });
        return { content: clip(`Headings of '${String(a.path)}' (Obsidian's own metadata cache): ${heads.join('\n') || 'none'}`) };
    };

    // --- lexical retrieval: core's search, NOT officially typed (docket row
    //     "search.query runtime verify" stays OPEN; shape-tolerant, honest) ---
    impls['vault__searchVault'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const search = (app as unknown as { search?: { query?: (query: string, searchType: number, ctx: unknown) => unknown } }).search;
        if (!search || !search.query) {
            return { content: 'lexical search is not reachable in this Obsidian build (search.query absent) — say so honestly; do not invent results.', isError: true };
        }
        // SearchType.ALL_FILES === 0 (core's untyped runtime shape), current
        // note = -1; the docket row keeps this runtime-verified, not ruled.
        const res = search.query(String(a.query), 0, app.vault.getFolderByPath(''));
        const results = (res && typeof res === 'object' && Array.isArray((res as Record<string, unknown>).results)
            ? (res as Record<string, unknown>).results as unknown[]
            : []);
        const lines = results.map((r) => {
            const o = (r && typeof r === 'object' ? r : null) as Record<string, unknown> | null;
            const path = o && typeof o.path === 'string' ? String(o.path)
                : o && typeof o.filename === 'string' ? String(o.filename) : '';
            const matches = o && Array.isArray(o.matches) ? o.matches as unknown[] : [];
            const snippet = matches.length > 0 && typeof matches[0] === 'object'
                && typeof ((matches[0] as Record<string, unknown>).strMatch) === 'string'
                ? ` — ${(matches[0] as Record<string, unknown>).strMatch}` : '';
            return `${path}${snippet}`;
        }).filter((l) => l.length > 0);
        return { content: clip(`Lexical hits for '${String(a.query)}' (exact words, Obsidian's own index — NOT similarity): ${lines.join('\n') || 'none'}`) };
    };

    // --- palette commands (core-typings; runtime feature-detected) ---
    impls['command__list'] = async (_a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const commands = (app as unknown as { commands?: { getCommands?: (filterAlts: boolean) => unknown[] } }).commands;
        if (!commands || !commands.getCommands) {
            return { content: 'the palette surface (app.commands) is not reachable in this Obsidian build.', isError: true };
        }
        const list = commands.getCommands(false);
        const ids = list.map((c) => {
            const o = (c && typeof c === 'object' ? c : null) as Record<string, unknown> | null;
            if (!o) return '';
            const name = typeof o.name === 'string' ? String(o.name) : '';
            const ns = typeof o.namespace === 'string' ? `${String(o.namespace)}:` : '';
            const title = typeof o.title === 'string' ? ` — ${String(o.title)}` : '';
            return `${ns}${name}${title}`;
        }).filter((l) => l.length > 0);
        return { content: clip(`Callable palette ids (namespace:name): ${ids.join('\n') || 'none'}`) };
    };
    impls['command__execute'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const commands = (app as unknown as { commands?: { executeCommandById?: (id: string) => boolean } }).commands;
        if (!commands || !commands.executeCommandById) {
            return { content: 'the palette surface (app.commands) is not reachable in this Obsidian build.', isError: true };
        }
        const id = String(a.id);
        const ran = commands.executeCommandById(id);
        return { content: ran === true
            ? `Palette command '${id}' executed.`
            : `Palette command '${id}' was not found/not executed by Obsidian (returned false).` };
    };

    // --- the door family (the ONLY family with no native verb — D-2) ---
    impls['muninn__notesLike'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        if (!muninnApi) {
            return { content: 'the Muninn door is absent (Plugin 1 not loaded or version skew) — no similarity results. Say so; do not substitute lexical hits.', isError: true };
        }
        const res: SemanticSearchResult | null = await muninnApi.searchSemantic(String(a.text));
        if (res === null) return { content: 'the door answered null — no similarity results.', isError: true };
        const limit = typeof a.limit === 'number' && a.limit > 0 ? a.limit : res.hits.length;
        const lines = res.hits.slice(0, limit).map((h: Hit) => `${h.path}${h.title ? ` — ${h.title}` : ''}`);
        const tie = res.tie ? `\nTie disclosure: cut score ${String(res.tie.score)}, ${String(res.tie.atScore)} candidates at it, ${String(res.tie.returnedAtScore)} returned.` : '';
        return {
            content: clip(
                `Notes like '${String(a.text)}' — these are a SIMILARITY match, NOT a lexical hit, NOT freshness. Never present them as exactness or recency.\n${lines.join('\n') || 'none'}${tie}`,
            ),
        };
    };

    // --- writes: reached ONLY after the gate router approved (D-4) ---
    impls['vault__create'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const path = String(a.path);
        if (fileAt(path)) return { content: `'${path}' already exists — use vault__write to replace it; nothing was applied.`, isError: true };
        await app.vault.create(path, String(a.content));
        return { content: `Created note '${path}'.` };
    };
    impls['vault__write'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const f = fileAt(String(a.path));
        if (!f) return { content: `no note '${String(a.path)}' to overwrite — use vault__create; nothing was applied.`, isError: true };
        await app.vault.modify(f, String(a.content));
        return { content: `Wrote (overwrote) note '${String(a.path)}'.` };
    };
    impls['vault__append'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const f = fileAt(String(a.path));
        if (!f) return { content: `no note '${String(a.path)}' to append to; nothing was applied.`, isError: true };
        await app.vault.append(f, String(a.content));
        return { content: `Appended to note '${String(a.path)}'.` };
    };
    impls['vault__delete'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const f = fileAt(String(a.path));
        if (!f) return { content: `no note '${String(a.path)}' to delete; nothing was applied.`, isError: true };
        await app.vault.delete(f);
        return { content: `Deleted note '${String(a.path)}'.` };
    };
    impls['vault__rename'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        const f = fileAt(String(a.path));
        if (!f) return { content: `no note '${String(a.path)}' to rename; nothing was applied.`, isError: true };
        await app.vault.rename(f, String(a.newPath));
        return { content: `Renamed '${String(a.path)}' → '${String(a.newPath)}'.` };
    };
    impls['vault__createFolder'] = async (a: Record<string, unknown>): Promise<{ content: string; isError?: boolean }> => {
        await app.vault.createFolder(String(a.path));
        return { content: `Created folder '${String(a.path)}'.` };
    };

    // The guard wraps every impl: a thrown Obsidian failure becomes a
    // machine-readable role:"tool" error (Design :43 — no exceptions reach
    // the loop).
    const surface: Record<string, TurnExecutor> = {};
    Object.entries(impls).forEach(([name, impl]) => {
        surface[name] = (a: Record<string, unknown>) => guard(name, () => impl(a));
    });
    return surface;
}

export function createSurfaceRead(app: App): SurfaceRead {
    const reader = new ObsidianVaultReader(app);
    return { readCurrent: (path: string) => reader.readFile(path) };
}
