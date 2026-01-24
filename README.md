# netprobe

Network Swiss Army Knife - A single command for comprehensive network diagnostics.

```
╭──────────────────────────────────╮
│  NETPROBE - Network Diagnostics  │
╰──────────────────────────────────╯
┌─ CONNECTION ────────────────────────────────────────────────┐
│  Interface:    Wi-Fi (en0)                                   │
│  Local IP:     192.168.0.31                                  │
│  Gateway:      192.168.0.1                                   │
│  External IP:  85.123.45.67                                  │
│  DNS:          1.1.1.1, 8.8.8.8                              │
└──────────────────────────────────────────────────────────────┘
┌─ SPEED ─────────────────────────────────────────────────────┐
│  ↓ Download:   245.3 Mbps                                    │
│  ↑ Upload:     48.7 Mbps                                     │
│  Latency:      12ms (jitter: 2.3ms)                          │
└──────────────────────────────────────────────────────────────┘
┌─ DEVICES (4 found) ─────────────────────────────────────────┐
│ IP              │ MAC                │ Vendor       │ Name   │
├─────────────────┼────────────────────┼──────────────┼────────┤
│ 192.168.0.1     │ F0:81:75:22:32:22  │ Sagemcom     │ -      │
│ 192.168.0.7     │ 00:17:88:2E:09:31  │ Philips      │ -      │
│ 192.168.0.31    │ 80:A9:97:35:64:71  │ Apple        │ This Mac│
└─────────────────┴────────────────────┴──────────────┴────────┘
┌─ GATEWAY PORTS (192.168.0.1) ───────────────────────────────┐
│  53/tcp    DNS       OPEN                                    │
│  80/tcp    HTTP      OPEN                                    │
└──────────────────────────────────────────────────────────────┘
```

## Features

- **Connection Info** - Local IP, gateway, external IP, DNS servers
- **Device Discovery** - Find all devices on your network via ARP with vendor identification
- **Speed Test** - Download/upload speeds and latency via Cloudflare
- **Port Scanner** - Scan common ports on any host
- **Beautiful Output** - Clean terminal UI with colors and tables
- **JSON Output** - Pipe results to other tools

## Installation

### Using Bun (recommended)

```bash
# Run directly without installing
bunx netsweep

# Or install globally
bun install -g netsweep
netprobe
```

### Using npm

```bash
# Run directly
npx netsweep

# Or install globally
npm install -g netsweep
netprobe
```

### From source

```bash
git clone https://github.com/jberggren/netprobe.git
cd netprobe
bun install
bun link
netprobe
```

## Usage

```bash
# Full network scan (connection, speed, devices, ports)
netprobe

# Individual scans
netprobe -d          # Devices only
netprobe -s          # Speed test only
netprobe -p          # Gateway ports only

# Scan specific host
netprobe -p -t 192.168.0.7

# JSON output for scripting
netprobe --json
netprobe -d --json | jq '.devices[] | select(.vendor == "Apple")'
```

## Options

| Flag | Short | Description |
|------|-------|-------------|
| `--all` | `-a` | Run all scans (default) |
| `--devices` | `-d` | Scan for network devices |
| `--speed` | `-s` | Run speed test |
| `--ports` | `-p` | Scan gateway ports |
| `--target <ip>` | `-t` | Scan specific IP for ports |
| `--json` | | Output as JSON |
| `--help` | `-h` | Show help |

## Requirements

- **Bun** >= 1.0 or **Node.js** >= 18
- **macOS** (Linux support coming soon)

## How it works

- **Connection**: Uses `ipconfig`, `netstat`, and ipify.org API
- **Devices**: Parses the ARP table with MAC vendor lookup (1000+ vendors)
- **Speed**: Tests against Cloudflare's speed test endpoints
- **Ports**: TCP connect scan on common service ports

## License

MIT
