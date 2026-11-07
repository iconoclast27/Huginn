// =============================================================================
// Huginn — F02: Settings Defaults and Sanitization
// src/fixtures/f02.ts
//
// CONTRACT TEXT (settings UI):
//   PASS requires:
//     S1  sanitizeSettings returns defaults for null/undefined/non-object input.
//     S2  sanitizeSettings strips a trailing slash from the Ollama URL.
//     S3  sanitizeSettings preserves valid user values.
//     S4  sanitizeSettings rejects invalid numbers and falls back to defaults.
//     S5  sanitizeSettings preserves warmupOnFocus and defaultTargetPath.
//
// RUNNER: plain Node via tsx.
//   npx tsx src/fixtures/f02.ts
// =============================================================================

import { DEFAULT_SETTINGS, sanitizeSettings } from '../settings.ts';

let failures = 0;
function check(name: string, cond: boolean, detail?: string): void {
    if (cond) {
        console.log(`  PASS  ${name}`);
    } else {
        failures++;
        console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ''}`);
    }
}

function main(): void {
    console.log('[F02] Huginn settings defaults and sanitization');

    check('S1 defaults for null', JSON.stringify(sanitizeSettings(null)) === JSON.stringify(DEFAULT_SETTINGS));
    check('S1 defaults for undefined', JSON.stringify(sanitizeSettings(undefined)) === JSON.stringify(DEFAULT_SETTINGS));
    check('S1 defaults for string', JSON.stringify(sanitizeSettings('bad')) === JSON.stringify(DEFAULT_SETTINGS));

    check('S2 strips trailing slash',
        sanitizeSettings({ ollamaUrl: 'http://example.com:11434/' }).ollamaUrl === 'http://example.com:11434');

    check('S3 preserves valid URL',
        sanitizeSettings({ ollamaUrl: 'http://192.168.1.10:11434' }).ollamaUrl === 'http://192.168.1.10:11434');
    check('S3 preserves valid chat model',
        sanitizeSettings({ ollamaChatModel: 'qwen3.5:4b' }).ollamaChatModel === 'qwen3.5:4b');
    check('S3 preserves valid timeout',
        sanitizeSettings({ chatTimeoutMs: 120000 }).chatTimeoutMs === 120000);
    check('S3 preserves warmup toggle',
        sanitizeSettings({ warmupOnFocus: true }).warmupOnFocus === true);
    check('S3 preserves default target path',
        sanitizeSettings({ defaultTargetPath: 'notes/alpha.md' }).defaultTargetPath === 'notes/alpha.md');
    check('S3 preserves verbose report-back verbosity',
        sanitizeSettings({ reportBackVerbosity: 'verbose' }).reportBackVerbosity === 'verbose');
    check('S3 preserves normal report-back verbosity',
        sanitizeSettings({ reportBackVerbosity: 'normal' }).reportBackVerbosity === 'normal');

    check('S4 rejects negative timeout', sanitizeSettings({ chatTimeoutMs: -1 }).chatTimeoutMs === DEFAULT_SETTINGS.chatTimeoutMs);
    check('S4 rejects NaN timeout', sanitizeSettings({ chatTimeoutMs: NaN }).chatTimeoutMs === DEFAULT_SETTINGS.chatTimeoutMs);
    check('S4 accepts numeric string timeout', sanitizeSettings({ chatTimeoutMs: '1000' as unknown as number }).chatTimeoutMs === 1000);
    check('S4 rejects empty chat model', sanitizeSettings({ ollamaChatModel: '' }).ollamaChatModel === DEFAULT_SETTINGS.ollamaChatModel);
    check('S4 rejects empty URL', sanitizeSettings({ ollamaUrl: '' }).ollamaUrl === DEFAULT_SETTINGS.ollamaUrl);

    console.log(
        failures === 0
            ? '[F02] VERDICT: GREEN'
            : `[F02] VERDICT: RED — ${failures} failure(s)`,
    );
    process.exit(failures === 0 ? 0 : 1);
}

main();
