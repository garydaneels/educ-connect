"use client";
import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix icônes Leaflet dans Next.js
const pinIcon = (color = "#ea580c", boosted = false) => L.divIcon({
  className: "",
  html: `<div style="
    width:${boosted ? 36 : 30}px;
    height:${boosted ? 36 : 30}px;
    background:${color};
    border:3px solid white;
    border-radius:50% 50% 50% 0;
    transform:rotate(-45deg);
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
    ${boosted ? "outline:2px solid #fbbf24;" : ""}
  "></div>`,
  iconSize: [boosted ? 36 : 30, boosted ? 36 : 30],
  iconAnchor: [boosted ? 18 : 15, boosted ? 36 : 30],
  popupAnchor: [0, boosted ? -36 : -30],
});

interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  name: string;
  commune: string;
  boosted?: boolean;
  popupContent: React.ReactNode;
}

function FitBounds({ markers }: { markers: MapMarker[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [markers, map]);
  return null;
}

interface Props {
  markers: MapMarker[];
  height?: string;
}

export default function MapView({ markers, height = "500px" }: Props) {
  // Centre Bruxelles par défaut
  const center: [number, number] = [50.8503, 4.3517];

  return (
    <div style={{ height }} className="rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
      <MapContainer
        center={center}
        zoom={12}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {markers.length > 0 && <FitBounds markers={markers} />}
        {markers.map(m => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={pinIcon(m.boosted ? "#0369a1" : "#ea580c", m.boosted)}
          >
            <Popup>
              {m.popupContent}
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
