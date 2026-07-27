import { connect, type Socket } from 'net';

export interface TcpProbe {
  open: boolean;
  /** Time to a completed TCP handshake, ms. Only meaningful when open. */
  rttMs: number;
  reason?: 'timeout' | 'refused' | 'unreachable' | 'aborted' | 'error';
}

export const DEFAULT_PROBE_TIMEOUT_MS = 1200;

/**
 * Times a single TCP connect. Never rejects, and always destroys the socket -
 * unlike an aborted fetch, which leaves a socket holding the event loop open.
 */
export function tcpProbe(
  host: string,
  port: number,
  timeoutMs: number = DEFAULT_PROBE_TIMEOUT_MS,
  signal?: AbortSignal
): Promise<TcpProbe> {
  return new Promise(resolve => {
    const start = performance.now();

    if (signal?.aborted) {
      resolve({ open: false, rttMs: 0, reason: 'aborted' });
      return;
    }

    const socket: Socket = connect({ host, port, timeout: timeoutMs });

    // removeAllListeners() before destroy() makes a second event impossible,
    // so no settled flag is needed. Same shape as the original checkPort.
    const finish = (open: boolean, reason?: TcpProbe['reason']) => {
      signal?.removeEventListener('abort', onAbort);
      socket.removeAllListeners();
      socket.destroy();
      resolve({ open, rttMs: performance.now() - start, reason });
    };

    const onAbort = () => finish(false, 'aborted');
    signal?.addEventListener('abort', onAbort, { once: true });

    socket.on('connect', () => finish(true));
    socket.on('timeout', () => finish(false, 'timeout'));
    socket.on('error', (error: NodeJS.ErrnoException) => {
      const reason =
        error.code === 'ECONNREFUSED'
          ? 'refused'
          : error.code === 'EHOSTUNREACH' || error.code === 'ENETUNREACH'
            ? 'unreachable'
            : 'error';
      finish(false, reason);
    });
  });
}

export interface TcpPingOptions {
  count?: number;
  timeoutMs?: number;
  /** Budget for the whole run, checked between samples. */
  deadlineMs?: number;
  signal?: AbortSignal;
  onSample?: (sample: number, total: number) => void;
}

/**
 * Sequential probes to ONE host, so the spread across samples is real jitter
 * rather than the geographic spread between different hosts. Stops early on the
 * first failure, abort, or deadline; may return fewer than `count`, or none.
 */
export async function tcpPing(
  host: string,
  port: number,
  options: TcpPingOptions = {}
): Promise<number[]> {
  const {
    count = 5,
    timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
    deadlineMs = Infinity,
    signal,
    onSample,
  } = options;

  const deadlineAt = performance.now() + deadlineMs;
  const rtts: number[] = [];

  for (let i = 0; i < count; i++) {
    if (signal?.aborted || performance.now() >= deadlineAt) break;
    onSample?.(i + 1, count);

    const { open, rttMs } = await tcpProbe(host, port, timeoutMs, signal);
    if (!open) break;
    rtts.push(rttMs);
  }

  return rtts;
}
