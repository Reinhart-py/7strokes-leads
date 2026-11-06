"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import Sidebar, { NavItem } from "./Sidebar";

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
  pending: "bg-[#f5f0e8] text-[#0f1f33]/70 ring-1 ring-inset ring-[#0f1f33]/10",
  running: "bg-[#d9b26a]/20 text-[#0f1f33] ring-1 ring-inset ring-[#d9b26a]/60",
  completed: "bg-[#0f1f33] text-white",
  stopped: "bg-white text-[#0f1f33]/70 ring-1 ring-inset ring-[#0f1f33]/15",
  failed: "bg-[#0f1f33]/10 text-[#0f1f33] ring-1 ring-inset ring-[#0f1f33]/25"
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

const parseServerDate = (value?: string) => {
  if (!value) return null;
  // SQLite returns "YYYY-MM-DD HH:MM:SS" in UTC without a zone marker.
  const iso = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value) ? value.replace(" ", "T") + "Z" : value;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
};

const formatRelative = (value?: string) => {
  const d = parseServerDate(value);
  if (!d) return "";
  const diff = Math.max(0, Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString();
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

const IconHome = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" />
  </svg>
);

const IconPlus = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}><path d="M12 5v14M5 12h14" /></svg>
);

const IconPhone = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" />
  </svg>
);

const IconGlobe = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <circle cx="12" cy="12" r="10" />
    <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

const IconLayers = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="m12 2 10 5-10 5L2 7l10-5z" />
    <path d="m2 17 10 5 10-5M2 12l10 5 10-5" />
  </svg>
);

const IconActivity = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
);

const IconUpload = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

const IconArrowRight = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} {...svgProps}><path d="M5 12h14M13 6l6 6-6 6" /></svg>
);

