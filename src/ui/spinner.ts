import ora, { type Ora } from 'ora';

let currentSpinner: Ora | null = null;
let baseText = '';
let phaseStart = 0;
let ticker: ReturnType<typeof setInterval> | null = null;

// Only phases that run long enough to look frozen grow a suffix; fast ones
// stay clean. Without this, a silent phase is indistinguishable from a hang.
const ELAPSED_THRESHOLD_MS = 2000;

function render(): void {
  if (!currentSpinner) return;
  const elapsed = Date.now() - phaseStart;
  currentSpinner.text =
    elapsed >= ELAPSED_THRESHOLD_MS ? `${baseText} (${Math.round(elapsed / 1000)}s)` : baseText;
}

export function startSpinner(text: string): Ora {
  if (currentSpinner) {
    currentSpinner.stop();
  }
  baseText = text;
  phaseStart = Date.now();
  currentSpinner = ora({ text, spinner: 'dots' }).start();

  if (!ticker) {
    ticker = setInterval(render, 250);
    // Must never become a new reason for the process to stay alive.
    ticker.unref();
  }
  return currentSpinner;
}

export function updateSpinner(text: string): void {
  if (!currentSpinner) {
    startSpinner(text);
    return;
  }
  baseText = text;
  phaseStart = Date.now();
  render();
}

/** Restores Ora's stderr cursor on crash and signal paths. */
export function restoreCursor(): void {
  if (currentSpinner && process.stderr.isTTY) {
    process.stderr.write('\x1b[?25h');
  }
}

export function stopSpinner(): void {
  if (ticker) {
    clearInterval(ticker);
    ticker = null;
  }
  if (currentSpinner) {
    currentSpinner.stop();
    currentSpinner = null;
  }
}
