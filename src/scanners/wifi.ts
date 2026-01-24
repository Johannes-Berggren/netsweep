import { exec } from '../utils/exec';

export interface WifiInfo {
  ssid: string;
  bssid: string;
  signal: number;      // dBm
  noise: number;       // dBm
  channel: number;
  band: string;        // "2.4 GHz" | "5 GHz" | "6 GHz"
  txRate: number;      // Mbps
  security: string;
}

export async function getWifiInfo(): Promise<WifiInfo | null> {
  // Try airport command first (older macOS)
  let output = await exec('/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -I');

  if (output) {
    return parseAirportOutput(output);
  }

  // Fallback to system_profiler (newer macOS)
  output = await exec('system_profiler SPAirPortDataType');
  if (output) {
    return parseSystemProfilerOutput(output);
  }

  return null;
}

function parseAirportOutput(output: string): WifiInfo | null {
  const getValue = (key: string): string => {
    const match = output.match(new RegExp(`^\\s*${key}:\\s*(.+)$`, 'm'));
    return match ? match[1].trim() : '';
  };

  const ssid = getValue('SSID');
  if (!ssid) {
    return null;
  }

  const channel = parseInt(getValue('channel'), 10) || 0;
  const signal = parseInt(getValue('agrCtlRSSI'), 10) || 0;
  const noise = parseInt(getValue('agrCtlNoise'), 10) || 0;
  const txRate = parseInt(getValue('lastTxRate'), 10) || 0;

  return {
    ssid,
    bssid: getValue('BSSID'),
    signal,
    noise,
    channel,
    band: getBandFromChannel(channel),
    txRate,
    security: getValue('link auth') || 'Unknown',
  };
}

function parseSystemProfilerOutput(output: string): WifiInfo | null {
  // Find the Current Network Information section
  const currentNetMatch = output.match(/Current Network Information:\s*\n\s*(.+?):\s*\n([\s\S]*?)(?=\n\s+Other Local Wi-Fi Networks:|$)/);
  if (!currentNetMatch) {
    return null;
  }

  const ssid = currentNetMatch[1].trim();
  const networkInfo = currentNetMatch[2];

  const getValue = (key: string): string => {
    const match = networkInfo.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
    return match ? match[1].trim() : '';
  };

  // Parse channel - format: "7 (2GHz, 20MHz)" or "40 (5GHz, 40MHz)"
  const channelStr = getValue('Channel');
  const channelMatch = channelStr.match(/(\d+)\s*\((\d+)GHz/);
  const channel = channelMatch ? parseInt(channelMatch[1], 10) : 0;
  const bandGhz = channelMatch ? channelMatch[2] : '2.4';

  // Parse signal/noise - format: "-50 dBm / -90 dBm"
  const signalNoiseStr = getValue('Signal / Noise');
  const signalMatch = signalNoiseStr.match(/(-?\d+)\s*dBm\s*\/\s*(-?\d+)\s*dBm/);
  const signal = signalMatch ? parseInt(signalMatch[1], 10) : 0;
  const noise = signalMatch ? parseInt(signalMatch[2], 10) : 0;

  // Parse transmit rate
  const txRate = parseInt(getValue('Transmit Rate'), 10) || 0;

  return {
    ssid,
    bssid: '',
    signal,
    noise,
    channel,
    band: bandGhz === '5' ? '5 GHz' : bandGhz === '6' ? '6 GHz' : '2.4 GHz',
    txRate,
    security: getValue('Security') || 'Unknown',
  };
}

function getBandFromChannel(channel: number): string {
  if (channel >= 36 && channel <= 177) {
    return '5 GHz';
  } else if (channel > 177) {
    return '6 GHz';
  }
  return '2.4 GHz';
}

export function getSignalQuality(signal: number): string {
  if (signal >= -50) return 'Excellent';
  if (signal >= -60) return 'Good';
  if (signal >= -70) return 'Fair';
  return 'Weak';
}
