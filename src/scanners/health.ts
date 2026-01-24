export interface HealthCheck {
  name: string;
  url: string;
  status: 'up' | 'down';
  latency: number;
}

const ENDPOINTS = [
  { name: 'Google', url: 'https://www.google.com' },
  { name: 'Cloudflare', url: 'https://1.1.1.1' },
  { name: 'GitHub', url: 'https://github.com' },
  { name: 'AWS', url: 'https://aws.amazon.com' },
];

async function checkEndpoint(name: string, url: string): Promise<HealthCheck> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const latency = Date.now() - start;

    return {
      name,
      url,
      status: response.ok ? 'up' : 'down',
      latency,
    };
  } catch {
    return {
      name,
      url,
      status: 'down',
      latency: Date.now() - start,
    };
  }
}

export async function checkInternetHealth(): Promise<HealthCheck[]> {
  const results = await Promise.all(
    ENDPOINTS.map(({ name, url }) => checkEndpoint(name, url))
  );

  return results;
}
