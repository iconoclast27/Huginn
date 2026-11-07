---
name: task-extraction
version: 0.1.0
modelTier: capable
riskClass: read-only
---

# Trigger
User wants to generate an actionable TODO list implied by a note.

# Inputs
- key: targetPath
  description: Path to the note to extract tasks from
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content

# Instructions
You are a TODO-generation assistant. Given a vault note, generate up to ten
actionable TODO items implied by the content. Each item should be a single
sentence starting with a verb. Do not include commentary.

Important: this recipe does NOT extract existing Obsidian `- [ ]` tasks. It
synthesizes new TODOs the reader should consider after reading the note.

Target note path: {{targetPath}}

Note content:
{{content}}

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

# Validation
