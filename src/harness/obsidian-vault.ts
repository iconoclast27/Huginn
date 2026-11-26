// =============================================================================
// Huginn — Obsidian Vault Reader
// src/harness/obsidian-vault.ts
//
// Concrete VaultReader backed by Obsidian's metadata cache. This is the only
// module in the harness that imports from 'obsidian'; it stays small and
// replaceable in tests.
// =============================================================================

import { App, TFile } from 'obsidian';
// Conform 2026-11-26 (baseline surgery, Restart Ledger §11): the VaultReader
// type lived in src/harness/ground-truth.ts, demolished at the ground state.
// This module is the reader's natural home; the type rides here and the new
// validator (red-first rebuild) will consume it.
export interface VaultReader {
    /** Return the parsed frontmatter object for a vault path, or null if the file does not exist. */
    getFileFrontmatter(path: string): Record<string, unknown> | null;
    /** Return the raw file body for a vault path, or null if the file does not exist. */
    readFile(path: string): Promise<string | null>;
}

export class ObsidianVaultReader implements VaultReader {
    constructor(private app: App) {}

    getFileFrontmatter(path: string): Record<string, unknown> | null {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!file || !(file instanceof TFile)) {
            return null;
        }
        const cache = this.app.metadataCache.getFileCache(file);
        return (cache?.frontmatter as Record<string, unknown>) ?? {};
    }

    async readFile(path: string): Promise<string | null> {
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!file || !(file instanceof TFile)) {
            return null;
        }
        try {
            return await this.app.vault.cachedRead(file);
        } catch {
            return null;
        }
    }
}
