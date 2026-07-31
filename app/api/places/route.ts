import { NextResponse } from "next/server";

const GOOGLE_API_KEY = process.env.GOOGLE_PLACES_API_KEY || "";
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ predictions: [] });
  }

  // Use Google Places if API key is configured
  if (GOOGLE_API_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&components=country:in&types=establishment&key=${GOOGLE_API_KEY}`
      );
      const data = await res.json();

      if (data.predictions) {
        const predictions = data.predictions.map((p: { place_id: string; description: string; structured_formatting?: { main_text?: string } }) => ({
          place_id: p.place_id,
          description: p.description,
          name: p.structured_formatting?.main_text || p.description.split(",")[0],
        }));
        return NextResponse.json({ predictions });
      }
    } catch {
      // Fall through to Nominatim
    }
  }

  // Fallback: Nominatim (OpenStreetMap)
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

  // Use Google Place Details if API key is configured and placeId looks like a Google one
  if (GOOGLE_API_KEY && placeId && placeId.startsWith("Ch")) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,photos&key=${GOOGLE_API_KEY}`
      );
      const data = await res.json();

      if (data.result) {
        const result = data.result;
        const photos = (result.photos || []).slice(0, 4).map(
          (p: { photo_reference: string }) =>
            `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${p.photo_reference}&key=${GOOGLE_API_KEY}`
        );

        return NextResponse.json({
          details: {
            name: result.name || "",
            address: result.formatted_address || "",
            lat: result.geometry?.location?.lat || null,
            lng: result.geometry?.location?.lng || null,
            photos,
          },
        });
      }
    } catch {
      // Fall through to Nominatim-based details
    }
  }

  // Nominatim-based details
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
