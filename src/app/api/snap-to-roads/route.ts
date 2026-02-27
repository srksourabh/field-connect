import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

/**
 * POST /api/snap-to-roads
 *
 * Server-side proxy for Google Roads API to avoid exposing the API key client-side.
 * Accepts a JSON body with `positions` array of [lat, lng] tuples.
 */
export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: { user } } = await supabaseAdmin.auth.getUser(authHeader.split(" ")[1]);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!GOOGLE_MAPS_API_KEY) {
    return NextResponse.json({ snapped: [] }, { status: 200 });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const positions: [number, number][] = body.positions;
  if (!Array.isArray(positions) || positions.length < 2) {
    return NextResponse.json({ snapped: positions || [] });
  }

  try {
    const batchSize = 100;
    const snapped: [number, number][] = [];

    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      const path = batch.map(([lat, lng]) => `${lat},${lng}`).join("|");
      const url = `https://roads.googleapis.com/v1/snapToRoads?path=${path}&interpolate=true&key=${GOOGLE_MAPS_API_KEY}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`Roads API error: ${res.status}`);

      const data = await res.json();
      if (data.snappedPoints) {
        for (const pt of data.snappedPoints) {
          snapped.push([pt.location.latitude, pt.location.longitude]);
        }
      }
    }

    return NextResponse.json({ snapped: snapped.length > 0 ? snapped : positions });
  } catch {
    return NextResponse.json({ snapped: positions });
  }
}
