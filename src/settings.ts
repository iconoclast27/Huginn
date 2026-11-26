// =============================================================================
// Huginn — Plugin Settings
// src/settings.ts
//
// Huginn owns the chat model and skill timeout settings. These settings live
// in Plugin 2, not in Muninn.
// =============================================================================

export type ReportBackVerbosity = 'minimal' | 'normal' | 'verbose';

/** Memory Feedback Loop, Step 8 (2026-11-23): per-kind retrieval budgets and the three
 *  score weights a tester can tune. Names mirror ranker.ts budgets and MemoryWeights.
 *  Conform 2026-11-26: the corrections kind's budgets were dropped with the kind (Dan's D-12). */
export interface MemorySettings {
    userEntryBudget: number;
    userCharBudget: number;
    summaryEntryBudget: number;
    summaryCharBudget: number;
    recencyWeight: number;
    recurrenceWeight: number;
    usefulnessWeight: number;
}

export interface HuginnSettings {
    ollamaUrl: string;
    ollamaChatModel: string;
    chatTimeoutMs: number;
    warmupOnFocus: boolean;
    defaultTargetPath: string;
    reportBackVerbosity: ReportBackVerbosity;
    /** §6/R9 (ruled): the op loop's per-turn bound, default 12, slider-adjustable. */
    turnOpBound: number;
    /** Memory Feedback Loop, Step 8 (2026-11-23, docket addenda 28-31): retrieval budgets and
     *  the three score weights a tester can tune. First cut: defaults ride the ranker and the
     *  kinds; settings merge keeps old saved data valid. UI wiring is a later pass. */
    memory: MemorySettings;
}

export const DEFAULT_SETTINGS: HuginnSettings = {
    ollamaUrl: 'http://localhost:11434',
    ollamaChatModel: 'qwen3.5:4b',
    chatTimeoutMs: 120000,
    warmupOnFocus: false,
    defaultTargetPath: 'notes/gamma.md',
    reportBackVerbosity: 'verbose',
    turnOpBound: 12,
    memory: {
        userEntryBudget: 10,
        userCharBudget: 2000,
        summaryEntryBudget: 3,
        summaryCharBudget: 1500,
        recencyWeight: 1.0,
        recurrenceWeight: 0.5,
        usefulnessWeight: 1.0,
    },
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
    if (s.reportBackVerbosity === 'minimal' || s.reportBackVerbosity === 'normal' || s.reportBackVerbosity === 'verbose') {
        out.reportBackVerbosity = s.reportBackVerbosity;
    }
    // §6/R9 (H-f36 choice 1): the op bound is a positive integer; anything else
    // falls back to the ruled default 12. Mirrors the chatTimeoutMs guard shape.
    if (typeof s.turnOpBound === 'number' && Number.isInteger(s.turnOpBound) && s.turnOpBound > 0) {
        out.turnOpBound = s.turnOpBound;
    }
    // Loop Step 8: saved memory settings merge over the defaults field-wise; a missing
    // or malformed sub-object leaves the defaults intact (old saved data must not break).
    if (s.memory !== undefined && typeof s.memory === 'object') {
        const m = s.memory as Record<string, unknown>;
        const mem = out.memory as unknown as Record<string, number>;
        for (const budgetKey of ['userEntryBudget',
            'userCharBudget', 'summaryEntryBudget', 'summaryCharBudget']) {
            const v = m[budgetKey];
            if (typeof v === 'number' && Number.isFinite(v) && v > 0) mem[budgetKey] = v;
        }
        for (const weightKey of ['recencyWeight', 'recurrenceWeight', 'usefulnessWeight']) {
            const v = m[weightKey];
            if (typeof v === 'number' && Number.isFinite(v) && v >= 0) mem[weightKey] = v;
        }
    }

    return out;
}
