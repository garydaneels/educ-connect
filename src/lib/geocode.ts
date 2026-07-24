export async function geocodeAddress(address: string, commune: string): Promise<{ lat: number; lng: number } | null> {
  const q = encodeURIComponent(`${address}, ${commune}, Belgium`);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=be`,
      {
        headers: { "User-Agent": "Educ-Connect/1.0 contact@educonnect.be" },
        signal: AbortSignal.timeout(5000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.[0]) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
