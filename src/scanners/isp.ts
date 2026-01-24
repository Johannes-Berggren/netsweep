export interface IspInfo {
  isp: string;
  asn: string;
  country: string;
  city: string;
  lat: number;
  lon: number;
}

export async function getIspInfo(): Promise<IspInfo | null> {
  try {
    const response = await fetch('http://ip-api.com/json');
    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      isp: data.isp || 'Unknown',
      asn: data.as ? data.as.split(' ')[0] : 'Unknown',
      country: data.country || 'Unknown',
      city: data.city || 'Unknown',
      lat: data.lat || 0,
      lon: data.lon || 0,
    };
  } catch {
    return null;
  }
}

export function formatCoordinates(lat: number, lon: number): string {
  const latDir = lat >= 0 ? 'N' : 'S';
  const lonDir = lon >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lon).toFixed(4)}° ${lonDir}`;
}
