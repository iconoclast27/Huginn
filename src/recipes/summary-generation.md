---
name: summary-generation
version: 0.1.0
modelTier: capable
riskClass: read-only
---

# Trigger
User wants a one-paragraph summary of a note.

# Inputs
- key: targetPath
  description: Path to the note to summarize
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content

# Instructions
You are a summarization assistant. Given a vault note, produce exactly one
concise paragraph that captures the main points. Do not include commentary.

Target note path: {{targetPath}}

Note content:
{{content}}

Return a JSON object with two fields only:
- summary: the summary paragraph as a plain string
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

# Validation
