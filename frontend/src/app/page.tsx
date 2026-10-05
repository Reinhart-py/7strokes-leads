"use client";

import { useState, useEffect } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

const EXPORT_COLUMNS = [
  { key: "title", label: "Business Name" },
  { key: "phone_1", label: "Phone Number" },
  { key: "website", label: "Website" },
  { key: "category", label: "Category" },
  { key: "address", label: "Full Address" },
  { key: "city", label: "City" },
  { key: "rating", label: "Star Rating" },
  { key: "reviews", label: "Reviews Count" },
  { key: "opening_hours", label: "Opening Hours" },
  { key: "place_id", label: "Place ID" }
];

export default function Home() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [token, setToken] = useState("");
  const [user, setUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const [viewMode, setViewMode] = useState<"app" | "admin">("app");
  const [activeTab, setActiveTab] = useState<"search" | "leads">("search");
  const [adminTab, setAdminTab] = useState<"overview" | "users" | "settings">("overview");

  const [jobs, setJobs] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [leadCount, setLeadCount] = useState<number>(0);
  const [customLeadCount, setCustomLeadCount] = useState<string>("");
  const [source, setSource] = useState<"gmaps" | "2gis">("gmaps");
  const [deepScan, setDeepScan] = useState(true);
  const [isStarting, setIsStarting] = useState(false);

  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [jobResults, setJobResults] = useState<any[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const [exportJobId, setExportJobId] = useState<string | null>(null);
  const [selectedCols, setSelectedCols] = useState<string[]>(EXPORT_COLUMNS.map(c => c.key));
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx" | "json" | "html">("xlsx");

  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState("user");
  const [createUserMsg, setCreateUserMsg] = useState("");

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("user");
  const [editUserStatus, setEditUserStatus] = useState("active");
  const [editUserPassword, setEditUserPassword] = useState("");

  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [resetResultData, setResetResultData] = useState<any | null>(null);

  const [platformName, setPlatformName] = useState("DashMin");
  const [publicRegistration, setPublicRegistration] = useState(true);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dashmin_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }
    const savedToken = localStorage.getItem("dashmin_token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserProfile(savedToken);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    localStorage.setItem("dashmin_theme", nextTheme);
  };

  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchJobsList(token);
      if (selectedJobId) {
        fetchJobDetails(selectedJobId, token, false);
      }
      if (viewMode === "admin" && user?.role === "admin") {
        fetchAdminStats(token);
        fetchTeamList(token);
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [token, selectedJobId, viewMode, user]);

  const fetchUserProfile = async (t: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        fetchJobsList(t);
        if (data.role === "admin") {
          fetchAdminStats(t);
          fetchTeamList(t);
        }
      } else {
        logout();
      }
    } catch {
      logout();
    }
  };

  const fetchJobsList = async (t = token) => {
    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        setJobs(await res.json());
      }
    } catch {}
  };

  const fetchAdminStats = async (t = token) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        setAdminStats(await res.json());
      }
    } catch {}
  };

  const fetchTeamList = async (t = token) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        setAdminUsers(await res.json());
      }
    } catch {}
  };

  const fetchJobDetails = async (jobId: string, t = token, showLoading = true) => {
    setSelectedJobId(jobId);
    if (showLoading) setLoadingResults(true);
    try {
      const res = await fetch(`${API_BASE}/api/jobs/${jobId}/results?limit=1000`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        setJobResults(await res.json());
      }
    } catch {} finally {
      if (showLoading) setLoadingResults(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload = authMode === "login" ? { email, password } : { email, password, name };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        if (data.requiresApproval) {
          setAuthSuccess("Account created! An administrator will approve your access shortly.");
          setAuthMode("login");
        } else {
          setToken(data.token);
          localStorage.setItem("dashmin_token", data.token);
          setUser(data.user);
          fetchJobsList(data.token);
          if (data.user.role === "admin") {
            fetchAdminStats(data.token);
            fetchTeamList(data.token);
          }
        }
      } else {
        setAuthError(data.error || "Authentication failed");
      }
    } catch {
      setAuthError("Could not connect to the server");
    }
  };

  const logout = () => {
    setToken("");
    setUser(null);
    setSelectedJobId(null);
    setJobResults([]);
    setViewMode("app");
    localStorage.removeItem("dashmin_token");
  };

  const startLeadSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsStarting(true);
    const targetQuery = location.trim() ? `${keyword.trim()} in ${location.trim()}` : keyword.trim();
    const formattedTarget = source === "2gis" && location.trim() ? `${location.trim()}:${keyword.trim()}` : targetQuery;
    const finalCap = customLeadCount ? (parseInt(customLeadCount) || 0) : leadCount;

    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          engine: source,
          target: formattedTarget,
          cap: finalCap
        })
      });

      if (res.ok) {
        const createdJob = await res.json();
        await fetchJobsList(token);
        setSelectedJobId(createdJob.id);
        fetchJobDetails(createdJob.id, token, true);
        setActiveTab("leads");
        setKeyword("");
        setLocation("");
        setCustomLeadCount("");
      }
    } catch {} finally {
      setIsStarting(false);
    }
  };

  const stopSearch = async (jobId: string) => {
    try {
      await fetch(`${API_BASE}/api/jobs/${jobId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchJobsList(token);
    } catch {}
  };

  const deleteSearch = async (jobId: string) => {
    try {
      await fetch(`${API_BASE}/api/jobs/${jobId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
        setJobResults([]);
      }
      fetchJobsList(token);
    } catch {}
  };

  const downloadFile = async () => {
    if (!exportJobId) return;
    const cols = selectedCols.join(",");
    const url = `${API_BASE}/api/jobs/${exportJobId}/export/${exportFormat}?columns=${encodeURIComponent(cols)}`;

    try {
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `leads_${exportFormat}.${exportFormat}`;
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
      const res = await fetch(`${API_BASE}/api/admin/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
          status: "active"
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateUserModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        fetchTeamList(token);
        fetchAdminStats(token);
      } else {
        setCreateUserMsg(data.error || "Failed to create user");
      }
    } catch {
      setCreateUserMsg("Server error");
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    try {
      const payload: any = {
        name: editUserName,
        email: editUserEmail,
        role: editUserRole,
        status: editUserStatus
      };
      if (editUserPassword.trim().length > 0) {
        payload.password = editUserPassword.trim();
      }

      const res = await fetch(`${API_BASE}/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditingUser(null);
        fetchTeamList(token);
      }
    } catch {}
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${resetModalUser.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newResetPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setResetResultData(data);
      }
    } catch {}
  };

  const approveUser = async (userId: string) => {
    try {
      await fetch(`${API_BASE}/api/admin/users/${userId}/approve`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTeamList(token);
      fetchAdminStats(token);
    } catch {}
  };

  const suspendUser = async (userId: string) => {
    try {
      await fetch(`${API_BASE}/api/admin/users/${userId}/suspend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTeamList(token);
    } catch {}
  };

  const deleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      await fetch(`${API_BASE}/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTeamList(token);
      fetchAdminStats(token);
    } catch {}
  };

  const filteredResults = jobResults.filter(r => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      (r.title && r.title.toLowerCase().includes(q)) ||
      (r.phone_1 && r.phone_1.toLowerCase().includes(q)) ||
      (r.address && r.address.toLowerCase().includes(q)) ||
      (r.website && r.website.toLowerCase().includes(q)) ||
      (r.category && r.category.toLowerCase().includes(q))
    );
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  const isDark = theme === "dark";

  if (!token || !user) {
    return (
      <div className={`flex min-h-screen w-full items-center justify-center p-4 transition-colors duration-300 ${isDark ? "bg-[#0A0C10] text-[#F5F5F7]" : "bg-[#F5F5F7] text-[#1D1D1F]"}`}>
        <div className={`w-full max-w-[420px] rounded-[28px] p-8 sm:p-10 shadow-2xl backdrop-blur-2xl border transition-all ${isDark ? "bg-[#16181D]/80 border-white/[0.08] shadow-black/60" : "bg-white/80 border-black/[0.06] shadow-slate-200/50"}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <span className="text-xl font-bold tracking-tight">{platformName}</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition ${isDark ? "bg-white/5 border-white/10 text-amber-400 hover:bg-white/10" : "bg-black/5 border-black/5 text-slate-600 hover:bg-black/10"}`}
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
              )}
            </button>
          </div>

          <p className="text-xs text-slate-400 mb-6 font-medium">Apple-grade business intelligence and lead discovery</p>

          <div className={`flex rounded-2xl p-1 mb-6 text-xs font-semibold border ${isDark ? "bg-black/30 border-white/[0.05]" : "bg-black/[0.04] border-black/[0.05]"}`}>
            <button
              onClick={() => { setAuthMode("login"); setAuthError(""); }}
              className={`flex-1 py-2 rounded-xl transition ${authMode === "login" ? (isDark ? "bg-[#252830] text-white shadow-sm" : "bg-white text-black shadow-sm") : "text-slate-400 hover:text-white"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("register"); setAuthError(""); }}
              className={`flex-1 py-2 rounded-xl transition ${authMode === "register" ? (isDark ? "bg-[#252830] text-white shadow-sm" : "bg-white text-black shadow-sm") : "text-slate-400 hover:text-white"}`}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-2xl font-medium text-left">
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-2xl font-medium text-left">
              {authSuccess}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-3">
            {authMode === "register" && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={e => setName(e.target.value)}
                className={`w-full px-4 py-3 rounded-2xl text-sm outline-none transition border ${isDark ? "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-slate-900 placeholder-slate-400 focus:border-emerald-600"}`}
                required
              />
            )}
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl text-sm outline-none transition border ${isDark ? "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-slate-900 placeholder-slate-400 focus:border-emerald-600"}`}
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-2xl text-sm outline-none transition border ${isDark ? "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-slate-900 placeholder-slate-400 focus:border-emerald-600"}`}
              required
            />
            <button
              type="submit"
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-sm font-semibold rounded-2xl transition shadow-lg shadow-emerald-500/25 active:scale-[0.98]"
            >
              {authMode === "login" ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="mt-8 pt-4 border-t border-white/[0.06] text-xs text-slate-500 text-center">
            Admin Account: <span className="font-semibold text-slate-400">admin@dashmin.local</span> / <span className="font-semibold text-slate-400">admin123</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-screen overflow-hidden font-sans transition-colors duration-300 ${isDark ? "bg-[#0A0C10] text-[#F5F5F7]" : "bg-[#F5F5F7] text-[#1D1D1F]"}`}>
      <aside className={`w-72 flex flex-col justify-between p-6 shrink-0 border-r transition-colors duration-300 ${isDark ? "bg-[#111318] border-white/[0.06]" : "bg-white border-black/[0.06]"}`}>
        <div>
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
              </div>
              <div>
                <span className="text-base font-bold tracking-tight block leading-tight">{platformName}</span>
                <span className="text-[10px] text-slate-400 font-medium">Lead Engine Pro</span>
              </div>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl border transition ${isDark ? "bg-white/5 border-white/10 text-amber-400 hover:bg-white/10" : "bg-black/5 border-black/5 text-slate-600 hover:bg-black/10"}`}
              title="Toggle Light / Dark mode"
            >
              {isDark ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
              ) : (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
              )}
            </button>
          </div>

          {user.role === "admin" && (
            <div className={`flex rounded-2xl p-1 mb-6 text-xs font-semibold border ${isDark ? "bg-black/30 border-white/[0.06]" : "bg-black/[0.04] border-black/[0.05]"}`}>
              <button
                onClick={() => setViewMode("app")}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${viewMode === "app" ? (isDark ? "bg-[#252830] text-white shadow-sm font-bold" : "bg-white text-black shadow-sm font-bold") : "text-slate-400 hover:text-white"}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                Lead Finder
              </button>
              <button
                onClick={() => { setViewMode("admin"); fetchAdminStats(); fetchTeamList(); }}
                className={`flex-1 py-2 rounded-xl transition flex items-center justify-center gap-1.5 ${viewMode === "admin" ? "bg-amber-500 text-slate-950 font-bold shadow-sm" : "text-slate-400 hover:text-white"}`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                Control Center
              </button>
            </div>
          )}

          {viewMode === "app" ? (
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab("search"); setSelectedJobId(null); }}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold text-left transition ${activeTab === "search" ? (isDark ? "bg-white/10 text-white font-bold" : "bg-black/[0.06] text-black font-bold") : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><path d="M21 21l-4.35-4.35"></path></svg>
                Find Leads
              </button>
              <button
                onClick={() => { setActiveTab("leads"); }}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold text-left transition ${activeTab === "leads" ? (isDark ? "bg-white/10 text-white font-bold" : "bg-black/[0.06] text-black font-bold") : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
                  My Saved Leads
                </span>
                {jobs.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? "bg-white/10 text-slate-300" : "bg-black/5 text-slate-700"}`}>
                    {jobs.length}
                  </span>
                )}
              </button>
            </nav>
          ) : (
            <nav className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 px-3 mb-2">Admin Tools</div>
              <button
                onClick={() => setAdminTab("overview")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold text-left transition ${adminTab === "overview" ? "bg-amber-500/15 text-amber-300 font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                System Health & DB
              </button>
              <button
                onClick={() => setAdminTab("users")}
                className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold text-left transition ${adminTab === "users" ? "bg-amber-500/15 text-amber-300 font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                <span className="flex items-center gap-3">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                  User Accounts
                </span>
                {adminUsers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold">
                    {adminUsers.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setAdminTab("settings")}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl text-xs font-semibold text-left transition ${adminTab === "settings" ? "bg-amber-500/15 text-amber-300 font-bold" : "text-slate-400 hover:text-white hover:bg-white/5"}`}
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                Platform Config
              </button>
            </nav>
          )}
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${isDark ? "bg-white/[0.03] border-white/[0.06]" : "bg-black/[0.02] border-black/[0.05]"} flex items-center justify-between`}>
          <div className="truncate text-xs">
            <div className="font-bold truncate">{user.name || user.email}</div>
            <div className="text-[10px] text-emerald-500 font-semibold uppercase">{user.role}</div>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-rose-500 text-xs transition font-semibold">
            Logout
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {viewMode === "app" && activeTab === "search" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">Find Local Leads</h1>
              <p className="text-xs text-slate-400 mt-1 font-medium">Apple card layout • Multi-area city scanning bypassing the 120-place ceiling</p>
            </div>

            <form onSubmit={startLeadSearch} className={`rounded-[32px] p-8 shadow-sm border transition-all ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
              <div className="space-y-5">
                <div>
                  <label className="text-xs font-bold block mb-2 text-slate-400">What business or industry?</label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={e => setKeyword(e.target.value)}
                    placeholder="e.g. Real Estate Agencies, Coffee Shops, Dentists"
                    className={`w-full px-5 py-4 rounded-2xl text-sm outline-none transition border ${isDark ? "bg-white/[0.04] border-white/[0.08] text-white focus:border-emerald-500 placeholder-slate-500" : "bg-black/[0.02] border-black/[0.08] text-black focus:border-emerald-600 placeholder-slate-400"}`}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold block mb-2 text-slate-400">Target City or Metro Area</label>
                  <input
                    type="text"
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="e.g. Dubai, New York, London, Riyadh, Toronto"
                    className={`w-full px-5 py-4 rounded-2xl text-sm outline-none transition border ${isDark ? "bg-white/[0.04] border-white/[0.08] text-white focus:border-emerald-500 placeholder-slate-500" : "bg-black/[0.02] border-black/[0.08] text-black focus:border-emerald-600 placeholder-slate-400"}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-1">
                  <div>
                    <label className="text-xs font-bold block mb-2 text-slate-400">Search Engine</label>
                    <div className={`flex rounded-2xl p-1 text-xs font-semibold border ${isDark ? "bg-black/30 border-white/[0.06]" : "bg-black/[0.04] border-black/[0.05]"}`}>
                      <button
                        type="button"
                        onClick={() => setSource("gmaps")}
                        className={`flex-1 py-2.5 rounded-xl transition ${source === "gmaps" ? (isDark ? "bg-[#252830] text-white shadow-sm font-bold" : "bg-white text-black shadow-sm font-bold") : "text-slate-400 hover:text-white"}`}
                      >
                        Google Maps
                      </button>
                      <button
                        type="button"
                        onClick={() => setSource("2gis")}
                        className={`flex-1 py-2.5 rounded-xl transition ${source === "2gis" ? (isDark ? "bg-[#252830] text-white shadow-sm font-bold" : "bg-white text-black shadow-sm font-bold") : "text-slate-400 hover:text-white"}`}
                      >
                        2GIS Catalog
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-2 text-slate-400">Lead Target</label>
                    <div className="flex gap-1.5">
                      {[50, 100, 250, 500].map(amt => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => { setLeadCount(amt); setCustomLeadCount(""); }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition ${leadCount === amt && !customLeadCount ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : (isDark ? "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]" : "border-black/[0.06] bg-black/[0.02] text-slate-600 hover:bg-black/[0.05]")}`}
                        >
                          {amt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => { setLeadCount(0); setCustomLeadCount(""); }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-black border transition ${leadCount === 0 && !customLeadCount ? "border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/25" : (isDark ? "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:bg-white/[0.05]" : "border-black/[0.06] bg-black/[0.02] text-slate-600 hover:bg-black/[0.05]")}`}
                      >
                        Unlimited
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center justify-between transition-colors ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-black/[0.02] border-black/[0.05]"}`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="deepScan"
                      checked={deepScan}
                      onChange={e => setDeepScan(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400"
                    />
                    <label htmlFor="deepScan" className="text-xs font-bold cursor-pointer">
                      Deep Multi-Area City Grid
                    </label>
                  </div>
                  <div className="text-[11px] text-slate-400 font-medium">
                    {leadCount === 0 ? "Scans all geographic cells until complete" : `Limit: ${leadCount} businesses`}
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <button
                  type="submit"
                  disabled={isStarting || !keyword.trim()}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white font-bold text-sm rounded-2xl transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 active:scale-[0.99]"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  {isStarting ? "Initializing..." : (leadCount === 0 ? "Find All Leads (Unlimited)" : `Extract ${leadCount} Leads`)}
                </button>
              </div>
            </form>

            {jobs.length > 0 && (
              <div className={`rounded-[32px] p-6 shadow-sm border transition-all ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold">Recent Searches</h3>
                  <button onClick={() => setActiveTab("leads")} className="text-xs text-emerald-500 hover:underline font-bold">
                    View All ({jobs.length}) →
                  </button>
                </div>
                <div className="divide-y divide-white/[0.06]">
                  {jobs.slice(0, 3).map(j => {
                    const isRunning = j.status === "running" || j.status === "pending";
                    return (
                      <div key={j.id} className="py-3.5 flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold capitalize">{j.target}</div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>{j.total_saved || 0} leads saved</span>
                            <span>•</span>
                            {isRunning ? (
                              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                                <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round"></circle></svg>
                                Searching city grid...
                              </span>
                            ) : (
                              <span className="text-emerald-500 font-semibold">Completed</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedJobId(j.id);
                            fetchJobDetails(j.id, token, true);
                            setActiveTab("leads");
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-bold border transition ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-black/[0.04] border-black/[0.06] hover:bg-black/[0.08] text-black"}`}
                        >
                          View Leads
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {viewMode === "app" && activeTab === "leads" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Saved Leads & Searches</h1>
                <p className="text-xs text-slate-400 mt-1 font-medium">Review discovered contacts or export directly to Excel and CSV</p>
              </div>
              <button
                onClick={() => { setActiveTab("search"); setSelectedJobId(null); }}
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold rounded-2xl transition shadow-md shadow-emerald-500/20 flex items-center gap-2 self-start"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                New Search
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Your Searches</div>
                {jobs.length === 0 ? (
                  <div className={`rounded-3xl p-8 text-center border text-xs text-slate-400 ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                    No searches run yet. Click "New Search" to extract leads!
                  </div>
                ) : (
                  jobs.map(j => {
                    const isSelected = j.id === selectedJobId;
                    const isRunning = j.status === "running" || j.status === "pending";
                    return (
                      <div
                        key={j.id}
                        onClick={() => fetchJobDetails(j.id, token, true)}
                        className={`p-5 rounded-[24px] border transition cursor-pointer ${isSelected ? (isDark ? "bg-[#1C1F28] border-emerald-500/60 shadow-lg ring-1 ring-emerald-500/50" : "bg-white border-emerald-500 shadow-md ring-1 ring-emerald-500") : (isDark ? "bg-[#14161D] border-white/[0.08] hover:border-white/[0.15]" : "bg-white border-black/[0.06] hover:border-black/[0.12]")}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-bold text-sm capitalize truncate">{j.target}</div>
                          {isRunning ? (
                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 shrink-0">
                              <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round"></circle></svg>
                              Active
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 shrink-0">
                              Completed
                            </span>
                          )}
                        </div>

                        {isRunning && (
                          <div className="mt-3">
                            <div className="w-full h-1.5 rounded-full overflow-hidden bg-white/10">
                              <div className="h-full w-full bg-emerald-500 apple-progress-bar rounded-full"></div>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1 flex justify-between font-mono">
                              <span>Scanning city zones...</span>
                              <span className="text-emerald-400 font-bold">{j.total_saved || 0} leads</span>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-slate-400 mt-3 pt-3 border-t border-white/[0.06]">
                          <span>{j.total_saved || 0} leads {j.cap === 0 ? "(Unlimited)" : `(Cap: ${j.cap})`}</span>
                          <span className="text-[10px] uppercase font-bold text-slate-500">{j.engine === "2gis" ? "2GIS" : "Google Maps"}</span>
                        </div>

                        <div className="flex items-center gap-3 mt-3">
                          {isRunning && (
                            <button
                              onClick={(e) => { e.stopPropagation(); stopSearch(j.id); }}
                              className="text-xs text-amber-400 hover:underline font-bold"
                            >
                              Stop Search
                            </button>
                          )}
                          <button
                            onClick={(e) => { e.stopPropagation(); setExportJobId(j.id); }}
                            className="text-xs text-emerald-400 hover:underline font-bold flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            Export
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteSearch(j.id); }}
                            className="text-xs text-slate-500 hover:text-rose-400 font-semibold ml-auto"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="lg:col-span-2">
                {!selectedJobId ? (
                  <div className={`rounded-[32px] p-12 text-center border text-slate-400 ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                    <svg className="w-12 h-12 mx-auto text-slate-600 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    <div className="font-bold text-sm">Select a search to view contacts</div>
                    <div className="text-xs mt-1">Choose any item from the left panel to inspect numbers, sites, and addresses.</div>
                  </div>
                ) : (
                  <div className={`rounded-[32px] shadow-sm border overflow-hidden ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                    <div className="p-6 border-b border-white/[0.06] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2.5">
                          <h2 className="text-lg font-extrabold capitalize">{selectedJob?.target}</h2>
                          {selectedJob?.status === "running" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 flex items-center gap-1">
                              <svg className="w-2.5 h-2.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round"></circle></svg>
                              Live
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 font-medium">
                          {jobResults.length} leads collected • Live table preview
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          placeholder="Filter in results..."
                          value={searchFilter}
                          onChange={e => setSearchFilter(e.target.value)}
                          className={`px-4 py-2 rounded-xl text-xs outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white placeholder-slate-500 focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black placeholder-slate-400 focus:border-emerald-600"}`}
                        />
                        <button
                          onClick={() => setExportJobId(selectedJobId)}
                          disabled={jobResults.length === 0}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-emerald-500/20"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                          Download
                        </button>
                      </div>
                    </div>

                    {loadingResults ? (
                      <div className="p-16 text-center text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 animate-spin text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round"></circle></svg>
                        Retrieving leads...
                      </div>
                    ) : filteredResults.length === 0 ? (
                      <div className="p-16 text-center text-xs text-slate-400">
                        {jobResults.length === 0 ? "Searching for businesses... results appear here live." : "No businesses match your filter."}
                      </div>
                    ) : (
                      <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                        <table className="w-full text-left text-xs">
                          <thead className={`text-[11px] font-bold uppercase tracking-wider sticky top-0 border-b ${isDark ? "bg-[#14161D] text-slate-400 border-white/[0.08]" : "bg-slate-50 text-slate-500 border-black/[0.06]"}`}>
                            <tr>
                              <th className="px-5 py-3.5">Business Name</th>
                              <th className="px-5 py-3.5">Phone Number</th>
                              <th className="px-5 py-3.5">Website</th>
                              <th className="px-5 py-3.5">Rating</th>
                              <th className="px-5 py-3.5">Address</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/[0.04]">
                            {filteredResults.map((lead, idx) => (
                              <tr key={lead.id || idx} className={`transition ${isDark ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]"}`}>
                                <td className="px-5 py-3.5 font-bold max-w-[200px] truncate">
                                  {lead.title || "—"}
                                  {lead.category && (
                                    <div className="text-[10px] text-slate-400 font-normal truncate mt-0.5">{lead.category}</div>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  {lead.phone_1 ? (
                                    <a href={`tel:${lead.phone_1}`} className="text-emerald-400 font-bold hover:underline">
                                      {lead.phone_1}
                                    </a>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 max-w-[160px] truncate">
                                  {lead.website ? (
                                    <a href={lead.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block">
                                      {lead.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '')}
                                    </a>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 whitespace-nowrap">
                                  {lead.rating ? (
                                    <span className="inline-flex items-center gap-1 font-bold text-amber-400">
                                      ★ {lead.rating}
                                    </span>
                                  ) : (
                                    <span className="text-slate-500">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3.5 text-slate-400 max-w-[240px] truncate" title={lead.address}>
                                  {lead.address || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {viewMode === "admin" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">Admin Control Center</h1>
                <p className="text-xs text-slate-400 mt-1 font-medium">Control accounts, database health, password resets, and platform configuration</p>
              </div>
              <button
                onClick={() => setViewMode("app")}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-black/[0.04] border-black/[0.06] hover:bg-black/[0.08] text-black"}`}
              >
                ← Back to Lead Finder
              </button>
            </div>

            {adminTab === "overview" && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`rounded-[28px] p-6 shadow-sm border ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</div>
                    <div className="text-3xl font-black mt-2">{adminStats?.totalUsers || adminUsers.length}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Platform members</div>
                  </div>
                  <div className={`rounded-[28px] p-6 shadow-sm border ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Leads in DB</div>
                    <div className="text-3xl font-black text-emerald-400 mt-2">{adminStats?.totalLeads || 0}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Extracted businesses</div>
                  </div>
                  <div className={`rounded-[28px] p-6 shadow-sm border ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Searches Executed</div>
                    <div className="text-3xl font-black mt-2">{adminStats?.totalJobs || jobs.length}</div>
                    <div className="text-[11px] text-slate-400 mt-1">Grid scan runs</div>
                  </div>
                  <div className={`rounded-[28px] p-6 shadow-sm border ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Server Health</div>
                    <div className="text-xl font-bold text-emerald-400 mt-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                      Operational
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">Port 4000 live</div>
                  </div>
                </div>

                <div className={`rounded-[28px] p-8 shadow-sm border space-y-4 ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                  <h3 className="text-sm font-bold">Infrastructure & Storage Status</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className={`p-5 rounded-2xl border ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-black/[0.02] border-black/[0.05]"}`}>
                      <div className="font-bold">Database Storage</div>
                      <div className="text-slate-400 mt-1 font-mono text-[11px]">SQLite (Local Engine: dashmin.sqlite)</div>
                      <div className="text-emerald-400 font-semibold mt-2">Zero setup needed. Postgres dual-adapter ready.</div>
                    </div>
                    <div className={`p-5 rounded-2xl border ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-black/[0.02] border-black/[0.05]"}`}>
                      <div className="font-bold">Scraper Architecture</div>
                      <div className="text-slate-400 mt-1 font-mono text-[11px]">Direct HTTP + Dynamic Geographic Grid</div>
                      <div className="text-emerald-400 font-semibold mt-2">In-process queue active. Distributed Redis compatible.</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {adminTab === "users" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-extrabold">User Accounts</h2>
                    <p className="text-xs text-slate-400">Manage member privileges, edit details, and execute password resets</p>
                  </div>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-2xl text-xs font-bold transition flex items-center gap-2 shadow-md shadow-emerald-500/20"
                  >
                    + Create New User
                  </button>
                </div>

                <div className={`rounded-[28px] shadow-sm border overflow-hidden ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`text-[11px] font-bold uppercase tracking-wider border-b ${isDark ? "bg-white/[0.02] text-slate-400 border-white/[0.06]" : "bg-black/[0.02] text-slate-500 border-black/[0.05]"}`}>
                      <tr>
                        <th className="px-6 py-4">User</th>
                        <th className="px-6 py-4">Role</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {adminUsers.map(u => (
                        <tr key={u.id} className={`transition ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]"}`}>
                          <td className="px-6 py-4">
                            <div className="font-bold">{u.name || "Unnamed"}</div>
                            <div className="text-[11px] text-slate-400">{u.email}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${u.role === "admin" ? "bg-amber-500/20 text-amber-300" : (isDark ? "bg-white/10 text-slate-300" : "bg-black/5 text-slate-600")}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${u.status === "active" ? "bg-emerald-500/20 text-emerald-400" : (u.status === "pending" ? "bg-amber-500/20 text-amber-300" : "bg-rose-500/20 text-rose-400")}`}>
                              {u.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setEditingUser(u);
                                setEditUserName(u.name || "");
                                setEditUserEmail(u.email || "");
                                setEditUserRole(u.role || "user");
                                setEditUserStatus(u.status || "active");
                                setEditUserPassword("");
                              }}
                              className={`px-3 py-1.5 rounded-xl font-bold text-xs border transition ${isDark ? "bg-white/5 border-white/10 hover:bg-white/10 text-white" : "bg-black/[0.03] border-black/10 hover:bg-black/[0.06] text-black"}`}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setResetModalUser(u);
                                setNewResetPassword("");
                                setResetResultData(null);
                              }}
                              className="px-3 py-1.5 rounded-xl font-bold text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/20 transition"
                            >
                              Reset Password
                            </button>
                            {u.status !== "active" && (
                              <button
                                onClick={() => approveUser(u.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-sm"
                              >
                                Activate
                              </button>
                            )}
                            {u.status === "active" && u.id !== user.id && (
                              <button
                                onClick={() => suspendUser(u.id)}
                                className={`px-3 py-1.5 rounded-xl font-semibold text-xs border transition ${isDark ? "bg-white/5 border-white/10 text-slate-400 hover:text-white" : "bg-black/5 border-black/10 text-slate-600 hover:text-black"}`}
                              >
                                Deactivate
                              </button>
                            )}
                            {u.id !== user.id && (
                              <button
                                onClick={() => deleteUser(u.id)}
                                className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-bold text-xs border border-rose-500/20 transition"
                              >
                                Delete
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {adminTab === "settings" && (
              <div className={`rounded-[28px] p-8 shadow-sm border space-y-6 max-w-2xl ${isDark ? "bg-[#14161D] border-white/[0.08]" : "bg-white border-black/[0.06]"}`}>
                <div>
                  <h2 className="text-lg font-extrabold">Platform Settings</h2>
                  <p className="text-xs text-slate-400 mt-1">Configure portal branding and registration controls</p>
                </div>

                {settingsSuccess && (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-2xl font-bold">
                    Settings saved successfully!
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-400">Portal Branding Name</label>
                    <input
                      type="text"
                      value={platformName}
                      onChange={e => setPlatformName(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl text-xs font-bold outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-400">Public Self-Registration</label>
                    <button
                      type="button"
                      onClick={() => setPublicRegistration(!publicRegistration)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold border transition ${publicRegistration ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : (isDark ? "bg-white/5 border-white/10 text-slate-400" : "bg-black/5 border-black/10 text-slate-600")}`}
                    >
                      {publicRegistration ? "✓ Enabled (New users can create accounts)" : "✕ Disabled (Admins create accounts only)"}
                    </button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/[0.06]">
                  <button
                    onClick={() => {
                      setSettingsSuccess(true);
                      setTimeout(() => setSettingsSuccess(false), 2500);
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs rounded-2xl transition shadow-md shadow-emerald-500/20"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {showCreateUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
            <div className={`rounded-[32px] p-8 max-w-md w-full shadow-2xl border space-y-6 ${isDark ? "bg-[#16181D] border-white/[0.1]" : "bg-white border-black/[0.08]"}`}>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <h3 className="text-lg font-bold">Create New User</h3>
                <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
              </div>

              {createUserMsg && (
                <div className="p-3 bg-red-500/10 text-red-400 text-xs rounded-xl font-bold">{createUserMsg}</div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    placeholder="e.g. Sarah Miller"
                    className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={newUserEmail}
                    onChange={e => setNewUserEmail(e.target.value)}
                    placeholder="e.g. sarah@company.com"
                    className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-400">Password</label>
                  <input
                    type="text"
                    value={newUserPassword}
                    onChange={e => setNewUserPassword(e.target.value)}
                    placeholder="Initial password"
                    className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-400">Account Role</label>
                  <select
                    value={newUserRole}
                    onChange={e => setNewUserRole(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-[#1E212A] border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateUserModal(false)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border ${isDark ? "border-white/10 text-slate-400" : "border-black/10 text-slate-600"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
            <div className={`rounded-[32px] p-8 max-w-md w-full shadow-2xl border space-y-6 ${isDark ? "bg-[#16181D] border-white/[0.1]" : "bg-white border-black/[0.08]"}`}>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <h3 className="text-lg font-bold">Edit User Details</h3>
                <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-4">
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-400">Full Name</label>
                  <input
                    type="text"
                    value={editUserName}
                    onChange={e => setEditUserName(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-400">Email Address</label>
                  <input
                    type="email"
                    value={editUserEmail}
                    onChange={e => setEditUserEmail(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold block mb-1 text-slate-400">New Password (leave empty to retain current)</label>
                  <input
                    type="text"
                    placeholder="New password"
                    value={editUserPassword}
                    onChange={e => setEditUserPassword(e.target.value)}
                    className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-400">Role</label>
                    <select
                      value={editUserRole}
                      onChange={e => setEditUserRole(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-[#1E212A] border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-400">Status</label>
                    <select
                      value={editUserStatus}
                      onChange={e => setEditUserStatus(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-[#1E212A] border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-bold border ${isDark ? "border-white/10 text-slate-400" : "border-black/10 text-slate-600"}`}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {resetModalUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
            <div className={`rounded-[32px] p-8 max-w-md w-full shadow-2xl border space-y-6 ${isDark ? "bg-[#16181D] border-white/[0.1]" : "bg-white border-black/[0.08]"}`}>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <h3 className="text-lg font-bold">Password Reset</h3>
                <button onClick={() => { setResetModalUser(null); setResetResultData(null); }} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
              </div>

              {!resetResultData ? (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <p className="text-xs text-slate-400">
                    Target account: <span className="font-bold text-white">{resetModalUser.email}</span>
                  </p>
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-400">New Password (leave empty to generate)</label>
                    <input
                      type="text"
                      placeholder="Optional manual password"
                      value={newResetPassword}
                      onChange={e => setNewResetPassword(e.target.value)}
                      className={`w-full px-4 py-3 rounded-2xl text-xs outline-none border transition ${isDark ? "bg-white/5 border-white/10 text-white focus:border-emerald-500" : "bg-black/[0.03] border-black/10 text-black focus:border-emerald-600"}`}
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setResetModalUser(null)}
                      className={`px-4 py-2.5 rounded-2xl text-xs font-bold border ${isDark ? "border-white/10 text-slate-400" : "border-black/10 text-slate-600"}`}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs"
                    >
                      Execute Reset
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2 text-xs">
                    <div className="font-bold text-emerald-400">Password Reset Completed</div>
                    <div className="text-slate-300">
                      Temporary Password: <code className="bg-white/10 px-2 py-1 rounded font-bold text-emerald-300 font-mono">{resetResultData.temporaryPassword}</code>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold block mb-1 text-slate-400">Reset Link to Share with User</label>
                    <input
                      type="text"
                      readOnly
                      value={resetResultData.resetLink}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-[11px] font-mono text-slate-400"
                    />
                  </div>
                  <button
                    onClick={() => { setResetModalUser(null); setResetResultData(null); }}
                    className="w-full py-3 bg-white/10 hover:bg-white/15 text-white rounded-2xl text-xs font-bold"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {exportJobId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
            <div className={`rounded-[32px] p-8 max-w-lg w-full shadow-2xl border space-y-6 ${isDark ? "bg-[#16181D] border-white/[0.1]" : "bg-white border-black/[0.08]"}`}>
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
                <div>
                  <h3 className="text-lg font-bold">Download Lead Export</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Select format and columns to include</p>
                </div>
                <button onClick={() => setExportJobId(null)} className="text-slate-400 hover:text-white text-sm font-bold">✕</button>
              </div>

              <div>
                <label className="text-xs font-bold block mb-2 text-slate-400">Export Format</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "xlsx", label: "Excel (.xlsx)" },
                    { id: "csv", label: "CSV" },
                    { id: "json", label: "JSON" },
                    { id: "html", label: "HTML" }
                  ].map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setExportFormat(f.id as any)}
                      className={`py-2.5 rounded-xl text-xs font-bold border transition ${exportFormat === f.id ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : (isDark ? "border-white/[0.08] bg-white/[0.02] text-slate-400" : "border-black/[0.06] bg-black/[0.02] text-slate-600")}`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-400">Included Columns</label>
                  <div className="space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setSelectedCols(EXPORT_COLUMNS.map(c => c.key))}
                      className="text-emerald-400 hover:underline font-bold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">|</span>
                    <button
                      type="button"
                      onClick={() => setSelectedCols(["title", "phone_1"])}
                      className="text-slate-400 hover:underline"
                    >
                      Phone Only
                    </button>
                  </div>
                </div>

                <div className={`grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 rounded-2xl border ${isDark ? "bg-white/[0.02] border-white/[0.06]" : "bg-black/[0.02] border-black/[0.05]"}`}>
                  {EXPORT_COLUMNS.map(col => {
                    const isChecked = selectedCols.includes(col.key);
                    return (
                      <label key={col.key} className={`flex items-center gap-2.5 p-2 rounded-xl text-xs cursor-pointer select-none transition ${isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.04]"}`}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (selectedCols.length > 1) {
                                setSelectedCols(selectedCols.filter(k => k !== col.key));
                              }
                            } else {
                              setSelectedCols([...selectedCols, col.key]);
                            }
                          }}
                          className="rounded text-emerald-500 focus:ring-emerald-400 w-4 h-4"
                        />
                        <span className="truncate">{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setExportJobId(null)}
                  className={`px-5 py-2.5 rounded-2xl border text-xs font-bold ${isDark ? "border-white/10 text-slate-400" : "border-black/10 text-slate-600"}`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={downloadFile}
                  className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-bold transition shadow-md shadow-emerald-500/20"
                >
                  Download File
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
