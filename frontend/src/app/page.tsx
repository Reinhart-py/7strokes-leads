"use client";

import { useState, useEffect } from "react";

const AVAILABLE_COLUMNS: { key: string; label: string }[] = [
  { key: "title", label: "Business Name" },
  { key: "category", label: "Category" },
  { key: "categories", label: "All Categories" },
  { key: "phone_1", label: "Primary Phone" },
  { key: "phone_2", label: "Secondary Phone" },
  { key: "email", label: "Email Address" },
  { key: "website", label: "Website" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "postal_code", label: "Postal Code" },
  { key: "rating", label: "Rating" },
  { key: "reviews", label: "Reviews Count" },
  { key: "price_level", label: "Price Level" },
  { key: "status", label: "Operational Status" },
  { key: "latitude", label: "Latitude" },
  { key: "longitude", label: "Longitude" },
  { key: "plus_code", label: "Plus Code" },
  { key: "timezone", label: "Timezone" },
  { key: "opening_hours", label: "Opening Hours" },
  { key: "place_id", label: "Place ID" }
];

export default function Home() {
  const [token, setToken] = useState("");
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [activeTab, setActiveTab] = useState("dashboard");
  const [jobs, setJobs] = useState<any[]>([]);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobResults, setJobResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [filterQuery, setFilterQuery] = useState("");

  const [exportModalJobId, setExportModalJobId] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(
    AVAILABLE_COLUMNS.map(c => c.key)
  );
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json" | "html">("csv");

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      fetchUser(savedToken);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      const hasRunning = jobs.some(j => j.status === 'running' || j.status === 'pending');
      if (hasRunning || activeTab === 'history' || activeTab === 'dashboard') {
        fetchJobs(token);
        if (selectedJobId) {
          fetchJobResults(selectedJobId, token, false);
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [token, jobs, activeTab, selectedJobId]);

  const fetchUser = async (t: string) => {
    try {
      const res = await fetch("http://localhost:4000/api/auth/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        fetchJobs(t);
      } else {
        logout();
      }
    } catch {
      logout();
    }
  };

  const fetchJobs = async (t: string) => {
    try {
      const res = await fetch("http://localhost:4000/api/jobs", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setJobs(await res.json());
      }
    } catch {}
  };

  const fetchJobResults = async (jobId: string, t = token, showLoading = true) => {
    setSelectedJobId(jobId);
    if (showLoading) setLoadingResults(true);
    try {
      const res = await fetch(`http://localhost:4000/api/jobs/${jobId}/results?limit=300`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        setJobResults(await res.json());
      }
    } finally {
      if (showLoading) setLoadingResults(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    try {
      const res = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
        setUser(data.user);
        fetchJobs(data.token);
      } else {
        setAuthError(data.error || "Login failed");
      }
    } catch {
      setAuthError("Could not connect to API server");
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setSelectedJobId(null);
    setJobResults([]);
    localStorage.removeItem("token");
  };

  const startJob = async (engine: string, target: string, cap: number) => {
    if (!target.trim()) return;
    const res = await fetch("http://localhost:4000/api/jobs", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ engine, target, cap }),
    });
    if (res.ok) {
      fetchJobs(token);
      setActiveTab("history");
    }
  };

  const triggerExport = async () => {
    if (!exportModalJobId) return;
    const colsParam = selectedColumns.join(',');
    const url = `http://localhost:4000/api/jobs/${exportModalJobId}/export/${exportFormat}?columns=${encodeURIComponent(colsParam)}`;
    
    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `leads_${exportModalJobId}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(blobUrl);
      setExportModalJobId(null);
    } catch {}
  };

  const toggleColumn = (key: string) => {
    if (selectedColumns.includes(key)) {
      if (selectedColumns.length > 1) {
        setSelectedColumns(selectedColumns.filter(c => c !== key));
      }
    } else {
      setSelectedColumns([...selectedColumns, key]);
    }
  };

  const selectAllColumns = () => {
    setSelectedColumns(AVAILABLE_COLUMNS.map(c => c.key));
  };

  const deselectAllColumns = () => {
    setSelectedColumns(["title"]);
  };

  const deleteJob = async (jobId: string) => {
    try {
      await fetch(`http://localhost:4000/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setJobResults([]);
      }
      fetchJobs(token);
    } catch {}
  };

  const filteredResults = jobResults.filter(r => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.phone_1 && r.phone_1.toLowerCase().includes(q)) ||
      (r.email && r.email.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q))
    );
  });

  if (!token || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-4 bg-gradient-to-br from-[#0D3824] to-[#020906]">
        <div className="w-full max-w-[420px] bg-white rounded-[32px] p-8 sm:p-10 shadow-2xl text-center border border-neutral-100">
          <div className="mb-5 flex items-center justify-center">
            <span className="text-2xl font-black tracking-tight text-neutral-900">DashMin</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">Login to your account</h1>
          
          <form className="mt-6 space-y-3" onSubmit={handleLogin}>
            <input 
              type="email" 
              placeholder="Email" 
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-emerald-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              placeholder="Password" 
              className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm outline-none focus:border-emerald-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {authError && <div className="text-xs text-rose-500 font-medium">{authError}</div>}
            <button type="submit" className="w-full py-3 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 transition">
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full p-6 bg-gradient-to-br from-[#0D3824] to-[#020906]">
      <main className="w-full max-w-[1440px] mx-auto h-full bg-[#0C1311] rounded-[36px] overflow-hidden flex border border-emerald-950/40 shadow-2xl">
        <aside className="w-[260px] bg-[#0C1412] p-6 flex flex-col justify-between border-r border-emerald-950/40">
          <div>
            <div className="text-white font-black text-2xl mb-8 tracking-tight flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              DashMin
            </div>
            <nav className="space-y-2">
              <button onClick={() => { setActiveTab('dashboard'); setSelectedJobId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition ${activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                Dashboard
              </button>
              <button onClick={() => { setActiveTab('gmaps'); setSelectedJobId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition ${activeTab === 'gmaps' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                Google Maps
              </button>
              <button onClick={() => { setActiveTab('2gis'); setSelectedJobId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition ${activeTab === '2gis' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                2GIS Catalog
              </button>
              <button onClick={() => { setActiveTab('history'); setSelectedJobId(null); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition ${activeTab === 'history' ? 'bg-white/10 text-white' : 'text-gray-400 hover:text-white'}`}>
                Job History
              </button>
            </nav>
          </div>
          <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
            <div className="truncate text-white text-xs font-semibold">{user.name || user.email}</div>
            <button onClick={logout} className="text-gray-400 hover:text-rose-400 text-xs font-medium">Logout</button>
          </div>
        </aside>

        <section className="flex-1 bg-[#F4F7F5] rounded-l-[32px] p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-xs text-gray-500 mt-1">Full-spectrum direct HTTP scraping engine</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Workers</div>
                  <div className="text-3xl font-black text-gray-900 mt-2">{jobs.filter(j => j.status === 'running').length}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Leads Gathered</div>
                  <div className="text-3xl font-black text-gray-900 mt-2">{jobs.reduce((acc, curr) => acc + (curr.total_saved || 0), 0)}</div>
                </div>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Extraction Detail</div>
                  <div className="text-xl font-black text-emerald-600 mt-2">All Details Included</div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Quick Search Launch</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => setActiveTab('gmaps')} className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 hover:bg-emerald-50 text-left transition">
                    <div className="text-sm font-bold text-emerald-950">Google Maps HTTP Engine</div>
                    <div className="text-xs text-gray-500 mt-1">Deep extraction: emails, phones, categories, ratings, opening hours</div>
                  </button>
                  <button onClick={() => setActiveTab('2gis')} className="p-4 rounded-xl border border-blue-100 bg-blue-50/50 hover:bg-blue-50 text-left transition">
                    <div className="text-sm font-bold text-blue-950">2GIS Direct Catalog API</div>
                    <div className="text-xs text-gray-500 mt-1">Direct items search with full contact groups</div>
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'gmaps' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Google Maps Search</h1>
                <p className="text-xs text-gray-500 mt-1">Extracts phone, email, website, categories, rating, reviews, coordinates, plus code & hours</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4 max-w-2xl">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Target Keyword & City</label>
                  <input id="gmaps-target" type="text" placeholder="e.g., Real Estate in Dubai" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Lead Collection Cap</label>
                  <input id="gmaps-cap" type="number" defaultValue={200} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-600" />
                </div>
                <button onClick={() => {
                  const target = (document.getElementById('gmaps-target') as HTMLInputElement).value;
                  const cap = parseInt((document.getElementById('gmaps-cap') as HTMLInputElement).value) || 200;
                  startJob('gmaps', target, cap);
                }} className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-md">
                  Run Scraper Job
                </button>
              </div>
            </div>
          )}

          {activeTab === '2gis' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">2GIS Catalog Search</h1>
                <p className="text-xs text-gray-500 mt-1">Direct Catalog 3.0 extraction with rich phone contacts</p>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-4 max-w-2xl">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">City</label>
                  <input id="twogis-city" type="text" placeholder="e.g., Dubai" defaultValue="Dubai" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Search Keyword</label>
                  <input id="twogis-target" type="text" placeholder="e.g., Cafes" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-600" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Lead Collection Cap</label>
                  <input id="twogis-cap" type="number" defaultValue={200} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:border-emerald-600" />
                </div>
                <button onClick={() => {
                  const city = (document.getElementById('twogis-city') as HTMLInputElement).value;
                  const target = (document.getElementById('twogis-target') as HTMLInputElement).value;
                  const cap = parseInt((document.getElementById('twogis-cap') as HTMLInputElement).value) || 200;
                  startJob('2gis', `${city}:${target}`, cap);
                }} className="px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm transition shadow-md">
                  Run Scraper Job
                </button>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-black text-gray-900 tracking-tight">Job History & Leads</h1>
                  <p className="text-xs text-gray-500 mt-1">Inspect leads and export with custom column filtering</p>
                </div>
                <button onClick={() => fetchJobs(token)} className="text-xs font-bold px-3 py-2 bg-white rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50">
                  Refresh
                </button>
              </div>

              <div className="space-y-3">
                {jobs.map(job => (
                  <div key={job.id} className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] font-black px-2 py-0.5 rounded bg-gray-900 text-white uppercase">{job.engine}</span>
                        <h4 className="text-sm font-bold text-gray-900">{job.target}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${job.status === 'running' ? 'bg-blue-100 text-blue-700 animate-pulse' : job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-700'}`}>
                          {job.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 mt-1">Saved: <b className="text-gray-900">{job.total_saved}</b> leads (Cap: {job.cap || 'Unlimited'})</p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={() => fetchJobResults(job.id)} className="px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition">
                        View Leads
                      </button>
                      <button onClick={() => setExportModalJobId(job.id)} className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition flex items-center gap-1.5">
                        Export & Filter
                      </button>
                      {job.status === 'running' && (
                        <button onClick={async () => {
                          await fetch(`http://localhost:4000/api/jobs/${job.id}/stop`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
                          fetchJobs(token);
                        }} className="px-3 py-1.5 text-xs font-bold text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition">
                          Stop
                        </button>
                      )}
                      <button onClick={() => deleteJob(job.id)} className="px-2 py-1.5 text-xs font-bold text-gray-400 hover:text-rose-600 transition">
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                {jobs.length === 0 && (
                  <div className="bg-white rounded-2xl p-8 text-center text-xs text-gray-400">
                    No jobs started yet. Launch a search above!
                  </div>
                )}
              </div>

              {selectedJobId && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mt-6">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-900">Extracted Results ({filteredResults.length} of {jobResults.length} leads)</h3>
                      <p className="text-[11px] text-gray-400">Click Export & Filter to download selected columns in CSV, Excel, JSON or HTML</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        placeholder="Search loaded leads..." 
                        value={filterQuery} 
                        onChange={(e) => setFilterQuery(e.target.value)} 
                        className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:border-emerald-600 w-48"
                      />
                      <button onClick={() => setExportModalJobId(selectedJobId)} className="px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition">
                        Export
                      </button>
                      <button onClick={() => setSelectedJobId(null)} className="text-xs text-gray-400 hover:text-gray-700 px-2 py-1">
                        Close
                      </button>
                    </div>
                  </div>

                  {loadingResults ? (
                    <div className="py-8 text-center text-xs text-gray-500">Loading leads...</div>
                  ) : filteredResults.length === 0 ? (
                    <div className="py-8 text-center text-xs text-gray-400">No leads found matching your search.</div>
                  ) : (
                    <div className="overflow-x-auto max-h-[500px]">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="sticky top-0 bg-white">
                          <tr className="border-b border-gray-100 text-gray-400 font-semibold uppercase">
                            <th className="py-2.5 px-3">Title</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3">Phone</th>
                            <th className="py-2.5 px-3">Email</th>
                            <th className="py-2.5 px-3">Website</th>
                            <th className="py-2.5 px-3">Address</th>
                            <th className="py-2.5 px-3">Rating</th>
                            <th className="py-2.5 px-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {filteredResults.map((r, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="py-2 px-3 font-semibold text-gray-900">{r.title}</td>
                              <td className="py-2 px-3 text-emerald-700 font-medium">{r.category || r.categories || '-'}</td>
                              <td className="py-2 px-3 text-gray-700">{r.phone_1 || '-'}</td>
                              <td className="py-2 px-3 text-gray-700">{r.email || '-'}</td>
                              <td className="py-2 px-3 text-blue-600 truncate max-w-[140px]">
                                {r.website ? <a href={r.website} target="_blank" rel="noreferrer" className="hover:underline">{r.website}</a> : '-'}
                              </td>
                              <td className="py-2 px-3 text-gray-500 truncate max-w-[180px]">{r.address || '-'}</td>
                              <td className="py-2 px-3 text-amber-600 font-medium">{r.rating ? `★ ${r.rating} (${r.reviews || 0})` : '-'}</td>
                              <td className="py-2 px-3 text-gray-500 text-[10px]">{r.status || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </main>

      {exportModalJobId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-gray-100 space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Export & Filter Columns</h3>
                <p className="text-xs text-gray-500 mt-0.5">Select which columns to include in your export</p>
              </div>
              <button onClick={() => setExportModalJobId(null)} className="text-gray-400 hover:text-gray-700 text-sm font-bold">✕</button>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-2">Export Format</label>
              <div className="grid grid-cols-4 gap-2">
                {(["csv", "xlsx", "json", "html"] as const).map(fmt => (
                  <button 
                    key={fmt} 
                    onClick={() => setExportFormat(fmt)}
                    className={`py-2 rounded-xl text-xs font-extrabold uppercase border transition ${exportFormat === fmt ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'}`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-gray-700">Columns to Include ({selectedColumns.length} selected)</label>
                <div className="space-x-2 text-[11px]">
                  <button onClick={selectAllColumns} className="text-indigo-600 hover:underline font-bold">Select All</button>
                  <span className="text-gray-300">|</span>
                  <button onClick={deselectAllColumns} className="text-gray-500 hover:underline">Reset</button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-gray-50 rounded-2xl border border-gray-200 text-xs">
                {AVAILABLE_COLUMNS.map(col => {
                  const isChecked = selectedColumns.includes(col.key);
                  return (
                    <label key={col.key} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white cursor-pointer select-none">
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        onChange={() => toggleColumn(col.key)} 
                        className="rounded text-indigo-600 focus:ring-0"
                      />
                      <span className={`text-[11px] ${isChecked ? 'text-gray-900 font-semibold' : 'text-gray-400'}`}>
                        {col.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setExportModalJobId(null)} className="px-4 py-2.5 text-xs font-bold text-gray-500 hover:text-gray-800">
                Cancel
              </button>
              <button onClick={triggerExport} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-xl shadow-md transition">
                Download {exportFormat.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
