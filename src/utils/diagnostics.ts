export type ProbeStatus = 'ok' | 'failed' | 'timeout' | 'skipped';

export interface Diagnostic {
  scope: string; // 'speed', 'exec:traceroute', 'tcp:1.1.1.1:443'
  status: ProbeStatus;
  durationMs: number;
  detail?: string;
}

// Module-level state is the right shape here: one process, one scan, one report.
const entries: Diagnostic[] = [];
let verbose = false;

export function record(diagnostic: Diagnostic): void {
  entries.push(diagnostic);
}

/** Everything recorded so far. Non-destructive - read by both --verbose and --json. */
export function drain(): Diagnostic[] {
  return entries.slice();
}

export function setVerbose(on: boolean): void {
  verbose = on;
}

export function isVerbose(): boolean {
  return verbose;
}
