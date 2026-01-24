export function formatSpeed(mbps: number): string {
  if (mbps >= 1000) {
    return `${(mbps / 1000).toFixed(1)} Gbps`;
  }
  return `${mbps.toFixed(1)} Mbps`;
}

export function formatLatency(ms: number): string {
  return `${Math.round(ms)}ms`;
}

export function padRight(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : str + ' '.repeat(len - str.length);
}

export function padLeft(str: string, len: number): string {
  return str.length >= len ? str.slice(0, len) : ' '.repeat(len - str.length) + str;
}
