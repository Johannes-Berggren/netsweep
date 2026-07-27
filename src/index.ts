#!/usr/bin/env node
import { scan } from './commands/scan';
import { restoreCursor } from './ui/spinner';
import { setVerbose } from './utils/diagnostics';

const args = process.argv.slice(2);

if (args.includes('--help')) {
  console.log(`
  ${'\x1b[36m'}netsweep${'\x1b[0m'} - Network Swiss Army Knife

  ${'\x1b[1m'}Usage:${'\x1b[0m'} netsweep [options]

  ${'\x1b[1m'}Options:${'\x1b[0m'}
    --all, -a         Run all scans (default)
    --devices, -d     Only scan for devices
    --speed, -s       Only run speed test
    --ports, -p       Only scan gateway ports
    --wifi, -w        Show WiFi info
    --isp, -i         Show ISP & geolocation
    --trace, -r       Run traceroute to 1.1.1.1
    --health          Check internet health
    --target, -t <ip> Scan specific IP for ports
    --timeout <sec>   Cap every scan phase at <sec> seconds
    --verbose         Show per-phase timings and failures
    --json            Output as JSON
    --help            Show help

  ${'\x1b[1m'}Examples:${'\x1b[0m'}
    netsweep              Full network scan
    netsweep -d           List network devices only
    netsweep -s           Speed test only
    netsweep -p           Scan gateway ports
    netsweep -w           Show WiFi signal info
    netsweep --isp        Show ISP and location
    netsweep --trace      Run traceroute
    netsweep --health     Check major services
    netsweep -p -t 192.168.0.7   Scan ports on specific host
    netsweep --timeout 3  Give up on any phase after 3s
    netsweep --verbose    Show which probes failed and why
    netsweep --json       Output results as JSON
`);
  process.exit(0);
}

// Parse target option
let target: string | undefined;
const targetIndex = args.findIndex(a => a === '-t' || a === '--target');
if (targetIndex !== -1 && args[targetIndex + 1]) {
  target = args[targetIndex + 1];
}

// Parse timeout option
let timeoutMs: number | undefined;
const timeoutIndex = args.indexOf('--timeout');
if (timeoutIndex !== -1) {
  const seconds = Number(args[timeoutIndex + 1]);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    console.error('--timeout expects a positive number of seconds');
    process.exit(2);
  }
  timeoutMs = seconds * 1000;
}

setVerbose(args.includes('--verbose'));

// Determine which scans to run
const hasSpecificFlags = args.includes('-d') || args.includes('--devices') ||
                         args.includes('-s') || args.includes('--speed') ||
                         args.includes('-p') || args.includes('--ports') ||
                         args.includes('-w') || args.includes('--wifi') ||
                         args.includes('-i') || args.includes('--isp') ||
                         args.includes('-r') || args.includes('--trace') ||
                         args.includes('--health');

const runAll = args.includes('-a') || args.includes('--all') || !hasSpecificFlags;

// Signals: restore the cursor ora hid, and report the conventional code.
let handlingSignal = false;
function onSignal(code: number): void {
  if (handlingSignal) {
    process.exit(code);
  }
  handlingSignal = true;
  restoreCursor();
  process.stdout.write('\n');
  process.exit(code);
}

process.on('SIGINT', () => onSignal(130));
process.on('SIGTERM', () => onSignal(143));

// No crash path may leave the terminal without a cursor.
function onFatal(error: unknown): void {
  restoreCursor();
  console.error(error);
  process.exit(1);
}

process.on('uncaughtException', onFatal);
process.on('unhandledRejection', onFatal);

const exitCode = await scan({
  devices: runAll || args.includes('-d') || args.includes('--devices'),
  speed: runAll || args.includes('-s') || args.includes('--speed'),
  ports: runAll || args.includes('-p') || args.includes('--ports'),
  wifi: runAll || args.includes('-w') || args.includes('--wifi'),
  isp: runAll || args.includes('-i') || args.includes('--isp'),
  trace: runAll || args.includes('-r') || args.includes('--trace'),
  health: runAll || args.includes('--health'),
  json: args.includes('--json'),
  target,
  timeoutMs,
});

// Exit rather than waiting for the event loop to drain: aborted sockets can
// keep it alive for seconds after the report has printed. The empty write
// flushes first - stdout is async for pipes, so a bare exit would truncate
// `netsweep --json | jq`.
await new Promise<void>(resolve => process.stdout.write('', () => resolve()));
process.exit(exitCode);
