"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Sidebar, { NavItem } from "./Sidebar";
import dynamic from "next/dynamic";
import LocationSearch, { PlaceSuggestion } from "./LocationSearch";
import RadiusPicker, { formatRadius } from "./RadiusPicker";
import type { LatLon } from "./MapPicker";

// Leaflet needs the browser; load the map only on the client.
const MapPicker = dynamic(() => import("./MapPicker"), {
  ssr: false,
  loading: () => <div className="h-[340px] rounded-xl bg-[#eef6f4] ring-1 ring-[#0b2a4a]/10 flex items-center justify-center text-xs text-[#0b2a4a]/60">Loading map...</div>
});

const DEFAULT_PIN: LatLon = { lat: 25.2048, lon: 55.2708 };

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

const LIMIT_PRESETS = [100, 250, 500, 1000, 5000];
const PAGE_SIZES = [25, 50, 100, 250];

type JobStatus = "pending" | "running" | "completed" | "stopped" | "failed";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-[#eef6f4] text-[#0b2a4a]/70 ring-1 ring-inset ring-[#0b2a4a]/10",
  running: "bg-[#12a594]/20 text-[#0b2a4a] ring-1 ring-inset ring-[#12a594]/60",
  completed: "bg-[#0b2a4a] text-white",
  stopped: "bg-white text-[#0b2a4a]/70 ring-1 ring-inset ring-[#0b2a4a]/15",
  failed: "bg-[#0b2a4a]/10 text-[#0b2a4a] ring-1 ring-inset ring-[#0b2a4a]/25"
};

const isActiveStatus = (status?: string) => status === "running" || status === "pending";

