---
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
- key: verbosity
  description: How verbose the reason sentence should be (minimal, normal, verbose)
  source: recipe-param

# Instructions
You are a tag assistant. Given a vault note, propose up to two tags.
Prefer tags that already exist in the vault vocabulary. Only propose a new
tag if none of the existing tags are a reasonable fit.

Target note path: {{targetPath}}

Existing tag vocabulary (JSON):
{{vocabulary}}

Related chunks from semantic search (JSON):
{{relatedChunks}}

Related notes from text search (JSON):
{{relatedTextHits}}

Verbosity: {{verbosity}}

Verbosity changes only the reason sentence: minimal = a short clause, normal =
one plain sentence, verbose = one fuller sentence naming which vocabulary tags
matched. If Verbosity is blank, use normal. The tags proposed are not changed by
verbosity.

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
