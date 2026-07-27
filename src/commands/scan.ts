import { getConnectionInfo } from '../scanners/connection';
import { scanDevices } from '../scanners/devices';
import { runSpeedTest } from '../scanners/speed';
import { scanPorts } from '../scanners/ports';
import { getWifiInfo } from '../scanners/wifi';
import { getIspInfo } from '../scanners/isp';
import { runTraceroute } from '../scanners/traceroute';
import { checkInternetHealth } from '../scanners/health';
import {
  header,
  connectionSection,
  speedSection,
  devicesSection,
  portsSection,
  wifiSection,
  ispSection,
  tracerouteSection,
  healthSection,
  notesSection,
  outputJson,
  type ScanResults,
} from '../ui/output';
import { startSpinner, updateSpinner, stopSpinner } from '../ui/spinner';
import { withDeadline, DeadlineError } from '../utils/deadline';
import { record, drain, isVerbose } from '../utils/diagnostics';

export interface ScanOptions {
  devices: boolean;
  speed: boolean;
  ports: boolean;
  wifi: boolean;
  isp: boolean;
  trace: boolean;
  health: boolean;
  json: boolean;
  target?: string;
  /** Clamps every phase budget below; from --timeout. */
  timeoutMs?: number;
}

// Worst-case wait per phase. Without these a single wedged scanner - an
// untimed exec, a dropped packet - hangs the entire run indefinitely.
const BUDGETS_MS = {
  connection: 6000,
  // Generous: `arp -a` reverse-resolves each entry, and devices.ts needs room
  // to fall back to the numeric table if that stalls.
  devices: 12000,
  speed: 25000,
  ports: 4000,
  wifi: 6000,
  isp: 5000,
  trace: 12000,
  health: 6000,
};

/**
 * Runs one phase under a deadline and records the outcome. Returns undefined
 * rather than throwing, so one dead phase never aborts the rest of the scan.
 */
async function runPhase<T>(
  scope: string,
  label: string,
  budgetMs: number,
  quiet: boolean,
  fn: (signal: AbortSignal) => Promise<T>
): Promise<T | undefined> {
  if (!quiet) {
    updateSpinner(label);
  }

  const started = performance.now();
  try {
    const value = await withDeadline(scope, budgetMs, fn);
    record({ scope, status: 'ok', durationMs: performance.now() - started });
    return value;
  } catch (error) {
    const timedOut = error instanceof DeadlineError;
    record({
      scope,
      status: timedOut ? 'timeout' : 'failed',
      durationMs: performance.now() - started,
      detail: timedOut ? `exceeded ${budgetMs}ms budget` : (error as Error).message,
    });
    return undefined;
  }
}

/** Returns the process exit code. */
export async function scan(options: ScanOptions): Promise<number> {
  const results: ScanResults = {};
  const quiet = options.json;
  const budget = (ms: number) => Math.min(ms, options.timeoutMs ?? Infinity);

  if (!quiet) {
    startSpinner('Getting connection info...');
  }

  // Connection info enriches every report, but only a gateway port scan depends
  // on it. A slow external-IP lookup must not suppress independent phases.
  const connection = await runPhase(
    'connection',
    'Getting connection info...',
    budget(BUDGETS_MS.connection),
    quiet,
    () => getConnectionInfo()
  );

  if (connection) {
    results.connection = connection;
  }
  results.gateway = options.target || connection?.gateway;

  if (options.devices) {
    results.devices = await runPhase(
      'devices',
      'Scanning for devices...',
      budget(BUDGETS_MS.devices),
      quiet,
      () => scanDevices(connection?.localIP)
    );
  }

  if (options.speed) {
    results.speed = await runPhase(
      'speed',
      'Running speed test...',
      budget(BUDGETS_MS.speed),
      quiet,
      signal =>
        runSpeedTest(stage => {
          if (!quiet) {
            updateSpinner(stage);
          }
        }, signal)
    );
  }

  if (options.ports) {
    if (results.gateway) {
      results.ports = await runPhase(
        'ports',
        `Scanning ports on ${results.gateway}...`,
        budget(BUDGETS_MS.ports),
        quiet,
        () => scanPorts(results.gateway!)
      );
    } else {
      record({
        scope: 'ports',
        status: 'skipped',
        durationMs: 0,
        detail: 'no gateway or --target available',
      });
    }
  }

  if (options.wifi) {
    results.wifi =
      (await runPhase('wifi', 'Getting WiFi info...', budget(BUDGETS_MS.wifi), quiet, async () => {
        const wifi = await getWifiInfo();
        if (!wifi) throw new Error('Wi-Fi information unavailable');
        return wifi;
      })) ?? undefined;
  }

  if (options.isp) {
    results.isp =
      (await runPhase('isp', 'Getting ISP info...', budget(BUDGETS_MS.isp), quiet, async () => {
        const isp = await getIspInfo();
        if (!isp) throw new Error('ISP information unavailable');
        return isp;
      })) ?? undefined;
  }

  if (options.trace) {
    results.traceroute = await runPhase(
      'traceroute',
      'Running traceroute...',
      budget(BUDGETS_MS.trace),
      quiet,
      () => runTraceroute()
    );
  }

  if (options.health) {
    results.health = await runPhase(
      'health',
      'Checking internet health...',
      budget(BUDGETS_MS.health),
      quiet,
      () => checkInternetHealth()
    );
  }

  stopSpinner();

  if (quiet) {
    // Always emitted: a script has nowhere else to learn that a phase failed.
    outputJson({ ...results, diagnostics: drain() });
    return 0;
  }

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

  if (results.wifi) {
    wifiSection(results.wifi);
  }

  if (results.isp) {
    ispSection(results.isp);
  }

  if (results.traceroute) {
    tracerouteSection(results.traceroute, '1.1.1.1');
  }

  if (results.health) {
    healthSection(results.health);
  }

  if (isVerbose()) {
    notesSection(drain());
  }

  return 0;
}
