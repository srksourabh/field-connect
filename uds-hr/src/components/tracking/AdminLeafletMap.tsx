"use client";

import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface MapEmployee {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  lat: number;
  lng: number;
  status: "online" | "away" | "on_leave" | "offline";
  trail: { lat: number; lng: number }[];
}

interface AdminLeafletMapProps {
  employees: MapEmployee[];
  onSelectEmployee?: (id: string) => void;
}

const statusColors: Record<string, string> = {
  online: "#137fec",
  away: "#EAB308",
  on_leave: "#F97316",
  offline: "#6B7280",
};

function createMarkerIcon(status: string) {
  const color = statusColors[status] || "#6B7280";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
      <div style="width:8px;height:8px;border-radius:50%;background:white"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function AdminLeafletMap({ employees, onSelectEmployee }: AdminLeafletMapProps) {
  const withLocation = employees.filter((e) => e.lat != null && e.lng != null);
  const center = withLocation.length > 0
    ? { lat: withLocation[0].lat, lng: withLocation[0].lng }
    : { lat: 28.6139, lng: 77.209 };

  return (
    <MapContainer
      center={[center.lat, center.lng]}
      zoom={13}
      className="w-full h-full"
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {withLocation.map((emp) => (
        <Marker
          key={emp.id}
          position={[emp.lat, emp.lng]}
          icon={createMarkerIcon(emp.status)}
          eventHandlers={{
            click: () => onSelectEmployee?.(emp.id),
          }}
        >
          <Popup>
            <div className="text-center min-w-[150px]">
              <p className="font-semibold text-sm">{emp.name}</p>
              {emp.phone && (
                <p className="text-xs mt-1">
                  <a href={`tel:${emp.phone}`} className="text-blue-600 underline">{emp.phone}</a>
                </p>
              )}
              {emp.email && (
                <p className="text-xs">
                  <a href={`mailto:${emp.email}`} className="text-blue-600 underline">{emp.email}</a>
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      {/* Movement trails */}
      {withLocation.map((emp) => {
        if (emp.trail.length < 2) return null;
        const positions = emp.trail.map((p) => [p.lat, p.lng] as [number, number]);
        const color = statusColors[emp.status] || "#6B7280";
        return (
          <Polyline
            key={`trail-${emp.id}`}
            positions={positions}
            pathOptions={{ color, weight: 2, opacity: 0.6, dashArray: "5,5" }}
          />
        );
      })}
    </MapContainer>
  );
}
