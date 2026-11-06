"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

type Job = { id: string; target: string; engine: string; created_at?: string; total_saved?: number; status?: string };
type Lead = Record<string, string | number | null | undefined> & { id: string; title?: string; phone_1?: string | null; address?: string | null; category?: string | null; website?: string | null; job_engine?: string; job_target?: string; first_seen?: string };

type Props = {
  jobs: Job[];
  /** Authenticated fetch (path relative to the API). */
  request: (path: string) => Promise<Response>;
  onCopy: (text: string) => void;
};

const fmt = (n: number) => new Intl.NumberFormat("en-US").format(n || 0);
const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const PAGE = 50;

const parseDate = (v?: string) => {
  if (!v) return null;
  const s = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(v) ? v.replace(" ", "T") + "Z" : v;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};
const shortDate = (v?: string) => parseDate(v)?.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) || "—";

function presetRange(key: string): { from: string; to: string } {
  const now = new Date();
  const today = iso(now);
  if (key === "7d") return { from: iso(new Date(now.getTime() - 6 * 86400000)), to: today };
  if (key === "30d") return { from: iso(new Date(now.getTime() - 29 * 86400000)), to: today };
  if (key === "lastMonth") {
    const first = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const last = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: iso(first), to: iso(last) };
  }
  if (key === "90d") return { from: iso(new Date(now.getTime() - 89 * 86400000)), to: today };
  return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }; // this month
}

const SourceBadge = ({ engine }: { engine?: string }) => (
  <span className={`inline-flex items-center h-5 px-2 rounded-full text-[10px] font-bold uppercase tracking-wide ${engine === "2gis" ? "bg-[#12a594]/15 text-[#0b2a4a]" : "bg-[#0b2a4a] text-white"}`}>
    {engine === "2gis" ? "2GIS" : "Google Maps"}
  </span>
);

