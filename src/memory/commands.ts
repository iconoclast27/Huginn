// =============================================================================
// Huginn — User Memory Commands
// src/memory/commands.ts
//
// Parses explicit user memory commands in the chat sidebar. Examples:
//   "Remember that I prefer qwen2.5:14b for capable tasks."
//   "Add a memory: always use UK spelling."
//   "Don't suggest tags that are already in the note."
//   "Avoid: proposing titles with dates in them."
// =============================================================================

export interface UserMemoryCommand {
    type: 'remember' | 'avoid' | 'preference' | 'fact';
    key: string;
    note: string;
}

const COMMAND_PATTERNS: { type: UserMemoryCommand['type']; regex: RegExp }[] = [
    { type: 'remember', regex: /^\s*(?:remember|note|add a memory|memorize)\s*(?:that\s*)?(.+)$/is },
    { type: 'avoid', regex: /^\s*(?:don't|do not|avoid|never)\s*(?:you\s*)?(.+)$/is },
    { type: 'preference', regex: /^\s*(?:i prefer|my preference is|use)\s*(?:that\s*)?(.+)$/is },
    { type: 'fact', regex: /^\s*(?:for context|fyi|just so you know)\s*(?:that\s*)?(.+)$/is },
];

export function parseUserMemoryCommand(text: string): UserMemoryCommand | null {
    const trimmed = text.trim();
    if (trimmed.length === 0) return null;
    for (const { type, regex } of COMMAND_PATTERNS) {
        const match = trimmed.match(regex);
        if (match && match[1]) {
            const note = match[1].trim().replace(/\.$/, '');
            const key = note.slice(0, 120);
            return { type, key, note };
        }
    }
    return null;
}
