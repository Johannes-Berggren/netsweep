import ora, { type Ora } from 'ora';

let currentSpinner: Ora | null = null;

export function startSpinner(text: string): Ora {
  if (currentSpinner) {
    currentSpinner.stop();
  }
  currentSpinner = ora({
    text,
    spinner: 'dots',
  }).start();
  return currentSpinner;
}

export function updateSpinner(text: string): void {
  if (currentSpinner) {
    currentSpinner.text = text;
  } else {
    startSpinner(text);
  }
}

export function stopSpinner(): void {
  if (currentSpinner) {
    currentSpinner.stop();
    currentSpinner = null;
  }
}
