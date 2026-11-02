"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
const LOGO_IMG = "https://ik.imagekit.io/Reinhart/nox/7strokeslogo.png";

let setServerStatusGlobal: ((online: boolean) => void) | null = null;

const apiFetch = async (url: string, options: RequestInit = {}) => {
  const headers = new Headers(options.headers || {});
  headers.set("ngrok-skip-browser-warning", "true");
  const fullUrl = url.startsWith("http") ? url : `${API_BASE}${url.startsWith("/") ? url : `/${url}`}`;
  try {
    const res = await fetch(fullUrl, { ...options, headers });
    if (setServerStatusGlobal) setServerStatusGlobal(true);
    return res;
  } catch (err) {
    if (setServerStatusGlobal) setServerStatusGlobal(false);
    throw err;
  }
};

const EXPORT_COLUMNS = [
  { key: "title", label: "Business Name" },
  { key: "phone_1", label: "Primary Phone" },
  { key: "phone_2", label: "Secondary Phone" },
  { key: "email", label: "Email" },
  { key: "website", label: "Website" },
  { key: "category", label: "Category" },
  { key: "street", label: "Street" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "country", label: "Country" },
  { key: "postal_code", label: "Postal Code" },
  { key: "address", label: "Full Address" },
  { key: "rating", label: "Rating" },
  { key: "reviews", label: "Reviews" },
  { key: "opening_hours", label: "Hours" },
  { key: "place_id", label: "Place ID" }
];

const POPULAR_CATEGORIES = [
  "Real Estate & Property",
  "Dental Clinics",
  "Restaurants & Cafes",
  "Hotels & Resorts",
  "Fitness Centers & Gyms",
  "Beauty Salons & Spas",
  "Medical Clinics & Doctors",
  "Law Firms & Legal Services",
  "Accounting & Audit Firms",
  "Car Rental & Leasing",
  "Marketing & Digital Agencies",
  "IT & Software Companies",
  "Construction & Contracting",
  "Interior Design & Fit-Out",
  "Logistics & Cargo Forwarding",
  "Cleaning & Facility Services",
  "Supermarkets & Grocery",
  "Auto Repair & Garages",
  "Pharmacies & Healthcare",
  "Solar & MEP Contracting"
];

const TWOGIS_SUPPORTED_REGIONS = [
  {
    country: "United Arab Emirates",
    cities: [
      { name: "Abu Dhabi", label: "Abu Dhabi (Capital)" },
      { name: "Dubai", label: "Dubai" },
      { name: "Sharjah", label: "Sharjah" },
      { name: "Ajman", label: "Ajman" },
      { name: "Ras Al Khaimah", label: "Ras Al Khaimah" },
      { name: "Fujairah", label: "Fujairah" },
      { name: "Umm Al Quwain", label: "Umm Al Quwain" }
    ]
  },
  {
    country: "Saudi Arabia",
    cities: [
      { name: "Riyadh", label: "Riyadh" },
      { name: "Jeddah", label: "Jeddah" }
    ]
  },
  {
    country: "Qatar",
    cities: [
      { name: "Doha", label: "Doha" }
    ]
  },
  {
    country: "Kuwait",
    cities: [
      { name: "Kuwait City", label: "Kuwait City" }
    ]
  },
  {
    country: "Bahrain",
    cities: [
      { name: "Manama", label: "Manama" }
    ]
  },
  {
    country: "Oman",
    cities: [
      { name: "Muscat", label: "Muscat" }
    ]
  }
];

// Clean Monochromatic SVG Icons (currentColor, crisp 1.75 stroke)
const IconSearch = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

const IconDatabase = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
  </svg>
);

const IconUsers = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const IconShield = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconPhone = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
  </svg>
);

const IconGlobe = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconMapPin = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

const IconStar = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const IconCopy = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IconDownload = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

const IconRefresh = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </svg>
);

const IconStop = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="6" y="6" width="12" height="12" rx="2" ry="2" />
  </svg>
);

