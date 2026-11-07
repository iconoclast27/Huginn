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
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants a tag suggestion for a note that lacks one.

# Inputs
- key: targetPath
  description: Path to the note needing a tag
  source: recipe-param
- key: vocabulary
  description: Existing tag vocabulary with file and chunk counts
  source: vocabulary
- key: relatedChunks
  description: Semantically related chunks and their tags
  source: path
- key: titleQuery
  description: Text to search for related notes
  source: recipe-param
- key: relatedTextHits
  description: Notes found by text search for the titleQuery
  source: query
  queryKey: titleQuery

# Instructions
You are a tag assistant. Given a vault note, propose exactly one tag.
Prefer tags that already exist in the vault vocabulary. Only propose a new
tag if none of the existing tags are a reasonable fit.

Target note path: {{targetPath}}

Existing tag vocabulary (JSON):
{{vocabulary}}

Related chunks from semantic search (JSON):
{{relatedChunks}}

Related notes from text search (JSON):
{{relatedTextHits}}

Return a JSON object with three fields only:
- tag: the proposed tag string
- reason: one sentence explaining the choice
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["tag", "reason", "confidence"],
  "properties": {
    "tag": { "type": "string" },
    "reason": { "type": "string" },
    "confidence": { "type": "number" }
  }
}

# Apply Method
append-frontmatter-array

# Apply Params
{
  "key": "tags",
  "valuePath": "tag"
}

# Validation
- primitive: frontmatter-not-contains
  path: /tag
  description: The proposed tag must not already be in the target note's frontmatter tags.
  params: {"key":"tags"}
`,
    },
    {
        fileName: 'title-suggestion.md',
        content: `---
name: title-suggestion
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants a better title for a note.

# Inputs
- key: targetPath
  description: Path to the note to rename
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content
- key: vocabulary
  description: Existing tag vocabulary with file and chunk counts
  source: vocabulary

# Instructions
You are a title assistant. Given a vault note, propose exactly one better title.
The title should be concise, descriptive, and use normal file-title casing.

Target note path: {{targetPath}}

Note content:
{{content}}

Existing tag vocabulary (JSON):
{{vocabulary}}

Return a JSON object with three fields only:
- title: the proposed title string (without file extension)
- reason: one sentence explaining the choice
- confidence: a number from 0.0 to 1.0

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
version: 0.1.0
modelTier: fast
riskClass: suggest
---

# Trigger
User wants wikilink suggestions to insert into a note.

# Inputs
- key: targetPath
  description: Path of the note receiving links
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content
- key: relatedChunks
  description: Semantically related notes and their snippets
  source: path
- key: titleQuery
  description: Text to search for related notes
  source: recipe-param
- key: relatedTextHits
  description: Notes found by text search for the titleQuery
  source: query
  queryKey: titleQuery

# Instructions
You are a link assistant. Given a vault note, suggest up to five existing vault
notes that the note should link to. Prefer notes that are explicitly related
in content. Only suggest notes that actually exist in the vault.

Target note path: {{targetPath}}

Note content:
{{content}}

Related notes from semantic search (JSON):
{{relatedChunks}}

Related notes from text search (JSON):
{{relatedTextHits}}

Return a JSON object with two fields only:
- links: an array of vault paths to link to, e.g. ["notes/alpha.md", "notes/beta.md"]
- confidence: a number from 0.0 to 1.0

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
version: 0.1.0
modelTier: capable
riskClass: read-only
---

# Trigger
User wants implied TODOs generated from a note's prose.

# Inputs
- key: targetPath
  description: Path of the note to scan for implied tasks
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content
- key: verbosity
  description: How verbose the returned TODOs should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
You are a task assistant. Read the note below and generate up to ten *implied*
actionable TODOs. These are not existing Obsidian task lines; they are actions a
reader would infer from the prose. Keep each TODO concise and phrased as a task.

Important: this recipe does NOT extract existing Obsidian \`- [ ]\` tasks. It
synthesizes new TODOs the reader should consider after reading the note.

Target note path: {{targetPath}}

Note content:
{{content}}

Verbosity: {{verbosity}}

If verbosity is "verbose", include a short parenthetical rationale for each TODO
explaining why it follows from the note. If verbosity is "minimal" or "normal",
return only the task text.

Return a JSON object with two fields only:
- todos: an array of TODO item strings
- confidence: a number from 0.0 to 1.0

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
version: 0.1.0
modelTier: fast
riskClass: read-only
---

# Trigger
User wants a concise summary of a note.

# Inputs
- key: targetPath
  description: Path of the note to summarize
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content

# Instructions
You are a summarization assistant. Read the note below and produce a concise
summary of its main ideas in 1-3 sentences. Do not add commentary.

Target note path: {{targetPath}}

Note content:
{{content}}

Return a JSON object with two fields only:
- summary: the concise paragraph summary
- confidence: a number from 0.0 to 1.0

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
version: 0.1.0
modelTier: fast
riskClass: read-only
---

# Trigger
User wants existing vault notes that are related to a target note.

# Inputs
- key: targetPath
  description: Path of the note to find related notes for
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content
- key: relatedChunks
  description: Semantically related notes and their snippets
  source: path
- key: titleQuery
  description: Text to search for related notes
  source: recipe-param
- key: relatedTextHits
  description: Notes found by text search for the titleQuery
  source: query
  queryKey: titleQuery

# Instructions
You are a related-notes assistant. Given a vault note, suggest up to five
existing vault notes that are related in content. Only suggest notes that
actually exist in the vault.

Target note path: {{targetPath}}

Note content:
{{content}}

Related notes from semantic search (JSON):
{{relatedChunks}}

Related notes from text search (JSON):
{{relatedTextHits}}

Return a JSON object with two fields only:
- notes: an array of vault paths, e.g. ["notes/alpha.md", "notes/beta.md"]
- confidence: a number from 0.0 to 1.0

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
