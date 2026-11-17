# Pointer — not authoritative

**Owned by Muninn.** Canonical copy: `Muninn/docs/Unified Project Definition v0.2.md`.
This file is a pointer, not authoritative (ruling 4, 2026-11-16; Huginn ADR-35, Muninn ADR-21).

Read the Muninn original for: the two-project split (Muninn = Plugin 1, the vault index and the frozen
`MuninnApi` door; Huginn = Plugin 2, chat, skills, harness, approval), the build order, and the scope
boundary that keeps vault enumeration in Muninn (`app.vault.getMarkdownFiles()` is forbidden in Huginn —
a second source of truth is a safety defect, not a convenience).

Huginn's own purpose and non-goals are recorded in `docs/Initial Design Report.md` §1 and in
`docs/decisions/` — not in this stub.
