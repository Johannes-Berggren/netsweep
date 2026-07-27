import { exec as execCb } from 'child_process';
import { promisify } from 'util';
import { record } from './diagnostics';

const execAsync = promisify(execCb);

export interface ExecOptions {
  timeoutMs?: number;
  maxBuffer?: number;
  signal?: AbortSignal;
  /** Keep stdout produced before a failed or timed-out command exits. */
  allowPartial?: boolean;
  /** Suppress diagnostics for expected misses used to select a fallback. */
  recordFailure?: boolean;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_MAX_BUFFER = 2 * 1024 * 1024;

export async function exec(command: string, options: ExecOptions = {}): Promise<string> {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxBuffer = DEFAULT_MAX_BUFFER,
    signal,
    allowPartial = false,
    recordFailure = true,
  } = options;
  const started = performance.now();

  try {
    const { stdout } = await execAsync(command, { timeout: timeoutMs, maxBuffer, signal });
    return stdout;
  } catch (error) {
    // promisify(exec) attaches stdout produced before a timeout. Most callers
    // need an all-or-nothing result; traceroute explicitly opts into partials.
    const partial = (error as { stdout?: string }).stdout ?? '';
    if (recordFailure) {
      record({
        scope: `exec:${command.split(' ')[0]}`,
        status: 'failed',
        durationMs: performance.now() - started,
        detail: partial ? 'partial output' : (error as Error).message.split('\n')[0],
      });
    }
    return allowPartial ? partial : '';
  }
}
