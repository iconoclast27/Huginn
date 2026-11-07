---
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
