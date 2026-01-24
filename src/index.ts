#!/usr/bin/env bun
import { scan } from './commands/scan';

const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
  ${'\x1b[36m'}netprobe${'\x1b[0m'} - Network Swiss Army Knife

  ${'\x1b[1m'}Usage:${'\x1b[0m'} netprobe [options]

  ${'\x1b[1m'}Options:${'\x1b[0m'}
    --all, -a         Run all scans (default)
    --devices, -d     Only scan for devices
    --speed, -s       Only run speed test
    --ports, -p       Only scan gateway ports
    --target, -t <ip> Scan specific IP for ports
    --json            Output as JSON
    --help, -h        Show help

  ${'\x1b[1m'}Examples:${'\x1b[0m'}
    netprobe              Full network scan
    netprobe -d           List network devices only
    netprobe -s           Speed test only
    netprobe -p           Scan gateway ports
    netprobe -p -t 192.168.0.7   Scan ports on specific host
    netprobe --json       Output results as JSON
`);
  process.exit(0);
}

// Parse target option
let target: string | undefined;
const targetIndex = args.findIndex(a => a === '-t' || a === '--target');
if (targetIndex !== -1 && args[targetIndex + 1]) {
  target = args[targetIndex + 1];
}

// Determine which scans to run
const hasSpecificFlags = args.includes('-d') || args.includes('--devices') ||
                         args.includes('-s') || args.includes('--speed') ||
                         args.includes('-p') || args.includes('--ports');

const runAll = args.includes('-a') || args.includes('--all') || !hasSpecificFlags;

await scan({
  devices: runAll || args.includes('-d') || args.includes('--devices'),
  speed: runAll || args.includes('-s') || args.includes('--speed'),
  ports: runAll || args.includes('-p') || args.includes('--ports'),
  json: args.includes('--json'),
  target,
});
