import { connect, type Socket } from 'net';

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

function checkPort(host: string, port: number, timeout = 1000): Promise<PortResult> {
  return new Promise(resolve => {
    const socket: Socket = connect({ host, port, timeout });

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.on('connect', () => {
      cleanup();
      resolve({ port, service: '', open: true });
    });

    socket.on('error', () => {
      cleanup();
      resolve({ port, service: '', open: false });
    });

    socket.on('timeout', () => {
      cleanup();
      resolve({ port, service: '', open: false });
    });
  });
}
