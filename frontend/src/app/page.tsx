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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");

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

  useEffect(() => {
    setServerStatusGlobal = setIsServerOnline;
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
    if (!token) return;
    const interval = setInterval(() => {
      fetchJobsList(token, false);
      if (selectedJobId && activeTab === "leads") {
        fetchJobDetails(selectedJobId, token, false);
      }
      if (viewMode === "admin") {
        fetchAdminStats(token);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [token, selectedJobId, activeTab, viewMode]);

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
      const res = await apiFetch(`/api/jobs/${jobId}/results?limit=1000`, {
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

  const fetchAdminGlobalLeads = async (authToken: string) => {
    try {
      const res = await apiFetch("/api/admin/leads?limit=500", {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminGlobalLeads(data.leads || []);
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
    setSelectedJobId(null);
    setViewMode("app");
    setActiveTab("search");
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
        setActiveTab("leads");
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
      const res = await apiFetch("/api/jobs/batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          engine: searchEngine,
          queries,
          cap: leadCount,
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
      fetchJobsList(token, false);
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
        setSelectedJobId(null);
        setJobResults([]);
      }
      fetchJobsList(token, false);
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
  // UNAUTHENTICATED SCREEN (Clean Apple-Style Sign In)
  // ----------------------------------------------------
  if (!token || !user) {
    return (
      <div className="min-h-screen bg-[#f8fafc] text-[#0f172a] flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-[400px] crm-box p-8">
          <div className="text-center mb-6">
            <img src={LOGO_IMG} alt="7Strokes" className="h-10 w-auto mx-auto mb-3 object-contain" />
            <h1 className="text-lg font-bold text-[#0f172a]">Lead Finder</h1>
          </div>

          {!isServerOnline && (
            <div className="mb-4 p-3 rounded bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs font-semibold">
              Backend service is offline on port 4000.
            </div>
          )}

          {authError && (
            <div className="mb-4 p-3 rounded bg-[#fef2f2] border border-[#fecaca] text-[#dc2626] text-xs font-semibold">
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
    );
  }

  // ----------------------------------------------------
  // AUTHENTICATED DASHBOARD (Clean CRM Workspace)
  // ----------------------------------------------------
  return (
    <div className="flex h-screen w-full bg-[#f8fafc] text-[#0f172a] font-sans overflow-hidden">
      {/* Toast Alert */}
      {copyToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0f172a] text-white text-xs font-semibold px-4 py-2.5 rounded shadow-lg">
          {copyToast}
        </div>
      )}

      {/* EXPORT MODAL */}
      {exportJobId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] w-full max-w-lg shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0f172a]">Export Leads Data</h3>
              <button onClick={() => setExportJobId(null)} className="text-[#64748b] hover:text-[#0f172a]">✕</button>
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
                      className={`py-2 rounded text-xs font-semibold uppercase border transition-colors ${exportFormat === fmt ? "bg-[#0072f0] text-white border-[#0072f0]" : "bg-white text-[#475569] border-[#cbd5e1] hover:bg-[#f8fafc]"}`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="crm-label">Select Columns to Include</label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-[#e2e8f0] rounded">
                  {EXPORT_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-xs text-[#0f172a] cursor-pointer">
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
                        className="rounded border-[#cbd5e1] text-[#0072f0] focus:ring-0"
                      />
                      <span>{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#f1f5f9]">
                <button onClick={() => setExportJobId(null)} className="crm-btn-default">Cancel</button>
                <button onClick={handleDownloadExport} className="crm-btn-primary">Download File</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE USER MODAL (Admin & Manager) */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0f172a]">Create New User Account</h3>
              <button onClick={() => setShowCreateUserModal(false)} className="text-[#64748b] hover:text-[#0f172a]">✕</button>
            </div>

            {createUserMsg && (
              <div className="mb-4 p-2.5 rounded bg-[#fef2f2] text-[#dc2626] text-xs">{createUserMsg}</div>
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

              <div className="flex justify-end gap-2 pt-3 border-t border-[#f1f5f9]">
                <button type="button" onClick={() => setShowCreateUserModal(false)} className="crm-btn-default">Cancel</button>
                <button type="submit" className="crm-btn-primary">Create Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PROFILE MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#e2e8f0] w-full max-w-md shadow-xl p-6">
            <div className="flex items-center justify-between border-b border-[#f1f5f9] pb-3 mb-4">
              <h3 className="text-sm font-bold text-[#0f172a]">My Profile</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-[#64748b] hover:text-[#0f172a]">✕</button>
            </div>

            {profileMsg && (
              <div className={`mb-4 p-2.5 rounded text-xs ${profileMsg.type === "success" ? "bg-[#f0fdf4] text-[#16a34a]" : "bg-[#fef2f2] text-[#dc2626]"}`}>
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

              <div className="pt-2 border-t border-[#f1f5f9]">
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

              <div className="flex justify-end gap-2 pt-3 border-t border-[#f1f5f9]">
                <button type="button" onClick={() => setShowProfileModal(false)} className="crm-btn-default">Close</button>
                <button type="submit" className="crm-btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEFT SIDEBAR NAVIGATION (Persistent Desktop Bar) */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-[#e2e8f0] flex flex-col justify-between p-4 transition-transform duration-200 md:static md:translate-x-0 ${sidebarOpen ? "translate-x-0 shadow-xl" : "-translate-x-full"}`}>
        <div>
          {/* Brand Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#f1f5f9]">
            <div className="flex items-center gap-2.5">
              <img src={LOGO_IMG} alt="7Strokes" className="h-8 w-auto object-contain" />
              <div>
                <span className="font-bold text-sm tracking-tight text-[#0f172a]">7STROKES</span>
                <span className="block text-[10px] text-[#64748b] uppercase tracking-wider font-semibold">Leads Workspace</span>
              </div>
            </div>
            <button onClick={() => setSidebarOpen(false)} className="md:hidden text-[#64748b]">✕</button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => { setActiveTab("search"); setViewMode("app"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs font-semibold text-left transition-colors ${activeTab === "search" && viewMode === "app" ? "bg-[#0072f0]/10 text-[#0072f0] border-l-4 border-[#0072f0]" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"}`}
            >
              <IconSearch className="w-4 h-4 shrink-0" />
              <span>Find Leads</span>
            </button>

            <button
              onClick={() => { setActiveTab("leads"); setViewMode("app"); setSidebarOpen(false); }}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded text-xs font-semibold text-left transition-colors ${activeTab === "leads" && viewMode === "app" ? "bg-[#0072f0]/10 text-[#0072f0] border-l-4 border-[#0072f0]" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"}`}
            >
              <div className="flex items-center gap-3">
                <IconDatabase className="w-4 h-4 shrink-0" />
                <span>Saved Database</span>
              </div>
              <span className="text-[10px] font-semibold text-[#64748b]">
                {jobs.length}
              </span>
            </button>

            {(user.role === "admin" || user.can_use_proxy === 1) && (
              <button
                onClick={() => { setActiveTab("settings"); setViewMode("app"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs font-semibold text-left transition-colors ${activeTab === "settings" && viewMode === "app" ? "bg-[#0072f0]/10 text-[#0072f0] border-l-4 border-[#0072f0]" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"}`}
              >
                <IconShield className="w-4 h-4 shrink-0" />
                <span>Proxy Settings</span>
              </button>
            )}

            {(user.role === "admin" || user.role === "manager") && (
              <button
                onClick={() => { setViewMode("admin"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded text-xs font-semibold text-left transition-colors ${viewMode === "admin" ? "bg-[#0072f0]/10 text-[#0072f0] border-l-4 border-[#0072f0]" : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"}`}
              >
                <IconUsers className="w-4 h-4 shrink-0" />
                <span>Admin Console</span>
              </button>
            )}
          </nav>
        </div>

        {/* User Footer */}
        <div className="pt-4 border-t border-[#f1f5f9]">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setShowProfileModal(true)}
              className="text-left hover:opacity-80"
            >
              <span className="block text-xs font-semibold text-[#0f172a] truncate">{user.name || user.username}</span>
              <span className="block text-[11px] text-[#64748b] truncate uppercase">{user.role}</span>
            </button>
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
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-[#e2e8f0] px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden text-[#64748b]">
              <IconMenu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#64748b]">
              <span>CRM</span>
              <span>/</span>
              <span className="text-[#0f172a] font-semibold">
                {viewMode === "admin" ? "Admin Console" : (activeTab === "search" ? "Find Leads" : (activeTab === "leads" ? "Saved Database" : "Proxy Settings"))}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {runningJob && (
              <div className="flex items-center gap-2 text-xs text-[#0072f0] font-semibold">
                <span>Extracting: {runningJob.target}</span>
                <button onClick={() => stopSearch(runningJob.id)} className="text-[#dc2626] hover:underline">
                  Stop
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Dedicated Page View Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">

            {/* PAGE 1: DEDICATED SEARCH PAGE */}
            {viewMode === "app" && activeTab === "search" && (
              <div className="crm-box">
                <div className="crm-box-header flex items-center justify-between">
                  <h2 className="crm-box-title">Search & Extraction Parameters</h2>
                  <div className="flex items-center gap-2 text-xs">
                    <button
                      onClick={() => setSearchMode("single")}
                      className={`px-3 py-1 rounded font-semibold transition-colors ${searchMode === "single" ? "bg-[#0072f0] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
                    >
                      Single Search
                    </button>
                    <button
                      onClick={() => setSearchMode("bulk")}
                      className={`px-3 py-1 rounded font-semibold transition-colors ${searchMode === "bulk" ? "bg-[#0072f0] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
                    >
                      Bulk File Search
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  {searchMode === "single" ? (
                    <form onSubmit={startLeadSearch} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative">
                          <label className="crm-label">Category or Keyword</label>
                          <input
                            type="text"
                            required
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            onFocus={() => setShowCategoryDropdown(true)}
                            placeholder="e.g. Real Estate, Dental Clinics..."
                            className="crm-input"
                          />
                          {showCategoryDropdown && (
                            <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white border border-[#e2e8f0] rounded shadow-lg max-h-48 overflow-y-auto p-1">
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

                        <div>
                          <label className="crm-label">Target Location</label>
                          <input
                            type="text"
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            placeholder="Any City, Country, or Region"
                            className="crm-input"
                          />
                        </div>

                        <div>
                          <label className="crm-label">Leads Limit</label>
                          <select
                            value={leadCount}
                            onChange={e => setLeadCount(Number(e.target.value))}
                            className="crm-input cursor-pointer"
                          >
                            <option value={50}>50 Leads</option>
                            <option value={100}>100 Leads</option>
                            <option value={250}>250 Leads</option>
                            <option value={500}>500 Leads</option>
                            <option value={0}>Unlimited</option>
                          </select>
                        </div>

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

                      <div className="flex items-center gap-3 pt-3 border-t border-[#f1f5f9]">
                        <button
                          type="submit"
                          disabled={isStarting || !keyword.trim()}
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
                      <div className="border border-dashed border-[#cbd5e1] rounded p-6 text-center bg-[#f8fafc]">
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="bulk-file-input"
                        />
                        <label htmlFor="bulk-file-input" className="cursor-pointer block">
                          <span className="text-xs font-semibold text-[#0072f0]">
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

                      <button
                        type="submit"
                        disabled={isBulkStarting || !bulkQueriesText.trim()}
                        className="crm-btn-primary disabled:opacity-50"
                      >
                        {isBulkStarting ? "Starting..." : "Start Bulk Extraction"}
                      </button>

                      {bulkStatusMsg && (
                        <div className="p-3 bg-[#f0f9ff] text-[#0369a1] text-xs rounded border border-[#bae6fd]">
                          {bulkStatusMsg}
                        </div>
                      )}
                    </form>
                  )}
                </div>
              </div>
            )}

            {/* PAGE 2: DEDICATED FULL DATABASE PAGE */}
            {viewMode === "app" && activeTab === "leads" && (
              <div className="space-y-6">
                {/* Search History Row */}
                <div className="crm-box">
                  <div className="crm-box-header flex items-center justify-between">
                    <h2 className="crm-box-title">Extraction History</h2>
                    <button
                      onClick={() => setActiveTab("search")}
                      className="crm-btn-primary h-8 text-xs"
                    >
                      + New Search
                    </button>
                  </div>
                  <div className="p-4 overflow-x-auto">
                    {jobs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#64748b]">No extractions found</div>
                    ) : (
                      <div className="flex gap-3">
                        {jobs.map(j => {
                          const isSelected = j.id === selectedJobId;
                          return (
                            <div
                              key={j.id}
                              onClick={() => { setSelectedJobId(j.id); fetchJobDetails(j.id, token, true); }}
                              className={`p-3 rounded border text-xs min-w-[200px] cursor-pointer transition-colors ${isSelected ? "border-[#0072f0] bg-[#0072f0]/5" : "border-[#e2e8f0] bg-white hover:border-[#cbd5e1]"}`}
                            >
                              <div className="font-semibold text-[#0f172a] capitalize truncate">{j.target}</div>
                              <div className="flex items-center justify-between mt-2 text-[#64748b] text-[11px]">
                                <span>{j.total_saved || 0} leads</span>
                                <div className="space-x-2">
                                  <button
                                    onClick={e => { e.stopPropagation(); setExportJobId(j.id); }}
                                    className="text-[#0072f0] hover:underline font-semibold"
                                  >
                                    Export
                                  </button>
                                  <button
                                    onClick={e => { e.stopPropagation(); deleteSearch(j.id); }}
                                    className="text-[#dc2626] hover:underline font-semibold"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Full Width Dedicated Data Table */}
                <div className="crm-box">
                  <div className="crm-box-header flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="crm-box-title">
                        {selectedJob ? selectedJob.target : "Leads Database"}
                      </h2>
                      <span className="text-xs text-[#64748b]">({filteredResults.length} records)</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Search records..."
                        value={searchFilter}
                        onChange={e => setSearchFilter(e.target.value)}
                        className="crm-input h-8 text-xs w-48"
                      />
                      {selectedJobId && (
                        <button
                          onClick={() => setExportJobId(selectedJobId)}
                          disabled={filteredResults.length === 0}
                          className="crm-btn-default h-8 text-xs gap-1.5 disabled:opacity-50"
                        >
                          <IconDownload className="w-3.5 h-3.5" />
                          <span>Export</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    {loadingResults ? (
                      <div className="p-12 text-center text-xs text-[#64748b]">Loading database records...</div>
                    ) : filteredResults.length === 0 ? (
                      <div className="p-12 text-center">
                        <div className="inline-block bg-[#f0f9ff] border border-[#bae6fd] text-[#0369a1] px-6 py-3 rounded text-sm font-medium">
                          No Data Found
                        </div>
                      </div>
                    ) : (
                      <table className="min-w-full divide-y divide-[#e2e8f0] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569] font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">#</th>
                            <th className="px-4 py-3">Business Name</th>
                            <th className="px-4 py-3">Primary Phone</th>
                            <th className="px-4 py-3">Secondary Phone</th>
                            <th className="px-4 py-3">Address & Locality</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Rating</th>
                            <th className="px-4 py-3">Website</th>
                            <th className="px-4 py-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9] bg-white">
                          {filteredResults.map((lead, idx) => (
                            <tr key={idx} className="hover:bg-[#f8fafc] transition-colors">
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
                              <td className="px-4 py-3 text-[#475569] max-w-[240px] truncate" title={lead.address || ""}>
                                {lead.address || lead.city || "—"}
                              </td>
                              <td className="px-4 py-3 text-[#64748b]">{lead.category || "—"}</td>
                              <td className="px-4 py-3 whitespace-nowrap font-medium text-[#0f172a]">
                                {lead.rating ? `${lead.rating} ★ (${lead.reviews || 0})` : "—"}
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
                                  title="Copy record"
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
              </div>
            )}

            {/* PAGE 3: PROXY SETTINGS */}
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
            )}

            {/* PAGE 4: ADMIN CONSOLE */}
            {viewMode === "admin" && (
              <div className="crm-box">
                <div className="crm-box-header flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="crm-box-title">Admin Console</h2>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setAdminTab("overview")}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${adminTab === "overview" ? "bg-[#0072f0] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => setAdminTab("users")}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${adminTab === "users" ? "bg-[#0072f0] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
                      >
                        Users & Team
                      </button>
                      <button
                        onClick={() => setAdminTab("leads")}
                        className={`text-xs font-semibold px-2.5 py-1 rounded transition-colors ${adminTab === "leads" ? "bg-[#0072f0] text-white" : "text-[#64748b] hover:bg-[#f1f5f9]"}`}
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

                <div className="p-6">
                  {adminTab === "overview" && adminStats && (
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                        <span className="crm-label">Total Users</span>
                        <span className="text-2xl font-bold text-[#0f172a]">{adminStats.totalUsers || 0}</span>
                      </div>
                      <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                        <span className="crm-label">Total Extractions</span>
                        <span className="text-2xl font-bold text-[#0f172a]">{adminStats.totalJobs || 0}</span>
                      </div>
                      <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                        <span className="crm-label">Total Stored Leads</span>
                        <span className="text-2xl font-bold text-[#0072f0]">{adminStats.totalLeads || 0}</span>
                      </div>
                      <div className="p-4 bg-[#f8fafc] border border-[#e2e8f0] rounded">
                        <span className="crm-label">Running Tasks</span>
                        <span className="text-2xl font-bold text-[#0f172a]">{adminStats.runningJobs || 0}</span>
                      </div>
                    </div>
                  )}

                  {adminTab === "users" && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#e2e8f0] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569] font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Name</th>
                            <th className="px-4 py-3">Username</th>
                            <th className="px-4 py-3">Email</th>
                            <th className="px-4 py-3">Role</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Created</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9] bg-white">
                          {adminUsers.map(u => (
                            <tr key={u.id} className="hover:bg-[#f8fafc]">
                              <td className="px-4 py-3 font-semibold text-[#0f172a]">{u.name}</td>
                              <td className="px-4 py-3 font-mono text-[#64748b]">@{u.username}</td>
                              <td className="px-4 py-3">{u.email}</td>
                              <td className="px-4 py-3 font-semibold uppercase">{u.role}</td>
                              <td className="px-4 py-3">{u.status}</td>
                              <td className="px-4 py-3 text-[#64748b]">{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {adminTab === "leads" && (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-[#e2e8f0] text-left text-xs">
                        <thead className="bg-[#f8fafc] text-[#475569] font-semibold uppercase tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Title</th>
                            <th className="px-4 py-3">Phone</th>
                            <th className="px-4 py-3">Address</th>
                            <th className="px-4 py-3">Category</th>
                            <th className="px-4 py-3">Rating</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#f1f5f9] bg-white">
                          {adminGlobalLeads.slice(0, 100).map((l, i) => (
                            <tr key={i} className="hover:bg-[#f8fafc]">
                              <td className="px-4 py-3 font-semibold text-[#0f172a]">{l.title}</td>
                              <td className="px-4 py-3 font-mono">{l.phone_1 || "—"}</td>
                              <td className="px-4 py-3 text-[#475569] max-w-[200px] truncate">{l.address || "—"}</td>
                              <td className="px-4 py-3 text-[#64748b]">{l.category || "—"}</td>
                              <td className="px-4 py-3">{l.rating || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
}
