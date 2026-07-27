import { tcpProbe } from '../utils/net';

const COMMON_PORTS: Record<number, string> = {
  21: 'FTP',
  22: 'SSH',
  23: 'Telnet',
  25: 'SMTP',
  53: 'DNS',
  80: 'HTTP',
  110: 'POP3',
  143: 'IMAP',
  443: 'HTTPS',
  445: 'SMB',
  548: 'AFP',
  3306: 'MySQL',
  3389: 'RDP',
  5432: 'PostgreSQL',
  5900: 'VNC',
  8080: 'HTTP-Alt',
  8443: 'HTTPS-Alt',
};

export interface PortResult {
  port: number;
  service: string;
  open: boolean;
}

export async function scanPorts(
  host: string,
  ports = Object.keys(COMMON_PORTS).map(Number)
): Promise<PortResult[]> {
  const results = await Promise.all(
    ports.map(port => checkPort(host, port))
  );

  return results
    .filter(r => r.open)
    .map(r => ({ ...r, service: COMMON_PORTS[r.port] || 'Unknown' }));
}

async function checkPort(host: string, port: number, timeout = 1000): Promise<PortResult> {
  const { open } = await tcpProbe(host, port, timeout);
  return { port, service: '', open };
}
