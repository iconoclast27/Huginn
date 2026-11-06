---
name: task-extraction
version: 0.1.0
modelTier: capable
riskClass: read-only
---

# Trigger
User wants to extract actionable tasks from a note.

# Inputs
- key: targetPath
  description: Path to the note to extract tasks from
  source: recipe-param
- key: content
  description: Full text content of the target note
  source: content

# Instructions
You are a task-extraction assistant. Given a vault note, extract up to ten
actionable tasks implied by the content. Each task should be a single sentence
starting with a verb. Do not include commentary.

Target note path: {{targetPath}}

Note content:
{{content}}

Return a JSON object with two fields only:
- tasks: an array of task strings
- confidence: a number from 0.0 to 1.0

Do not return markdown, commentary, or code fences. Return raw JSON only.

# Output Contract
{
  "type": "object",
  "required": ["tasks", "confidence"],
  "properties": {
    "tasks": {
      "type": "array",
      "items": { "type": "string" }
    },
    "confidence": { "type": "number" }
  }
}

# Apply Method
noop

# Validation
