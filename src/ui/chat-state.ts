// =============================================================================
// Huginn — Chat Sidebar State
// src/ui/chat-state.ts
//
// Serializable state for the Huginn chat sidebar view. Kept free of Obsidian
// dependencies so it can be unit-tested in Node fixtures.
// =============================================================================

export type ChatRole = 'system' | 'user' | 'assistant';

export interface HuginnChatMessage {
    role: ChatRole;
    content: string;
}

export interface HuginnChatState extends Record<string, unknown> {
    messages: HuginnChatMessage[];
    activeNotePath: string | null;
    activeNoteContent: string | null;
}

export function emptyChatState(): HuginnChatState {
    return { messages: [], activeNotePath: null, activeNoteContent: null };
}

function isChatMessage(v: unknown): v is HuginnChatMessage {
    if (v === null || typeof v !== 'object') return false;
    const m = v as Record<string, unknown>;
    return (m.role === 'system' || m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string';
}

export function sanitizeChatState(raw: unknown): HuginnChatState | null {
    if (raw === null || typeof raw !== 'object') return null;
    const r = raw as Record<string, unknown>;
    const out = emptyChatState();

    if (typeof r.activeNotePath === 'string') {
        out.activeNotePath = r.activeNotePath;
    }

    if (typeof r.activeNoteContent === 'string' || r.activeNoteContent === null) {
        out.activeNoteContent = r.activeNoteContent;
    }

    if (Array.isArray(r.messages)) {
        out.messages = r.messages.filter(isChatMessage);
    }

    return out;
}
