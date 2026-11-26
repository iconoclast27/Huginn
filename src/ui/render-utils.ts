// =============================================================================
// Huginn — Chat Render Utilities
// src/ui/render-utils.ts
//
// Helpers for rendering read-only skill output in the chat sidebar based on a
// recipe's declared chat-render template.
// =============================================================================

export function resolveOutputField(obj: unknown, path: string): unknown {
    if (path === '' || path === '/') return obj;
    const keys = path.replace(/^\//, '').split('.');
    let current: unknown = obj;
    for (const key of keys) {
        if (current === null || typeof current !== 'object' || Array.isArray(current)) {
            return undefined;
        }
        current = (current as Record<string, unknown>)[key];
    }
    return current;
}
