"use client";

import { MapContainer, TileLayer, Polyline, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { HrLocationLog } from "@/lib/database.types";

interface RouteMapInnerProps {
  logs: HrLocationLog[];
  distanceKm: number;
}

export default function RouteMapInner({ logs }: RouteMapInnerProps) {
  const positions: [number, number][] = logs.map((l) => [l.lat, l.long]);

  // Center on midpoint
  const midIdx = Math.floor(positions.length / 2);
  const center = positions[midIdx] || [28.6139, 77.209];

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

      {/* Route polyline */}
      <Polyline
        positions={positions}
        pathOptions={{ color: "#137fec", weight: 3, opacity: 0.8 }}
      />

      {/* Start marker */}
      {positions.length > 0 && (
        <CircleMarker
          center={positions[0]}
          radius={7}
          pathOptions={{ color: "#16a34a", fillColor: "#16a34a", fillOpacity: 1, weight: 2 }}
        >
          <Popup>
            <span className="text-xs font-medium">Start — {formatLogTime(logs[0])}</span>
          </Popup>
        </CircleMarker>
      )}

      {/* End marker */}
      {positions.length > 1 && (
        <CircleMarker
          center={positions[positions.length - 1]}
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
