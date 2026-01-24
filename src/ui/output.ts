import chalk from 'chalk';
import boxen from 'boxen';
import type { Device } from '../scanners/devices';
import type { ConnectionInfo } from '../scanners/connection';
import type { SpeedResult } from '../scanners/speed';
import type { PortResult } from '../scanners/ports';
import type { WifiInfo } from '../scanners/wifi';
import type { IspInfo } from '../scanners/isp';
import type { TraceHop } from '../scanners/traceroute';
import type { HealthCheck } from '../scanners/health';
import { getSignalQuality } from '../scanners/wifi';
import { formatCoordinates } from '../scanners/isp';
import { getMaxLatency } from '../scanners/traceroute';
import { formatSpeed, formatLatency, padRight, padLeft } from '../utils/format';

const BOX_WIDTH = 62;

export function header() {
  console.log(
    boxen(chalk.bold.cyan('  NETSWEEP - Network Diagnostics  '), {
      padding: 0,
      margin: { top: 1, bottom: 0, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    })
  );
  console.log();
}

export function section(title: string, content: string[]) {
  const titleLine = `─ ${chalk.white.bold(title)} `;
  const dashesNeeded = BOX_WIDTH - title.length - 4;

  console.log(chalk.gray('┌' + titleLine + '─'.repeat(dashesNeeded) + '┐'));

  content.forEach(line => {
    const visibleLen = stripAnsi(line).length;
    const padding = BOX_WIDTH - visibleLen - 4;
    console.log(chalk.gray('│  ') + line + ' '.repeat(Math.max(0, padding)) + chalk.gray('  │'));
  });

  console.log(chalk.gray('└' + '─'.repeat(BOX_WIDTH) + '┘'));
  console.log();
}

export function connectionSection(info: ConnectionInfo) {
  // Limit DNS display to avoid overflow
  const dnsDisplay = info.dns.length > 2
    ? `${info.dns.slice(0, 2).join(', ')} +${info.dns.length - 2} more`
    : info.dns.join(', ');

  section('CONNECTION', [
    `${chalk.gray('Interface:')}    ${chalk.white(info.interface)}`,
    `${chalk.gray('Local IP:')}     ${chalk.white(info.localIP)}`,
    `${chalk.gray('Gateway:')}      ${chalk.white(info.gateway)}`,
    `${chalk.gray('External IP:')}  ${chalk.white(info.externalIP)}`,
    `${chalk.gray('DNS:')}          ${chalk.white(dnsDisplay)}`,
  ]);
}

export function speedSection(speed: SpeedResult) {
  section('SPEED', [
    `${chalk.green('↓')} ${chalk.gray('Download:')}   ${chalk.white.bold(formatSpeed(speed.download))}`,
    `${chalk.blue('↑')} ${chalk.gray('Upload:')}     ${chalk.white.bold(formatSpeed(speed.upload))}`,
    `${chalk.gray('Latency:')}      ${chalk.white(formatLatency(speed.latency))} ${chalk.gray(`(jitter: ${formatLatency(speed.jitter)})`)}`,
  ]);
}

export function devicesSection(devices: Device[]) {
  const lines: string[] = [];

  // Header row
  const headerIP = padRight(chalk.cyan('IP'), 16);
  const headerMAC = padRight(chalk.cyan('MAC'), 19);
  const headerVendor = padRight(chalk.cyan('Vendor'), 12);
  const headerName = chalk.cyan('Name');
  lines.push(`${headerIP} ${headerMAC} ${headerVendor} ${headerName}`);

  // Device rows
  devices.forEach(d => {
    const ip = padRight(d.ip, 16);
    const mac = padRight(d.mac, 19);
    const vendor = d.isCurrentDevice && d.vendor === 'Unknown' ? 'Apple' : d.vendor;
    const vendorStr = padRight(truncate(vendor, 12), 12);
    const name = d.isCurrentDevice
      ? chalk.green('This Mac')
      : d.hostname
        ? truncate(d.hostname, 10)
        : chalk.gray('-');

    lines.push(`${chalk.white(ip)} ${chalk.gray(mac)} ${chalk.white(vendorStr)} ${name}`);
  });

  section(`DEVICES (${devices.length} found)`, lines);
}

export function portsSection(ports: PortResult[], host: string) {
  if (ports.length === 0) {
    section(`GATEWAY PORTS (${host})`, [
      chalk.gray('No open ports found'),
    ]);
    return;
  }

  const lines = ports.map(p => {
    const portStr = padRight(`${p.port}/tcp`, 10);
    const serviceStr = padRight(p.service, 10);
    return `${chalk.white(portStr)}${chalk.gray(serviceStr)}${chalk.green('OPEN')}`;
  });

  section(`GATEWAY PORTS (${host})`, lines);
}

function truncate(str: string, len: number): string {
  if (str.length <= len) return str;
  return str.slice(0, len - 1) + '…';
}

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1B\[[0-9;]*m/g, '');
}

