#!/usr/bin/env node
import { scan } from './commands/scan';

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

// Determine which scans to run
const hasSpecificFlags = args.includes('-d') || args.includes('--devices') ||
                         args.includes('-s') || args.includes('--speed') ||
                         args.includes('-p') || args.includes('--ports') ||
                         args.includes('-w') || args.includes('--wifi') ||
                         args.includes('-i') || args.includes('--isp') ||
                         args.includes('-r') || args.includes('--trace') ||
                         args.includes('--health');

const runAll = args.includes('-a') || args.includes('--all') || !hasSpecificFlags;

await scan({
  devices: runAll || args.includes('-d') || args.includes('--devices'),
  speed: runAll || args.includes('-s') || args.includes('--speed'),
  ports: runAll || args.includes('-p') || args.includes('--ports'),
  wifi: runAll || args.includes('-w') || args.includes('--wifi'),
  isp: runAll || args.includes('-i') || args.includes('--isp'),
  trace: runAll || args.includes('-r') || args.includes('--trace'),
  health: runAll || args.includes('--health'),
  json: args.includes('--json'),
  target,
});
