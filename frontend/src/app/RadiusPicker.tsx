"use client";

import React, { useState } from "react";

const PRESETS = [100, 250, 500, 1000, 2000, 3000, 5000, 10000];

export const formatRadius = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${Math.round(m / 100) / 10} km`);

type Props = {
  valueM: number;
  onChange: (m: number) => void;
};

/** Search radius: quick presets or a custom value in metres or kilometres (50 m - 100 km). */
export default function RadiusPicker({ valueM, onChange }: Props) {
  const isPreset = PRESETS.includes(valueM);
  const [custom, setCustom] = useState(!isPreset);
  const [unit, setUnit] = useState<"m" | "km">(valueM >= 1000 ? "km" : "m");
  const [text, setText] = useState(String(valueM >= 1000 ? valueM / 1000 : valueM));

  const applyCustom = (raw: string, u: "m" | "km") => {
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return;
    const metres = Math.round(u === "km" ? n * 1000 : n);
    onChange(Math.min(100000, Math.max(50, metres)));
  };

  return (
    <div>
      <label className="crm-label">Radius from the point</label>
      <div className="flex flex-wrap items-center gap-1.5">
        {PRESETS.map(m => {
          const active = !custom && valueM === m;
          return (
            <button
              key={m}
              type="button"
              onClick={() => { setCustom(false); onChange(m); }}
              className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${active ? "bg-[#0b2a4a] text-white" : "bg-white text-[#0b2a4a] ring-1 ring-[#0b2a4a]/15 hover:ring-[#0b2a4a]/30"}`}
            >
              {formatRadius(m)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => { setCustom(true); applyCustom(text, unit); }}
          className={`h-8 px-3 rounded-full text-xs font-semibold transition-colors ${custom ? "bg-[#0b2a4a] text-white" : "bg-white text-[#0b2a4a] ring-1 ring-[#0b2a4a]/15 hover:ring-[#0b2a4a]/30"}`}
        >
          Custom
        </button>
        {custom && (
          <span className="flex items-center gap-1.5">
            <input
              type="number"
              min={unit === "km" ? 0.05 : 50}
              step={unit === "km" ? 0.1 : 10}
              value={text}
              onChange={e => { setText(e.target.value); applyCustom(e.target.value, unit); }}
              className="crm-input h-8 w-24 text-xs"
              aria-label="Custom radius"
            />
            <select
              value={unit}
              onChange={e => {
                const u = e.target.value === "km" ? "km" : "m";
                const converted = u === "km" ? String(Math.round((valueM / 1000) * 100) / 100) : String(valueM);
                setUnit(u);
                setText(converted);
              }}
              className="crm-input h-8 w-auto text-xs py-0"
              aria-label="Radius unit"
            >
              <option value="m">metres</option>
              <option value="km">km</option>
            </select>
          </span>
        )}
      </div>
      <p className="text-[11px] text-[#0b2a4a]/55 mt-1.5">Only businesses whose map position is within {formatRadius(valueM)} of the point are saved.</p>
    </div>
  );
}
