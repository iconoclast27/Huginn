// =============================================================================
// Huginn — F27: Abort must reach the streaming loop (Scenario F)
// src/fixtures/f27.ts
//
// Dan's authoritative fixture contract (2026-11-10), implemented verbatim:
//   1. Mock fetch drives an iteration process (N chunks).
//   2. At predetermined iteration M < N, fire the mock abort through the
//      fetch/controller channel ONLY.
//   3. The abort receptor is what the code SHOULD be, not what it is: the
//      fixture asserts on the signal fetch was handed (controller.signal),
//      NOT on the external arg the buggy code listens to.
//   4. Abort not picked up → all N iterations complete → RED.
//   5. Abort picked up → halts at M → GREEN.
//
// Two legs, because Scenario F is tested both ways (plain chat and a
// write-class skill):
//   S1 — entry chat(), abort fired through the controller channel only.
//        Guards: the stream loop must poll controller.signal.
//   S2 — entry complete(), abort fired through the user/external channel, the
//        channel the chat view's Stop button actually uses. The client is
//        typed as the interface the harness codes against, so the fixture calls
//        the seam exactly as harness.ts:76 does.
//        Guards: complete() must forward the signal so it routes through
//        onExternalAbort into the controller.
//
// Trap rules: reader.read() parks forever once the queue is drained (the stream
// never ends naturally, so only abort detection can stop the loop); cancel()
// sets an assertable flag; timeoutMs is absurdly high so the client's internal
// watchdog can never rescue the test; the fakes never reject on abort.
// Red must fail at the intended seam — the stream loop not noticing the
// abort — not at an import/mock error.
//
// Run: npx tsx src/fixtures/f27.ts
// Exit 0 = abort reaches the loop on both legs. Nonzero exit = Scenario F is alive.
// =============================================================================

import { OllamaChatClient } from '../llm/client.ts';
import type { ChatLlmClient, ChatMessage, LlmClient } from '../llm/client.ts';

const N = 10; // chunks the mock stream yields
const M = 3; // abort fires as chunk M is delivered
const TIMEOUT_MS = 10_000_000; // absurdly high: internal watchdog cannot rescue the test
const CHUNK_DELAY_MS = 10; // chunks arrive slowly: a parked loop stays parked
const WATCHDOG_MS = 2_000; // fixture-side: a loop that never halts is RED

// Assertion signature so a guard narrows types too: a red is the bug, never a
// null-narrowing artifact, and guards stay readable.
function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(`F27 FAIL: ${msg}`);
}

// The abort receptor: the signal the code SHOULD poll inside the stream loop.
// The fixture's own controllers are created with the real class, so they are
// never recorded — the recorded controller is the client's internal one.
const RealAbortController = globalThis.AbortController;
let controllers: AbortController[] = [];
globalThis.AbortController = class extends RealAbortController {
  constructor() {
    super();
    controllers.push(this);
  }
} as typeof AbortController;

