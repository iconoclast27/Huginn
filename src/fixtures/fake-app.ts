// =============================================================================
// Huginn — Fake App helper for fixtures
// src/fixtures/fake-app.ts
//
// Minimal Obsidian App stand-in that lets fixtures instantiate the real
// apply registry without loading the obsidian package at runtime.
// =============================================================================

export interface FakeFile {
    path: string;
    name: string;
    extension: string;
}

export interface FakeVault {
    getAbstractFileByPath(path: string): FakeFile | null;
    read(file: FakeFile): Promise<string>;
    modify(file: FakeFile, content: string): Promise<void>;
    cachedRead(file: FakeFile): Promise<string>;
}

export interface FakeApp {
    vault: FakeVault;
}

export function createFakeApp(files: Record<string, string>): FakeApp {
    return {
        vault: {
            getAbstractFileByPath(path: string): FakeFile | null {
                if (!Object.prototype.hasOwnProperty.call(files, path)) return null;
                return {
                    path,
                    name: path.split('/').pop() ?? path,
                    extension: 'md',
                };
            },
            async read(file: FakeFile): Promise<string> {
                return files[file.path] ?? '';
            },
            async modify(file: FakeFile, content: string): Promise<void> {
                files[file.path] = content;
            },
            async cachedRead(file: FakeFile): Promise<string> {
                return files[file.path] ?? '';
            },
        },
    };
}

export function createApplyOptionsForFakeApp(files: Record<string, string>): {
    resolveFile: (path: string) => unknown;
    readFile: (file: unknown) => Promise<string>;
    writeFile: (file: unknown, content: string) => Promise<void>;
} {
    const app = createFakeApp(files);
    return {
        resolveFile(path: string): unknown {
            return app.vault.getAbstractFileByPath(path);
        },
        async readFile(file: unknown): Promise<string> {
            return app.vault.read(file as FakeFile);
        },
        async writeFile(file: unknown, content: string): Promise<void> {
            app.vault.modify(file as FakeFile, content);
        },
    };
}
