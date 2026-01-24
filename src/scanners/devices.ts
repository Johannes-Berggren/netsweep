import { exec } from '../utils/exec';
import { lookupVendor } from '../utils/vendor';

export interface Device {
  ip: string;
  mac: string;
  vendor: string;
  hostname?: string;
  isCurrentDevice?: boolean;
}

// Normalize MAC address to have leading zeros (0:17:88 -> 00:17:88)
function normalizeMac(mac: string): string {
  return mac
    .split(':')
    .map(part => part.padStart(2, '0'))
    .join(':')
    .toUpperCase();
}

// Check if IP is a multicast or broadcast address
function isSpecialAddress(ip: string): boolean {
  const firstOctet = parseInt(ip.split('.')[0]);
  // Filter multicast (224-239), broadcast (.255), and link-local (169.254)
  if (firstOctet >= 224 && firstOctet <= 239) return true;
  if (ip.endsWith('.255')) return true;
  if (ip.startsWith('169.254.')) return true;
  return false;
}

export async function scanDevices(localIP?: string): Promise<Device[]> {
  // Get current device's MAC
  const ifconfigOutput = await exec('ifconfig en0 | grep ether');
  const currentMacMatch = ifconfigOutput.match(/ether\s+([0-9a-f:]+)/i);
  const currentMac = currentMacMatch ? normalizeMac(currentMacMatch[1]) : '';

  // Read ARP table
  const arpOutput = await exec('arp -a');

  // Parse: "? (192.168.0.1) at f0:81:75:22:32:22 on en0 [ethernet]"
  // or: "hostname (192.168.0.1) at f0:81:75:22:32:22 on en0 [ethernet]"
  const devices = arpOutput
    .split('\n')
    .filter(line => line.includes(' at ') && !line.includes('incomplete'))
    .map(line => {
      const ipMatch = line.match(/\(([0-9.]+)\)/);
      const macMatch = line.match(/at ([0-9a-f:]+)/i);
      const hostMatch = line.match(/^(\S+)\s+\(/);

      if (!ipMatch || !macMatch) return null;

      const ip = ipMatch[1];

      // Skip multicast and broadcast addresses
      if (isSpecialAddress(ip)) return null;

      const mac = normalizeMac(macMatch[1]);
      const isCurrentDevice = localIP === ip || mac === currentMac;

      return {
        ip,
        mac,
        vendor: lookupVendor(mac),
        hostname: hostMatch?.[1] !== '?' ? hostMatch[1] : undefined,
        isCurrentDevice,
      };
    })
    .filter(Boolean) as Device[];

  // Sort by IP numerically
  return devices.sort((a, b) => {
    const aNum = a.ip.split('.').reduce((acc, n, i) => acc + parseInt(n) * Math.pow(256, 3 - i), 0);
    const bNum = b.ip.split('.').reduce((acc, n, i) => acc + parseInt(n) * Math.pow(256, 3 - i), 0);
    return aNum - bNum;
  });
}