const IconMenu = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const IconLogOut = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchEngine, setSearchEngine] = useState<"gmaps" | "2gis">("gmaps");
  const [twoGisCountry, setTwoGisCountry] = useState<string>("United Arab Emirates");
  const [twoGisCity, setTwoGisCity] = useState<string>("Abu Dhabi");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  const [token, setToken] = useState("");
  const [user, setUser] = useState<{
    id: string;
    name: string;
    email: string;
    username?: string;
    avatar?: string;
    role: string;
    can_use_proxy?: number;
    custom_proxy?: string;
    company?: string;
    manager_id?: string;
  } | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const [viewMode, setViewMode] = useState<"app" | "admin">("app");
  const [activeTab, setActiveTab] = useState<"search" | "leads" | "settings">("search");
  const [adminTab, setAdminTab] = useState<"overview" | "users" | "leads">("overview");

  const [jobs, setJobs] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminGlobalLeads, setAdminGlobalLeads] = useState<any[]>([]);

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [leadCount, setLeadCount] = useState<number>(100);
  const [isStarting, setIsStarting] = useState(false);

  const [userProxy, setUserProxy] = useState("");
  const [proxySaveSuccess, setProxySaveSuccess] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobResults, setJobResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const [searchMode, setSearchMode] = useState<"single" | "bulk">("single");
  const [bulkQueriesText, setBulkQueriesText] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [isBulkStarting, setIsBulkStarting] = useState(false);
  const [bulkStatusMsg, setBulkStatusMsg] = useState("");

  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  useEffect(() => {
    setServerStatusGlobal = setIsServerOnline;
    const storedToken = localStorage.getItem("token");
    if (storedToken) {
      setToken(storedToken);
      apiFetch("/api/auth/profile", {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then(r => r.json())
        .then(u => {
          if (u && u.id) {
            setUser(u);
            setUserProxy(u.custom_proxy || "");
            fetchJobsList(storedToken);
          } else {
            localStorage.removeItem("token");
            setToken("");
            setUser(null);
          }
        })
        .catch(() => {
          setIsServerOnline(false);
        });
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchJobsList(token, false);
      if (selectedJobId) {
        fetchJobDetails(selectedJobId, token, false);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [token, selectedJobId]);

  const fetchJobsList = async (authToken: string, showLoading = true) => {
    try {
      const res = await apiFetch("/api/jobs", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const list = await res.json();
        setJobs(Array.isArray(list) ? list : []);
        if (!selectedJobId && Array.isArray(list) && list.length > 0) {
          setSelectedJobId(list[0].id);
          fetchJobDetails(list[0].id, authToken, showLoading);
        }
      }
    } catch {}
  };

  const fetchJobDetails = async (jobId: string, authToken: string, showLoading = true) => {
    if (showLoading) setLoadingResults(true);
    try {
      const res = await apiFetch(`/api/jobs/${jobId}/leads`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setJobResults(Array.isArray(data) ? data : []);
      }
    } catch {} finally {
      if (showLoading) setLoadingResults(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    if (authMode === "login") {
      try {
        const res = await apiFetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          localStorage.setItem("token", data.token);
          setToken(data.token);
          setUser(data.user);
          setUserProxy(data.user.custom_proxy || "");
          fetchJobsList(data.token);
        } else {
          setAuthError(data.error || "Login failed. Check your credentials.");
        }
      } catch (err: any) {
        setAuthError(err.message || "Network error. Backend unreachable.");
      }
    } else {
      try {
        const res = await apiFetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, username: regUsername, email, password })
        });
        const data = await res.json();
        if (res.ok) {
          setAuthSuccess("Registration successful! You may now sign in.");
          setAuthMode("login");
          setPassword("");
        } else {
          setAuthError(data.error || "Registration failed.");
        }
      } catch (err: any) {
        setAuthError(err.message || "Network error.");
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken("");
    setUser(null);
    setJobs([]);
    setJobResults([]);
    setSelectedJobId(null);
  };

  const startLeadSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsStarting(true);
    const chosenLocation = searchEngine === "2gis" ? twoGisCity : location;
    const targetQuery = chosenLocation.trim() ? `${keyword.trim()} in ${chosenLocation.trim()}` : keyword.trim();

    try {
      const res = await apiFetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          engine: searchEngine,
          target: targetQuery,
          cap: leadCount,
          proxy: userProxy.trim()
        })
      });

      if (res.ok) {
        const createdJob = await res.json();
        await fetchJobsList(token);
        setSelectedJobId(createdJob.id);
        fetchJobDetails(createdJob.id, token, true);
        setActiveTab("search");
      }
    } catch {} finally {
      setIsStarting(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const lines = content
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(l => l.length > 0 && !l.startsWith("#"));
        setBulkQueriesText(lines.join("\n"));
      }
    };
    reader.readAsText(file);
  };

  const startBulkSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const queries = bulkQueriesText
      .split(/\r?\n/)
      .map(q => q.trim())
      .filter(q => q.length > 0);

    if (queries.length === 0) return;
    setIsBulkStarting(true);
    setBulkStatusMsg("");

    try {
      const res = await apiFetch("/api/jobs/bulk", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          engine: searchEngine,
          queries,
          cap: leadCount,
          proxy: userProxy.trim()
        })
      });

      if (res.ok) {
        const data = await res.json();
        setBulkStatusMsg(`Created ${data.createdCount || queries.length} parallel extraction tasks.`);
        await fetchJobsList(token);
        setActiveTab("leads");
      }
    } catch (err: any) {
      setBulkStatusMsg(`Bulk start failed: ${err.message}`);
    } finally {
      setIsBulkStarting(false);
    }
  };

  const stopSearch = async (jobId: string) => {
    try {
      await apiFetch(`/api/jobs/${jobId}/cancel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchJobsList(token, false);
    } catch {}
  };

  const deleteSearch = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this extraction record and its leads?")) return;
    try {
      await apiFetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setJobResults([]);
      }
      fetchJobsList(token, false);
    } catch {}
  };

  const exportLeadsCsv = (leads: any[], filename = "7strokes_leads.csv") => {
    if (!leads || leads.length === 0) return;
    const headers = ["Title", "Phone 1", "Phone 2", "Address", "City", "Category", "Rating", "Reviews", "Website"];
    const rows = leads.map(l => [
      `"${(l.title || "").replace(/"/g, '""')}"`,
      `"${(l.phone_1 || "").replace(/"/g, '""')}"`,
      `"${(l.phone_2 || "").replace(/"/g, '""')}"`,
      `"${(l.address || "").replace(/"/g, '""')}"`,
      `"${(l.city || "").replace(/"/g, '""')}"`,
      `"${(l.category || "").replace(/"/g, '""')}"`,
      `"${l.rating || ""}"`,
      `"${l.reviews || ""}"`,
      `"${(l.website || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast("Copied to clipboard!");
    setTimeout(() => setCopyToast(null), 2000);
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0];
  const runningJob = jobs.find(j => j.status === "running" || j.status === "pending");

  const filteredResults = jobResults.filter(r => {
    if (!searchFilter.trim()) return true;
    const term = searchFilter.toLowerCase();
    return (
      (r.title && r.title.toLowerCase().includes(term)) ||
      (r.phone_1 && r.phone_1.includes(term)) ||
      (r.address && r.address.toLowerCase().includes(term)) ||
      (r.category && r.category.toLowerCase().includes(term))
    );
  });

  // ----------------------------------------------------
  // UNAUTHENTICATED SCREEN (Clean Apple-Style CRM Login)
  // ----------------------------------------------------
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-[420px] crm-box p-8 shadow-sm">
          <div className="text-center mb-6">
            <img src={LOGO_IMG} alt="7Strokes" className="h-12 w-auto mx-auto mb-3 object-contain" />
            <h1 className="text-xl font-bold text-[#0f172a]">Lead Finder Database</h1>
            <p className="text-xs text-[#64748b] mt-1">Enter your CRM credentials to access the extraction workspace</p>
          </div>

          {!isServerOnline && (
            <div className="mb-5 p-3 rounded-md bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>Backend server is offline or unreachable on port 4000.</span>
            </div>
          )}

          {authError && (
            <div className="mb-4 p-3 rounded-md bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs font-semibold">
              {authError}
            </div>
          )}

          {authSuccess && (
            <div className="mb-4 p-3 rounded-md bg-[#f0fdf4] border border-[#bbf7d0] text-[#16a34a] text-xs font-semibold">
              {authSuccess}
            </div>
          )}

          <div className="flex border-b border-[#e2e8f0] mb-5">
            <button
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
              className={`pb-2.5 text-xs font-semibold border-b-2 mr-6 transition-colors ${authMode === "login" ? "border-[#0072f0] text-[#0072f0]" : "border-transparent text-[#64748b] hover:text-[#0f172a]"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("register"); setAuthError(""); }}
              className={`pb-2.5 text-xs font-semibold border-b-2 transition-colors ${authMode === "register" ? "border-[#0072f0] text-[#0072f0]" : "border-transparent text-[#64748b] hover:text-[#0f172a]"}`}
            >
              Register New Account
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {authMode === "register" && (
              <>
                <div>
                  <label className="crm-label">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="crm-input"
                  />
                </div>
                <div>
                  <label className="crm-label">Username</label>
                  <input
                    type="text"
                    required
                    value={regUsername}
                    onChange={e => setRegUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="e.g. jdoe_crm"
                    className="crm-input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="crm-label">{authMode === "login" ? "Username or Email" : "Email Address"}</label>
              <input
                type={authMode === "login" ? "text" : "email"}
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder={authMode === "login" ? "admin or user@company.com" : "user@company.com"}
                className="crm-input"
              />
            </div>

            <div>
              <label className="crm-label">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="crm-input"
              />
            </div>

            <button type="submit" className="crm-btn-primary w-full mt-2">
              {authMode === "login" ? "Sign In to Lead Finder" : "Create Account"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#f1f5f9] text-center">
            <span className="text-xs text-[#64748b]">Default Local Admin: <code className="text-[#0f172a] bg-[#f1f5f9] px-1 py-0.5 rounded">admin</code> / <code className="text-[#0f172a] bg-[#f1f5f9] px-1 py-0.5 rounded">admin123</code></span>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // AUTHENTICATED DASHBOARD (Clean Apple-Style CRM View)
  // ----------------------------------------------------
  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] font-sans overflow-hidden">
      {/* Toast Notification */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white text-xs font-semibold px-4 py-2.5 rounded-md shadow-lg flex items-center gap-2">
          <span>✓</span>
          <span>{copyToast}</span>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION (Sideways Dock) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#e2e8f0] flex flex-col justify-between p-4 transition-transform duration-200 md:static md:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}`}>
        <div>
          {/* Logo & Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-2.5">
              <img src={LOGO_IMG} alt="7Strokes" className="h-8 w-auto object-contain" />
              <div>
                <span className="font-bold text-sm tracking-tight text-[#0f172a]">7STROKES</span>
                <span className="block text-[10px] text-[#64748b] uppercase tracking-wider font-semibold">Lead Generator</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[#64748b] hover:text-[#0f172a]">✕</button>
          </div>

          {/* Navigation Items */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab("search"); setViewMode("app"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-semibold text-left transition-colors ${activeTab === "search" && viewMode === "app" ? "bg-[#0072f0]/10 text-[#0072f0] border-l-4 border-[#0072f0]" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"}`}
            >
              <IconSearch className="w-4 h-4 shrink-0" />
              <span>Find Leads</span>
            </button>

            <button
              onClick={() => { setActiveTab("leads"); setViewMode("app"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-md text-xs font-semibold text-left transition-colors ${activeTab === "leads" && viewMode === "app" ? "bg-[#0072f0]/10 text-[#0072f0] border-l-4 border-[#0072f0]" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"}`}
            >
              <div className="flex items-center gap-3">
                <IconDatabase className="w-4 h-4 shrink-0" />
                <span>Saved Database</span>
              </div>
              {jobs.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f1f5f9] text-[#475569]">
                  {jobs.length}
                </span>
              )}
            </button>

            {(user.role === "admin" || user.can_use_proxy === 1) && (
              <button
                onClick={() => { setActiveTab("settings"); setViewMode("app"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-semibold text-left transition-colors ${activeTab === "settings" && viewMode === "app" ? "bg-[#0072f0]/10 text-[#0072f0] border-l-4 border-[#0072f0]" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"}`}
              >
                <IconShield className="w-4 h-4 shrink-0" />
                <span>Proxy Settings</span>
              </button>
            )}

            {(user.role === "admin" || user.role === "manager") && (
              <button
                onClick={() => { setViewMode("admin"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-md text-xs font-semibold text-left transition-colors ${viewMode === "admin" ? "bg-[#0072f0]/10 text-[#0072f0] border-l-4 border-[#0072f0]" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"}`}
              >
                <IconUsers className="w-4 h-4 shrink-0" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>
        </div>

        {/* Sidebar Footer User Info & Logout */}
        <div className="pt-4 border-t border-[#f1f5f9]">
          <div className="flex items-center justify-between mb-3">
            <div className="min-w-0">
              <span className="block text-xs font-semibold text-[#0f172a] truncate">{user.name || user.username}</span>
              <span className="block text-[11px] text-[#64748b] truncate uppercase">{user.role}</span>
            </div>
            <span className="h-2 w-2 rounded-full bg-[#0072f0]"></span>
          </div>

          <button
            onClick={logout}
            className="w-full crm-btn-default flex items-center justify-center gap-2 text-xs"
          >
            <IconLogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* MAIN VIEW CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-[#64748b] hover:text-[#0f172a]">
              <IconMenu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#64748b]">
              <span>CRM</span>
              <span>/</span>
              <span className="text-[#0f172a] font-semibold">
                {viewMode === "admin" ? "Admin Console" : (activeTab === "search" ? "Find Leads" : (activeTab === "leads" ? "Saved Leads" : "Proxy Settings"))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#16a34a]"></span>
              Universal Geocoder Active
            </span>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* PAGE TITLE HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl font-bold text-[#0f172a] tracking-tight">
                  {viewMode === "admin" ? "Administrative Console" : "Lead Finder Database"}
                </h1>
                <p className="text-xs text-[#64748b] mt-0.5">
                  High-Speed Multi-Region Business Data Extraction Engine
                </p>
              </div>

              {runningJob && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#0072f0]/10 border border-[#0072f0]/20 text-[#0072f0] text-xs font-semibold">
                  <span className="animate-spin">⟳</span>
                  <span>Extracting: {runningJob.target} ({runningJob.total_saved || 0} leads)</span>
                  <button
                    onClick={() => stopSearch(runningJob.id)}
                    className="ml-2 text-[#dc2626] hover:underline font-bold"
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>

            {/* TAB 1: FIND LEADS (DUAL-BOX ARCHITECTURE) */}
            {viewMode === "app" && activeTab === "search" && (
              <>
                {/* BOX 1: SEARCH & LOCALITY PARAMETERS */}
                <div className="crm-box">
                  <div className="crm-box-header flex items-center justify-between">
                    <h2 className="crm-box-title">Initial Search & Locality Parameters</h2>
                    <div className="flex items-center gap-2 text-xs">
                      <button
                        onClick={() => setSearchMode("single")}
                        className={`px-3 py-1 rounded-md font-semibold transition-colors ${searchMode === "single" ? "bg-[#0072f0] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
                      >
                        Single Search
                      </button>
                      <button
                        onClick={() => setSearchMode("bulk")}
                        className={`px-3 py-1 rounded-md font-semibold transition-colors ${searchMode === "bulk" ? "bg-[#0072f0] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
                      >
                        Bulk File Search
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    {searchMode === "single" ? (
                      <form onSubmit={startLeadSearch} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Field 1: Category / Keyword */}
                          <div className="relative">
                            <label className="crm-label">Business Category or Niche *</label>
                            <input
                              type="text"
                              required
                              value={keyword}
                              onChange={e => setKeyword(e.target.value)}
                              onFocus={() => setShowCategoryDropdown(true)}
                              placeholder="e.g. Real Estate, Dental Clinics, Hotels..."
                              className="crm-input"
                            />
                            {showCategoryDropdown && (
                              <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#e2e8f0] rounded-md shadow-lg max-h-48 overflow-y-auto p-1">
                                <div className="text-[10px] uppercase font-bold text-[#64748b] px-3 py-1">Popular Categories:</div>
                                {POPULAR_CATEGORIES.map((cat, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => { setKeyword(cat); setShowCategoryDropdown(false); }}
                                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#f1f5f9] rounded text-[#0f172a]"
                                  >
                                    {cat}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Field 2: Target Location (City, Country, or Region) */}
                          <div>
                            <label className="crm-label">Target Location (Any City or Country) *</label>
                            <input
                              type="text"
                              value={location}
                              onChange={e => setLocation(e.target.value)}
                              placeholder="e.g. Jaipur, Dubai, Kenya, Germany, Austin..."
                              className="crm-input"
                            />
                          </div>

                          {/* Field 3: Max Leads Cap */}
                          <div>
                            <label className="crm-label">Leads Limit (Cap)</label>
                            <select
                              value={leadCount}
                              onChange={e => setLeadCount(Number(e.target.value))}
                              className="crm-input cursor-pointer"
                            >
                              <option value={50}>50 Leads</option>
                              <option value={100}>100 Leads (Standard)</option>
                              <option value={250}>250 Leads (Deep Scan)</option>
                              <option value={500}>500 Leads (Wide Area)</option>
                              <option value={0}>Unlimited (Full Grid)</option>
                            </select>
                          </div>

                          {/* Field 4: Scraping Engine */}
                          <div>
                            <label className="crm-label">Scraping Engine</label>
                            <select
                              value={searchEngine}
                              onChange={e => setSearchEngine(e.target.value as any)}
                              className="crm-input cursor-pointer"
                            >
                              <option value="gmaps">Google Maps Global (Direct HTTP)</option>
                              <option value="2gis">2GIS Directory (UAE & GCC)</option>
                            </select>
                          </div>
                        </div>

                        {/* Quick Location Pills */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-2">
                          <span className="text-[11px] font-semibold text-[#64748b] mr-1">Quick Select:</span>
                          {["Jaipur", "Dubai", "Abu Dhabi", "Mumbai", "Delhi", "Kenya", "Germany", "Iceland", "Austin", "Tokyo", "London"].map(loc => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => setLocation(loc)}
                              className={`px-2.5 py-1 rounded text-xs transition-colors border ${location.toLowerCase() === loc.toLowerCase() ? "bg-[#0072f0] text-white border-[#0072f0]" : "bg-[#f8fafc] text-[#475569] border-[#e2e8f0] hover:bg-[#f1f5f9]"}`}
                            >
                              {loc}
                            </button>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3 pt-3 border-t border-[#f1f5f9]">
                          <button
                            type="submit"
                            disabled={isStarting || !keyword.trim()}
                            className="crm-btn-primary gap-2 disabled:opacity-50"
                          >
                            <IconSearch className="w-4 h-4" />
                            <span>{isStarting ? "Initializing Extraction..." : "Start Lead Extraction"}</span>
                          </button>

                          {runningJob && (
                            <button
                              type="button"
                              onClick={() => stopSearch(runningJob.id)}
                              className="crm-btn-danger gap-2"
                            >
                              <IconStop className="w-4 h-4" />
                              <span>Stop Extraction</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => { setKeyword(""); setLocation(""); }}
                            className="crm-btn-default"
                          >
                            Reset
                          </button>
                        </div>
                      </form>
                    ) : (
                      <form onSubmit={startBulkSearch} className="space-y-4">
                        <div className="border-2 border-dashed border-[#cbd5e1] rounded-lg p-6 text-center bg-[#f8fafc]">
                          <input
                            type="file"
                            accept=".txt,.csv"
                            onChange={handleFileUpload}
                            className="hidden"
                            id="bulk-file-upload"
                          />
                          <label htmlFor="bulk-file-upload" className="cursor-pointer block">
                            <span className="text-sm font-semibold text-[#0072f0]">
                              {bulkFileName ? `Selected: ${bulkFileName}` : "Click to select a .txt or .csv queries file"}
                            </span>
                            <span className="block text-xs text-[#64748b] mt-1">One query per line (e.g. 'dental clinics in jaipur')</span>
                          </label>
                        </div>

                        <div>
                          <label className="crm-label">Search Queries (One Per Line)</label>
                          <textarea
                            rows={4}
                            value={bulkQueriesText}
                            onChange={e => setBulkQueriesText(e.target.value)}
                            placeholder={"real estate in jaipur\ndentists in dubai\nlawyers in kenya"}
                            className="crm-input h-auto py-2 font-mono"
                          />
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="submit"
                            disabled={isBulkStarting || !bulkQueriesText.trim()}
                            className="crm-btn-primary gap-2 disabled:opacity-50"
                          >
                            <IconSearch className="w-4 h-4" />
                            <span>{isBulkStarting ? "Starting Bulk Jobs..." : "Start Bulk Extraction"}</span>
                          </button>
                        </div>

                        {bulkStatusMsg && (
                          <div className="p-3 bg-[#f0f9ff] text-[#0369a1] text-xs rounded border border-[#bae6fd]">
                            {bulkStatusMsg}
                          </div>
                        )}
                      </form>
                    )}
                  </div>
                </div>

                {/* BOX 2: EXTRACTED LEADS DATABASE TABLE */}
                <div className="crm-box">
                  <div className="crm-box-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="crm-box-title">Extracted Leads Database</h2>
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-[#f1f5f9] text-[#475569]">
                        {filteredResults.length} records
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Filter results..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        className="crm-input h-8 text-xs w-48"
                      />
                      <button
                        onClick={() => exportLeadsCsv(filteredResults, `leads_${selectedJob?.target || "export"}.csv`)}
                        disabled={filteredResults.length === 0}
                        className="crm-btn-default h-8 text-xs gap-1.5 disabled:opacity-50"
                      >
                        <IconDownload className="w-3.5 h-3.5" />
                        <span>Export CSV</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {loadingResults ? (
                      <div className="p-8 text-center text-xs text-[#64748b]">Loading leads data...</div>
                    ) : filteredResults.length === 0 ? (
                      <div className="p-8 text-center">
                        <div className="inline-block bg-[#f0f9ff] border border-[#bae6fd] text-[#0369a1] px-6 py-3 rounded-md text-sm font-medium">
                          No Data Found
                        </div>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-[#e2e8f0] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569] font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Company Name</th>
                            <th className="px-4 py-3">Primary Phone</th>
                            <th className="px-4 py-3">Secondary Phone</th>
                            <th className="px-4 py-3">Address & Locality</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Rating</th>
                            <th className="px-4 py-3">Website</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9] bg-white">
                          {filteredResults.map((lead, idx) => (
                            <tr key={idx} className="hover:bg-[#f8fafc]/80 transition-colors">
                              <td className="px-4 py-3 text-[#64748b]">{idx + 1}</td>
                              <td className="px-4 py-3 font-semibold text-[#0f172a]">{lead.title || "—"}</td>
                              <td className="px-4 py-3">
                                {lead.phone_1 ? (
                                  <a href={`tel:${lead.phone_1}`} className="text-[#0072f0] hover:underline font-mono">
                                    {lead.phone_1}
                                  </a>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 font-mono text-[#64748b]">{lead.phone_2 || "—"}</td>
                              <td className="px-4 py-3 text-[#475569] max-w-[220px] truncate" title={lead.address || ""}>
                                {lead.address || lead.city || "—"}
                              </td>
                              <td className="px-4 py-3 text-[#64748b]">{lead.category || "—"}</td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {lead.rating ? (
                                  <span className="font-semibold text-[#0f172a]">{lead.rating} ★ ({lead.reviews || 0})</span>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 max-w-[150px] truncate">
                                {lead.website ? (
                                  <a href={lead.website} target="_blank" rel="noreferrer" className="text-[#0072f0] hover:underline">
                                    {lead.website.replace(/^https?:\/\//, '')}
                                  </a>
                                ) : "—"}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  onClick={() => copyToClipboard(`${lead.title} | ${lead.phone_1 || ''} | ${lead.address || ''}`)}
                                  className="text-[#64748b] hover:text-[#0f172a] p-1"
                                  title="Copy lead summary"
                                >
                                  <IconCopy className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: SAVED LEADS / PAST EXTRACTIONS */}
            {viewMode === "app" && activeTab === "leads" && (
              <div className="crm-box">
                <div className="crm-box-header flex items-center justify-between">
                  <h2 className="crm-box-title">Saved Extraction Database</h2>
                  <button
                    onClick={() => { setActiveTab("search"); }}
                    className="crm-btn-primary h-8 text-xs gap-1.5"
                  >
                    <span>+ New Lead Extraction</span>
                  </button>
                </div>

                <div className="p-6">
                  {jobs.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="inline-block bg-[#f0f9ff] border border-[#bae6fd] text-[#0369a1] px-6 py-3 rounded-md text-sm font-medium">
                        No Data Found
                      </div>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#e2e8f0] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569] font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Search Target</th>
                            <th className="px-4 py-3">Engine</th>
                            <th className="px-4 py-3">Leads Count</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created</th>
                            <th className="px-4 py-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9] bg-white">
                          {jobs.map(j => (
                            <tr key={j.id} className="hover:bg-[#f8fafc]/80 transition-colors">
                              <td className="px-4 py-3 font-semibold text-[#0f172a] capitalize">{j.target}</td>
                              <td className="px-4 py-3 text-[#64748b] uppercase font-mono">{j.engine}</td>
                              <td className="px-4 py-3 font-bold text-[#0f172a]">{j.total_saved || 0}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${j.status === "running" ? "bg-[#0072f0]/10 text-[#0072f0]" : "bg-[#f1f5f9] text-[#475569]"}`}>
                                  {j.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-[#64748b]">{new Date(j.created_at).toLocaleString()}</td>
                              <td className="px-4 py-3 text-right space-x-2">
                                <button
                                  onClick={() => { setSelectedJobId(j.id); fetchJobDetails(j.id, token, true); setActiveTab("search"); }}
                                  className="text-[#0072f0] hover:underline font-semibold"
                                >
                                  View Table
                                </button>
                                <button
                                  onClick={() => deleteSearch(j.id)}
                                  className="text-[#dc2626] hover:underline font-semibold"
                                >
                                  Delete
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: PROXY SETTINGS */}
            {viewMode === "app" && activeTab === "settings" && (
              <div className="crm-box max-w-2xl">
                <div className="crm-box-header">
                  <h2 className="crm-box-title">Network & Proxy Settings</h2>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="crm-label">Custom Proxy URL</label>
                    <input
                      type="text"
                      value={userProxy}
                      onChange={e => setUserProxy(e.target.value)}
                      placeholder="http://username:password@proxy-host:port"
                      className="crm-input font-mono text-xs"
                    />
                    <span className="text-[11px] text-[#64748b] mt-1 block">
                      HTTP/HTTPS proxy format: <code className="bg-[#f1f5f9] px-1 rounded">http://user:pass@host:port</code>
                    </span>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      onClick={async () => {
                        try {
                          const res = await apiFetch("/api/auth/profile", {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`
                            },
                            body: JSON.stringify({ custom_proxy: userProxy.trim() })
                          });
                          if (res.ok) {
                            setProxySaveSuccess(true);
                            setTimeout(() => setProxySaveSuccess(false), 2000);
                          }
                        } catch {}
                      }}
                      className="crm-btn-primary"
                    >
                      {proxySaveSuccess ? "Saved!" : "Save Proxy Settings"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: ADMIN CONSOLE */}
            {viewMode === "admin" && (
              <div className="crm-box">
                <div className="crm-box-header flex items-center justify-between">
                  <h2 className="crm-box-title">Administration & Team Management</h2>
                  <button
                    onClick={() => { setViewMode("app"); setActiveTab("search"); }}
                    className="crm-btn-default h-8 text-xs"
                  >
                    Back to Lead Finder
                  </button>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                      <span className="crm-label">Total Searches</span>
                      <span className="text-2xl font-bold text-[#0f172a]">{jobs.length}</span>
                    </div>
                    <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                      <span className="crm-label">Total Leads Stored</span>
                      <span className="text-2xl font-bold text-[#0072f0]">
                        {jobs.reduce((acc, j) => acc + (j.total_saved || 0), 0)}
                      </span>
                    </div>
                    <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-md">
                      <span className="crm-label">Current Role</span>
                      <span className="text-2xl font-bold text-[#0f172a] uppercase">{user.role}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