export default function NewListings({ jobs, request, onCopy }: Props) {
  const [mode, setMode] = useState<"range" | "compare">("range");

  // Date-range mode
  const [preset, setPreset] = useState("month");
  const [{ from, to }, setRange] = useState(presetRange("month"));
  const [engine, setEngine] = useState<"all" | "gmaps" | "2gis">("all");
  const [target, setTarget] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(0);

  // Compare mode
  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => (parseDate(a.created_at)?.getTime() || 0) - (parseDate(b.created_at)?.getTime() || 0)),
    [jobs]
  );
  const [baseline, setBaseline] = useState("");
  const [current, setCurrent] = useState("");
  const [show, setShow] = useState<"new" | "removed">("new");

  const [data, setData] = useState<{ rows: Lead[]; total: number; previouslyKnown?: number; byDay?: { day: string; count: number }[]; counts?: { added: number; removed: number; unchanged: number } } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const pastTargets = useMemo(() => Array.from(new Set(jobs.map(j => j.target))).slice(0, 50), [jobs]);

  // Sensible compare defaults: newest extraction vs the previous run of the same search.
  useEffect(() => {
    if (current || sortedJobs.length < 2) return;
    const latest = sortedJobs[sortedJobs.length - 1];
    const prevSame = [...sortedJobs].reverse().find(j => j.id !== latest.id && j.target.toLowerCase() === latest.target.toLowerCase() && j.engine === latest.engine);
    const prev = prevSame || sortedJobs[sortedJobs.length - 2];
    const t = setTimeout(() => { setCurrent(latest.id); setBaseline(prev.id); }, 0);
    return () => clearTimeout(t);
  }, [sortedJobs, current]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQ(q.trim()); setPage(0); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const query = useCallback((format?: "csv") => {
    const p = new URLSearchParams({ limit: String(PAGE), offset: String(page * PAGE) });
    if (debouncedQ) p.set("q", debouncedQ);
    if (format) p.set("format", format);
    if (mode === "range") {
      p.set("from", from);
      p.set("to", to);
      if (engine !== "all") p.set("engine", engine);
      if (target.trim()) p.set("target", target.trim());
      return `/api/leads/new?${p.toString()}`;
    }
    p.set("baseline", baseline);
    p.set("current", current);
    p.set("show", show);
    return `/api/leads/compare?${p.toString()}`;
  }, [mode, from, to, engine, target, debouncedQ, page, baseline, current, show]);

  useEffect(() => {
    if (mode === "compare" && (!baseline || !current || baseline === current)) return;
    if (mode === "range" && (!from || !to)) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await request(query());
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) { setError(body.error || "Could not load listings"); setData(null); }
        else setData(body);
      } catch {
        if (!cancelled) setError("Network error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [query, request, mode, baseline, current, from, to]);

  const exportCsv = async () => {
    const res = await request(query("csv"));
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = mode === "range" ? `new_listings_${from}_to_${to}.csv` : `${show}_listings.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const total = data?.total || 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const dayMax = Math.max(1, ...(data?.byDay || []).map(d => d.count));
  const jobLabel = (j: Job) => `${j.target} · ${j.engine === "2gis" ? "2GIS" : "Google Maps"} · ${shortDate(j.created_at)} · ${fmt(j.total_saved || 0)} leads`;

  return (
    <div className="space-y-6">
      {/* Mode + filters */}
      <div className="crm-box">
        <div className="crm-box-header flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex p-1 rounded-xl bg-[#eef6f4] ring-1 ring-[#0b2a4a]/[0.06]">
            {([["range", "First seen in a period"], ["compare", "Compare two extractions"]] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => { setMode(k); setPage(0); setData(null); }}
                className={`h-8 px-3.5 rounded-lg text-xs font-semibold transition-colors ${mode === k ? "bg-white text-[#0b2a4a] shadow-sm" : "text-[#0b2a4a]/60 hover:text-[#0b2a4a]"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={exportCsv} disabled={!total} className="crm-btn-default h-9 disabled:opacity-50">Export CSV</button>
        </div>

        <div className="p-4 sm:p-5">
          {mode === "range" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="xl:col-span-2">
                <label className="crm-label">Period</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {([["7d", "Last 7 days"], ["30d", "Last 30 days"], ["month", "This month"], ["lastMonth", "Last month"], ["90d", "Last 90 days"]] as const).map(([k, label]) => (
                    <button
                      key={k}
                      onClick={() => { setPreset(k); setRange(presetRange(k)); setPage(0); }}
                      className={`h-8 px-3 rounded-full text-xs font-semibold ${preset === k ? "bg-[#0b2a4a] text-white" : "bg-white ring-1 ring-[#0b2a4a]/15 text-[#0b2a4a] hover:ring-[#0b2a4a]/30"}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2.5">
                  <input type="date" value={from} max={to} onChange={e => { setPreset("custom"); setRange({ from: e.target.value, to }); setPage(0); }} className="crm-input h-9 text-xs" aria-label="From date" />
                  <span className="text-xs text-[#0b2a4a]/50">to</span>
                  <input type="date" value={to} min={from} onChange={e => { setPreset("custom"); setRange({ from, to: e.target.value }); setPage(0); }} className="crm-input h-9 text-xs" aria-label="To date" />
                </div>
              </div>
              <div>
                <label className="crm-label">Source</label>
                <select value={engine} onChange={e => { setEngine(e.target.value as "all" | "gmaps" | "2gis"); setPage(0); }} className="crm-input">
                  <option value="all">Google Maps + 2GIS</option>
                  <option value="gmaps">Google Maps only</option>
                  <option value="2gis">2GIS only</option>
                </select>
              </div>
              <div>
                <label className="crm-label">Search contains</label>
                <input
                  list="past-targets"
                  value={target}
                  onChange={e => { setTarget(e.target.value); setPage(0); }}
                  placeholder="e.g. real estate in Dubai"
                  className="crm-input"
                />
                <datalist id="past-targets">{pastTargets.map(t => <option key={t} value={t} />)}</datalist>
              </div>
              <p className="md:col-span-2 xl:col-span-4 text-xs text-[#0b2a4a]/60 leading-relaxed">
                A listing counts as <b className="text-[#0b2a4a]">new</b> when it was found in this period and in none of your earlier searches
                {target.trim() ? <> matching “{target.trim()}”</> : null}
                {engine !== "all" ? <> on {engine === "2gis" ? "2GIS" : "Google Maps"}</> : null}. For a fair comparison, repeat the same search (same keyword and location) each time.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <label className="crm-label">Older extraction (before)</label>
                <select value={baseline} onChange={e => { setBaseline(e.target.value); setPage(0); }} className="crm-input">
                  <option value="">Choose...</option>
                  {sortedJobs.map(j => <option key={j.id} value={j.id}>{jobLabel(j)}</option>)}
                </select>
              </div>
              <div>
                <label className="crm-label">Newer extraction (after)</label>
                <select value={current} onChange={e => { setCurrent(e.target.value); setPage(0); }} className="crm-input">
                  <option value="">Choose...</option>
                  {sortedJobs.map(j => <option key={j.id} value={j.id}>{jobLabel(j)}</option>)}
                </select>
              </div>
              {baseline && current && baseline === current && (
                <p className="lg:col-span-2 text-xs font-semibold text-[#0b2a4a]">Pick two different extractions.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Summary */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(mode === "range"
            ? [
                { label: "New listings", value: fmt(total), sub: `First seen ${shortDate(from)} – ${shortDate(to)}`, accent: true },
                { label: "Previously known", value: fmt(data.previouslyKnown || 0), sub: "Already found before this period" },
                { label: "Growth", value: data.previouslyKnown ? `+${Math.round((total / data.previouslyKnown) * 100)}%` : total ? "All new" : "—", sub: "New vs previously known" }
              ]
            : [
                { label: "New listings", value: fmt(data.counts?.added || 0), sub: "In the newer search only", accent: true },
                { label: "No longer listed", value: fmt(data.counts?.removed || 0), sub: "In the older search only" },
                { label: "In both", value: fmt(data.counts?.unchanged || 0), sub: "Found both times" }
              ]
          ).map(card => (
            <div key={card.label} className="crm-box p-5">
              <div className="crm-label !mb-1">{card.label}</div>
              <div className={`text-[28px] leading-none font-extrabold tracking-[-0.02em] tabular-nums ${card.accent ? "text-[#12a594]" : ""}`}>{card.value}</div>
              <div className="text-xs text-[#0b2a4a]/60 mt-2">{card.sub}</div>
            </div>
          ))}
        </div>
      )}

      {mode === "range" && data?.byDay && data.byDay.length > 0 && (
        <div className="crm-box p-5">
          <div className="crm-box-title mb-4">New listings by day</div>
          <div className="flex items-end gap-1.5 h-28">
            {data.byDay.map(d => (
              <div key={d.day} className="group relative flex-1 h-full flex items-end min-w-[6px]">
                <div className="w-full rounded-t bg-[#12a594]" style={{ height: `${(d.count / dayMax) * 100}%` }} />
                <div className="pointer-events-none absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-md bg-[#0b2a4a] text-white text-[11px] px-2 py-1 z-10">
                  {shortDate(d.day)} · {fmt(d.count)} new
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-[#0b2a4a]/50 mt-1.5">
            <span>{shortDate(data.byDay[0].day)}</span>
            <span>{shortDate(data.byDay[data.byDay.length - 1].day)}</span>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="crm-box overflow-hidden">
        <div className="crm-box-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h2 className="crm-box-title">
              {mode === "compare" && show === "removed" ? "No longer listed" : "New listings"}
            </h2>
            {mode === "compare" && (
              <div className="inline-flex p-0.5 rounded-lg bg-[#eef6f4]">
                {([["new", "New"], ["removed", "No longer listed"]] as const).map(([k, label]) => (
                  <button key={k} onClick={() => { setShow(k); setPage(0); }} className={`h-7 px-2.5 rounded-md text-[11px] font-semibold ${show === k ? "bg-white shadow-sm" : "text-[#0b2a4a]/60"}`}>{label}</button>
                ))}
              </div>
            )}
          </div>
          <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search name, phone, address..." className="crm-input h-9 text-xs sm:w-64" />
        </div>

        {error ? (
          <div className="p-10 text-center text-sm text-[#0b2a4a]/70">{error}</div>
        ) : !data && loading ? (
          <div className="p-10 text-center text-xs text-[#0b2a4a]/60">Loading...</div>
        ) : !data || data.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[#0b2a4a]/60">
            {mode === "compare" && (!baseline || !current) ? "Choose two extractions to compare." : "No new listings for these filters."}
          </div>
        ) : (
          <>
            <div className={`hidden md:block overflow-x-auto ${loading ? "opacity-60" : ""}`}>
              <table className="min-w-full text-left text-xs divide-y divide-[#0b2a4a]/10">
                <thead className="bg-[#eef6f4] text-[#0b2a4a]/70 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Phone</th>
                    <th className="px-4 py-3">Address</th>
                    <th className="px-4 py-3">Source</th>
                    <th className="px-4 py-3">{mode === "compare" && show === "removed" ? "Last seen" : "First seen"}</th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0b2a4a]/[0.06] bg-white">
                  {data.rows.map(l => (
                    <tr key={l.id} className="hover:bg-[#eef6f4]/60 align-top">
                      <td className="px-4 py-3 max-w-[260px]">
                        <div className="font-semibold truncate" title={l.title}>{l.title}</div>
                        <div className="text-[11px] text-[#0b2a4a]/55 truncate">{l.category || "—"}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono">
                        {l.phone_1 ? <a href={`tel:${l.phone_1}`} className="hover:underline">{l.phone_1}</a> : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-[300px]"><div className="truncate text-[#0b2a4a]/75" title={l.address || ""}>{l.address || "—"}</div></td>
                      <td className="px-4 py-3"><SourceBadge engine={l.job_engine} /><div className="text-[10.5px] text-[#0b2a4a]/50 mt-1 truncate max-w-[180px]" title={l.job_target}>{l.job_target}</div></td>
                      <td className="px-4 py-3 whitespace-nowrap">{shortDate(l.first_seen)}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => onCopy([l.title, l.phone_1, l.website, l.address].filter(Boolean).join(" | "))} className="text-[#0b2a4a]/50 hover:text-[#0b2a4a]" aria-label="Copy">⧉</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="md:hidden divide-y divide-[#0b2a4a]/[0.06]">
              {data.rows.map(l => (
                <li key={l.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-sm">{l.title}</div>
                    <SourceBadge engine={l.job_engine} />
                  </div>
                  <div className="text-xs text-[#0b2a4a]/60 mt-1">{l.address || l.category}</div>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    {l.phone_1 ? <a href={`tel:${l.phone_1}`} className="font-mono font-semibold">{l.phone_1}</a> : <span />}
                    <span className="text-[#0b2a4a]/50">{shortDate(l.first_seen)}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-[#0b2a4a]/[0.07] text-xs text-[#0b2a4a]/60">
              <span>Showing <b className="text-[#0b2a4a]">{fmt(page * PAGE + 1)}–{fmt(Math.min(total, (page + 1) * PAGE))}</b> of <b className="text-[#0b2a4a]">{fmt(total)}</b></span>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} className="crm-btn-default h-8 px-3 text-xs disabled:opacity-40">Prev</button>
                <span className="tabular-nums">{page + 1} / {fmt(pages)}</span>
                <button onClick={() => setPage(p => Math.min(pages - 1, p + 1))} disabled={page >= pages - 1} className="crm-btn-default h-8 px-3 text-xs disabled:opacity-40">Next</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
