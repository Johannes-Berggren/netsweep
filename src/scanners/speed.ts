export interface SpeedResult {
  download: number; // Mbps
  upload: number; // Mbps
  latency: number; // ms
  jitter: number; // ms
}

export async function runSpeedTest(
  onProgress?: (stage: string) => void
): Promise<SpeedResult> {
  // Latency test
  onProgress?.('Testing latency...');
  const latencies = await Promise.all([
    pingHost('1.1.1.1'),
    pingHost('8.8.8.8'),
    pingHost('208.67.222.222'),
  ]);
  const validLatencies = latencies.filter(l => l > 0);
  const latency = validLatencies.length > 0 ? average(validLatencies) : 0;
  const jitter = validLatencies.length > 1 ? standardDeviation(validLatencies) : 0;

  // Download test using Cloudflare's speed test endpoint
  onProgress?.('Testing download...');
  const downloadBytes = 10_000_000; // 10MB for faster results
  const downloadStart = performance.now();

  try {
    const response = await fetch(`https://speed.cloudflare.com/__down?bytes=${downloadBytes}`, {
      signal: AbortSignal.timeout(30000),
    });
    await response.arrayBuffer(); // Consume the response
  } catch {
    // If Cloudflare fails, return partial results
    return { download: 0, upload: 0, latency, jitter };
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
      signal: AbortSignal.timeout(30000),
    });
  } catch {
    return { download, upload: 0, latency, jitter };
  }

  const uploadTime = (performance.now() - uploadStart) / 1000;
  const upload = (uploadData.length * 8) / uploadTime / 1_000_000;

  return { download, upload, latency, jitter };
}

async function pingHost(host: string): Promise<number> {
  const start = performance.now();
  try {
    await fetch(`https://${host}`, {
      method: 'HEAD',
      mode: 'no-cors',
      signal: AbortSignal.timeout(5000),
    });
    return performance.now() - start;
  } catch {
    return 0;
  }
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
