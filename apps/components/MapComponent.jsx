import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, Circle } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix default marker icons
delete L.Icon.Default.prototype._getIconUrl;  
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const ambulanceIcon = new L.DivIcon({
  html: '<div style="font-size: 28px;">🚑</div>',
  iconSize: [30, 30],
  className: 'custom-div-icon'
});

const hospitalIcon = new L.DivIcon({
  html: '<div style="font-size: 28px;">🏥</div>',
  iconSize: [30, 30],
  className: 'custom-div-icon'
});

const greenSignalIcon = new L.DivIcon({
  html: '<div style="font-size: 20px;">🟢</div>',
  iconSize: [20, 20],
  className: 'custom-div-icon'
});

const redSignalIcon = new L.DivIcon({
  html: '<div style="font-size: 20px;">🔴</div>',
  iconSize: [20, 20],
  className: 'custom-div-icon'
});

function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 14);
    }
  }, [center, zoom, map]);
  return null;
}

export default function MapComponent({
  center = [17.385, 78.4867],
  zoom = 14,
  ambulancePosition,
  destination,
  startPosition,
  route,
  signals = [],
  onMapClick,
  clickMode = false,
  showAmbulanceRadius = false
}) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      onClick={onMapClick}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      <MapController center={center} zoom={zoom} />

      {/* Start Position */}
      {startPosition && (
        <Marker position={[startPosition.lat, startPosition.lng]}>
          <Popup>🚑 Start Location</Popup>
        </Marker>
      )}

      {/* Destination */}
      {destination && (
        <Marker 
          position={[destination.lat, destination.lng]}
          icon={hospitalIcon}
        >
          <Popup>🏥 {destination.name || "Destination"}</Popup>
        </Marker>
      )}

      {/* Ambulance Position */}
      {ambulancePosition && (
        <>
          <Marker 
            position={[ambulancePosition.lat, ambulancePosition.lng]}
            icon={ambulanceIcon}
          >
            <Popup>🚑 Ambulance</Popup>
          </Marker>
          {showAmbulanceRadius && (
            <Circle
              center={[ambulancePosition.lat, ambulancePosition.lng]}
              radius={150}
              pathOptions={{ color: '#22c55e', fillColor: '#22c55e', fillOpacity: 0.1 }}
            />
          )}
        </>
      )}

      {/* Route */}
      {route && route.length > 0 && (
        <Polyline
          positions={route}
          pathOptions={{ color: '#3b82f6', weight: 4 }}
        />
      )}

      {/* Traffic Signals */}
      {signals.map((signal, index) => (
        <Marker
          key={signal.id || index}
          position={[signal.lat, signal.lng]}
          icon={signal.state === 'green' ? greenSignalIcon : redSignalIcon}
        >
          <Popup>
            Signal: {signal.state?.toUpperCase()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