const StatusBadge = ({ status }: { status?: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wide ${STATUS_STYLES[status || "pending"] || STATUS_STYLES.pending}`}>
    {isActiveStatus(status) && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
    {status || "pending"}
  </span>
);

const formatNumber = (n: number) => new Intl.NumberFormat("en-US").format(n || 0);

const formatCap = (cap?: number) => (cap && cap > 0 ? formatNumber(cap) : "Unlimited");

type Scope = "exact" | "extended" | "map";

const scopeLabel = (job: { scope?: string; radius_m?: number | null }) =>
  job.scope === "map"
    ? `Map pin · ${formatRadius(job.radius_m || 3000)}`
    : job.scope === "extended"
      ? `${formatRadius(job.radius_m || 3000)} radius`
      : "Exact";

const ScopeToggle = ({
  value,
  onChange,
  locationLabel,
  allowMap = true,
  allowRadius = true
}: {
  value: Scope;
  onChange: (v: Scope) => void;
  locationLabel: string;
  allowMap?: boolean;
  allowRadius?: boolean;
}) => {
  const options: { key: Scope; title: string; body: string; disabled?: string }[] = [
    { key: "exact", title: "Exact location", body: `Only businesses inside ${locationLabel}. Nothing from nearby buildings or streets.` },
    { key: "extended", title: "Radius around location", body: `Everything within the distance you choose from ${locationLabel}.`, disabled: allowRadius ? undefined : "Google Maps only" },
    { key: "map", title: "Pin on the map", body: "Drag a pin anywhere and search within the distance you choose.", disabled: allowMap ? undefined : "Google Maps only" }
  ];
  return (
    <div>
      <label className="crm-label">Search area</label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-2" role="radiogroup" aria-label="Search area">
        {options.map(opt => {
          const active = value === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={!!opt.disabled}
              onClick={() => onChange(opt.key)}
              className={`text-left rounded-xl border p-3.5 transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${active ? "border-[#12a594] bg-[#12a594]/[0.07] ring-1 ring-[#12a594]" : "border-[#0b2a4a]/12 bg-white hover:border-[#0b2a4a]/25"}`}
            >
              <span className="flex items-center gap-2">
                <span className={`w-4 h-4 rounded-full border-2 inline-flex items-center justify-center shrink-0 ${active ? "border-[#12a594]" : "border-[#0b2a4a]/25"}`}>
                  {active && <span className="w-2 h-2 rounded-full bg-[#12a594]" />}
                </span>
                <span className="text-[13px] font-bold">{opt.title}</span>
                {opt.disabled && <span className="ml-auto text-[10px] font-semibold text-[#0b2a4a]/50">{opt.disabled}</span>}
              </span>
              <span className="block text-xs text-[#0b2a4a]/60 mt-1.5 leading-relaxed">{opt.body}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

const parseServerDate = (value?: string) => {
  if (!value) return null;
  // SQLite returns "YYYY-MM-DD HH:MM:SS" in UTC without a zone marker.
  const iso = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(" ", "T") + "Z" : value;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

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
      { name: "Abu Dhabi", label: "Abu Dhabi" },
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

// Pure Monochromatic SVG Icons (currentColor, clean stroke)
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

const svgProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const
};

const IconPlus = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}><path d="M12 5v14M5 12h14" /></svg>
);

const BrandMark = ({ size = 36 }: { size?: number }) => (
  <span
    className="inline-flex items-center justify-center rounded-[10px] bg-white text-[#0b2a4a] font-extrabold shrink-0 ring-1 ring-[#12a594]/60"
    style={{ width: size, height: size, fontSize: size * 0.42 }}
    aria-hidden="true"
  >
    7S
  </span>
);

const PageHeader = ({ eyebrow, title, subtitle, actions }: { eyebrow?: string; title: string; subtitle?: React.ReactNode; actions?: React.ReactNode }) => (
  <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
    <div className="min-w-0">
      {eyebrow && <div className="crm-eyebrow mb-1.5">{eyebrow}</div>}
      <h1 className="text-[26px] sm:text-[30px] leading-tight font-extrabold tracking-[-0.02em] text-[#0b2a4a]">{title}</h1>
      {subtitle && <p className="text-sm text-[#0b2a4a]/60 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

const initialsOf = (name?: string) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join("") || "?";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navPinned, setNavPinned] = useState(true);
  const [globalSearch, setGlobalSearch] = useState("");
  const globalSearchRef = useRef<HTMLInputElement>(null);
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const [viewMode, setViewMode] = useState<"app" | "admin">("app");
  const [activeTab, setActiveTab] = useState<"search" | "leads" | "settings">("search");
  const [adminTab, setAdminTab] = useState<"overview" | "users" | "leads">("overview");

  const [jobs, setJobs] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [leadCount, setLeadCount] = useState<number>(500);
  const [limitMode, setLimitMode] = useState<"preset" | "custom">("preset");
  const [customLimit, setCustomLimit] = useState<string>("2000");
  const [isStarting, setIsStarting] = useState(false);

  const [userProxy, setUserProxy] = useState("");
  const [proxySaveSuccess, setProxySaveSuccess] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobResults, setJobResults] = useState<any[]>([]);
  const [loadedResultsKey, setLoadedResultsKey] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [debouncedFilter, setDebouncedFilter] = useState("");
  const [resultsPage, setResultsPage] = useState(0);
  const [resultsPageSize, setResultsPageSize] = useState(50);
  const [resultsTotal, setResultsTotal] = useState(0);
  const [resultsStats, setResultsStats] = useState<{ total: number; withPhone: number; withWebsite: number; withEmail: number } | null>(null);
  const [startError, setStartError] = useState("");

  // Refs let the polling interval read the latest values without being re-created.
  const selectedJobIdRef = useRef<string | null>(null);
  const resultsQueryRef = useRef({ page: 0, size: 50, q: "" });
  const resultsRequestRef = useRef(0);
  const jobsRef = useRef<any[]>([]);

  // Modals
  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [selectedCols, setSelectedCols] = useState<string[]>(EXPORT_COLUMNS.map(c => c.key));
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json" | "html">("csv");

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [newUserCompany, setNewUserCompany] = useState("");
  const [newUserManagerId, setNewUserManagerId] = useState("");
  const [newUserCanProxy, setNewUserCanProxy] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState("");

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("user");
  const [editUserCompany, setEditUserCompany] = useState("");
  const [editUserStatus, setEditUserStatus] = useState("active");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserCanProxy, setEditUserCanProxy] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileUsername, setProfileUsername] = useState("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState("");
  const [profileNewPassword, setProfileNewPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [searchMode, setSearchMode] = useState<"single" | "bulk">("single");
  const [searchScope, setSearchScope] = useState<Scope>("exact");
  const [selectedPlace, setSelectedPlace] = useState<PlaceSuggestion | null>(null);
  const [radiusM, setRadiusM] = useState(1000);
  const [mapPin, setMapPin] = useState<LatLon | null>(null);
  const [bulkQueriesText, setBulkQueriesText] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [isBulkStarting, setIsBulkStarting] = useState(false);
  const [bulkStatusMsg, setBulkStatusMsg] = useState("");

  const [isServerOnline, setIsServerOnline] = useState<boolean>(true);
  const [copyToast, setCopyToast] = useState<string | null>(null);

  const fetchJobDetails = useCallback(async (jobId: string, authToken: string) => {
    const { page, size, q } = resultsQueryRef.current;
    const requestKey = `${jobId}|${page}|${size}|${q}`;
    const requestId = ++resultsRequestRef.current;
    try {
      const params = new URLSearchParams({ paged: "1", limit: String(size), offset: String(page * size) });
      if (q) params.set("q", q);
      const res = await apiFetch(`/api/jobs/${jobId}/results?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      // Ignore responses for a job/page the user has already navigated away from.
      if (requestId !== resultsRequestRef.current) return;
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setJobResults(data);
          setResultsTotal(data.length);
        } else {
          setJobResults(Array.isArray(data.rows) ? data.rows : []);
          setResultsTotal(Number(data.total) || 0);
          setResultsStats(data.stats || null);
        }
      }
    } catch {} finally {
      if (requestId === resultsRequestRef.current) setLoadedResultsKey(requestKey);
    }
  }, []);

  const fetchJobsList = useCallback(async (authToken: string) => {
    try {
      const res = await apiFetch("/api/jobs", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const list = await res.json();
        const arr = Array.isArray(list) ? list : [];
        setJobs(arr);
        const current = selectedJobIdRef.current;
        if ((!current || !arr.some(j => j.id === current)) && arr.length > 0) {
          selectedJobIdRef.current = arr[0].id;
          setSelectedJobId(arr[0].id);
        } else if (arr.length === 0 && current) {
          selectedJobIdRef.current = null;
          setSelectedJobId(null);
          setJobResults([]);
          setResultsTotal(0);
          setResultsStats(null);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    setServerStatusGlobal = setIsServerOnline;
    try {
      if (localStorage.getItem("nav_pinned") === "0") setNavPinned(false);
    } catch {}
    const storedToken = localStorage.getItem("token") || localStorage.getItem("dashmin_token");
    if (storedToken) {
      setToken(storedToken);
      apiFetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${storedToken}` }
      })
        .then(r => r.json())
        .then(u => {
          if (u && u.id) {
            setUser(u);
            setProfileName(u.name || "");
            setProfileUsername(u.username || "");
            setUserProxy(u.custom_proxy || "");
            fetchJobsList(storedToken);
            if (u.role === "admin" || u.role === "manager") {
              fetchAdminStats(storedToken);
              fetchAdminUsers(storedToken);
            }
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("dashmin_token");
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
    selectedJobIdRef.current = selectedJobId;
  }, [selectedJobId]);

  useEffect(() => {
    jobsRef.current = jobs;
  }, [jobs]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedFilter(searchFilter.trim());
      setResultsPage(0);
    }, 350);
    return () => clearTimeout(t);
  }, [searchFilter]);

  const fetchPlaceSuggestions = useCallback(async (q: string): Promise<PlaceSuggestion[]> => {
    try {
      const res = await apiFetch(`/api/places/suggest?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data.items) ? data.items : [];
    } catch {
      return [];
    }
  }, [token]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        globalSearchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reload the visible page whenever the job, page, page size or search changes.
  useEffect(() => {
    resultsQueryRef.current = { page: resultsPage, size: resultsPageSize, q: debouncedFilter };
    if (token && selectedJobId) {
      fetchJobDetails(selectedJobId, token);
    }
  }, [token, selectedJobId, resultsPage, resultsPageSize, debouncedFilter, fetchJobDetails]);

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (document.hidden) return;
      fetchJobsList(token);
      const jobId = selectedJobIdRef.current;
      const job = jobsRef.current.find(j => j.id === jobId);
      // Only re-pull rows while the selected extraction is still collecting.
      if (jobId && activeTab === "leads" && viewMode === "app" && job && isActiveStatus(job.status)) {
        fetchJobDetails(jobId, token);
      }
      if (viewMode === "admin") {
        fetchAdminStats(token);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [token, activeTab, viewMode, fetchJobsList, fetchJobDetails]);

  const selectJob = (jobId: string) => {
    if (jobId === selectedJobId) return;
    setJobResults([]);
    setResultsTotal(0);
    setResultsStats(null);
    setResultsPage(0);
    setSearchFilter("");
    setDebouncedFilter("");
    setSelectedJobId(jobId);
  };

  const fetchAdminStats = async (authToken: string) => {
    try {
      const res = await apiFetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) setAdminStats(await res.json());
    } catch {}
  };

  const fetchAdminUsers = async (authToken: string) => {
    try {
      const res = await apiFetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) setAdminUsers(await res.json());
    } catch {}
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("dashmin_token", data.token);
        setToken(data.token);
        setUser(data.user);
        setProfileName(data.user.name || "");
        setProfileUsername(data.user.username || "");
        setUserProxy(data.user.custom_proxy || "");
        fetchJobsList(data.token);
        if (data.user.role === "admin" || data.user.role === "manager") {
          fetchAdminStats(data.token);
          fetchAdminUsers(data.token);
        }
      } else {
        setAuthError(data.error || "Login failed. Check your credentials.");
      }
    } catch (err: any) {
      setAuthError(err.message || "Network error. Backend unreachable.");
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("dashmin_token");
    setToken("");
    setUser(null);
    setJobs([]);
    setJobResults([]);
    selectedJobIdRef.current = null;
    setSelectedJobId(null);
    setViewMode("app");
    setActiveTab("search");
  };

  const effectiveCap = limitMode === "custom" ? Math.max(0, Math.floor(Number(customLimit) || 0)) : leadCount;

  /** Leads are not stored: a new search erases the current results, so confirm first. */
  const confirmReplaceResults = () => {
    const count = jobs.reduce((a, j) => a + (j.total_saved || 0), 0);
    if (jobs.length === 0) return true;
    return window.confirm(
      count > 0
        ? `Starting a new search permanently erases your current results (${formatNumber(count)} leads).\n\nDownload them first if you need them. Continue?`
        : "Starting a new search replaces your current one. Continue?"
    );
  };

  const resetSelection = () => {
    selectedJobIdRef.current = null;
    setSelectedJobId(null);
    setJobResults([]);
    setResultsTotal(0);
    setResultsStats(null);
    setResultsPage(0);
    setSearchFilter("");
    setDebouncedFilter("");
  };

  const clearResults = async () => {
    const count = jobs.reduce((a, j) => a + (j.total_saved || 0), 0);
    if (!window.confirm(`Erase the current results${count ? ` (${formatNumber(count)} leads)` : ""}? This cannot be undone.`)) return;
    try {
      await apiFetch("/api/jobs", { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    } catch {}
    resetSelection();
    setJobs([]);
    fetchJobsList(token);
  };

  const startLeadSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    if (!confirmReplaceResults()) return;

    setIsStarting(true);
    setStartError("");
    const scope: Scope = searchEngine === "2gis" ? "exact" : searchScope;
    const chosenLocation = searchEngine === "2gis" ? twoGisCity : location;
    const pin = scope === "map" ? (mapPin || (selectedPlace ? { lat: selectedPlace.lat, lon: selectedPlace.lon } : DEFAULT_PIN)) : null;
    const targetQuery = scope === "map"
      ? `${keyword.trim()} within ${formatRadius(radiusM)} of ${selectedPlace && pin && pin.lat === selectedPlace.lat && pin.lon === selectedPlace.lon ? selectedPlace.name : `pin ${pin!.lat.toFixed(4)}, ${pin!.lon.toFixed(4)}`}`
      : chosenLocation.trim() ? `${keyword.trim()} in ${chosenLocation.trim()}` : keyword.trim();
    const center = scope === "map"
      ? { lat: pin!.lat, lon: pin!.lon, label: selectedPlace && pin!.lat === selectedPlace.lat && pin!.lon === selectedPlace.lon ? selectedPlace.label : "Dropped pin", kind: "point" }
      : searchEngine === "gmaps" && selectedPlace && selectedPlace.label === location
        ? { lat: selectedPlace.lat, lon: selectedPlace.lon, label: selectedPlace.label, kind: selectedPlace.kind, bbox: selectedPlace.bbox }
        : undefined;

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
          keyword: keyword.trim(),
          cap: effectiveCap,
          scope,
          radius_m: scope === "exact" ? undefined : radiusM,
          center,
          proxy: userProxy.trim()
        })
      });

      if (res.ok) {
        const createdJob = await res.json();
        resetSelection();
        selectedJobIdRef.current = createdJob.id;
        setSelectedJobId(createdJob.id);
        await fetchJobsList(token);
        setActiveTab("leads");
      } else {
        const data = await res.json().catch(() => ({}));
        setStartError(data.error || `Could not start the search (HTTP ${res.status})`);
      }
    } catch (err: any) {
      setStartError(err?.message ? `Network error: ${err.message}` : "Network error");
    } finally {
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
    if (!confirmReplaceResults()) return;
    setIsBulkStarting(true);
    setBulkStatusMsg("");

    try {
      const res = await apiFetch("/api/jobs/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          engine: searchEngine,
          queries,
          cap: effectiveCap,
          scope: searchScope === "extended" ? "extended" : "exact",
          radius_m: searchScope === "extended" ? radiusM : undefined,
          proxy: userProxy.trim() || undefined
        })
      });

      if (res.ok) {
        setBulkQueriesText("");
        setBulkFileName("");
        resetSelection();
        await fetchJobsList(token);
        setActiveTab("leads");
      } else {
        const data = await res.json();
        setBulkStatusMsg(data.error || "Failed to start bulk searches");
      }
    } catch (err: any) {
      setBulkStatusMsg(`Bulk error: ${err.message}`);
    } finally {
      setIsBulkStarting(false);
    }
  };

  const stopSearch = async (jobId: string) => {
    try {
      await apiFetch(`/api/jobs/${jobId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchJobsList(token);
    } catch {}
  };

  const handleDownloadExport = async () => {
    if (!exportJobId) return;
    const cols = selectedCols.join(",");
    const url = `/api/jobs/${exportJobId}/export/${exportFormat}?columns=${encodeURIComponent(cols)}`;
    try {
      const res = await apiFetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `leads_${exportJobId.slice(0, 8)}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(downloadUrl);
      setExportJobId(null);
    } catch {}
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserMsg("");
    try {
      const res = await apiFetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newUserName,
          username: newUserUsername.trim().toLowerCase(),
          email: newUserEmail,
          password: newUserPassword,
          role: user?.role === "manager" ? "user" : newUserRole,
          company: user?.role === "manager" ? user?.company : newUserCompany,
          manager_id: user?.role === "manager" ? user?.id : (newUserManagerId || null),
          can_use_proxy: newUserCanProxy ? 1 : 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateUserModal(false);
        setNewUserName("");
        setNewUserUsername("");
        setNewUserEmail("");
        setNewUserPassword("");
        fetchAdminUsers(token);
        fetchAdminStats(token);
      } else {
        setCreateUserMsg(data.error || "Failed to create user");
      }
    } catch {
      setCreateUserMsg("Server error");
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    try {
      const res = await apiFetch("/api/auth/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          username: profileUsername,
          currentPassword: profileCurrentPassword || undefined,
          newPassword: profileNewPassword || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setProfileCurrentPassword("");
        setProfileNewPassword("");
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
      } else {
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Server error" });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopyToast("Copied to clipboard");
    setTimeout(() => setCopyToast(null), 1800);
  };

  const selectedJob = jobs.find(j => j.id === selectedJobId) || jobs[0];
  const runningJob = jobs.find(j => j.status === "running" || j.status === "pending");

  const filteredResults = jobResults;
  const loadingResults = !!selectedJobId && loadedResultsKey !== `${selectedJobId}|${resultsPage}|${resultsPageSize}|${debouncedFilter}`;
  const totalPages = Math.max(1, Math.ceil(resultsTotal / resultsPageSize));
  const filteredCategories = POPULAR_CATEGORIES.filter(c => !keyword.trim() || c.toLowerCase().includes(keyword.trim().toLowerCase()));

  const goApp = (tab: "search" | "leads" | "settings") => {
    setViewMode("app");
    setActiveTab(tab);
  };
  const goAdmin = (tab: "overview" | "users") => {
    setViewMode("admin");
    setAdminTab(tab);
  };
  const toggleNavPinned = () => {
    setNavPinned(p => {
      try { localStorage.setItem("nav_pinned", p ? "0" : "1"); } catch {}
      return !p;
    });
  };

  const latestLeadCount = jobs.reduce((a, j) => a + (j.total_saved || 0), 0);
  const navItems: NavItem[] = [
    {
      key: "find",
      label: "Find leads",
      icon: <IconSearch className="w-[18px] h-[18px]" />,
      children: [
        { key: "search:single", label: "Single search", onSelect: () => { setSearchMode("single"); goApp("search"); } },
        { key: "search:bulk", label: "Bulk upload", onSelect: () => { setSearchMode("bulk"); goApp("search"); } }
      ]
    },
    {
      key: "results",
      label: "Latest results",
      icon: <IconDatabase className="w-[18px] h-[18px]" />,
      badge: runningJob ? "live" : latestLeadCount ? formatNumber(latestLeadCount) : undefined,
      onSelect: () => goApp("leads")
    },
    ...((user?.role === "admin" || user?.can_use_proxy === 1)
      ? [{ key: "settings", label: "Proxy settings", icon: <IconShield className="w-[18px] h-[18px]" />, onSelect: () => goApp("settings") }]
      : []),
    ...((user?.role === "admin" || user?.role === "manager")
      ? [{
          key: "admin",
          label: "Admin",
          icon: <IconUsers className="w-[18px] h-[18px]" />,
          children: [
            { key: "admin:overview", label: "Overview", onSelect: () => goAdmin("overview") },
            { key: "admin:users", label: "Users & team", onSelect: () => goAdmin("users") }
          ]
        }]
      : [])
  ];

  const activeNavKey = viewMode === "admin"
    ? `admin:${adminTab}`
    : activeTab === "search"
      ? `search:${searchMode}`
      : activeTab === "leads"
        ? "results"
        : activeTab;

  const submitGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goApp("leads");
    setSearchFilter(globalSearch.trim());
  };

  // ----------------------------------------------------
  // UNAUTHENTICATED SCREEN (Clean Apple-Style Sign In)
  // ----------------------------------------------------
  if (!token || !user) {
    return (
      <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#eef6f4] text-[#0b2a4a]">
        <div className="crm-sidebar hidden lg:flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <div className="font-bold text-[15px] leading-tight">7strokes Leads</div>
              <div className="text-[11px] text-white/55">by Seven Strokes</div>
            </div>
          </div>
          <div className="max-w-md">
            <div className="crm-eyebrow !text-[#12a594] mb-3">Lead intelligence</div>
            <h2 className="text-4xl font-extrabold leading-[1.1] tracking-[-0.02em]">Every business in the city, in one clean list.</h2>
            <p className="text-white/60 mt-4 text-sm leading-relaxed">Search Google Maps and 2GIS, sweep entire areas, and export verified phones, websites and addresses.</p>
          </div>
          <div className="text-[11px] text-white/40">© {new Date().getFullYear()} Seven Strokes</div>
        </div>
        <div className="flex items-center justify-center p-4 sm:p-10">
        <div className="w-full max-w-[400px] crm-box p-8">
          <div className="mb-6">
            <div className="lg:hidden mb-4"><BrandMark size={40} /></div>
            <div className="crm-eyebrow mb-1">Welcome back</div>
            <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0b2a4a]">Sign in to your workspace</h1>
          </div>

          {!isServerOnline && (
            <div className="mb-4 p-3 rounded bg-[#12a594]/15 border border-[#12a594]/60 text-[#0b2a4a] text-xs font-semibold">
              Backend service is offline on port 4000.
            </div>
          )}

          {authError && (
            <div className="mb-4 p-3 rounded bg-[#12a594]/15 border border-[#12a594]/60 text-[#0b2a4a] text-xs font-semibold">
              {authError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="crm-label">Username or Email</label>
              <input
                type="text"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your username or email"
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
                placeholder="Enter password"
                className="crm-input"
              />
            </div>

            <button type="submit" className="crm-btn-primary w-full mt-2">
              Sign In
            </button>
          </form>
        </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------
  // AUTHENTICATED DASHBOARD (Clean CRM Workspace)
  // ----------------------------------------------------
  return (
    <div className="flex h-screen w-full bg-[#eef6f4] text-[#0b2a4a] font-sans overflow-hidden">
      {/* Toast Alert */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0b2a4a] text-white text-xs font-semibold px-4 py-2.5 rounded shadow-lg">
          {copyToast}
        </div>
      )}

      {/* EXPORT MODAL */}
      {exportJobId && (
        <div className="fixed inset-0 z-50 bg-[#0b2a4a]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#0b2a4a]/10 w-full max-w-lg shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#0b2a4a]/[0.07] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0b2a4a]">Export Leads Data</h3>
              <button onClick={() => setExportJobId(null)} className="text-[#0b2a4a]/60 hover:text-[#0b2a4a]">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="crm-label">Export File Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["csv", "xlsx", "json", "html"] as const).map(fmt => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setExportFormat(fmt)}
                      className={`py-2 rounded text-xs font-semibold uppercase border transition-colors ${exportFormat === fmt ? "bg-[#0b2a4a] text-white border-[#12a594]" : "bg-white text-[#0b2a4a]/75 border-[#0b2a4a]/20 hover:bg-[#eef6f4]/60"}`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="crm-label">Select Columns to Include</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-[#0b2a4a]/10 rounded">
                  {EXPORT_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs text-[#0b2a4a] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedCols.includes(col.key)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedCols([...selectedCols, col.key]);
                          } else {
                            setSelectedCols(selectedCols.filter(c => c !== col.key));
                          }
                        }}
                        className="rounded border-[#0b2a4a]/20 text-[#0b2a4a] focus:ring-0"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0b2a4a]/[0.07]">
                <button onClick={() => setExportJobId(null)} className="crm-btn-default">Cancel</button>
                <button onClick={handleDownloadExport} className="crm-btn-primary">Download File</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL (Admin & Manager) */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-[#0b2a4a]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#0b2a4a]/10 w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#0b2a4a]/[0.07] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0b2a4a]">Create New User Account</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-[#0b2a4a]/60 hover:text-[#0b2a4a]">✕</button>
            </div>

            {createUserMsg && (
              <div className="mb-4 p-2.5 rounded bg-[#12a594]/15 text-[#0b2a4a] text-xs">{createUserMsg}</div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="crm-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={e => setNewUserName(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label className="crm-label">Username</label>
                <input
                  type="text"
                  required
                  value={newUserUsername}
                  onChange={e => setNewUserUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="crm-input"
                />
              </div>

              <div>
                <label className="crm-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={e => setNewUserEmail(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label className="crm-label">Password</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={e => setNewUserPassword(e.target.value)}
                  className="crm-input"
                />
              </div>

              {user.role === "admin" && (
                <div>
                  <label className="crm-label">Account Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                    className="crm-input"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0b2a4a]/[0.07]">
                <button type="button" onClick={() => setShowCreateUserModal(false)} className="crm-btn-default">Cancel</button>
                <button type="submit" className="crm-btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-[#0b2a4a]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#0b2a4a]/10 w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#0b2a4a]/[0.07] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0b2a4a]">My Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-[#0b2a4a]/60 hover:text-[#0b2a4a]">✕</button>
            </div>

            {profileMsg && (
              <div className={`mb-4 p-2.5 rounded text-xs ${profileMsg.type === "success" ? "bg-[#0b2a4a]/[0.06] text-[#0b2a4a]" : "bg-[#12a594]/15 text-[#0b2a4a]"}`}>
                {profileMsg.text}
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-3.5">
              <div>
                <label className="crm-label">Full Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={e => setProfileName(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div>
                <label className="crm-label">Username</label>
                <input
                  type="text"
                  value={profileUsername}
                  onChange={e => setProfileUsername(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div className="pt-2 border-t border-[#0b2a4a]/[0.07]">
                <label className="crm-label">Change Password (Optional)</label>
                <input
                  type="password"
                  placeholder="Current password"
                  value={profileCurrentPassword}
                  onChange={e => setProfileCurrentPassword(e.target.value)}
                  className="crm-input mb-2"
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={profileNewPassword}
                  onChange={e => setProfileNewPassword(e.target.value)}
                  className="crm-input"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0b2a4a]/[0.07]">
                <button type="button" onClick={() => setShowProfileModal(false)} className="crm-btn-default">Close</button>
                <button type="submit" className="crm-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Sidebar
        items={navItems}
        activeKey={activeNavKey}
        pinned={navPinned}
        onTogglePinned={toggleNavPinned}
        mobileOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        brandMark={<BrandMark />}
        brand={
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div className="min-w-0">
              <div className="font-bold text-[15px] leading-tight truncate">7strokes Leads</div>
              <div className="text-[11px] text-white/50 truncate">by Seven Strokes</div>
            </div>
          </div>
        }
        footer={expanded => (
          <div className={`flex items-center gap-2.5 ${expanded ? "" : "flex-col"}`}>
            <button
              onClick={() => setShowProfileModal(true)}
              className={`flex items-center gap-2.5 min-w-0 rounded-lg hover:bg-white/[0.06] ${expanded ? "flex-1 p-1.5" : "p-1"}`}
              title="My profile"
            >
              <span className="w-8 h-8 rounded-full bg-[#12a594] text-[#0b2a4a] text-xs font-bold inline-flex items-center justify-center shrink-0">
                {initialsOf(user.name || user.username)}
              </span>
              {expanded && (
                <span className="min-w-0 text-left">
                  <span className="block text-[13px] font-semibold text-white truncate">{user.name || user.username}</span>
                  <span className="block text-[11px] text-white/50 capitalize truncate">{user.role}{user.company ? ` · ${user.company}` : ""}</span>
                </span>
              )}
            </button>
            <button
              onClick={logout}
              className="w-8 h-8 rounded-lg text-white/60 hover:text-white hover:bg-white/[0.06] inline-flex items-center justify-center shrink-0"
              title="Sign out"
              aria-label="Sign out"
            >
              <IconLogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      />

      {/* MAIN VIEW CONTENT AREA */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        <header className="h-16 shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 border-b border-[#0b2a4a]/[0.07] bg-[#eef6f4]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-10 h-10 rounded-[10px] bg-white ring-1 ring-[#0b2a4a]/10 inline-flex items-center justify-center shrink-0"
            aria-label="Open menu"
          >
            <IconMenu className="w-5 h-5" />
          </button>

          <form onSubmit={submitGlobalSearch} className="relative flex-1 max-w-xl min-w-0">
            <IconSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0b2a4a]/45" />
            <input
              ref={globalSearchRef}
              type="search"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search the current results..."
              className="crm-input h-10 pl-10 pr-16 rounded-full bg-white"
              aria-label="Search the current results"
            />
            <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center h-6 px-2 rounded-md border border-[#0b2a4a]/15 text-[10px] font-semibold text-[#0b2a4a]/60 bg-[#eef6f4]">Ctrl K</kbd>
          </form>

          <button onClick={() => { setSearchMode("single"); goApp("search"); }} className="crm-btn-primary h-10 shrink-0 px-3 sm:px-4">
            <IconPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New search</span>
          </button>

          {runningJob && (
            <div className="hidden lg:flex items-center gap-2 h-10 pl-3 pr-1.5 rounded-full bg-white ring-1 ring-[#12a594]/60 min-w-0 max-w-[340px]">
              <span className="w-2 h-2 rounded-full bg-[#12a594] animate-pulse shrink-0" />
              <button
                onClick={() => { selectJob(runningJob.id); goApp("leads"); }}
                className="text-xs font-semibold truncate hover:underline text-left"
                title={runningJob.target}
              >
                {runningJob.target}
              </button>
              <span className="text-xs font-bold tabular-nums shrink-0">{formatNumber(runningJob.total_saved || 0)}</span>
              <button
                onClick={() => stopSearch(runningJob.id)}
                className="h-7 px-2.5 rounded-full bg-[#0b2a4a] text-white text-[11px] font-semibold shrink-0"
              >
                Stop
              </button>
            </div>
          )}

          <button
            onClick={() => setShowProfileModal(true)}
            className="hidden md:flex items-center gap-2.5 h-10 pl-1.5 pr-3 rounded-full bg-white ring-1 ring-[#0b2a4a]/10 hover:ring-[#0b2a4a]/20 shrink-0 ml-auto"
          >
            <span className="w-7 h-7 rounded-full bg-[#0b2a4a] text-white text-[11px] font-bold inline-flex items-center justify-center">
              {initialsOf(user.name || user.username)}
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[12.5px] font-semibold max-w-[140px] truncate">{user.name || user.username}</span>
              <span className="block text-[10.5px] text-[#0b2a4a]/55 capitalize">{user.role}</span>
            </span>
          </button>
          <button
            onClick={logout}
            className="hidden md:inline-flex w-10 h-10 rounded-full items-center justify-center text-[#0b2a4a]/60 hover:text-[#0b2a4a] hover:bg-white shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <IconLogOut className="w-[18px] h-[18px]" />
          </button>
        </header>

        {/* Dedicated Page View Area */}
        <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-7">
          <div className="max-w-[1400px] mx-auto space-y-6">

            {/* PAGE 1: DEDICATED SEARCH PAGE */}
            {viewMode === "app" && activeTab === "search" && (
              <div className="space-y-6">
              <PageHeader
                eyebrow="Find leads"
                title={searchMode === "single" ? "New extraction" : "Bulk extraction"}
                subtitle="Search Google Maps or 2GIS and save every matching business to your leads."
              />
              <div className="crm-box">
                <div className="crm-box-header flex flex-wrap items-center justify-between gap-2">
                  <h2 className="crm-box-title">Search & Extraction Parameters</h2>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setSearchMode("single")}
                      className={`px-3 py-1 rounded font-semibold transition-colors ${searchMode === "single" ? "bg-[#0b2a4a] text-white" : "text-[#0b2a4a]/60 hover:bg-[#eef6f4]"}`}
                    >
                      Single Search
                    </button>
                    <button
                      onClick={() => setSearchMode("bulk")}
                      className={`px-3 py-1 rounded font-semibold transition-colors ${searchMode === "bulk" ? "bg-[#0b2a4a] text-white" : "text-[#0b2a4a]/60 hover:bg-[#eef6f4]"}`}
                    >
                      Bulk File Search
                    </button>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {searchMode === "single" ? (
                    <form onSubmit={startLeadSearch} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                          <label className="crm-label">Category or Keyword</label>
                          <input
                            type="text"
                            required
                            value={keyword}
                            onChange={e => { setKeyword(e.target.value); setShowCategoryDropdown(true); }}
                            onFocus={() => setShowCategoryDropdown(true)}
                            onBlur={() => setTimeout(() => setShowCategoryDropdown(false), 150)}
                            onKeyDown={e => { if (e.key === "Escape") setShowCategoryDropdown(false); }}
                            placeholder="e.g. Dentists, Real Estate..."
                            autoComplete="off"
                            className="crm-input"
                          />
                          {showCategoryDropdown && filteredCategories.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#0b2a4a]/10 rounded shadow-lg max-h-56 overflow-y-auto p-1">
                              {filteredCategories.map((cat, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { setKeyword(cat); setShowCategoryDropdown(false); }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#eef6f4] rounded text-[#0b2a4a]"
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="crm-label">Target Location</label>
                          {searchEngine === "2gis" ? (
                            <select
                              value={twoGisCity}
                              onChange={e => setTwoGisCity(e.target.value)}
                              className="crm-input cursor-pointer"
                            >
                              {TWOGIS_SUPPORTED_REGIONS.map(region => (
                                <optgroup key={region.country} label={region.country}>
                                  {region.cities.map(city => (
                                    <option key={city.name} value={city.name}>{city.label}</option>
                                  ))}
                                </optgroup>
                              ))}
                            </select>
                          ) : (
                            <LocationSearch
                              value={location}
                              onChange={setLocation}
                              selected={selectedPlace}
                              onSelect={place => {
                                setSelectedPlace(place);
                                if (place) setMapPin({ lat: place.lat, lon: place.lon });
                              }}
                              fetchSuggestions={fetchPlaceSuggestions}
                              placeholder={searchScope === "map" ? "Jump the pin to a place (optional)" : "Building, area, city or country"}
                            />
                          )}
                        </div>

                        <div>
                          <label className="crm-label">Leads Limit</label>
                          <div className="flex gap-2">
                            <select
                              value={limitMode === "custom" ? "custom" : String(leadCount)}
                              onChange={e => {
                                if (e.target.value === "custom") {
                                  setLimitMode("custom");
                                } else {
                                  setLimitMode("preset");
                                  setLeadCount(Number(e.target.value));
                                }
                              }}
                              className="crm-input cursor-pointer"
                            >
                              {LIMIT_PRESETS.map(n => (
                                <option key={n} value={n}>{formatNumber(n)} leads</option>
                              ))}
                              <option value="custom">Custom amount</option>
                              <option value={0}>Unlimited (full sweep)</option>
                            </select>
                            {limitMode === "custom" && (
                              <input
                                type="number"
                                min={1}
                                step={1}
                                inputMode="numeric"
                                value={customLimit}
                                onChange={e => setCustomLimit(e.target.value.replace(/[^0-9]/g, ""))}
                                className="crm-input w-28 shrink-0"
                                aria-label="Custom lead limit"
                              />
                            )}
                          </div>
                        </div>

                        <div>
                          <label className="crm-label">Scraping Engine</label>
                          <select
                            value={searchEngine}
                            onChange={e => setSearchEngine(e.target.value === "2gis" ? "2gis" : "gmaps")}
                            className="crm-input cursor-pointer"
                          >
                            <option value="gmaps">Google Maps Global (Direct HTTP)</option>
                            <option value="2gis">2GIS Directory (UAE & GCC)</option>
                          </select>
                        </div>
                      </div>

                      <ScopeToggle
                        value={searchEngine === "2gis" ? "exact" : searchScope}
                        onChange={v => {
                          setSearchScope(v);
                          if (v === "map" && !mapPin) setMapPin(selectedPlace ? { lat: selectedPlace.lat, lon: selectedPlace.lon } : DEFAULT_PIN);
                        }}
                        allowMap={searchEngine === "gmaps"}
                        allowRadius={searchEngine === "gmaps"}
                        locationLabel={(searchEngine === "2gis" ? twoGisCity : location).trim() ? `"${(searchEngine === "2gis" ? twoGisCity : location).trim()}"` : "the location you enter"}
                      />

                      {searchEngine === "gmaps" && searchScope !== "exact" && (
                        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-4 items-start">
                          <div className="space-y-3">
                            <RadiusPicker valueM={radiusM} onChange={setRadiusM} />
                            {searchScope === "extended" && !selectedPlace && (
                              <p className="text-xs text-[#0b2a4a]/70 bg-[#12a594]/[0.08] rounded-lg px-3 py-2">
                                Pick a place from the suggestions so the radius is measured from its exact position. Typed text is located automatically otherwise.
                              </p>
                            )}
                            {searchScope === "map" && (
                              <p className="text-xs text-[#0b2a4a]/70 bg-[#12a594]/[0.08] rounded-lg px-3 py-2">
                                Drag the pin or click anywhere on the map. Pin: <b className="font-mono">{(mapPin || DEFAULT_PIN).lat.toFixed(5)}, {(mapPin || DEFAULT_PIN).lon.toFixed(5)}</b>
                              </p>
                            )}
                          </div>
                          {(searchScope === "map" || selectedPlace) && (
                            <MapPicker
                              center={searchScope === "map" ? (mapPin || DEFAULT_PIN) : { lat: selectedPlace!.lat, lon: selectedPlace!.lon }}
                              radiusM={radiusM}
                              onMove={p => { setMapPin(p); setSearchScope("map"); }}
                            />
                          )}
                        </div>
                      )}

                      <p className="text-xs text-[#0b2a4a]/60 leading-relaxed">
                        {effectiveCap > 0
                          ? `Stops as soon as ${formatNumber(effectiveCap)} unique leads are saved.`
                          : searchEngine === "gmaps"
                            ? "Unlimited: searches every neighbourhood, then sweeps the whole area on a map grid and splits busy cells into smaller ones until no new businesses appear. Large cities can take a while; you can stop at any time and keep what was found."
                            : "Unlimited: pages through every 2GIS district until the directory runs out of results. You can stop at any time and keep what was found."}
                      </p>

                      {startError && (
                        <div className="p-3 rounded bg-[#12a594]/15 border border-[#12a594]/60 text-[#0b2a4a] text-xs font-semibold">
                          {startError}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#0b2a4a]/[0.07]">
                        <button
                          type="submit"
                          disabled={isStarting || !keyword.trim() || (limitMode === "custom" && effectiveCap <= 0)}
                          className="crm-btn-primary gap-2 disabled:opacity-50"
                        >
                          <IconSearch className="w-4 h-4" />
                          <span>{isStarting ? "Starting..." : "Start Extraction"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => { setKeyword(""); setLocation(""); setSelectedPlace(null); }}
                          className="crm-btn-default"
                        >
                          Reset
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={startBulkSearch} className="space-y-4">
                      <div className="border border-dashed border-[#0b2a4a]/20 rounded p-6 text-center bg-[#eef6f4]">
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="bulk-file-input"
                        />
                        <label htmlFor="bulk-file-input" className="cursor-pointer block">
                          <span className="text-xs font-semibold text-[#0b2a4a]">
                            {bulkFileName ? `File: ${bulkFileName}` : "Upload .txt or .csv queries file"}
                          </span>
                        </label>
                      </div>

                      <div>
                        <label className="crm-label">Queries List</label>
                        <textarea
                          rows={4}
                          value={bulkQueriesText}
                          onChange={e => setBulkQueriesText(e.target.value)}
                          placeholder={"real estate in jaipur\ndentists in dubai"}
                          className="crm-input h-auto py-2 font-mono"
                        />
                      </div>

                      <ScopeToggle
                        value={searchScope === "map" ? "exact" : searchScope}
                        onChange={setSearchScope}
                        allowMap={false}
                        allowRadius={searchEngine === "gmaps"}
                        locationLabel="each line's location"
                      />
                      {searchScope === "extended" && searchEngine === "gmaps" && <RadiusPicker valueM={radiusM} onChange={setRadiusM} />}

                      <p className="text-xs text-[#0b2a4a]/60">
                        Each line runs as its own extraction using the engine and limit selected in Single Search ({searchEngine === "gmaps" ? "Google Maps" : "2GIS"}, {formatCap(effectiveCap)}).
                      </p>

                      <button
                        type="submit"
                        disabled={isBulkStarting || !bulkQueriesText.trim()}
                        className="crm-btn-primary disabled:opacity-50"
                      >
                        {isBulkStarting ? "Starting..." : "Start Bulk Extraction"}
                      </button>

                      {bulkStatusMsg && (
                        <div className="p-3 bg-[#eef6f4] text-[#0b2a4a] text-xs rounded-[10px] border border-[#12a594]/50">
                          {bulkStatusMsg}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
              </div>
            )}

            {/* PAGE 2: LATEST RESULTS (nothing older is kept) */}
            {viewMode === "app" && activeTab === "leads" && (
              <div className="space-y-4 sm:space-y-6">
                <PageHeader
                  eyebrow="Results"
                  title={jobs.length ? "Latest search" : "No results yet"}
                  subtitle={jobs.length
                    ? `${jobs.length > 1 ? `${jobs.length} searches (bulk) · ` : ""}${formatNumber(jobs.reduce((a, j) => a + (j.total_saved || 0), 0))} leads found`
                    : "Run a search and its results will appear here."}
                  actions={
                    <>
                      {selectedJobId && (
                        <button onClick={() => setExportJobId(selectedJobId)} disabled={!resultsStats?.total} className="crm-btn-default disabled:opacity-50">
                          <IconDownload className="w-4 h-4" /> Download
                        </button>
                      )}
                      {jobs.length > 0 && (
                        <button onClick={clearResults} className="crm-btn-default">Clear results</button>
                      )}
                      <button onClick={() => goApp("search")} className="crm-btn-primary"><IconPlus className="w-4 h-4" /> New search</button>
                    </>
                  }
                />

                <div className="flex items-start gap-3 rounded-xl bg-[#12a594]/[0.08] ring-1 ring-[#12a594]/30 px-4 py-3 text-[13px] text-[#0b2a4a]">
                  <IconShield className="w-4 h-4 mt-0.5 shrink-0 text-[#12a594]" />
                  <span>
                    <b>Leads are not stored.</b> These results are kept only until you start a new search or press Clear results. Download them to keep a copy.
                  </span>
                </div>

                {jobs.length === 0 && (
                  <div className="crm-box p-10 text-center">
                    <p className="text-sm text-[#0b2a4a]/60">There are no results. Old searches are not kept.</p>
                    <button onClick={() => goApp("search")} className="crm-btn-primary mt-4"><IconPlus className="w-4 h-4" /> Start a search</button>
                  </div>
                )}

                {jobs.length > 1 && (
                  <div className="crm-box p-3 sm:p-4 overflow-x-auto">
                    <div className="flex gap-2">
                      {jobs.map(j => (
                        <button
                          key={j.id}
                          onClick={() => selectJob(j.id)}
                          className={`shrink-0 text-left rounded-xl px-3.5 py-2.5 ring-1 transition-colors ${j.id === selectedJobId ? "ring-[#12a594] bg-[#12a594]/[0.08]" : "ring-[#0b2a4a]/10 hover:ring-[#0b2a4a]/25 bg-white"}`}
                        >
                          <span className="flex items-center gap-2">
                            <span className="text-[13px] font-semibold capitalize max-w-[220px] truncate">{j.target}</span>
                            <StatusBadge status={j.status} />
                          </span>
                          <span className="block text-[11px] text-[#0b2a4a]/55 mt-0.5">{formatNumber(j.total_saved || 0)} leads · {scopeLabel(j)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leads table */}
                {jobs.length > 0 && (
                <div className="crm-box">
                  <div className="crm-box-header flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <h2 className="crm-box-title truncate capitalize">
                          {selectedJob ? selectedJob.target : "Leads Database"}
                        </h2>
                        {selectedJob && <StatusBadge status={selectedJob.status} />}
                      </div>
                      {resultsStats && resultsStats.total > 0 && (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-[#0b2a4a]/60">
                          <span><b className="text-[#0b2a4a]">{formatNumber(resultsStats.total)}</b> leads</span>
                          <span><b className="text-[#0b2a4a]">{formatNumber(resultsStats.withPhone)}</b> with phone ({Math.round((resultsStats.withPhone / resultsStats.total) * 100)}%)</span>
                          <span><b className="text-[#0b2a4a]">{formatNumber(resultsStats.withWebsite)}</b> with website</span>
                          {resultsStats.withEmail > 0 && <span><b className="text-[#0b2a4a]">{formatNumber(resultsStats.withEmail)}</b> with email</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <div className="relative flex-1 lg:flex-none">
                        <IconSearch className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0b2a4a]/45" />
                        <input
                          type="search"
                          placeholder="Search name, phone, address..."
                          value={searchFilter}
                          onChange={e => setSearchFilter(e.target.value)}
                          className="crm-input h-8 text-xs pl-8 w-full lg:w-64"
                        />
                      </div>
                      {selectedJobId && (
                        <button
                          onClick={() => setExportJobId(selectedJobId)}
                          disabled={!resultsStats?.total}
                          className="crm-btn-default h-8 text-xs gap-1.5 disabled:opacity-50 shrink-0"
                        >
                          <IconDownload className="w-3.5 h-3.5" />
                          <span>Export</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {loadingResults && filteredResults.length === 0 ? (
                    <div className="p-12 text-center text-xs text-[#0b2a4a]/60">Loading leads...</div>
                  ) : filteredResults.length === 0 ? (
                    <div className="p-12 text-center text-sm text-[#0b2a4a]/60">
                      {debouncedFilter
                        ? `No leads match "${debouncedFilter}".`
                        : selectedJob && isActiveStatus(selectedJob.status)
                          ? "Searching... leads will appear here as they are found."
                          : "No leads in this extraction."}
                    </div>
                  ) : (
                    <>
                      {/* Desktop / tablet table */}
                      <div className={`hidden md:block overflow-x-auto transition-opacity ${loadingResults ? "opacity-60" : ""}`}>
                        <table className="min-w-full divide-y divide-[#0b2a4a]/10 text-left text-xs">
                          <thead className="bg-[#eef6f4] text-[#0b2a4a]/75 font-semibold uppercase tracking-wider sticky top-0">
                            <tr>
                              <th className="px-4 py-3 w-12">#</th>
                              <th className="px-4 py-3">Business</th>
                              <th className="px-4 py-3">Phones</th>
                              <th className="px-4 py-3">Address</th>
                              <th className="px-4 py-3">Rating</th>
                              <th className="px-4 py-3">Website</th>
                              <th className="px-4 py-3 text-right w-12"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#0b2a4a]/[0.06] bg-white">
                            {filteredResults.map((lead, idx) => (
                              <tr key={lead.id || idx} className="hover:bg-[#eef6f4]/60 transition-colors align-top">
                                <td className="px-4 py-3 text-[#0b2a4a]/45 tabular-nums">{resultsPage * resultsPageSize + idx + 1}</td>
                                <td className="px-4 py-3 max-w-[260px]">
                                  <div className="font-semibold text-[#0b2a4a] truncate" title={lead.title}>{lead.title || "—"}</div>
                                  {lead.category && <div className="text-[11px] text-[#0b2a4a]/60 truncate">{lead.category}</div>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {lead.phone_1 ? (
                                    <a href={`tel:${lead.phone_1}`} className="block text-[#0b2a4a] hover:underline font-mono">{lead.phone_1}</a>
                                  ) : <span className="text-[#0b2a4a]/45">—</span>}
                                  {lead.phone_2 && <a href={`tel:${lead.phone_2}`} className="block text-[#0b2a4a]/60 hover:underline font-mono text-[11px]">{lead.phone_2}</a>}
                                </td>
                                <td className="px-4 py-3 text-[#0b2a4a]/75 max-w-[280px]">
                                  <div className="truncate" title={lead.address || ""}>{lead.address || lead.street || "—"}</div>
                                  {(lead.city || lead.country) && (
                                    <div className="text-[11px] text-[#0b2a4a]/45 truncate">{[lead.city, lead.country].filter(Boolean).join(", ")}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-[#0b2a4a]">
                                  {lead.rating ? <>{lead.rating} <span className="text-[#12a594]">★</span> <span className="text-[#0b2a4a]/45 font-normal">({formatNumber(Number(lead.reviews) || 0)})</span></> : <span className="text-[#0b2a4a]/45">—</span>}
                                </td>
                                <td className="px-4 py-3 max-w-[180px] truncate">
                                  {lead.website ? (
                                    <a href={lead.website} target="_blank" rel="noreferrer" className="text-[#0b2a4a] hover:underline" title={lead.website}>
                                      {lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                                    </a>
                                  ) : <span className="text-[#0b2a4a]/45">—</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => copyToClipboard([lead.title, lead.phone_1, lead.phone_2, lead.website, lead.address].filter(Boolean).join(" | "))}
                                    className="text-[#0b2a4a]/60 hover:text-[#0b2a4a] p-1"
                                    title="Copy record"
                                    aria-label="Copy record"
                                  >
                                    <IconCopy className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile cards */}
                      <ul className={`md:hidden divide-y divide-[#0b2a4a]/[0.06] ${loadingResults ? "opacity-60" : ""}`}>
                        {filteredResults.map((lead, idx) => (
                          <li key={lead.id || idx} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-[#0b2a4a] leading-snug">{lead.title || "—"}</div>
                                <div className="text-[11px] text-[#0b2a4a]/60 mt-0.5">
                                  {[lead.category, lead.rating ? `${lead.rating}★ (${formatNumber(Number(lead.reviews) || 0)})` : null].filter(Boolean).join(" · ")}
                                </div>
                              </div>
                              <button
                                onClick={() => copyToClipboard([lead.title, lead.phone_1, lead.phone_2, lead.website, lead.address].filter(Boolean).join(" | "))}
                                className="text-[#0b2a4a]/60 p-1.5 -m-1.5 shrink-0"
                                aria-label="Copy record"
                              >
                                <IconCopy className="w-4 h-4" />
                              </button>
                            </div>
                            {(lead.address || lead.city) && (
                              <div className="text-xs text-[#0b2a4a]/75 mt-2">{lead.address || lead.city}</div>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {lead.phone_1 && (
                                <a href={`tel:${lead.phone_1}`} className="inline-flex items-center h-8 px-3 rounded-full bg-[#12a594]/15 text-[#0b2a4a] text-xs font-semibold font-mono">
                                  {lead.phone_1}
                                </a>
                              )}
                              {lead.phone_2 && (
                                <a href={`tel:${lead.phone_2}`} className="inline-flex items-center h-8 px-3 rounded-full bg-[#eef6f4] text-[#0b2a4a]/75 text-xs font-mono">
                                  {lead.phone_2}
                                </a>
                              )}
                              {lead.website && (
                                <a href={lead.website} target="_blank" rel="noreferrer" className="inline-flex items-center h-8 px-3 rounded-full bg-[#eef6f4] text-[#0b2a4a]/75 text-xs max-w-full truncate">
                                  {lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Pagination */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#0b2a4a]/[0.07] text-xs text-[#0b2a4a]/60">
                        <div>
                          Showing <b className="text-[#0b2a4a]">{formatNumber(resultsPage * resultsPageSize + 1)}–{formatNumber(Math.min(resultsTotal, (resultsPage + 1) * resultsPageSize))}</b> of <b className="text-[#0b2a4a]">{formatNumber(resultsTotal)}</b>
                          {debouncedFilter && " matches"}
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            value={resultsPageSize}
                            onChange={e => { setResultsPageSize(Number(e.target.value)); setResultsPage(0); }}
                            className="crm-input h-8 w-auto text-xs py-0"
                            aria-label="Rows per page"
                          >
                            {PAGE_SIZES.map(n => <option key={n} value={n}>{n} / page</option>)}
                          </select>
                          <button
                            onClick={() => setResultsPage(p => Math.max(0, p - 1))}
                            disabled={resultsPage === 0}
                            className="crm-btn-default h-8 px-3 text-xs disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <span className="tabular-nums whitespace-nowrap">{resultsPage + 1} / {formatNumber(totalPages)}</span>
                          <button
                            onClick={() => setResultsPage(p => Math.min(totalPages - 1, p + 1))}
                            disabled={resultsPage >= totalPages - 1}
                            className="crm-btn-default h-8 px-3 text-xs disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
                )}
              </div>
            )}

            {/* PAGE 3: PROXY SETTINGS */}
            {viewMode === "app" && activeTab === "settings" && (
              <div className="space-y-6">
              <PageHeader eyebrow="Settings" title="Network & proxy" subtitle="Route your extractions through your own proxy server." />
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
                  </div>

                  <button
                    onClick={async () => {
                      try {
                        const res = await apiFetch("/api/auth/proxy", {
                          method: "PUT",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`
                          },
                          body: JSON.stringify({ customProxy: userProxy.trim() })
                        });
                        if (res.ok) {
                          setProxySaveSuccess(true);
                          setTimeout(() => setProxySaveSuccess(false), 2000);
                        }
                      } catch {}
                    }}
                    className="crm-btn-primary"
                  >
                    {proxySaveSuccess ? "Saved" : "Save Proxy Settings"}
                  </button>
                </div>
              </div>
              </div>
            )}

            {/* PAGE 4: ADMIN CONSOLE */}
            {viewMode === "admin" && (
              <div className="space-y-6">
              <PageHeader
                eyebrow="Admin"
                title={adminTab === "overview" ? "Workspace overview" : adminTab === "users" ? "Users & team" : "All leads"}
                subtitle="Manage your team and every lead collected across the workspace."
                actions={adminTab === "users" ? <button onClick={() => setShowCreateUserModal(true)} className="crm-btn-primary"><IconPlus className="w-4 h-4" /> Add user</button> : undefined}
              />
              <div className="crm-box">
                <div className="crm-box-header flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="crm-box-title">Admin Console</h2>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => setAdminTab("overview")}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${adminTab === "overview" ? "bg-[#0b2a4a] text-white" : "text-[#0b2a4a]/60 hover:bg-[#eef6f4]"}`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setAdminTab("users")}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${adminTab === "users" ? "bg-[#0b2a4a] text-white" : "text-[#0b2a4a]/60 hover:bg-[#eef6f4]"}`}
                      >
                        Users & Team
                      </button>
                    </div>
                  </div>

                  {adminTab === "users" && (
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="crm-btn-primary h-8 text-xs"
                    >
                      + Add New User
                    </button>
                  )}
                </div>

                <div className="p-4 sm:p-6">
                  {adminTab === "overview" && adminStats && (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                      <div className="p-4 bg-[#eef6f4] border border-[#0b2a4a]/10 rounded">
                        <span className="crm-label">Total Users</span>
                        <span className="text-2xl font-bold text-[#0b2a4a]">{adminStats.totalUsers || 0}</span>
                      </div>
                      <div className="p-4 bg-[#eef6f4] border border-[#0b2a4a]/10 rounded">
                        <span className="crm-label">Running Tasks</span>
                        <span className="text-2xl font-bold text-[#0b2a4a]">{adminStats.runningJobs || 0}</span>
                      </div>
                    </div>
                  )}

                  {adminTab === "users" && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#0b2a4a]/10 text-left text-xs">
                        <thead className="bg-[#eef6f4] text-[#0b2a4a]/75 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0b2a4a]/[0.06] bg-white">
                          {adminUsers.map(u => (
                            <tr key={u.id} className="hover:bg-[#eef6f4]/60">
                              <td className="px-4 py-3 font-semibold text-[#0b2a4a]">{u.name}</td>
                              <td className="px-4 py-3 font-mono text-[#0b2a4a]/60">@{u.username}</td>
                              <td className="px-4 py-3">{u.email}</td>
                              <td className="px-4 py-3 font-semibold uppercase">{u.role}</td>
                              <td className="px-4 py-3">{u.status}</td>
                              <td className="px-4 py-3 text-[#0b2a4a]/60">{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

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
