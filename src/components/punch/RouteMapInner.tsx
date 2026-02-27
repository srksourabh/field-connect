"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { HrLocationLog } from "@/lib/database.types";

interface RouteMapInnerProps {
  logs: HrLocationLog[];
  distanceKm: number;
}

/** Snap GPS points to nearest roads using Google Roads API */
async function snapToRoads(
  positions: [number, number][]
): Promise<[number, number][]> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey || positions.length < 2) return positions;

  try {
    // Roads API accepts max 100 points per call; batch if needed
    const batchSize = 100;
    const snapped: [number, number][] = [];

    for (let i = 0; i < positions.length; i += batchSize) {
      const batch = positions.slice(i, i + batchSize);
      const path = batch.map(([lat, lng]) => `${lat},${lng}`).join("|");
      const url = `https://roads.googleapis.com/v1/snapToRoads?path=${path}&interpolate=true&key=${apiKey}`;
      const res = await fetch(url);

      if (!res.ok) throw new Error(`Roads API error: ${res.status}`);

      const data = await res.json();
      if (data.snappedPoints) {
        for (const pt of data.snappedPoints) {
          snapped.push([pt.location.latitude, pt.location.longitude]);
        }
      }
    }

    return snapped.length > 0 ? snapped : positions;
  } catch (err) {
    console.error("Snap to roads failed, using raw GPS points:", err);
    return positions;
  }
}

export default function RouteMapInner({ logs }: RouteMapInnerProps) {
  const rawPositions: [number, number][] = logs.map((l) => [l.lat, l.long]);
  const [routePositions, setRoutePositions] = useState<[number, number][]>(rawPositions);
  const [snapping, setSnapping] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setSnapping(true);

    snapToRoads(rawPositions).then((snapped) => {
      if (!cancelled) {
        setRoutePositions(snapped);
        setSnapping(false);
      }
    });

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logs.length]);

  // Center on midpoint
  const midIdx = Math.floor(rawPositions.length / 2);
  const center = rawPositions[midIdx] || [28.6139, 77.209];

  return (
    <MapContainer
      center={center}
      zoom={14}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
      />

      {/* Snapped road-following route */}
      <Polyline
        positions={routePositions}
        pathOptions={{
          color: "#137fec",
          weight: 3,
          opacity: snapping ? 0.4 : 0.8,
        }}
      />

      {/* Start marker */}
      {rawPositions.length > 0 && (
        <CircleMarker
          center={rawPositions[0]}
          radius={7}
          pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 1, weight: 2 }}
        >
          <Popup>
            <span className="text-xs font-medium">Start — {formatLogTime(logs[0])}</span>
          </Popup>
        </CircleMarker>
      )}

      {/* End marker */}
      {rawPositions.length > 1 && (
        <CircleMarker
          center={rawPositions[rawPositions.length - 1]}
          radius={7}
          pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 1, weight: 2 }}
        >
          <Popup>
            <span className="text-xs font-medium">Latest — {formatLogTime(logs[logs.length - 1])}</span>
          </Popup>
        </CircleMarker>
      )}
    </MapContainer>
  );
}

function formatLogTime(log: HrLocationLog): string {
  return new Date(log.captured_at).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}
