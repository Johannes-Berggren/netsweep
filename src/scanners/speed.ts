import { tcpProbe, tcpPing } from '../utils/net';
import { anySignal } from '../utils/deadline';
import { record, type ProbeStatus } from '../utils/diagnostics';

export interface SpeedResult {
  download: number; // Mbps, 0 when status.download !== 'ok'
  upload: number; // Mbps, 0 when status.upload !== 'ok'
  latency: number; // ms, 0 when status.latency !== 'ok'
  jitter: number; // ms, stddev across repeated samples of one host
  status: {
    download: ProbeStatus;
    upload: ProbeStatus;
    latency: ProbeStatus;
  };
  /** Host the latency figure was measured against; absent if none answered. */
  latencyHost?: string;
}

// A TCP handshake to :443 tracks real ICMP within a few ms and needs no root.
// The previous HTTPS HEAD measured TCP + TLS + request - roughly 3 round trips,
// which over-reported latency by ~10x and stalled far more often.
const LATENCY_HOSTS = ['1.1.1.1', '8.8.8.8', '9.9.9.9'];
const LATENCY_PORT = 443;
const PROBE_TIMEOUT_MS = 1200;
const LATENCY_SAMPLES = 5;
const LATENCY_DEADLINE_MS = 3000;

const TRANSFER_TIMEOUT_MS = 15000;

interface LatencyResult {
  latency: number;
  jitter: number;
  status: ProbeStatus;
  host?: string;
}

async function measureLatency(
  onProgress?: (stage: string) => void,
  signal?: AbortSignal
): Promise<LatencyResult> {
  const started = performance.now();
  onProgress?.('Testing latency...');

  // Round 1: one probe per host, in parallel, to find a host that answers.
  // Unreachable hosts cost PROBE_TIMEOUT_MS once, concurrently - not serially.
  const probes = await Promise.all(
    LATENCY_HOSTS.map(async host => ({ host, result: await tcpProbe(host, LATENCY_PORT, PROBE_TIMEOUT_MS, signal) }))
  );
  const answered = probes.find(p => p.result.open);

  if (!answered) {
    record({
      scope: 'speed:latency',
      status: 'failed',
      durationMs: performance.now() - started,
      detail: probes.map(p => `${p.host} ${p.result.reason}`).join(', '),
    });
    return { latency: 0, jitter: 0, status: 'failed' };
  }

  // Round 2: sample that one host repeatedly, so jitter is genuine variance
  // rather than the geographic spread between three different hosts.
  const samples = [answered.result.rttMs];
  samples.push(
    ...(await tcpPing(answered.host, LATENCY_PORT, {
      count: LATENCY_SAMPLES - 1,
      timeoutMs: PROBE_TIMEOUT_MS,
      deadlineMs: LATENCY_DEADLINE_MS - (performance.now() - started),
      signal,
      onSample: (n, total) =>
        onProgress?.(`Testing latency... ${answered.host} (${n + 1}/${total + 1})`),
    }))
  );

  record({
    scope: 'speed:latency',
    status: 'ok',
    durationMs: performance.now() - started,
    detail: `${answered.host}, ${samples.length} samples`,
  });

  return {
    latency: average(samples),
    jitter: samples.length > 1 ? standardDeviation(samples) : 0,
    status: 'ok',
    host: answered.host,
  };
}

export async function runSpeedTest(
  onProgress?: (stage: string) => void,
  signal?: AbortSignal
): Promise<SpeedResult> {
  const lat = await measureLatency(onProgress, signal);

  const base = {
    latency: lat.latency,
    jitter: lat.jitter,
    latencyHost: lat.host,
  };

  // Download test using Cloudflare's speed test endpoint
  onProgress?.('Testing download...');
  const downloadBytes = 10_000_000; // 10MB for faster results
  const downloadStart = performance.now();

  try {
    const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${downloadBytes}`, {
      signal: anySignal(signal, AbortSignal.timeout(TRANSFER_TIMEOUT_MS)),
    });
    await response.arrayBuffer(); // Consume the response
  } catch (error) {
    record({
      scope: 'speed:download',
      status: 'failed',
      durationMs: performance.now() - downloadStart,
      detail: (error as Error).name,
    });
    return {
      ...base,
      download: 0,
      upload: 0,
      status: { download: 'failed', upload: 'skipped', latency: lat.status },
    };
  }

  const downloadTime = (performance.now() - downloadStart) / 1000;
  const download = (downloadBytes * 8) / downloadTime / 1_000_000;

  // Upload test
  onProgress?.('Testing upload...');
  const uploadData = new Uint8Array(5_000_000); // 5MB
  const uploadStart = performance.now();

  try {
    await fetch('https://speed.cloudflare.com/__up', {
      method: 'POST',
      body: uploadData,
      signal: anySignal(signal, AbortSignal.timeout(TRANSFER_TIMEOUT_MS)),
    });
  } catch (error) {
    record({
      scope: 'speed:upload',
      status: 'failed',
      durationMs: performance.now() - uploadStart,
      detail: (error as Error).name,
    });
    return {
      ...base,
      download,
      upload: 0,
      status: { download: 'ok', upload: 'failed', latency: lat.status },
    };
  }

  const uploadTime = (performance.now() - uploadStart) / 1000;
  const upload = (uploadData.length * 8) / uploadTime / 1_000_000;

  return {
    ...base,
    download,
    upload,
    status: { download: 'ok', upload: 'ok', latency: lat.status },
  };
}

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function standardDeviation(arr: number[]): number {
  if (arr.length < 2) return 0;
  const avg = average(arr);
  const squareDiffs = arr.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(average(squareDiffs));
}
