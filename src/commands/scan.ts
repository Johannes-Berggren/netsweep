import { getConnectionInfo } from '../scanners/connection';
import { scanDevices } from '../scanners/devices';
import { runSpeedTest } from '../scanners/speed';
import { scanPorts } from '../scanners/ports';
import {
  header,
  connectionSection,
  speedSection,
  devicesSection,
  portsSection,
  outputJson,
  type ScanResults,
} from '../ui/output';
import { startSpinner, updateSpinner, stopSpinner } from '../ui/spinner';

export interface ScanOptions {
  devices: boolean;
  speed: boolean;
  ports: boolean;
  json: boolean;
  target?: string;
}

export async function scan(options: ScanOptions): Promise<void> {
  const results: ScanResults = {};

  // Always get connection info first (needed for other scans)
  if (!options.json) {
    startSpinner('Getting connection info...');
  }

  try {
    results.connection = await getConnectionInfo();
    results.gateway = options.target || results.connection.gateway;
  } catch (error) {
    stopSpinner();
    if (!options.json) {
      console.error('Failed to get connection info');
    }
    return;
  }

  // Run device scan
  if (options.devices) {
    if (!options.json) {
      updateSpinner('Scanning for devices...');
    }
    try {
      results.devices = await scanDevices(results.connection.localIP);
    } catch {
      // Continue with other scans
    }
  }

  // Run speed test
  if (options.speed) {
    if (!options.json) {
      updateSpinner('Running speed test...');
    }
    try {
      results.speed = await runSpeedTest((stage) => {
        if (!options.json) {
          updateSpinner(stage);
        }
      });
    } catch {
      // Continue with other scans
    }
  }

  // Run port scan
  if (options.ports && results.gateway) {
    if (!options.json) {
      updateSpinner(`Scanning ports on ${results.gateway}...`);
    }
    try {
      results.ports = await scanPorts(results.gateway);
    } catch {
      // Continue
    }
  }

  stopSpinner();

  // Output results
  if (options.json) {
    outputJson(results);
  } else {
    header();

    if (results.connection) {
      connectionSection(results.connection);
    }

    if (results.speed) {
      speedSection(results.speed);
    }

    if (results.devices) {
      devicesSection(results.devices);
    }

    if (results.ports !== undefined && results.gateway) {
      portsSection(results.ports, results.gateway);
    }
  }
}
