// =============================================================================
// Huginn — Obsidian Vault Reader
// src/harness/obsidian-vault.ts
//
// Concrete VaultReader backed by Obsidian's metadata cache. This is the only
// module in the harness that imports from 'obsidian'; it stays small and
// replaceable in tests.
// =============================================================================

import { App, TFile } from 'obsidian';
import type { VaultReader } from './ground-truth.ts';

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
