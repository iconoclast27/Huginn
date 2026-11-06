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

export interface LlmClient {
    /** Complete a prompt. Returns the raw model output or null on failure. */
    complete(prompt: string): Promise<string | null>;
}

export interface ChatLlmClient extends LlmClient {
    /** Send a full message history and return the assistant's reply, or null on failure. */
    chat(messages: ChatMessage[]): Promise<string | null>;
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

    async chat(messages: ChatMessage[]): Promise<string | null> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.opts.timeoutMs ?? 60000);
        try {
            const res = await fetch(`${this.opts.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.opts.model,
                    messages,
                    stream: false,
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
            const data = (await res.json()) as { message?: { content?: string } };
            return stripJsonFences(data.message?.content?.trim() ?? '');
        } catch (e) {
            if ((e as Error).name === 'AbortError') {
                // eslint-disable-next-line no-console
                console.warn('[Huginn] Ollama chat timed out');
            } else {
                // eslint-disable-next-line no-console
                console.warn('[Huginn] Ollama chat failed:', (e as Error).message);
            }
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }
}

function stripJsonFences(text: string): string {
    // Models sometimes wrap JSON in ```json ... ``` fences despite the
    // instruction to return raw JSON only. Strip the outer fences.
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)```\s*$/);
    if (fenced) return fenced[1].trim();
    return text.trim();
}
