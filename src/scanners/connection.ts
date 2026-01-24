import { exec } from '../utils/exec';

export interface ConnectionInfo {
  interface: string;
  localIP: string;
  gateway: string;
  externalIP: string;
  dns: string[];
}

export async function getConnectionInfo(): Promise<ConnectionInfo> {
  // Try to find the active interface
  const [localIPEn0, localIPEn1, gateway, externalIP, dns] = await Promise.all([
    exec('ipconfig getifaddr en0'),
    exec('ipconfig getifaddr en1'),
    exec("netstat -nr | grep default | head -1 | awk '{print $2}'"),
    fetch('https://api.ipify.org', { signal: AbortSignal.timeout(5000) })
      .then(r => r.text())
      .catch(() => 'Unknown'),
    exec("scutil --dns | grep 'nameserver\\[' | head -4 | awk '{print $3}'"),
  ]);

  const localIP = localIPEn0.trim() || localIPEn1.trim() || 'Unknown';
  const interfaceName = localIPEn0.trim() ? 'Wi-Fi (en0)' : localIPEn1.trim() ? 'Ethernet (en1)' : 'Unknown';

  // Deduplicate DNS servers
  const dnsServers = [...new Set(dns.trim().split('\n').filter(Boolean))];

  return {
    interface: interfaceName,
    localIP,
    gateway: gateway.trim() || 'Unknown',
    externalIP: externalIP.trim(),
    dns: dnsServers,
  };
}