interface MockState {
  chunks: number; // chunks the mock has delivered
  cancel: boolean; // assertable flag set by reader.cancel()
  receptor: AbortSignal | null; // the signal fetch was handed: what the code should poll
  user: AbortController | null; // the fixture owns the user abort, not the signal
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function chunkBytes(ord: number): Uint8Array {
  const line = JSON.stringify({ message: { content: `chunk${ord}` }, done: false });
  return new TextEncoder().encode(`${line}\n`);
}

// Mock fetch: hands back a controllable stream and records the signal it was
// given. The abort is fired through the channel under test only.
function makeMock(fire: 'controller' | 'external') {
  const state: MockState = { chunks: 0, cancel: false, receptor: null, user: null };

  const fetchMock = async (_url: string, init: { signal?: AbortSignal }): Promise<Response> => {
    state.receptor = init.signal ?? null;

    const reader = {
      async read(): Promise<{ done: boolean; value: Uint8Array }> {
        if (state.chunks >= N) {
          // Parked forever: no natural end-of-stream, no rejection on abort.
          return new Promise<{ done: boolean; value: Uint8Array }>(() => undefined);
        }
        await sleep(CHUNK_DELAY_MS);
        state.chunks += 1;
        const ord = state.chunks;
        if (ord === M) {
          if (fire === 'controller') {
            const clientController = controllers[0];
            assert(clientController !== undefined, 'mock seam: client AbortController was not constructed (fixture broken, not a red)');
            assert(state.receptor !== null, 'mock seam: fetch was not handed a signal (fixture broken, not a red)');
            clientController.abort(); // abort through the fetch/controller channel ONLY
          } else {
            const user = state.user;
            assert(user !== null, 'mock seam: no user controller in flight (fixture broken, not a red)');
            user.abort(); // the channel the chat view's Stop button actually uses
          }
        }
        return { done: false, value: chunkBytes(ord) };
      },
      async cancel(): Promise<void> {
        state.cancel = true;
      },
      async releaseLock(): Promise<void> {
        // no-op: the loop's contract is cancel first, release is Obsidian's business
      },
    };

    const response = {
      ok: true,
      status: 200,
      body: { getReader: () => reader },
      text: async () => '',
    } as unknown as Response;
    return response;
  };

  return { state, fetchMock };
}

interface Outcome {
  chunks: number;
  cancel: boolean;
  receptorAborted: boolean;
  result: string | null | 'PARKED';
}

async function run(entry: 'chat' | 'complete', fire: 'controller' | 'external'): Promise<Outcome> {
  controllers = [];
  const { state, fetchMock } = makeMock(fire);
  globalThis.fetch = fetchMock as typeof globalThis.fetch;

  // Typed as the interface the harness codes against, so complete(prompt, signal)
  // is called the way harness.ts:76 calls it.
  const client: ChatLlmClient & LlmClient = new OllamaChatClient({
    baseUrl: 'http://127.0.0.1:9',
    model: 'fixture-fake',
    timeoutMs: TIMEOUT_MS,
  });

  let running: Promise<string | null>;
  if (entry === 'chat') {
    const messages: ChatMessage[] = [{ role: 'user', content: 'stream fixture' }];
    running = client.chat(messages, new RealAbortController().signal);
  } else {
    const user = new RealAbortController();
    state.user = user;
    running = client.complete('fixture prompt', user.signal);
  }

  const parked = new Promise<'PARKED'>((resolve) => setTimeout(() => resolve('PARKED'), WATCHDOG_MS));
  const result = await Promise.race([running, parked]);

  const receptor: AbortSignal | null = state.receptor;

  return {
    chunks: state.chunks,
    cancel: state.cancel,
    receptorAborted: receptor ? receptor.aborted : false,
    result,
  };
}

function report(name: string, o: Outcome, expectedChunks: number): void {
  const shown = o.result === 'PARKED' ? 'PARKED' : JSON.stringify(o.result);
  console.log(`[F27] ${name}: chunks=${o.chunks} (expected ${expectedChunks}) cancel=${o.cancel} receptorAborted=${o.receptorAborted} result=${shown}`);
}

async function main(): Promise<void> {
  console.log('[F27] Scenario F: abort must reach the streaming loop');
  console.log(`[F27] setup: N=${N} chunks, abort fires at iteration M=${M}, timeoutMs=${TIMEOUT_MS} (absurdly high), watchdog=${WATCHDOG_MS}ms`);

  // Both legs run and report before any assert, so one red receipt shows the
  // whole picture instead of one leg at a time.
  console.log('\n--- S1: abort through the controller channel, entry chat() ---');
  const s1 = await run('chat', 'controller');
  report('S1', s1, M);

  console.log('\n--- S2: user Stop through the external channel, entry complete() ---');
  const s2 = await run('complete', 'external');
  report('S2', s2, M);

  // Seam integrity first: a red must be the bug, never a broken mock.
  assert(s1.receptorAborted, 'S1: the abort never arrived at the receptor (controller.signal) — mock seam broken');
  // The seam: the loop must notice the abort, cancel the reader, and halt at M.
  assert(s1.result !== 'PARKED', `S1: stream loop never halted — consumed ${s1.chunks} chunks, abort not detected inside the loop`);
  assert(s1.chunks === M, `S1: loop did not halt at M — consumed ${s1.chunks} chunks, expected ${M}`);
  assert(s1.cancel, 'S1: reader.cancel() was never called on abort');
  assert(s1.result === null, `S1: expected null result on abort, got ${JSON.stringify(s1.result)}`);

  assert(s2.result !== 'PARKED', `S2: stream loop never halted — consumed ${s2.chunks} chunks, user abort not detected inside the loop`);
  assert(s2.receptorAborted, 'S2: the user abort never reached controller.signal — the signal was dropped before the client built its controller');
  assert(s2.chunks === M, `S2: loop did not halt at M — consumed ${s2.chunks} chunks, expected ${M}`);
  assert(s2.cancel, 'S2: reader.cancel() was never called on abort');
  assert(s2.result === null, `S2: expected null result on abort, got ${JSON.stringify(s2.result)}`);

  console.log('\n[F27] VERDICT: GREEN — abort detected inside the stream loop on both legs, halted at M, reader cancelled');
  console.log('[F27] Fixture complete');
  process.exit(0);
}

void main();
