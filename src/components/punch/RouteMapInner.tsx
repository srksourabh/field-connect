"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { HrLocationLog } from "@/lib/database.types";
import { snapToRoads } from "@/lib/location-api";

interface RouteMapInnerProps {
  logs: HrLocationLog[];
  distanceKm: number;
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
