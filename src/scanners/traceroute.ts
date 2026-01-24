import { exec } from '../utils/exec';

export interface TraceHop {
  hop: number;
  ip: string;
  hostname?: string;
  latency: number;  // ms
}

export async function runTraceroute(target: string = '1.1.1.1'): Promise<TraceHop[]> {
  // -n: numeric only (no DNS), -q 1: single query, -m 15: max 15 hops
  const output = await exec(`traceroute -n -q 1 -m 15 ${target}`);

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
