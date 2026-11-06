"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";

export type LatLon = { lat: number; lon: number };

type Props = {
  center: LatLon;
  radiusM: number;
  /** Called when the user drags the pin or clicks the map. */
  onMove: (p: LatLon) => void;
  height?: number;
};

const PIN_HTML = `
  <svg width="34" height="44" viewBox="0 0 34 44" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 4px 6px rgba(11,42,74,.35))">
    <path d="M17 1C8.2 1 1 8.1 1 16.9 1 28.6 17 43 17 43s16-14.4 16-26.1C33 8.1 25.8 1 17 1z" fill="#0b2a4a" stroke="#ffffff" stroke-width="2"/>
    <circle cx="17" cy="17" r="6.5" fill="#12a594"/>
  </svg>`;

const same = (a: LatLon | null, b: LatLon | null) =>
  !!a && !!b && Math.abs(a.lat - b.lat) < 1e-7 && Math.abs(a.lon - b.lon) < 1e-7;

/**
 * Map with a draggable pin and the search radius drawn around it.
 * Leaflet touches `window`, so it is loaded only in the browser.
 */
export default function MapPicker({ center, radiusM, onMove, height = 340 }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const marker = useRef<Marker | null>(null);
  const circle = useRef<Circle | null>(null);
  const lastEmitted = useRef<LatLon | null>(null);
  const onMoveRef = useRef(onMove);
  const initial = useRef({ center, radiusM });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onMoveRef.current = onMove;
  }, [onMove]);

  // Create the map once.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !el.current || map.current) return;
      const { center: c, radiusM: r } = initial.current;

      // The map needs a view before layers attach (circle bounds are computed from it).
      const m = L.map(el.current, { zoomControl: true, attributionControl: true, scrollWheelZoom: true }).setView([c.lat, c.lon], 15);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors"
      }).addTo(m);

      const icon = L.divIcon({ html: PIN_HTML, className: "", iconSize: [34, 44], iconAnchor: [17, 43] });
      const mk = L.marker([c.lat, c.lon], { draggable: true, icon, autoPan: true }).addTo(m);
      const ci = L.circle([c.lat, c.lon], {
        radius: r,
        color: "#12a594",
        weight: 2,
        fillColor: "#12a594",
        fillOpacity: 0.12
      }).addTo(m);

      const emit = (lat: number, lon: number) => {
        lastEmitted.current = { lat, lon };
        onMoveRef.current({ lat, lon });
      };
      mk.on("drag", () => ci.setLatLng(mk.getLatLng()));
      mk.on("dragend", () => {
        const p = mk.getLatLng();
        emit(p.lat, p.lng);
      });
      m.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        mk.setLatLng(e.latlng);
        ci.setLatLng(e.latlng);
        emit(e.latlng.lat, e.latlng.lng);
      });

      m.fitBounds(ci.getBounds(), { padding: [24, 24] });
      map.current = m;
      marker.current = mk;
      circle.current = ci;
      setReady(true);
    })();
    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Follow pin changes made outside the map (e.g. picking a suggestion).
  useEffect(() => {
    if (!ready || !marker.current || !circle.current || !map.current) return;
    if (same(center, lastEmitted.current)) return;
    marker.current.setLatLng([center.lat, center.lon]);
    circle.current.setLatLng([center.lat, center.lon]);
    map.current.fitBounds(circle.current.getBounds(), { padding: [24, 24] });
  }, [center, ready]);

  // Redraw the radius.
  useEffect(() => {
    if (!ready || !circle.current || !map.current) return;
    circle.current.setRadius(radiusM);
    map.current.fitBounds(circle.current.getBounds(), { padding: [24, 24] });
  }, [radiusM, ready]);

  return (
    <div className="relative rounded-xl overflow-hidden ring-1 ring-[#0b2a4a]/12 bg-[#eef6f4]" style={{ height }}>
      <div ref={el} className="absolute inset-0" />
      {!ready && (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-[#0b2a4a]/60">Loading map...</div>
      )}
    </div>
  );
}