export function wifiSection(info: WifiInfo) {
  const quality = getSignalQuality(info.signal);
  const qualityColor = quality === 'Excellent' ? chalk.green : quality === 'Good' ? chalk.yellow : chalk.red;

  section('WIFI', [
    `${chalk.gray('SSID:')}         ${chalk.white(info.ssid)}`,
    `${chalk.gray('Signal:')}       ${chalk.white(`${info.signal} dBm`)} (${qualityColor(quality)})`,
    `${chalk.gray('Noise:')}        ${chalk.white(`${info.noise} dBm`)}`,
    `${chalk.gray('Channel:')}      ${chalk.white(`${info.channel}`)} (${chalk.white(info.band)})`,
    `${chalk.gray('Tx Rate:')}      ${chalk.white(`${info.txRate} Mbps`)}`,
  ]);
}

export function ispSection(info: IspInfo) {
  section('ISP & LOCATION', [
    `${chalk.gray('ISP:')}          ${chalk.white(info.isp)}`,
    `${chalk.gray('ASN:')}          ${chalk.white(info.asn)}`,
    `${chalk.gray('Location:')}     ${chalk.white(`${info.city}, ${info.country}`)}`,
    `${chalk.gray('Coordinates:')}  ${chalk.white(formatCoordinates(info.lat, info.lon))}`,
  ]);
}

export function tracerouteSection(hops: TraceHop[], target: string) {
  if (hops.length === 0) {
    section(`TRACEROUTE (to ${target})`, [
      chalk.gray('No hops recorded'),
    ]);
    return;
  }

  const maxLatency = getMaxLatency(hops);
  const maxBarWidth = 30;

  const lines = hops.map(hop => {
    const hopNum = padLeft(String(hop.hop), 3);
    const ip = padRight(hop.ip, 16);
    const latency = padLeft(`${hop.latency.toFixed(1)}ms`, 8);
    const barWidth = Math.ceil((hop.latency / maxLatency) * maxBarWidth);
    const bar = chalk.cyan('█'.repeat(Math.max(1, barWidth)));

    return `${chalk.white(hopNum)}  ${chalk.white(ip)}${chalk.white(latency)}   ${bar}`;
  });

  section(`TRACEROUTE (to ${target})`, lines);
}

export function healthSection(checks: HealthCheck[]) {
  const lines = checks.map(check => {
    const name = padRight(check.name, 14);
    const status = check.status === 'up' ? chalk.green('✓') : chalk.red('✗');

    let latencyStr: string;
    if (check.status !== 'up') {
      latencyStr = chalk.red('timeout');
    } else if (check.latency < 100) {
      latencyStr = chalk.green(`${check.latency}ms`);
    } else if (check.latency < 300) {
      latencyStr = chalk.yellow(`${check.latency}ms`);
    } else {
      latencyStr = chalk.red(`${check.latency}ms`);
    }

    return `${chalk.white(name)}${status}  ${latencyStr}`;
  });

  section('INTERNET HEALTH', lines);
}

export interface ScanResults {
  connection?: ConnectionInfo;
  devices?: Device[];
  speed?: SpeedResult;
  ports?: PortResult[];
  gateway?: string;
  wifi?: WifiInfo;
  isp?: IspInfo;
  traceroute?: TraceHop[];
  health?: HealthCheck[];
}

export function outputJson(results: ScanResults) {
  console.log(JSON.stringify(results, null, 2));
}
