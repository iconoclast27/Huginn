// =============================================================================
// Huginn — Bundled Default Recipes
// src/recipes/bundled.ts
//
// Default recipe content embedded at build time so Huginn can seed the vault's
// Agents/Huginn/SKILLS/ folder on first run or when the user asks to restore
// defaults. These are the same recipes kept in src/recipes/*.md.
// =============================================================================

export interface BundledRecipe {
    fileName: string;
    content: string;
}

export const BUNDLED_RECIPES: BundledRecipe[] = [
    {
        fileName: 'tag-assignment.md',
        content: `---
name: tag-assignment
version: 0.2.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants tag suggestions for a note.

# Inputs
- key: targetPath
  description: Path of the note needing tags
  source: recipe-param
- key: verbosity
  description: How verbose the reason sentence should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Tag question class: which tags a note should get. Ground the answer on the
read face, never on recall: read the note with vault__readNote (a well-formed
call carries the vault-relative .md path, e.g. notes/alpha.md), and read its
current tags with vault__tags on the same path — never re-propose a tag the
note already has.

To check whether a candidate tag already exists in the vault, use the lexical
family: vault__searchVault with an Obsidian query like tag:candidate — exact
and cheap through Obsidian's own index. Never confuse the families: a tag
question is a vocabulary question, not a meaning question — do not route it
through muninn__notesLike, whose results are a similarity match, not a
lexical hit.

Propose at most two tags; prefer ones the vault already uses, and only propose
a new tag when none of the existing ones is a reasonable fit. This skill only
proposes: adding a tag is a gated write, so never claim a tag was added.

Verbosity changes only the reason sentence: minimal = a short clause, normal =
one plain sentence, verbose = one fuller sentence naming which existing tags
matched. If Verbosity is blank, use normal. The tags proposed do not change
with verbosity.

Return a JSON object with three fields only:
- tags: an array of one or two proposed tag strings
- reason: one sentence explaining the proposal
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["tags", "reason", "confidence"],
  "properties": {
    "tags": { "type": "array", "items": { "type": "string" } },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-frontmatter-array

# Apply Params
{
  "key": "tags",
  "valuePath": "tags"
}

# Validation
- primitive: frontmatter-not-contains
  path: /tags
  description: Proposed tags already in the target note's frontmatter are dropped, and only the remaining tags are proposed.
  params: {"key":"tags"}
`,
    },
    {
        fileName: 'title-suggestion.md',
        content: `---
name: title-suggestion
version: 0.2.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants a better title for a note.

# Inputs
- key: targetPath
  description: Path of the note to title better
  source: recipe-param
- key: verbosity
  description: How verbose the reason sentence should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Title question class: one better title for one named note. Read the note
itself with vault__readNote, and its siblings with vault__listFolder on the
containing folder path — a good title fits the sibling naming style, and both
sides of that evidence come from the read face, never from recall.

A rename is a gated write and its addressed shape is the pair the model names
itself: vault__rename carries path (the existing note) and newPath (the new
vault-relative .md path). This skill proposes the title only: never claim a
move happened, and issue no write call here.

Propose exactly one better title: concise, descriptive, normal file-title
casing, without the file extension.

Return a JSON object with three fields only:
- title: the proposed title string (without file extension)
- reason: one sentence explaining the choice
- confidence: a number from 0.0 to 1.0

Verbosity changes only the reason sentence: minimal = a short clause, normal =
one plain sentence, verbose = one fuller sentence saying what makes the
proposed title better than the current one. If Verbosity is blank, use normal.
The title proposed is not changed by verbosity.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["title", "reason", "confidence"],
  "properties": {
    "title": { "type": "string" },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
set-first-heading

# Apply Params
{
  "valuePath": "title"
}

# Validation
`,
    },
    {
        fileName: 'link-suggestion.md',
        content: `---
name: link-suggestion
version: 0.2.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants wikilink suggestions to insert into a note.

# Inputs
- key: targetPath
  description: Path of the note receiving links
  source: recipe-param
- key: verbosity
  description: How verbose the reason field should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Link question class: which existing notes a note should link to. Ground
suggestions on evidence, not vibes: read the note with vault__readNote and
its current outgoing links with vault__links on the same vault-relative .md
path — never re-suggest a link the note already has.

Find candidate mentions with the lexical family: vault__searchVault answers
whether other notes mention a title, exactly and cheaply. Never confuse the
families: muninn__notesLike results are a similarity match, not a lexical hit
— similarity can name a theme, but a link needs evidence the note actually
mentions the other note, so do not suggest a link on similarity alone.

This skill proposes only: inserting links is a gated write, so make no write
call here; the proposal rides the apply machinery after approval.

Return a JSON object with these fields:
- links: an array of vault paths to link to, e.g. ["notes/alpha.md", "notes/beta.md"]
- reason: a sentence saying why each linked note is related — include it only in verbose mode
- confidence: a number from 0.0 to 1.0

Verbosity changes only the prose field: in verbose mode, add the reason field
(one sentence saying why each linked note fits the target); in minimal and
normal modes, return links and confidence only. If Verbosity is blank, use
normal. The links suggested are not changed by verbosity.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["links", "confidence"],
  "properties": {
    "links": {
      "type": "array",
      "items": { "type": "string" }
    },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-section

# Apply Params
{
  "valuePath": "links",
  "heading": "Related",
  "itemTemplate": "- [[{{value}}]]"
}

# Validation
`,
    },
    {
        fileName: 'task-extraction.md',
        content: `---
name: task-extraction
version: 0.2.0
modelTier: capable
riskClass: read-only
---

# Trigger
User wants implied TODOs generated from a note's prose.

# Inputs
- key: targetPath
  description: Path of the note to scan for implied tasks
  source: recipe-param
- key: verbosity
  description: How verbose the returned TODOs should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Implied-task question class: what a reader would do after reading one named
note. Read the note first with vault__readNote (the vault-relative .md path
in path) — the prose is fetched, never recalled.

Important: this recipe does NOT extract existing Obsidian task lines. Those
lines are already in the text the read returns; this skill synthesizes new
implied actions a reader would infer from the prose, phrased as tasks.

The question is about one named note: it needs the read face alone. Do not
route it through the retrieval families — exact-word retrieval (vault__searchVault)
and similarity retrieval (muninn__notesLike) answer different question classes.

Generate up to ten concise implied TODOs, each phrased as an action.

Return a JSON object with two fields only:
- todos: an array of TODO item strings
- confidence: a number from 0.0 to 1.0

If verbosity is verbose, include a short parenthetical rationale for each TODO
explaining why it follows from the note. If verbosity is minimal or normal,
return only the task text.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["todos", "confidence"],
  "properties": {
    "todos": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: numbered-list
field: todos
message: No actionable TODOs found.

# Validation
`,
    },
    {
        fileName: 'note-summary.md',
        content: `---
name: note-summary
version: 0.2.0
modelTier: fast
riskClass: read-only
---

# Trigger
User wants a concise summary of a note.

# Inputs
- key: targetPath
  description: Path of the note to summarize
  source: recipe-param
- key: verbosity
  description: How verbose the summary should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Summary question class: summarize a named note. Read first — the note's
content is a fact you fetch, never one you recall: call vault__readNote with
the vault-relative .md path (a well-formed call: path notes/alpha.md). Never
summarize from a path name or from memory, and if the read comes back empty
or missing, say so honestly instead of guessing.

This question is about one named note: it needs the read face alone. Do not
route it through the retrieval families — exact-word retrieval (vault__searchVault)
and similarity retrieval (muninn__notesLike) answer different question classes.

Return a JSON object with two fields only:
- summary: the concise paragraph summary of the note's main ideas
- confidence: a number from 0.0 to 1.0

Verbosity changes length inside the 1-3 sentence limit: minimal = one sentence,
normal = two sentences, verbose = up to three sentences naming which sections of
the note the summary draws on. If Verbosity is blank, use normal.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["summary", "confidence"],
  "properties": {
    "summary": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: paragraph
field: summary
message: No summary available.

# Validation
`,
    },
    {
        fileName: 'related-notes.md',
        content: `---
name: related-notes
version: 0.2.0
modelTier: fast
riskClass: read-only
---

# Trigger
User wants existing vault notes related to a note or a topic.

# Inputs
- key: targetPath
  description: Path of the note to find related notes for
  source: recipe-param
- key: verbosity
  description: How verbose the reason field should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
Related-notes question class: which existing notes bear on a note or a topic.
Two retrieval families answer it, and they must never confuse each other:

- vault__searchVault is the lexical family: exact words through Obsidian's own
  index — cheap and exact. A well-formed call passes the exact words (or an
  Obsidian query) as query. It answers words, not meanings.
- muninn__notesLike is the semantic family — the door's one family, answering
  questions of meaning and similarity ("notes like X"). A well-formed call
  passes the text the notes should be like (text), with an optional limit.
  Its results are ranked with scores: a result is a similarity match,
  not a lexical hit, not freshness — never treat its scores as exactness or
  recency.

Never confuse the two families: send exact-word questions to the lexical one,
and "notes like X" questions to the semantic one — the only family that
answers similarity. A good answer consults both families and keeps each
candidate labeled by the family that found it.

Only suggest notes that actually exist in the vault: candidates come from the
retrieval calls, never from invention.

Return a JSON object with these fields:
- notes: an array of vault paths, e.g. ["notes/alpha.md", "notes/beta.md"]
- reason: a sentence saying why each related note fits — include it only in verbose mode
- confidence: a number from 0.0 to 1.0

Verbosity changes only the prose field: in verbose mode, add the reason field
listed above; in minimal and normal modes, return the notes and confidence
fields only. If Verbosity is blank, use normal. The notes suggested are not
changed by verbosity.

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["notes", "confidence"],
  "properties": {
    "notes": {
      "type": "array",
      "items": { "type": "string" }
    },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Chat Render
template: bulleted-list
field: notes
message: No related notes found.

# Validation
`,
    },
];
