// =============================================================================
// Huginn — Obsidian Memory Storage
// src/memory/obsidian-storage.ts
//
// MemoryStorage implementation backed by Obsidian's Vault. Creates the MEMORY
// folder if it does not exist and appends/reads Markdown memory files.
// =============================================================================

import { normalizePath, TFile, TFolder, type Vault, type DataWriteOptions } from 'obsidian';
import type { MemoryStorage } from './store.ts';

export class ObsidianMemoryStorage implements MemoryStorage {
    constructor(private vault: Vault) {}

    async read(path: string): Promise<string> {
        const normalized = normalizePath(path);
        const file = this.vault.getAbstractFileByPath(normalized);
        if (!file || !(file instanceof TFile)) {
            throw new Error(`Memory file not found: ${path}`);
        }
        return this.vault.cachedRead(file);
    }

    async write(path: string, content: string): Promise<void> {
        const normalized = normalizePath(path);
        await this.ensureFolder(normalized);
        const file = this.vault.getAbstractFileByPath(normalized);
        if (file && file instanceof TFile) {
            await this.vault.modify(file, content);
        } else {
            await this.vault.create(normalized, content);
        }
    }

    async exists(path: string): Promise<boolean> {
        const normalized = normalizePath(path);
        const file = this.vault.getAbstractFileByPath(normalized);
        return file instanceof TFile;
    }

    private async ensureFolder(path: string): Promise<void> {
        const parts = path.split('/');
        parts.pop(); // drop file name
        let current = '';
        for (const part of parts) {
            current = current ? `${current}/${part}` : part;
            const folder = this.vault.getAbstractFileByPath(normalizePath(current));
            if (!folder || !(folder instanceof TFolder)) {
                await this.vault.createFolder(normalizePath(current));
            }
        }
    }
}
