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

/**
 * Explicit user memory commands begin with the keyword "Remember" so the
 * model does not misinterpret ordinary chat containing "don't" or "avoid".
 */
const COMMAND_PATTERNS: { type: UserMemoryCommand['type']; regex: RegExp }[] = [
    { type: 'remember', regex: /^\s*remember\b\s*(?:that\s*)?(.+)$/is },
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
