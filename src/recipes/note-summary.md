---
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
