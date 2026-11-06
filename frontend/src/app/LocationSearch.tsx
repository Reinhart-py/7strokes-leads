"use client";

import React, { useEffect, useRef, useState } from "react";

export type PlaceSuggestion = {
  id: string;
  label: string;
  name: string;
  secondary: string;
  lat: number;
  lon: number;
  kind: "country" | "city" | "area" | "point";
  bbox?: { minLat: number; minLon: number; maxLat: number; maxLon: number };
  source: "google" | "osm";
};

type Props = {
  value: string;
  onChange: (text: string) => void;
  selected: PlaceSuggestion | null;
  onSelect: (place: PlaceSuggestion | null) => void;
  fetchSuggestions: (q: string) => Promise<PlaceSuggestion[]>;
  placeholder?: string;
};

const KIND_LABEL: Record<PlaceSuggestion["kind"], string> = {
  point: "Building / place",
  area: "Area",
  city: "City",
  country: "Country"
};

const KindIcon = ({ kind }: { kind: PlaceSuggestion["kind"] }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {kind === "point" && (<><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>)}
    {kind === "area" && (<><path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z" /><path d="M9 3v15M15 6v15" /></>)}
    {kind === "city" && (<><path d="M3 21h18M5 21V7l7-4 7 4v14" /><path d="M9 21v-6h6v6" /></>)}
    {kind === "country" && (<><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20" /></>)}
  </svg>
);

/**
 * Location box with live place suggestions (like the Google Maps search dropdown).
 * Picking a suggestion pins the search to that exact place.
 */
export default function LocationSearch({ value, onChange, selected, onSelect, fetchSuggestions, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [focused, setFocused] = useState(false);
  const requestId = useRef(0);
  const fetchRef = useRef(fetchSuggestions);

  useEffect(() => {
    fetchRef.current = fetchSuggestions;
  }, [fetchSuggestions]);

  useEffect(() => {
    const q = value.trim();
    if (!focused || q.length < 2 || (selected && selected.label === value)) return;
    const id = ++requestId.current;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetchRef.current(q);
        if (id === requestId.current) {
          setItems(res);
          setHighlight(0);
          setOpen(true);
        }
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [value, focused, selected]);

  const choose = (p: PlaceSuggestion) => {
    onSelect(p);
    onChange(p.label);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <span className={`absolute left-3 top-1/2 -translate-y-1/2 ${selected ? "text-[#12a594]" : "text-[#0b2a4a]/40"}`}>
          <KindIcon kind={selected?.kind || "point"} />
        </span>
        <input
          type="text"
          value={value}
          autoComplete="off"
          placeholder={placeholder || "Building, area, city or country"}
          onFocus={() => { setFocused(true); if (items.length && !selected) setOpen(true); }}
          onBlur={() => { setFocused(false); setTimeout(() => setOpen(false), 150); }}
          onChange={e => {
            onChange(e.target.value);
            if (selected) onSelect(null);
          }}
          onKeyDown={e => {
            if (!open || items.length === 0) return;
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(items.length - 1, h + 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setHighlight(h => Math.max(0, h - 1)); }
            if (e.key === "Enter") { e.preventDefault(); choose(items[highlight]); }
            if (e.key === "Escape") setOpen(false);
          }}
          className={`crm-input pl-9 pr-9 ${selected ? "border-[#12a594]" : ""}`}
          role="combobox"
          aria-expanded={open}
          aria-controls="location-suggestions"
          aria-autocomplete="list"
        />
        {loading && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[#12a594]/30 border-t-[#12a594] animate-spin" />
        )}
        {!loading && selected && (
          <button
            type="button"
            onClick={() => { onSelect(null); onChange(""); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full text-[#0b2a4a]/50 hover:bg-[#eef6f4] hover:text-[#0b2a4a] text-xs"
            aria-label="Clear location"
          >
            ✕
          </button>
        )}
      </div>

      {selected && (
        <div className="mt-1.5 text-[11px] text-[#0b2a4a]/60 truncate">
          Pinned: <b className="text-[#0b2a4a]">{KIND_LABEL[selected.kind]}</b> · {selected.lat.toFixed(5)}, {selected.lon.toFixed(5)}
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 bg-white rounded-xl shadow-[0_12px_32px_-8px_rgba(11,42,74,0.35)] ring-1 ring-[#0b2a4a]/10 overflow-hidden min-w-[280px]">
          {items.length === 0 ? (
            <div className="px-4 py-3 text-xs text-[#0b2a4a]/60">
              No matching places. You can still search the text as typed.
            </div>
          ) : (
            <ul id="location-suggestions" role="listbox" className="max-h-80 overflow-y-auto py-1">
              {items.map((p, i) => (
                <li key={p.id} role="option" aria-selected={i === highlight}>
                  <button
                    type="button"
                    onMouseDown={e => e.preventDefault()}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => choose(p)}
                    className={`w-full flex items-start gap-3 px-3.5 py-2.5 text-left ${i === highlight ? "bg-[#eef6f4]" : ""}`}
                  >
                    <span className="mt-0.5 w-7 h-7 rounded-lg bg-[#12a594]/12 text-[#0b2a4a] inline-flex items-center justify-center shrink-0">
                      <KindIcon kind={p.kind} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13px] font-semibold text-[#0b2a4a] truncate">{p.name}</span>
                      <span className="block text-[11.5px] text-[#0b2a4a]/55 truncate">{p.secondary || KIND_LABEL[p.kind]}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-[#0b2a4a]/40 mt-1 shrink-0">{KIND_LABEL[p.kind]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="px-3.5 py-2 border-t border-[#0b2a4a]/[0.06] text-[10px] text-[#0b2a4a]/45">
            Suggestions from Google Maps and OpenStreetMap
          </div>
        </div>
      )}
    </div>
  );
}
