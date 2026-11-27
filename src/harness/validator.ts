// =============================================================================
// Huginn — Schema Validator + the per-call choke point
// src/harness/validator.ts
//
// Minimal JSON Schema validator for recipe output contracts. Returns typed
// errors instead of throwing. Supports object, array, string, number,
// boolean, required, enum, and nested properties/items.
//
// Conform 2026-11-27 (validator leg — Restart Ledger §11 SALVAGE row: "the
// per-call choke point: known-command, types, vault-rooting red re-earned
// here"; H-f09/H-f30 re-anchoring rows; Design Report §2 VALIDATE). validateJson
// above stays the recipe output contract (recipe seam); the NEW per-call face
// validates every tool call BEFORE execution: unknown tool / unknown-shaped
// args / path escapes (vault-rooting) / malformed payload become a
// machine-readable Lumo tool-error ({role:'tool', name, content,
// is_error:true} — external-command-surfaces.md §2 L31; tool_call_id is the
// client leg's to assign), so the model self-corrects at the client's round
// budget — never an exception (Design Report §2/§5). Known-command source is
// the curated manifest (H-f42's seam; the ground-truth registry is dead).
// Policed by H-f43 (src/fixtures/f43.ts) + H-f09 conform legs.
// =============================================================================

import type { JsonSchema, ValidationError, ValidationResult } from '../recipes/types.ts';
import { MANIFEST, type ManifestVerb } from '../manifest/manifest.ts';
import { normalizeNotePath } from '../ui/path-utils.ts';

export function validateJson(data: unknown, schema: JsonSchema, path = ''): ValidationResult {
    const errors: ValidationError[] = [];
    validateValue(data, schema, path, errors);
    return { ok: errors.length === 0, errors };
}

function validateValue(value: unknown, schema: JsonSchema, path: string, errors: ValidationError[]): void {
    if (schema.enum !== undefined && !schema.enum.some((e) => e === value)) {
        errors.push({ path, message: `value not in enum ${JSON.stringify(schema.enum)}` });
        return;
    }

    switch (schema.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push({ path, message: `expected string, got ${typeof value}` });
            }
            break;
        case 'number':
            if (typeof value !== 'number' || Number.isNaN(value)) {
                errors.push({ path, message: `expected number, got ${typeof value}` });
            }
            break;
        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push({ path, message: `expected boolean, got ${typeof value}` });
            }
            break;
        case 'array':
            if (!Array.isArray(value)) {
                errors.push({ path, message: `expected array, got ${typeof value}` });
                return;
            }
            for (let i = 0; i < value.length; i++) {
                validateValue(value[i], schema.items, `${path}[${i}]`, errors);
            }
            break;
        case 'object':
            if (value === null || typeof value !== 'object' || Array.isArray(value)) {
                errors.push({ path, message: `expected object, got ${value === null ? 'null' : typeof value}` });
                return;
            }
            validateObject(value as Record<string, unknown>, schema, path, errors);
            break;
    }
}

function validateObject(
    value: Record<string, unknown>,
    schema: JsonSchema,
    path: string,
    errors: ValidationError[],
): void {
    if (schema.type !== 'object') return;

    const required = schema.required ?? [];
    for (const key of required) {
        if (!(key in value)) {
            errors.push({ path: `${path}.${key}`, message: 'missing required property' });
        }
    }

    if (!schema.properties) return;
    for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (key in value) {
            validateValue(value[key], propSchema, path ? `${path}.${key}` : key, errors);
        }
    }
}

// =============================================================================
// The per-call choke point (conform 2026-11-27, validator leg).
// =============================================================================

const VERBS_BY_NAME: Record<string, ManifestVerb> = Object.fromEntries(
    MANIFEST.map((verb) => [verb.name, verb]),
);
const KNOWN_VERB_NAMES: string = [...MANIFEST.map((verb) => verb.name)].sort().join(', ');

/** Path-class param slots (choice, disclosed at H-f43): these carry vault paths. */
const PATH_PARAM_SLOTS = new Set(['path', 'newPath']);

export interface ToolErrorEnvelope {
    role: 'tool';
    /** The offending name — even unknown — so a model mid-plan maps the error to its call. */
    name: string;
    content: string;
    is_error: true;
}

export interface ToolCallVerdict {
    ok: boolean;
    /** On ok: the args the executor must run with — path-class values trimmed, rooted-checked, .md-normalized. */
    resolved: Record<string, unknown>;
    /** The manifest's gate classification for this call — the gate leg routes on this (D-4). */
    mutation: boolean;
    /** Present on rejection only: the Lumo tool-error anatomy (no exceptions, §2 design consequence). */
    toolError?: ToolErrorEnvelope;
}

function pathRootingProblems(slot: string, value: string, problems: string[]): void {
    const trimmed = value.trim();
    if (!trimmed) {
        problems.push(`blank path in slot '${slot}'`);
        return;
    }
    if (trimmed.startsWith('/') || trimmed.startsWith('\\')) {
        problems.push(`absolute path escapes the vault in slot '${slot}'`);
        return;
    }
    if (trimmed.split('/').some((seg) => seg === '..')) {
        problems.push(`'..' segment escapes the vault-rooted path in slot '${slot}'`);
    }
}

export function validateToolCall(name: string, args: Record<string, unknown>): ToolCallVerdict {
    const verb = VERBS_BY_NAME[name];
    if (!verb) {
        return {
            ok: false,
            resolved: {},
            mutation: false,
            toolError: {
                role: 'tool',
                name,
                content: `unknown tool '${name}'. Known tools: ${KNOWN_VERB_NAMES}`,
                is_error: true,
            },
        };
    }

    const declared = verb.parameters.properties;
    const problems: string[] = [];

    for (const key of verb.parameters.required ?? []) {
        if (!(key in args)) problems.push(`missing required parameter '${key}'`);
    }
    for (const [key, value] of Object.entries(args)) {
        if (!(key in declared)) {
            problems.push(`undeclared parameter '${key}'`);
            continue;
        }
        const declaredType = declared[key].type;
        if (declaredType === 'string') {
            if (typeof value !== 'string') problems.push(`'${key}' expected string`);
        } else if (declaredType === 'integer') {
            if (typeof value !== 'number' || !Number.isInteger(value)) problems.push(`'${key}' expected integer`);
        } else if (declaredType === 'number') {
            if (typeof value !== 'number' || Number.isNaN(value)) problems.push(`'${key}' expected number`);
        } else if (declaredType === 'boolean') {
            if (typeof value !== 'boolean') problems.push(`'${key}' expected boolean`);
        }
        if (typeof value === 'string' && PATH_PARAM_SLOTS.has(key)) {
            pathRootingProblems(key, value, problems);
        }
    }

    if (problems.length > 0) {
        return {
            ok: false,
            resolved: {},
            mutation: verb.mutation,
            toolError: {
                role: 'tool',
                name,
                content: `invalid call to '${name}': ${problems.join('; ')}.`,
                is_error: true,
            },
        };
    }

    // Resolution point (H-f09 contract at this seam): path-class slots normalize
    // through ui/path-utils (trim, .md append unless anchored); non-path slots
    // resolve UNCHANGED (H-f30's face — path handling never borrows them).
    const resolved: Record<string, unknown> = { ...args };
    for (const key of Object.keys(resolved)) {
        if (PATH_PARAM_SLOTS.has(key) && typeof resolved[key] === 'string') {
            resolved[key] = normalizeNotePath(resolved[key] as string);
        }
    }
    return { ok: true, resolved, mutation: verb.mutation };
}
