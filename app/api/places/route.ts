import { NextResponse } from "next/server";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ predictions: [] });
  }

  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&addressdetails=1&limit=6`,
      { headers: { "User-Agent": "ProManage/1.0" } }
    );
    const data = await res.json();

    const predictions = data.map((item: { place_id: number; display_name: string; name: string; lat: string; lon: string }) => ({
      place_id: String(item.place_id),
      description: item.display_name,
      name: item.name || item.display_name.split(",")[0],
      lat: item.lat,
      lon: item.lon,
    }));

    return NextResponse.json({ predictions });
  } catch {
    return NextResponse.json({ predictions: [] });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const { placeId, name, description, lat, lon } = body;

  if (!placeId && !name) {
    return NextResponse.json({ details: null });
  }

  // If prediction data was passed directly, use it
  if (name || description) {
    return NextResponse.json({
      details: {
        name: name || (description ? description.split(",")[0] : ""),
        address: description || "",
        lat: lat ? parseFloat(lat) : null,
        lng: lon ? parseFloat(lon) : null,
        photos: [],
      },
    });
  }

  // Fallback: lookup by Nominatim place_id
  try {
    const res = await fetch(
      `${NOMINATIM_BASE}/details?place_id=${placeId}&format=json`,
      { headers: { "User-Agent": "ProManage/1.0" } }
    );
    const item = await res.json();

    if (item && item.localname) {
      return NextResponse.json({
        details: {
          name: item.localname || "",
          address: item.localname || "",
          lat: item.centroid?.coordinates?.[1] || null,
          lng: item.centroid?.coordinates?.[0] || null,
          photos: [],
        },
      });
    }

    return NextResponse.json({ details: null });
  } catch {
    return NextResponse.json({ details: null });
  }
}
