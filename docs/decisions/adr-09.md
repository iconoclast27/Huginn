# ADR-9: Chat lives in a sidebar `ItemView` with ribbon icon and state persistence; `ChatSession` stays an explicit param

**Status:** Accepted (retrospective; recorded 2026-11-16)
**Ruled:** 2026-11-06 (`1ab6bb4`, `0a0c2ca` → `0.1.0-test.9`); history-persistence fix 2026-11-07 (`0a066d7` → `test.19`).

## Context

Chat began as a floating modal. The design questions: where chat lives, what survives a sidebar
close/reopen, and how a restored view gets a live harness and active-note getter.

## Decision

- Chat is a sidebar `ItemView` (`HuginnChatView`, `HUGINN_CHAT_VIEW_TYPE`) with a `message-square`
  ribbon icon, and `getState()` / `setState()` persistence across close/reopen (`1ab6bb4`).
- **`ChatView` keeps `ChatSession` as an explicit param** — the session is passed in, not smuggled
  through globals (a design-doc ruling, live in as-built).
- **New chat** clears the transcript without reloading Obsidian (ADR-16 carries the Stop half).
- Chat resets when Obsidian reloads or the workspace is restored (README of record).

## Consequences

- As-built seams: `src/main.ts:94-96` (`registerView` with `createChatViewServices()`), `:99` (ribbon),
  `src/ui/chat-view.ts:42` (`private session: ChatSession`), `:11` (`ChatController`, `ChatSession`
  imported as types).
- Live harness and active-note getters were required for restored views (`edc3f5e`) — persistence is
  the state, not the live objects.
- The op loop inherits the view: the loop renders in this view and the Stop button is the same control
  (ADR-28, R10/R11).

## Sources

Commits `1ab6bb4` (2026-11-06, sidebar + ribbon + state persistence), `0a0c2ca` (2026-11-06, release
`test.9`), `edc3f5e` (2026-11-07, live harness/active-note getters for restored views), `0a066d7`
(2026-11-07, "preserve chat history, Stop abort race", release `test.19`); `README.md:9`;
`docs/HANDOVER - 2026-11-06.md` (test.9 record); `src/main.ts:94-99`; `src/ui/chat-view.ts:11, 42`.

**Cross-references:** ADR-10, ADR-16, ADR-28.