const BrandMark = ({ size = 36 }: { size?: number }) => (
  <span
    className="inline-flex items-center justify-center rounded-[10px] bg-white text-[#0f1f33] font-extrabold shrink-0 ring-1 ring-[#d9b26a]/60"
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
      <h1 className="text-[26px] sm:text-[30px] leading-tight font-extrabold tracking-[-0.02em] text-[#0f1f33]">{title}</h1>
      {subtitle && <p className="text-sm text-[#0f1f33]/60 mt-1">{subtitle}</p>}
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

type Summary = {
  totals: { leads: number; withPhone: number; withWebsite: number; withEmail: number; withRating: number };
  jobs: { total: number; byStatus: Record<string, number> };
  daily: { day: string; total: number; withPhone: number }[];
  topCategories: { name: string; count: number }[];
  topCities: { name: string; count: number }[];
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

const initialsOf = (name?: string) =>
  (name || "?").split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join("") || "?";

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navPinned, setNavPinned] = useState(true);
  const [summary, setSummary] = useState<Summary | null>(null);
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
  const [activeTab, setActiveTab] = useState<"dashboard" | "search" | "leads" | "settings">("dashboard");
  const [adminTab, setAdminTab] = useState<"overview" | "users" | "leads">("overview");

  const [jobs, setJobs] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminGlobalLeads, setAdminGlobalLeads] = useState<any[]>([]);

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
  const [adminLeadsPage, setAdminLeadsPage] = useState(0);
  const [adminLeadsTotal, setAdminLeadsTotal] = useState(0);
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
        if (!selectedJobIdRef.current && arr.length > 0) {
          selectedJobIdRef.current = arr[0].id;
          setSelectedJobId(arr[0].id);
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
              fetchAdminGlobalLeads(storedToken);
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

  const fetchSummary = useCallback(async (authToken: string) => {
    try {
      const res = await apiFetch("/api/jobs/summary?days=14", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) setSummary(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    if (token && activeTab === "dashboard" && viewMode === "app") fetchSummary(token);
  }, [token, activeTab, viewMode, fetchSummary]);

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
      if (viewMode === "app" && activeTab === "dashboard" && jobsRef.current.some(j => isActiveStatus(j.status))) {
        fetchSummary(token);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [token, activeTab, viewMode, fetchJobsList, fetchJobDetails, fetchSummary]);

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

  const fetchAdminGlobalLeads = async (authToken: string, page = 0) => {
    try {
      const res = await apiFetch(`/api/admin/leads?limit=100&offset=${page * 100}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminGlobalLeads(data.leads || []);
        setAdminLeadsTotal(Number(data.total) || 0);
        setAdminLeadsPage(page);
      }
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
          fetchAdminGlobalLeads(data.token);
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
    setActiveTab("dashboard");
    setSummary(null);
  };

  const effectiveCap = limitMode === "custom" ? Math.max(0, Math.floor(Number(customLimit) || 0)) : leadCount;

  const startLeadSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsStarting(true);
    setStartError("");
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
          cap: effectiveCap,
          proxy: userProxy.trim()
        })
      });

      if (res.ok) {
        const createdJob = await res.json();
        await fetchJobsList(token);
        selectJob(createdJob.id);
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
          proxy: userProxy.trim() || undefined
        })
      });

      if (res.ok) {
        setBulkQueriesText("");
        setBulkFileName("");
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

  const deleteSearch = async (jobId: string) => {
    if (!confirm("Are you sure you want to delete this search and all its collected leads?")) return;
    try {
      await apiFetch(`/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedJobId === jobId) {
        selectedJobIdRef.current = null;
        setSelectedJobId(null);
        setJobResults([]);
        setResultsTotal(0);
        setResultsStats(null);
      }
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

  const goApp = (tab: "dashboard" | "search" | "leads" | "settings") => {
    setViewMode("app");
    setActiveTab(tab);
  };
  const goAdmin = (tab: "overview" | "users" | "leads") => {
    setViewMode("admin");
    setAdminTab(tab);
    if (tab === "leads" && token) fetchAdminGlobalLeads(token, 0);
  };
  const toggleNavPinned = () => {
    setNavPinned(p => {
      try { localStorage.setItem("nav_pinned", p ? "0" : "1"); } catch {}
      return !p;
    });
  };

  const recentJobs = jobs.slice(0, 6);
  const navItems: NavItem[] = [
    { key: "dashboard", label: "Dashboard", icon: <IconHome className="w-[18px] h-[18px]" />, onSelect: () => goApp("dashboard") },
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
      key: "leads",
      label: "Leads",
      icon: <IconDatabase className="w-[18px] h-[18px]" />,
      badge: runningJob ? "live" : jobs.length,
      children: [
        { key: "leads:all", label: "All extractions", meta: String(jobs.length), onSelect: () => goApp("leads") },
        ...recentJobs.map(j => ({
          key: `job:${j.id}`,
          label: j.target,
          meta: isActiveStatus(j.status) ? "live" : formatNumber(j.total_saved || 0),
          onSelect: () => { selectJob(j.id); goApp("leads"); }
        }))
      ]
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
            { key: "admin:users", label: "Users & team", onSelect: () => goAdmin("users") },
            { key: "admin:leads", label: "All leads", onSelect: () => goAdmin("leads") }
          ]
        }]
      : [])
  ];

  const activeNavKey = viewMode === "admin"
    ? `admin:${adminTab}`
    : activeTab === "search"
      ? `search:${searchMode}`
      : activeTab === "leads"
        ? (selectedJobId && recentJobs.some(j => j.id === selectedJobId) ? `job:${selectedJobId}` : "leads:all")
        : activeTab;

  const submitGlobalSearch = (e: React.FormEvent) => {
    e.preventDefault();
    goApp("leads");
    setSearchFilter(globalSearch.trim());
  };

  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const summaryTotals = summary?.totals;
  const dailyMax = Math.max(1, ...(summary?.daily || []).map(d => d.total));
  const chartTicks = (() => {
    const step = Math.max(1, Math.ceil(dailyMax / 4 / 10) * 10);
    return [4, 3, 2, 1, 0].map(i => i * step);
  })();
  const chartTop = chartTicks[0] || 1;
  const leadsLast14 = (summary?.daily || []).reduce((a, d) => a + d.total, 0);
  const categoryMax = Math.max(1, ...(summary?.topCategories || []).map(c => c.count));
  const cityMax = Math.max(1, ...(summary?.topCities || []).map(c => c.count));


  // ----------------------------------------------------
  // UNAUTHENTICATED SCREEN (Clean Apple-Style Sign In)
  // ----------------------------------------------------
  if (!token || !user) {
    return (
      <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-[#f5f0e8] text-[#0f1f33]">
        <div className="crm-sidebar hidden lg:flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <BrandMark size={40} />
            <div>
              <div className="font-bold text-[15px] leading-tight">7strokes Leads</div>
              <div className="text-[11px] text-white/55">by Seven Strokes</div>
            </div>
          </div>
          <div className="max-w-md">
            <div className="crm-eyebrow !text-[#d9b26a] mb-3">Lead intelligence</div>
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
            <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#0f1f33]">Sign in to your workspace</h1>
          </div>

          {!isServerOnline && (
            <div className="mb-4 p-3 rounded bg-[#d9b26a]/15 border border-[#d9b26a]/60 text-[#0f1f33] text-xs font-semibold">
              Backend service is offline on port 4000.
            </div>
          )}

          {authError && (
            <div className="mb-4 p-3 rounded bg-[#d9b26a]/15 border border-[#d9b26a]/60 text-[#0f1f33] text-xs font-semibold">
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
    <div className="flex h-screen w-full bg-[#f5f0e8] text-[#0f1f33] font-sans overflow-hidden">
      {/* Toast Alert */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f1f33] text-white text-xs font-semibold px-4 py-2.5 rounded shadow-lg">
          {copyToast}
        </div>
      )}

      {/* EXPORT MODAL */}
      {exportJobId && (
        <div className="fixed inset-0 z-50 bg-[#0f1f33]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#0f1f33]/10 w-full max-w-lg shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#0f1f33]/[0.07] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0f1f33]">Export Leads Data</h3>
              <button onClick={() => setExportJobId(null)} className="text-[#0f1f33]/60 hover:text-[#0f1f33]">✕</button>
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
                      className={`py-2 rounded text-xs font-semibold uppercase border transition-colors ${exportFormat === fmt ? "bg-[#0f1f33] text-white border-[#d9b26a]" : "bg-white text-[#0f1f33]/75 border-[#0f1f33]/20 hover:bg-[#f5f0e8]/60"}`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="crm-label">Select Columns to Include</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-[#0f1f33]/10 rounded">
                  {EXPORT_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs text-[#0f1f33] cursor-pointer">
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
                        className="rounded border-[#0f1f33]/20 text-[#0f1f33] focus:ring-0"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0f1f33]/[0.07]">
                <button onClick={() => setExportJobId(null)} className="crm-btn-default">Cancel</button>
                <button onClick={handleDownloadExport} className="crm-btn-primary">Download File</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL (Admin & Manager) */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-[#0f1f33]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#0f1f33]/10 w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#0f1f33]/[0.07] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0f1f33]">Create New User Account</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-[#0f1f33]/60 hover:text-[#0f1f33]">✕</button>
            </div>

            {createUserMsg && (
              <div className="mb-4 p-2.5 rounded bg-[#d9b26a]/15 text-[#0f1f33] text-xs">{createUserMsg}</div>
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

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0f1f33]/[0.07]">
                <button type="button" onClick={() => setShowCreateUserModal(false)} className="crm-btn-default">Cancel</button>
                <button type="submit" className="crm-btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-[#0f1f33]/45 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#0f1f33]/10 w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#0f1f33]/[0.07] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0f1f33]">My Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-[#0f1f33]/60 hover:text-[#0f1f33]">✕</button>
            </div>

            {profileMsg && (
              <div className={`mb-4 p-2.5 rounded text-xs ${profileMsg.type === "success" ? "bg-[#0f1f33]/[0.06] text-[#0f1f33]" : "bg-[#d9b26a]/15 text-[#0f1f33]"}`}>
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

              <div className="pt-2 border-t border-[#0f1f33]/[0.07]">
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

              <div className="flex justify-end gap-2 pt-3 border-t border-[#0f1f33]/[0.07]">
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
              <span className="w-8 h-8 rounded-full bg-[#d9b26a] text-[#0f1f33] text-xs font-bold inline-flex items-center justify-center shrink-0">
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
        <header className="h-16 shrink-0 flex items-center gap-2 sm:gap-3 px-3 sm:px-6 border-b border-[#0f1f33]/[0.07] bg-[#f5f0e8]">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden w-10 h-10 rounded-[10px] bg-white ring-1 ring-[#0f1f33]/10 inline-flex items-center justify-center shrink-0"
            aria-label="Open menu"
          >
            <IconMenu className="w-5 h-5" />
          </button>

          <form onSubmit={submitGlobalSearch} className="relative flex-1 max-w-xl min-w-0">
            <IconSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#0f1f33]/45" />
            <input
              ref={globalSearchRef}
              type="search"
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              placeholder="Search leads by name, phone, address..."
              className="crm-input h-10 pl-10 pr-16 rounded-full bg-white"
              aria-label="Search leads"
            />
            <kbd className="hidden sm:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center h-6 px-2 rounded-md border border-[#0f1f33]/15 text-[10px] font-semibold text-[#0f1f33]/60 bg-[#f5f0e8]">Ctrl K</kbd>
          </form>

          <button onClick={() => { setSearchMode("single"); goApp("search"); }} className="crm-btn-primary h-10 shrink-0 px-3 sm:px-4">
            <IconPlus className="w-4 h-4" />
            <span className="hidden sm:inline">New search</span>
          </button>

          {runningJob && (
            <div className="hidden lg:flex items-center gap-2 h-10 pl-3 pr-1.5 rounded-full bg-white ring-1 ring-[#d9b26a]/60 min-w-0 max-w-[340px]">
              <span className="w-2 h-2 rounded-full bg-[#d9b26a] animate-pulse shrink-0" />
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
                className="h-7 px-2.5 rounded-full bg-[#0f1f33] text-white text-[11px] font-semibold shrink-0"
              >
                Stop
              </button>
            </div>
          )}

          <button
            onClick={() => setShowProfileModal(true)}
            className="hidden md:flex items-center gap-2.5 h-10 pl-1.5 pr-3 rounded-full bg-white ring-1 ring-[#0f1f33]/10 hover:ring-[#0f1f33]/20 shrink-0 ml-auto"
          >
            <span className="w-7 h-7 rounded-full bg-[#0f1f33] text-white text-[11px] font-bold inline-flex items-center justify-center">
              {initialsOf(user.name || user.username)}
            </span>
            <span className="text-left leading-tight">
              <span className="block text-[12.5px] font-semibold max-w-[140px] truncate">{user.name || user.username}</span>
              <span className="block text-[10.5px] text-[#0f1f33]/55 capitalize">{user.role}</span>
            </span>
          </button>
          <button
            onClick={logout}
            className="hidden md:inline-flex w-10 h-10 rounded-full items-center justify-center text-[#0f1f33]/60 hover:text-[#0f1f33] hover:bg-white shrink-0"
            title="Sign out"
            aria-label="Sign out"
          >
            <IconLogOut className="w-[18px] h-[18px]" />
          </button>
        </header>

        {/* Dedicated Page View Area */}
        <div className="flex-1 overflow-y-auto px-3 py-5 sm:px-6 sm:py-7">
          <div className="max-w-[1400px] mx-auto space-y-6">

            {/* PAGE 0: DASHBOARD */}
            {viewMode === "app" && activeTab === "dashboard" && (
              <div className="space-y-6">
                <PageHeader
                  eyebrow={today}
                  title={greeting()}
                  subtitle={<>{user.name || user.username}{user.company ? ` · ${user.company}` : ""} · {formatNumber(summary?.jobs.total ?? jobs.length)} extractions · {formatNumber(summaryTotals?.leads || 0)} leads collected</>}
                  actions={
                    <>
                      <button onClick={() => { setSearchMode("bulk"); goApp("search"); }} className="crm-btn-default">
                        <IconUpload className="w-4 h-4" /> Bulk upload
                      </button>
                      <button onClick={() => goApp("leads")} className="crm-btn-default">View leads</button>
                      <button onClick={() => { setSearchMode("single"); goApp("search"); }} className="crm-btn-primary">
                        <IconPlus className="w-4 h-4" /> New search
                      </button>
                    </>
                  }
                />

                {/* KPI cards */}
                <div className="grid grid-cols-2 xl:grid-cols-5 gap-3 sm:gap-4">
                  {[
                    { label: "Total leads", value: formatNumber(summaryTotals?.leads || 0), sub: `${formatNumber(leadsLast14)} in the last 14 days`, icon: <IconDatabase className="w-[18px] h-[18px]" /> },
                    { label: "With phone", value: formatNumber(summaryTotals?.withPhone || 0), sub: `${pct(summaryTotals?.withPhone || 0, summaryTotals?.leads || 0)}% of all leads`, icon: <IconPhone className="w-[18px] h-[18px]" /> },
                    { label: "With website", value: formatNumber(summaryTotals?.withWebsite || 0), sub: `${pct(summaryTotals?.withWebsite || 0, summaryTotals?.leads || 0)}% of all leads`, icon: <IconGlobe className="w-[18px] h-[18px]" /> },
                    { label: "Extractions", value: formatNumber(summary?.jobs.total ?? jobs.length), sub: `${formatNumber(summary?.jobs.byStatus.completed || 0)} completed`, icon: <IconLayers className="w-[18px] h-[18px]" /> },
                    { label: "Running now", value: formatNumber((summary?.jobs.byStatus.running || 0) + (summary?.jobs.byStatus.pending || 0)), sub: runningJob ? runningJob.target : "Nothing in progress", icon: <IconActivity className="w-[18px] h-[18px]" />, live: !!runningJob }
                  ].map((card, idx, all) => (
                    <div key={card.label} className={`crm-box p-4 sm:p-5 relative overflow-hidden ${idx === all.length - 1 ? "col-span-2 xl:col-span-1" : ""}`}>
                      <div className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-[#d9b26a]/0 via-[#d9b26a]/70 to-[#d9b26a]/0" />
                      <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-3.5">
                        <span className="crm-icon-tile">{card.icon}</span>
                        <div className="min-w-0">
                          <div className="crm-label !mb-1 flex items-center gap-1.5">
                            {card.label}
                            {card.live && <span className="w-1.5 h-1.5 rounded-full bg-[#d9b26a] animate-pulse" />}
                          </div>
                          <div className="text-[22px] sm:text-[26px] leading-none font-extrabold tracking-[-0.02em] tabular-nums">{card.value}</div>
                          <div className="text-xs text-[#0f1f33]/60 mt-2 truncate" title={card.sub}>{card.sub}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Leads collected chart */}
                  <div className="crm-box p-5 sm:p-6 xl:col-span-2">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="crm-box-title">Leads collected</h2>
                        <p className="text-xs text-[#0f1f33]/60 mt-1">Last 14 days · {formatNumber(leadsLast14)} leads · {formatNumber((summary?.daily || []).reduce((a, d) => a + d.withPhone, 0))} with phone</p>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-[#0f1f33]/70">
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#0f1f33]" />Leads</span>
                        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#d9b26a]" />With phone</span>
                      </div>
                    </div>

                    <div className="mt-6 flex gap-3">
                      <div className="flex flex-col justify-between h-56 xl:h-[336px] text-[10px] text-[#0f1f33]/45 tabular-nums text-right w-8 shrink-0 -mt-1.5 pb-5">
                        {chartTicks.map(t => <span key={t}>{t >= 1000 ? `${Math.round(t / 100) / 10}k` : t}</span>)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="relative h-52 xl:h-[312px]">
                          {chartTicks.map((t, i) => (
                            <div key={t} className="absolute inset-x-0 border-t border-dashed border-[#0f1f33]/[0.08]" style={{ top: `${(i / 4) * 100}%` }} />
                          ))}
                          <div className="absolute inset-0 flex items-end justify-between gap-1 sm:gap-2">
                            {(summary?.daily || []).map(d => (
                              <div key={d.day} className="group relative flex-1 h-full flex items-end justify-center gap-[3px]">
                                <div className="w-full max-w-[14px] rounded-t-[4px] bg-[#0f1f33] transition-[height] duration-500" style={{ height: `${(d.total / chartTop) * 100}%` }} />
                                <div className="w-full max-w-[14px] rounded-t-[4px] bg-[#d9b26a] transition-[height] duration-500" style={{ height: `${(d.withPhone / chartTop) * 100}%` }} />
                                <div className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap rounded-lg bg-[#0f1f33] text-white text-[11px] px-2.5 py-1.5 shadow-lg z-10">
                                  <div className="font-semibold">{new Date(d.day + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</div>
                                  <div>{formatNumber(d.total)} leads · {formatNumber(d.withPhone)} with phone</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-between gap-1 sm:gap-2 mt-2 text-[10px] text-[#0f1f33]/50">
                          {(summary?.daily || []).map((d, i, arr) => (
                            <span key={d.day} className={`flex-1 text-center ${i === arr.length - 1 ? "font-bold text-[#0f1f33]" : ""} ${i % 2 === 1 && i !== arr.length - 1 ? "invisible sm:visible" : ""}`}>
                              {new Date(d.day + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Data quality / top categories */}
                  <div className="crm-box p-5 sm:p-6">
                    <div className="flex items-center justify-between">
                      <h2 className="crm-box-title">Data quality</h2>
                      <button onClick={() => goApp("leads")} className="text-xs font-semibold text-[#0f1f33]/70 hover:text-[#0f1f33] inline-flex items-center gap-1">
                        All leads <IconArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-[#0f1f33]/60 mt-1">How complete your saved leads are</p>
                    <div className="mt-5 space-y-4">
                      {[
                        { label: "Phone number", value: summaryTotals?.withPhone || 0, gold: false },
                        { label: "Website", value: summaryTotals?.withWebsite || 0, gold: true },
                        { label: "Rating & reviews", value: summaryTotals?.withRating || 0, gold: false },
                        { label: "Email", value: summaryTotals?.withEmail || 0, gold: true }
                      ].map(row => (
                        <div key={row.label}>
                          <div className="flex items-baseline justify-between text-[13px]">
                            <span className="font-medium">{row.label}</span>
                            <span className="font-bold tabular-nums">{pct(row.value, summaryTotals?.leads || 0)}%</span>
                          </div>
                          <div className="mt-1.5 h-2 rounded-full bg-[#f5f0e8] overflow-hidden">
                            <div className={`h-full rounded-full ${row.gold ? "bg-[#d9b26a]" : "bg-[#0f1f33]"}`} style={{ width: `${pct(row.value, summaryTotals?.leads || 0)}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-4 border-t border-[#0f1f33]/[0.07]">
                      <div className="crm-label">Top categories</div>
                      {(summary?.topCategories || []).length === 0 ? (
                        <p className="text-xs text-[#0f1f33]/50">No leads yet.</p>
                      ) : (
                        <ul className="space-y-2.5">
                          {summary!.topCategories.slice(0, 5).map((c, i) => (
                            <li key={c.name} className="flex items-center gap-3 text-[13px]">
                              <span className="flex-1 min-w-0 truncate" title={c.name}>{c.name}</span>
                              <span className="w-20 h-1.5 rounded-full bg-[#f5f0e8] overflow-hidden shrink-0">
                                <span className={`block h-full rounded-full ${i % 2 ? "bg-[#d9b26a]" : "bg-[#0f1f33]"}`} style={{ width: `${(c.count / categoryMax) * 100}%` }} />
                              </span>
                              <span className="w-12 text-right font-semibold tabular-nums">{formatNumber(c.count)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  {/* Recent extractions */}
                  <div className="crm-box xl:col-span-2 overflow-hidden">
                    <div className="crm-box-header flex items-center justify-between">
                      <h2 className="crm-box-title">Recent extractions</h2>
                      <button onClick={() => goApp("leads")} className="text-xs font-semibold text-[#0f1f33]/70 hover:text-[#0f1f33] inline-flex items-center gap-1">
                        View all <IconArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {jobs.length === 0 ? (
                      <div className="p-10 text-center">
                        <p className="text-sm text-[#0f1f33]/60">No extractions yet.</p>
                        <button onClick={() => goApp("search")} className="crm-btn-primary mt-4"><IconPlus className="w-4 h-4" /> Start your first search</button>
                      </div>
                    ) : (
                      <ul className="divide-y divide-[#0f1f33]/[0.06]">
                        {jobs.slice(0, 6).map(j => (
                          <li key={j.id}>
                            <button
                              onClick={() => { selectJob(j.id); goApp("leads"); }}
                              className="w-full flex items-center gap-4 px-5 py-3.5 text-left hover:bg-[#f5f0e8]/60 transition-colors"
                            >
                              <span className="crm-icon-tile !w-9 !h-9 !rounded-[10px]">
                                {j.engine === "2gis" ? <IconLayers className="w-4 h-4" /> : <IconGlobe className="w-4 h-4" />}
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-[13.5px] font-semibold capitalize truncate">{j.target}</span>
                                <span className="block text-[11.5px] text-[#0f1f33]/55">{j.engine === "2gis" ? "2GIS" : "Google Maps"} · {j.cap > 0 ? `Max ${formatNumber(j.cap)}` : "Unlimited"} · {formatRelative(j.created_at)}</span>
                              </span>
                              <span className="hidden sm:block"><StatusBadge status={j.status} /></span>
                              <span className="w-20 text-right">
                                <span className="block text-[15px] font-bold tabular-nums">{formatNumber(j.total_saved || 0)}</span>
                                <span className="block text-[10.5px] text-[#0f1f33]/50">leads</span>
                              </span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Top cities */}
                  <div className="crm-box p-5 sm:p-6">
                    <h2 className="crm-box-title">Top cities</h2>
                    <p className="text-xs text-[#0f1f33]/60 mt-1">Where your leads are located</p>
                    {(summary?.topCities || []).length === 0 ? (
                      <p className="text-xs text-[#0f1f33]/50 mt-5">No leads yet.</p>
                    ) : (
                      <ul className="mt-5 space-y-4">
                        {summary!.topCities.map((c, i) => (
                          <li key={c.name}>
                            <div className="flex items-baseline justify-between text-[13px]">
                              <span className="font-medium truncate" title={c.name}>{c.name}</span>
                              <span className="font-bold tabular-nums">{formatNumber(c.count)}</span>
                            </div>
                            <div className="mt-1.5 h-2 rounded-full bg-[#f5f0e8] overflow-hidden">
                              <div className={`h-full rounded-full ${i % 2 ? "bg-[#d9b26a]" : "bg-[#0f1f33]"}`} style={{ width: `${(c.count / cityMax) * 100}%` }} />
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

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
                      className={`px-3 py-1 rounded font-semibold transition-colors ${searchMode === "single" ? "bg-[#0f1f33] text-white" : "text-[#0f1f33]/60 hover:bg-[#f5f0e8]"}`}
                    >
                      Single Search
                    </button>
                    <button
                      onClick={() => setSearchMode("bulk")}
                      className={`px-3 py-1 rounded font-semibold transition-colors ${searchMode === "bulk" ? "bg-[#0f1f33] text-white" : "text-[#0f1f33]/60 hover:bg-[#f5f0e8]"}`}
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
                            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#0f1f33]/10 rounded shadow-lg max-h-56 overflow-y-auto p-1">
                              {filteredCategories.map((cat, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onMouseDown={e => e.preventDefault()}
                                  onClick={() => { setKeyword(cat); setShowCategoryDropdown(false); }}
                                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-[#f5f0e8] rounded text-[#0f1f33]"
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
                            <input
                              type="text"
                              value={location}
                              onChange={e => setLocation(e.target.value)}
                              placeholder="City, area or country"
                              className="crm-input"
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

                      <p className="text-xs text-[#0f1f33]/60 leading-relaxed">
                        {effectiveCap > 0
                          ? `Stops as soon as ${formatNumber(effectiveCap)} unique leads are saved.`
                          : searchEngine === "gmaps"
                            ? "Unlimited: searches every neighbourhood, then sweeps the whole area on a map grid and splits busy cells into smaller ones until no new businesses appear. Large cities can take a while; you can stop at any time and keep what was found."
                            : "Unlimited: pages through every 2GIS district until the directory runs out of results. You can stop at any time and keep what was found."}
                      </p>

                      {startError && (
                        <div className="p-3 rounded bg-[#d9b26a]/15 border border-[#d9b26a]/60 text-[#0f1f33] text-xs font-semibold">
                          {startError}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#0f1f33]/[0.07]">
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
                          onClick={() => { setKeyword(""); setLocation(""); }}
                          className="crm-btn-default"
                        >
                          Reset
                        </button>
                      </div>
                    </form>
                  ) : (
                    <form onSubmit={startBulkSearch} className="space-y-4">
                      <div className="border border-dashed border-[#0f1f33]/20 rounded p-6 text-center bg-[#f5f0e8]">
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="bulk-file-input"
                        />
                        <label htmlFor="bulk-file-input" className="cursor-pointer block">
                          <span className="text-xs font-semibold text-[#0f1f33]">
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

                      <p className="text-xs text-[#0f1f33]/60">
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
                        <div className="p-3 bg-[#f5f0e8] text-[#0f1f33] text-xs rounded-[10px] border border-[#d9b26a]/50">
                          {bulkStatusMsg}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
              </div>
            )}

            {/* PAGE 2: DEDICATED FULL DATABASE PAGE */}
            {viewMode === "app" && activeTab === "leads" && (
              <div className="space-y-4 sm:space-y-6">
                <PageHeader
                  eyebrow="Leads"
                  title="Saved leads"
                  subtitle={`${formatNumber(jobs.length)} extractions · ${formatNumber(jobs.reduce((a, j) => a + (j.total_saved || 0), 0))} leads`}
                  actions={
                    <>
                      {selectedJobId && (
                        <button onClick={() => setExportJobId(selectedJobId)} disabled={!resultsStats?.total} className="crm-btn-default disabled:opacity-50">
                          <IconDownload className="w-4 h-4" /> Export
                        </button>
                      )}
                      <button onClick={() => goApp("search")} className="crm-btn-primary"><IconPlus className="w-4 h-4" /> New search</button>
                    </>
                  }
                />
                {/* Extraction history */}
                <div className="crm-box">
                  <div className="crm-box-header flex items-center justify-between gap-2">
                    <h2 className="crm-box-title">Extraction history</h2>
                    <span className="text-xs text-[#0f1f33]/55">{formatNumber(jobs.length)} total</span>
                  </div>
                  <div className="p-3 sm:p-4 overflow-x-auto">
                    {jobs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#0f1f33]/60">No extractions yet. Start one from Find Leads.</div>
                    ) : (
                      <div className="flex gap-3 pb-1">
                        {jobs.map(j => {
                          const isSelected = j.id === selectedJobId;
                          const active = isActiveStatus(j.status);
                          const capPct = j.cap > 0 ? Math.min(100, Math.round(((j.total_saved || 0) / j.cap) * 100)) : null;
                          return (
                            <div
                              key={j.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => selectJob(j.id)}
                              onKeyDown={e => { if (e.key === "Enter") selectJob(j.id); }}
                              className={`p-3 rounded border text-xs w-[240px] shrink-0 cursor-pointer transition-colors ${isSelected ? "border-[#d9b26a] bg-[#d9b26a]/10" : "border-[#0f1f33]/10 bg-white hover:border-[#0f1f33]/20"}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="font-semibold text-[#0f1f33] capitalize truncate" title={j.target}>{j.target}</div>
                                <StatusBadge status={j.status} />
                              </div>
                              <div className="mt-1.5 text-[11px] text-[#0f1f33]/60 truncate">
                                {j.engine === "2gis" ? "2GIS" : "Google Maps"} · {j.cap > 0 ? `Max ${formatNumber(j.cap)}` : "Unlimited"} · {formatRelative(j.created_at)}
                              </div>
                              <div className="mt-2 font-semibold text-[#0f1f33] text-sm">
                                {formatNumber(j.total_saved || 0)} <span className="text-[11px] font-medium text-[#0f1f33]/60">leads</span>
                              </div>
                              <div className="mt-1.5 h-1 rounded-full bg-[#f5f0e8] overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${active ? "bg-[#d9b26a]" : j.status === "failed" ? "bg-[#0f1f33]/30" : "bg-[#0f1f33]"} ${active && capPct === null ? "animate-pulse w-full opacity-40" : ""}`}
                                  style={capPct !== null ? { width: `${active ? capPct : 100}%` } : (active ? undefined : { width: "100%" })}
                                />
                              </div>
                              <div className="flex items-center justify-end gap-3 mt-2 text-[11px]">
                                {active && (
                                  <button
                                    onClick={e => { e.stopPropagation(); stopSearch(j.id); }}
                                    className="text-[#0f1f33] hover:underline font-semibold"
                                  >
                                    Stop
                                  </button>
                                )}
                                <button
                                  onClick={e => { e.stopPropagation(); setExportJobId(j.id); }}
                                  disabled={!j.total_saved}
                                  className="text-[#0f1f33] hover:underline font-semibold disabled:opacity-40 disabled:no-underline"
                                >
                                  Export
                                </button>
                                <button
                                  onClick={e => { e.stopPropagation(); deleteSearch(j.id); }}
                                  className="text-[#0f1f33]/70 hover:underline font-semibold"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Leads table */}
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
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-[#0f1f33]/60">
                          <span><b className="text-[#0f1f33]">{formatNumber(resultsStats.total)}</b> leads</span>
                          <span><b className="text-[#0f1f33]">{formatNumber(resultsStats.withPhone)}</b> with phone ({Math.round((resultsStats.withPhone / resultsStats.total) * 100)}%)</span>
                          <span><b className="text-[#0f1f33]">{formatNumber(resultsStats.withWebsite)}</b> with website</span>
                          {resultsStats.withEmail > 0 && <span><b className="text-[#0f1f33]">{formatNumber(resultsStats.withEmail)}</b> with email</span>}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <div className="relative flex-1 lg:flex-none">
                        <IconSearch className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#0f1f33]/45" />
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
                    <div className="p-12 text-center text-xs text-[#0f1f33]/60">Loading leads...</div>
                  ) : filteredResults.length === 0 ? (
                    <div className="p-12 text-center text-sm text-[#0f1f33]/60">
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
                        <table className="min-w-full divide-y divide-[#0f1f33]/10 text-left text-xs">
                          <thead className="bg-[#f5f0e8] text-[#0f1f33]/75 font-semibold uppercase tracking-wider sticky top-0">
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
                          <tbody className="divide-y divide-[#0f1f33]/[0.06] bg-white">
                            {filteredResults.map((lead, idx) => (
                              <tr key={lead.id || idx} className="hover:bg-[#f5f0e8]/60 transition-colors align-top">
                                <td className="px-4 py-3 text-[#0f1f33]/45 tabular-nums">{resultsPage * resultsPageSize + idx + 1}</td>
                                <td className="px-4 py-3 max-w-[260px]">
                                  <div className="font-semibold text-[#0f1f33] truncate" title={lead.title}>{lead.title || "—"}</div>
                                  {lead.category && <div className="text-[11px] text-[#0f1f33]/60 truncate">{lead.category}</div>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  {lead.phone_1 ? (
                                    <a href={`tel:${lead.phone_1}`} className="block text-[#0f1f33] hover:underline font-mono">{lead.phone_1}</a>
                                  ) : <span className="text-[#0f1f33]/45">—</span>}
                                  {lead.phone_2 && <a href={`tel:${lead.phone_2}`} className="block text-[#0f1f33]/60 hover:underline font-mono text-[11px]">{lead.phone_2}</a>}
                                </td>
                                <td className="px-4 py-3 text-[#0f1f33]/75 max-w-[280px]">
                                  <div className="truncate" title={lead.address || ""}>{lead.address || lead.street || "—"}</div>
                                  {(lead.city || lead.country) && (
                                    <div className="text-[11px] text-[#0f1f33]/45 truncate">{[lead.city, lead.country].filter(Boolean).join(", ")}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap font-medium text-[#0f1f33]">
                                  {lead.rating ? <>{lead.rating} <span className="text-[#d9b26a]">★</span> <span className="text-[#0f1f33]/45 font-normal">({formatNumber(Number(lead.reviews) || 0)})</span></> : <span className="text-[#0f1f33]/45">—</span>}
                                </td>
                                <td className="px-4 py-3 max-w-[180px] truncate">
                                  {lead.website ? (
                                    <a href={lead.website} target="_blank" rel="noreferrer" className="text-[#0f1f33] hover:underline" title={lead.website}>
                                      {lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                                    </a>
                                  ) : <span className="text-[#0f1f33]/45">—</span>}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => copyToClipboard([lead.title, lead.phone_1, lead.phone_2, lead.website, lead.address].filter(Boolean).join(" | "))}
                                    className="text-[#0f1f33]/60 hover:text-[#0f1f33] p-1"
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
                      <ul className={`md:hidden divide-y divide-[#0f1f33]/[0.06] ${loadingResults ? "opacity-60" : ""}`}>
                        {filteredResults.map((lead, idx) => (
                          <li key={lead.id || idx} className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="font-semibold text-sm text-[#0f1f33] leading-snug">{lead.title || "—"}</div>
                                <div className="text-[11px] text-[#0f1f33]/60 mt-0.5">
                                  {[lead.category, lead.rating ? `${lead.rating}★ (${formatNumber(Number(lead.reviews) || 0)})` : null].filter(Boolean).join(" · ")}
                                </div>
                              </div>
                              <button
                                onClick={() => copyToClipboard([lead.title, lead.phone_1, lead.phone_2, lead.website, lead.address].filter(Boolean).join(" | "))}
                                className="text-[#0f1f33]/60 p-1.5 -m-1.5 shrink-0"
                                aria-label="Copy record"
                              >
                                <IconCopy className="w-4 h-4" />
                              </button>
                            </div>
                            {(lead.address || lead.city) && (
                              <div className="text-xs text-[#0f1f33]/75 mt-2">{lead.address || lead.city}</div>
                            )}
                            <div className="flex flex-wrap gap-2 mt-3">
                              {lead.phone_1 && (
                                <a href={`tel:${lead.phone_1}`} className="inline-flex items-center h-8 px-3 rounded-full bg-[#d9b26a]/15 text-[#0f1f33] text-xs font-semibold font-mono">
                                  {lead.phone_1}
                                </a>
                              )}
                              {lead.phone_2 && (
                                <a href={`tel:${lead.phone_2}`} className="inline-flex items-center h-8 px-3 rounded-full bg-[#f5f0e8] text-[#0f1f33]/75 text-xs font-mono">
                                  {lead.phone_2}
                                </a>
                              )}
                              {lead.website && (
                                <a href={lead.website} target="_blank" rel="noreferrer" className="inline-flex items-center h-8 px-3 rounded-full bg-[#f5f0e8] text-[#0f1f33]/75 text-xs max-w-full truncate">
                                  {lead.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                                </a>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>

                      {/* Pagination */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#0f1f33]/[0.07] text-xs text-[#0f1f33]/60">
                        <div>
                          Showing <b className="text-[#0f1f33]">{formatNumber(resultsPage * resultsPageSize + 1)}–{formatNumber(Math.min(resultsTotal, (resultsPage + 1) * resultsPageSize))}</b> of <b className="text-[#0f1f33]">{formatNumber(resultsTotal)}</b>
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
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${adminTab === "overview" ? "bg-[#0f1f33] text-white" : "text-[#0f1f33]/60 hover:bg-[#f5f0e8]"}`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setAdminTab("users")}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${adminTab === "users" ? "bg-[#0f1f33] text-white" : "text-[#0f1f33]/60 hover:bg-[#f5f0e8]"}`}
                      >
                        Users & Team
                      </button>
                      <button
                        onClick={() => { setAdminTab("leads"); fetchAdminGlobalLeads(token, 0); }}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${adminTab === "leads" ? "bg-[#0f1f33] text-white" : "text-[#0f1f33]/60 hover:bg-[#f5f0e8]"}`}
                      >
                        All Leads
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
                      <div className="p-4 bg-[#f5f0e8] border border-[#0f1f33]/10 rounded">
                        <span className="crm-label">Total Users</span>
                        <span className="text-2xl font-bold text-[#0f1f33]">{adminStats.totalUsers || 0}</span>
                      </div>
                      <div className="p-4 bg-[#f5f0e8] border border-[#0f1f33]/10 rounded">
                        <span className="crm-label">Total Extractions</span>
                        <span className="text-2xl font-bold text-[#0f1f33]">{adminStats.totalJobs || 0}</span>
                      </div>
                      <div className="p-4 bg-[#f5f0e8] border border-[#0f1f33]/10 rounded">
                        <span className="crm-label">Total Stored Leads</span>
                        <span className="text-2xl font-bold text-[#0f1f33]">{adminStats.totalLeads || 0}</span>
                      </div>
                      <div className="p-4 bg-[#f5f0e8] border border-[#0f1f33]/10 rounded">
                        <span className="crm-label">Running Tasks</span>
                        <span className="text-2xl font-bold text-[#0f1f33]">{adminStats.runningJobs || 0}</span>
                      </div>
                    </div>
                  )}

                  {adminTab === "users" && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#0f1f33]/10 text-left text-xs">
                        <thead className="bg-[#f5f0e8] text-[#0f1f33]/75 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0f1f33]/[0.06] bg-white">
                          {adminUsers.map(u => (
                            <tr key={u.id} className="hover:bg-[#f5f0e8]/60">
                              <td className="px-4 py-3 font-semibold text-[#0f1f33]">{u.name}</td>
                              <td className="px-4 py-3 font-mono text-[#0f1f33]/60">@{u.username}</td>
                              <td className="px-4 py-3">{u.email}</td>
                              <td className="px-4 py-3 font-semibold uppercase">{u.role}</td>
                              <td className="px-4 py-3">{u.status}</td>
                              <td className="px-4 py-3 text-[#0f1f33]/60">{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {adminTab === "leads" && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#0f1f33]/10 text-left text-xs">
                        <thead className="bg-[#f5f0e8] text-[#0f1f33]/75 font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Address</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Rating</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0f1f33]/[0.06] bg-white">
                          {adminGlobalLeads.map((l, i) => (
                            <tr key={i} className="hover:bg-[#f5f0e8]/60">
                              <td className="px-4 py-3 font-semibold text-[#0f1f33]">{l.title}</td>
                              <td className="px-4 py-3 font-mono">{l.phone_1 || "—"}</td>
                              <td className="px-4 py-3 text-[#0f1f33]/75 max-w-[200px] truncate">{l.address || "—"}</td>
                              <td className="px-4 py-3 text-[#0f1f33]/60">{l.category || "—"}</td>
                              <td className="px-4 py-3">{l.rating || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex items-center justify-between gap-3 pt-3 text-xs text-[#0f1f33]/60">
                        <span>
                          {adminLeadsTotal > 0
                            ? `Showing ${formatNumber(adminLeadsPage * 100 + 1)}–${formatNumber(Math.min(adminLeadsTotal, (adminLeadsPage + 1) * 100))} of ${formatNumber(adminLeadsTotal)}`
                            : "No leads yet"}
                        </span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => fetchAdminGlobalLeads(token, Math.max(0, adminLeadsPage - 1))}
                            disabled={adminLeadsPage === 0}
                            className="crm-btn-default h-8 px-3 text-xs disabled:opacity-40"
                          >
                            Prev
                          </button>
                          <button
                            onClick={() => fetchAdminGlobalLeads(token, adminLeadsPage + 1)}
                            disabled={(adminLeadsPage + 1) * 100 >= adminLeadsTotal}
                            className="crm-btn-default h-8 px-3 text-xs disabled:opacity-40"
                          >
                            Next
                          </button>
                        </div>
                      </div>
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
