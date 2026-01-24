import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import type { Device } from '../scanners/devices';
import type { ConnectionInfo } from '../scanners/connection';
import type { SpeedResult } from '../scanners/speed';
import type { PortResult } from '../scanners/ports';
import { formatSpeed, formatLatency, padRight } from '../utils/format';

const BOX_WIDTH = 62;

export function header() {
  console.log(
    boxen(chalk.bold.cyan('  NETPROBE - Network Diagnostics  '), {
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
  section('CONNECTION', [
    `${chalk.gray('Interface:')}    ${chalk.white(info.interface)}`,
    `${chalk.gray('Local IP:')}     ${chalk.white(info.localIP)}`,
    `${chalk.gray('Gateway:')}      ${chalk.white(info.gateway)}`,
    `${chalk.gray('External IP:')}  ${chalk.white(info.externalIP)}`,
    `${chalk.gray('DNS:')}          ${chalk.white(info.dns.join(', '))}`,
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
  const table = new Table({
    head: ['IP', 'MAC', 'Vendor', 'Name'].map(h => chalk.cyan(h)),
    style: {
      head: [],
      border: ['gray'],
    },
    chars: {
      'top': '─', 'top-mid': '┬', 'top-left': '┌', 'top-right': '┐',
      'bottom': '─', 'bottom-mid': '┴', 'bottom-left': '└', 'bottom-right': '┘',
      'left': '│', 'left-mid': '├', 'mid': '─', 'mid-mid': '┼',
      'right': '│', 'right-mid': '┤', 'middle': '│'
    },
    colWidths: [17, 20, 14, 14],
  });

  devices.forEach(d => {
    const name = d.isCurrentDevice
      ? chalk.green('This Mac')
      : d.hostname
        ? truncate(d.hostname, 12)
        : chalk.gray('-');

    table.push([
      d.ip,
      d.mac,
      truncate(d.vendor, 12),
      name,
    ]);
  });

  console.log(chalk.gray(`┌─ ${chalk.white.bold('DEVICES')} (${devices.length} found) ${'─'.repeat(BOX_WIDTH - 18 - String(devices.length).length)}┐`));
  console.log(table.toString());
  console.log();
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

export interface ScanResults {
  connection?: ConnectionInfo;
  devices?: Device[];
  speed?: SpeedResult;
  ports?: PortResult[];
  gateway?: string;
}

export function outputJson(results: ScanResults) {
  console.log(JSON.stringify(results, null, 2));
}
