---
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
