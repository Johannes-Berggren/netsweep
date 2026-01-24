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

    // Extract ASN and ISP name from 'as' field (format: "AS25400 Telia Norge AS")
    const asField = data.as || '';
    const asnMatch = asField.match(/^(AS\d+)\s+(.+)$/);
    const asn = asnMatch ? asnMatch[1] : 'Unknown';
    const ispFromAs = asnMatch ? asnMatch[2] : '';

    // Use ISP name from 'as' field, fallback to 'org', then 'isp'
    const ispName = ispFromAs || data.org || data.isp || 'Unknown';

    return {
      isp: ispName,
      asn,
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
