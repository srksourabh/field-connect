"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface TrackedEmployee {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: "online" | "away" | "offline";
  lastSeen: string;
}

interface LeafletMapProps {
  employees: TrackedEmployee[];
  onSelectEmployee?: (id: string) => void;
}

function createMarkerIcon(status: string) {
  const color = status === "online" ? "#137fec" : status === "away" ? "#EAB308" : "#6B7280";
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
      <div style="width:8px;height:8px;border-radius:50%;background:white"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

export default function LeafletMap({ employees, onSelectEmployee }: LeafletMapProps) {
  const center = employees.length > 0
    ? { lat: employees[0].lat, lng: employees[0].lng }
    : { lat: 28.6139, lng: 77.209 }; // Delhi default

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
      {employees.map((emp) => (
        <Marker
          key={emp.id}
          position={[emp.lat, emp.lng]}
          icon={createMarkerIcon(emp.status)}
          eventHandlers={{
            click: () => onSelectEmployee?.(emp.id),
          }}
        >
          <Popup>
            <div className="text-center">
              <p className="font-semibold text-sm">{emp.name}</p>
              <p className="text-xs text-gray-500">Last seen: {emp.lastSeen}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
