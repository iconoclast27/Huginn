// =============================================================================
// Huginn — Plugin Settings
// src/settings.ts
//
// Huginn owns the chat model and skill timeout settings. These settings live
// in Plugin 2, not in Muninn.
// =============================================================================

export interface HuginnSettings {
    ollamaUrl: string;
    ollamaChatModel: string;
    chatTimeoutMs: number;
    warmupOnFocus: boolean;
    defaultTargetPath: string;
}

export const DEFAULT_SETTINGS: HuginnSettings = {
    ollamaUrl: 'http://localhost:11434',
    ollamaChatModel: 'qwen3.5:4b',
    chatTimeoutMs: 60000,
    warmupOnFocus: false,
    defaultTargetPath: 'notes/gamma.md',
};

export function sanitizeSettings(saved: unknown): HuginnSettings {
    const out: HuginnSettings = { ...DEFAULT_SETTINGS };
    if (saved === null || typeof saved !== 'object') return out;
    const s = saved as Record<string, unknown>;

    if (typeof s.ollamaUrl === 'string' && s.ollamaUrl.length > 0) {
        out.ollamaUrl = s.ollamaUrl.replace(/\/$/, '');
    }
    if (typeof s.ollamaChatModel === 'string' && s.ollamaChatModel.length > 0) {
        out.ollamaChatModel = s.ollamaChatModel;
    }
    if (typeof s.chatTimeoutMs === 'number' && Number.isFinite(s.chatTimeoutMs) && s.chatTimeoutMs > 0) {
        out.chatTimeoutMs = s.chatTimeoutMs;
    } else if (typeof s.chatTimeoutMs === 'string') {
        const n = Number(s.chatTimeoutMs);
        if (Number.isFinite(n) && n > 0) out.chatTimeoutMs = n;
    }
    if (typeof s.warmupOnFocus === 'boolean') {
        out.warmupOnFocus = s.warmupOnFocus;
    }
    if (typeof s.defaultTargetPath === 'string') {
        out.defaultTargetPath = s.defaultTargetPath;
    }

    return out;
}
