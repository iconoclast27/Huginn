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
}

export const DEFAULT_SETTINGS: HuginnSettings = {
    ollamaUrl: 'http://localhost:11434',
    ollamaChatModel: 'qwen3.5:4b',
    chatTimeoutMs: 60000,
};

export function sanitizeSettings(saved: unknown): HuginnSettings {
    const out: HuginnSettings = { ...DEFAULT_SETTINGS };
    if (saved === null || typeof saved !== 'object') return out;
    const s = saved as Record<string, unknown>;

    if (typeof s.ollamaUrl === 'string') {
        out.ollamaUrl = s.ollamaUrl.replace(/\/$/, '');
    }
    if (typeof s.ollamaChatModel === 'string') {
        out.ollamaChatModel = s.ollamaChatModel;
    }
    if (typeof s.chatTimeoutMs === 'number' && Number.isFinite(s.chatTimeoutMs) && s.chatTimeoutMs > 0) {
        out.chatTimeoutMs = s.chatTimeoutMs;
    } else if (typeof s.chatTimeoutMs === 'string') {
        const n = Number(s.chatTimeoutMs);
        if (Number.isFinite(n) && n > 0) out.chatTimeoutMs = n;
    }

    return out;
}
