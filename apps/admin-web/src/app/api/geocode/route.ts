import { NextRequest, NextResponse } from "next/server";

type GeocodeCandidate = {
  label: string;
  latitude: number;
  longitude: number;
};

const toResponse = (results: GeocodeCandidate[]) => {
  return NextResponse.json({
    success: true,
    data: results,
  });
};

const geocodeWithMapbox = async (query: string, token: string): Promise<GeocodeCandidate[]> => {
  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("access_token", token);
  url.searchParams.set("limit", "5");
  url.searchParams.set("types", "address,poi,place");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mapbox geocoding failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    features?: Array<{
      place_name?: string;
      center?: [number, number];
    }>;
  };

  return (payload.features || [])
    .filter((feature) => Array.isArray(feature.center) && feature.center.length === 2)
    .map((feature) => ({
      label: feature.place_name || "Unknown location",
      latitude: Number(feature.center?.[1]),
      longitude: Number(feature.center?.[0]),
    }))
    .filter((entry) => Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude));
};

const geocodeWithNominatim = async (query: string): Promise<GeocodeCandidate[]> => {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("q", query);
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "QyouAdminWeb/1.0 (geocoding)",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Nominatim geocoding failed with status ${response.status}`);
  }

  const payload = (await response.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;

  return (payload || [])
    .map((entry) => ({
      label: entry.display_name || "Unknown location",
      latitude: Number(entry.lat),
      longitude: Number(entry.lon),
    }))
    .filter((entry) => Number.isFinite(entry.latitude) && Number.isFinite(entry.longitude));
};

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim();
  if (!query || query.length < 3) {
    return NextResponse.json(
      { success: false, error: { code: "INVALID_QUERY", message: "Query must be at least 3 characters." } },
      { status: 400 }
    );
  }

  try {
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || "";
    if (mapboxToken) {
      return toResponse(await geocodeWithMapbox(query, mapboxToken));
    }
    return toResponse(await geocodeWithNominatim(query));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Geocoding failed";
    return NextResponse.json(
      { success: false, error: { code: "GEOCODING_FAILED", message } },
      { status: 502 }
    );
  }
}
