// =============================================================================
// Huginn — LLM Client Abstraction
// src/llm/client.ts
//
// The harness calls complete(prompt) and receives a raw string. Real adapters
// implement this interface. Fake clients make fixtures deterministic.
// =============================================================================

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

/** Minimal subset of the DOM AbortSignal that the clients need for cancellation. */
export interface AbortSignalLike {
    readonly aborted: boolean;
    addEventListener(type: 'abort', listener: () => void): void;
    removeEventListener(type: 'abort', listener: () => void): void;
}

export interface LlmClient {
    /** Complete a prompt. Returns the raw model output or null on failure. */
    complete(prompt: string, signal?: AbortSignalLike): Promise<string | null>;
}

export interface ChatLlmClient extends LlmClient {
    /** Send a full message history and return the assistant's reply, or null on failure / abort. */
    chat(messages: ChatMessage[], signal?: AbortSignalLike): Promise<string | null>;
}

export class FakeLlmClient implements LlmClient {
    constructor(private response: string | null) {}

    async complete(_prompt: string): Promise<string | null> {
        return this.response;
    }
}

export class EchoLlmClient implements LlmClient {
    async complete(prompt: string): Promise<string | null> {
        return `ECHO: ${prompt}`;
    }
}

// ---------------------------------------------------------------------------
// Ollama chat completion client
// ---------------------------------------------------------------------------

export interface OllamaChatOptions {
    baseUrl: string;
    model: string;
    systemPrompt?: string;
    timeoutMs?: number;
}

export class OllamaChatClient implements ChatLlmClient {
    constructor(private opts: OllamaChatOptions) {}

    async complete(prompt: string): Promise<string | null> {
        const messages: ChatMessage[] = [
            ...(this.opts.systemPrompt ? [{ role: 'system' as const, content: this.opts.systemPrompt }] : []),
            { role: 'user', content: prompt },
        ];
        return this.chat(messages);
    }

    async chat(messages: ChatMessage[], signal?: AbortSignalLike): Promise<string | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 60000);

        const onExternalAbort = () => controller.abort();
        signal?.addEventListener('abort', onExternalAbort);

        try {
            const res = await fetch(`${this.opts.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.opts.model,
                    messages,
                    stream: true,
                    // Do not send "format": "json" — Ollama versions vary in how they
                    // validate it, and the recipe's system prompt already demands raw JSON.
                }),
                signal: controller.signal,
            });
            if (!res.ok) {
                let body = '';
                try {
                    body = await res.text();
                } catch {
                    // ignore secondary read failure
                }
                // eslint-disable-next-line no-console
                console.warn('[Huginn] Ollama chat HTTP', res.status, body.slice(0, 1000));
                return null;
            }
            return await this.readStreamingResponse(res, signal);
        } catch (e) {
            if ((e as Error).name === 'AbortError') {
                if (signal?.aborted) {
                    // External abort from the user — do not log as an error.
                    return null;
                }
                // eslint-disable-next-line no-console
                console.warn('[Huginn] Ollama chat timed out');
            } else {
                // eslint-disable-next-line no-console
                console.warn('[Huginn] Ollama chat failed:', (e as Error).message);
            }
            return null;
        } finally {
            signal?.removeEventListener('abort', onExternalAbort);
            clearTimeout(timeout);
        }
    }

    private async readStreamingResponse(res: Response, signal?: AbortSignalLike): Promise<string | null> {
        if (!res.body) return null;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let content = '';
        try {
            while (true) {
                if (signal?.aborted) {
                    await reader.cancel();
                    return null;
                }
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                for (const line of chunk.split('\n')) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;
                    try {
                        const data = JSON.parse(trimmed) as { message?: { content?: string }; done?: boolean };
                        if (data.message?.content) {
                            content += data.message.content;
                        }
                        if (data.done) break;
                    } catch {
                        // Ignore malformed streaming lines.
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
        return stripJsonFences(content.trim());
    }
}

function stripJsonFences(text: string): string {
    // Models sometimes wrap JSON in ```json ... ``` fences despite the
    // instruction to return raw JSON only. Strip the outer fences.
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
    if (fenced) return fenced[1].trim();
    return text.trim();
}
