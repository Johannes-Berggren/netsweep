/**
 * Aborts when any input signal aborts. Hand-rolled because AbortSignal.any is
 * not available on Node 18, which package.json still declares as the floor.
 */
export function anySignal(...signals: Array<AbortSignal | undefined>): AbortSignal {
  const present = signals.filter((s): s is AbortSignal => s !== undefined);
  const controller = new AbortController();

  const abort = () => {
    for (const signal of present) signal.removeEventListener('abort', abort);
    controller.abort();
  };

  for (const signal of present) {
    if (signal.aborted) {
      controller.abort();
      return controller.signal;
    }
    signal.addEventListener('abort', abort, { once: true });
  }

  return controller.signal;
}

export class DeadlineError extends Error {
  readonly label: string;
  readonly ms: number;

  constructor(label: string, ms: number) {
    super(`${label} exceeded its ${ms}ms budget`);
    this.name = 'DeadlineError';
    this.label = label;
    this.ms = ms;
  }
}

/**
 * Races `fn` against a timer so no single phase can wedge the whole run. `fn`
 * gets a signal it may honour; if it doesn't, we stop waiting regardless.
 */
export function withDeadline<T>(
  label: string,
  ms: number,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Wrapped so a synchronous throw inside fn still lands on the promise path.
  const work = Promise.resolve().then(() => fn(controller.signal));

  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      // The abandoned work may still reject minutes later, long after the
      // report has printed. Attach a sink now so it can't surface as an
      // unhandled rejection.
      work.catch(() => {});
      reject(new DeadlineError(label, ms));
    }, ms);
  });

  // clearTimeout must run on every path: a live timer holds the event loop
  // open, which is the same lingering-exit bug this pass exists to remove.
  return Promise.race([work, expiry]).finally(() => clearTimeout(timer));
}
