import { exec } from '../utils/exec';

export interface TraceHop {
  hop: number;
  ip: string;
  hostname?: string;
  latency: number;  // ms
}

export async function runTraceroute(target: string = '1.1.1.1'): Promise<TraceHop[]> {
  // -n: numeric only (no DNS), -q 1: single query, -w 1: 1s per probe (the
  // 5s default means 15 unanswered hops take over a minute), -m 15: max hops
  // Timeout deliberately sits under the phase budget in scan.ts: exec returns
  // the hops collected so far when it kills the child, so a route that goes
  // dark partway still renders what it found instead of nothing.
  const output = await exec(`traceroute -n -q 1 -w 1 -m 15 ${target}`, {
    timeoutMs: 8000,
    allowPartial: true,
  });

  if (!output) {
    return [];
  }

  const hops: TraceHop[] = [];
  const lines = output.split('\n');

  for (const line of lines) {
    // Parse lines like: " 1  192.168.0.1  1.234 ms"
    const match = line.match(/^\s*(\d+)\s+([\d.]+|\*)\s+([\d.]+)\s*ms/);
    if (match) {
      const hop = parseInt(match[1], 10);
      const ip = match[2];
      const latency = parseFloat(match[3]);

      if (ip !== '*') {
        hops.push({
          hop,
          ip,
          latency,
        });
      }
    }
  }

  return hops;
}

export function getMaxLatency(hops: TraceHop[]): number {
  if (hops.length === 0) return 0;
  return Math.max(...hops.map(h => h.latency));
}
