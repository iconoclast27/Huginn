// =============================================================================
// Huginn — Path utilities (no Obsidian runtime dependency)
// src/ui/path-utils.ts
//
// Vault path normalization shared by UI and fixtures.
// =============================================================================

export function normalizeNotePath(path: string): string {
    const trimmed = path.trim();
    if (!trimmed || trimmed.length === 0) return trimmed;
    if (trimmed.endsWith('.md')) return trimmed;
    // Skip Obsidian markdown/Canvas anchors or query strings.
    if (/[?#\[]/.test(trimmed)) return trimmed;
    return `${trimmed}.md`;
}
