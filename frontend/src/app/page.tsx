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
  { key: "rating", label: "Rating" },
  { key: "reviews", label: "Reviews" },
  { key: "opening_hours", label: "Hours" },
  { key: "place_id", label: "Place ID" }
];

const POPULAR_CATEGORIES = [
  "Real Estate & Property",
  "Restaurants & Cafes",
  "Dental Clinics",
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
  "Event Management",
  "Travel & Tourism Agencies",
  "Nurseries & Daycares",
  "Supermarkets & Grocery",
  "Auto Repair & Garages",
  "Pharmacies & Healthcare",
  "Photography & Studios",
  "Veterinary & Pet Care",
  "Security Services",
  "Financial Advisors",
  "Coworking & Business Centers",
  "Printing & Signage",
  "Solar & MEP Contracting",
  "Recruitment & HR Agencies"
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
  },
  {
    country: "Kazakhstan",
    cities: [
      { name: "Almaty", label: "Almaty" },
      { name: "Astana", label: "Astana" },
      { name: "Shymkent", label: "Shymkent" }
    ]
  },
  {
    country: "Uzbekistan",
    cities: [
      { name: "Tashkent", label: "Tashkent" },
      { name: "Samarkand", label: "Samarkand" }
    ]
  },
  {
    country: "Kyrgyzstan",
    cities: [
      { name: "Bishkek", label: "Bishkek" },
      { name: "Osh", label: "Osh" }
    ]
  },
  {
    country: "Azerbaijan",
    cities: [
      { name: "Baku", label: "Baku" }
    ]
  },
  {
    country: "Cyprus",
    cities: [
      { name: "Limassol", label: "Limassol" },
      { name: "Nicosia", label: "Nicosia" }
    ]
  }
];

export default function Home() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isTableZoomed, setIsTableZoomed] = useState(false);
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
  } | null>(null);

  const [authMode, setAuthMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const [forgotResult, setForgotResult] = useState<any | null>(null);

  const [viewMode, setViewMode] = useState<"app" | "admin">("app");
  const [activeTab, setActiveTab] = useState<"search" | "leads" | "settings">("search");
  const [adminTab, setAdminTab] = useState<"overview" | "users" | "leads" | "settings">("overview");

  const [jobs, setJobs] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminGlobalLeads, setAdminGlobalLeads] = useState<any[]>([]);
  const [adminGlobalTotal, setAdminGlobalTotal] = useState<number>(0);
  const [adminLeadUserFilter, setAdminLeadUserFilter] = useState<string>("all");
  const [adminLeadSearch, setAdminLeadSearch] = useState<string>("");
  const [loadingAdminLeads, setLoadingAdminLeads] = useState<boolean>(false);

  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [profileName, setProfileName] = useState<string>("");
  const [profileUsername, setProfileUsername] = useState<string>("");
  const [profileAvatar, setProfileAvatar] = useState<string>("");
  const [profileCurrentPassword, setProfileCurrentPassword] = useState<string>("");
  const [profileNewPassword, setProfileNewPassword] = useState<string>("");
  const [profileConfirmPassword, setProfileConfirmPassword] = useState<string>("");
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [leadCount, setLeadCount] = useState<number>(50);
  const [customLeadCount, setCustomLeadCount] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);

  const [userProxy, setUserProxy] = useState("");
  const [proxySaveSuccess, setProxySaveSuccess] = useState(false);

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
  const [newUserCanProxy, setNewUserCanProxy] = useState(false);
  const [createUserMsg, setCreateUserMsg] = useState("");

  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserRole, setEditUserRole] = useState("user");
  const [editUserStatus, setEditUserStatus] = useState("active");
  const [editUserPassword, setEditUserPassword] = useState("");
  const [editUserCanProxy, setEditUserCanProxy] = useState(false);

  const [resetModalUser, setResetModalUser] = useState<any | null>(null);
  const [newResetPassword, setNewResetPassword] = useState("");
  const [resetResultData, setResetResultData] = useState<any | null>(null);

  const [searchMode, setSearchMode] = useState<"single" | "bulk">("single");
  const [bulkQueriesText, setBulkQueriesText] = useState("");
  const [bulkFileName, setBulkFileName] = useState("");
  const [isBulkStarting, setIsBulkStarting] = useState(false);
  const [bulkStatusMsg, setBulkStatusMsg] = useState("");
  const [parallelConcurrency, setParallelConcurrency] = useState<number>(6);

  const [platformName, setPlatformName] = useState("DashMin");
  const [publicRegistration, setPublicRegistration] = useState(true);
  const [systemProxyEnabled, setSystemProxyEnabled] = useState(false);
  const [systemProxyUrl, setSystemProxyUrl] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("dashmin_theme") as "dark" | "light" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    } else {
      setTheme("light");
    }
    const savedToken = localStorage.getItem("dashmin_token");
    if (savedToken) {
      setToken(savedToken);
      fetchUserProfile(savedToken);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isTableZoomed) {
        setIsTableZoomed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isTableZoomed]);

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
        if (data.custom_proxy) {
          setUserProxy(data.custom_proxy);
        }
        fetchJobsList(t);
        if (data.role === "admin") {
          fetchAdminStats(t);
          fetchTeamList(t);
          fetchSettings(t);
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

  const fetchSettings = async (t = token) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const s = await res.json();
        if (s.platform_name) setPlatformName(s.platform_name);
        if (s.allow_registration !== undefined) setPublicRegistration(s.allow_registration === "true");
        if (s.proxy_enabled !== undefined) setSystemProxyEnabled(s.proxy_enabled === "true");
        if (s.proxy_url) setSystemProxyUrl(s.proxy_url);
        if (s.parallel_concurrency) setParallelConcurrency(parseInt(s.parallel_concurrency) || 6);
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

    if (authMode === "forgot") {
      try {
        const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
          setForgotResult(data);
        } else {
          setAuthError(data.error || "Password reset failed");
        }
      } catch {
        setAuthError("Failed to reach server");
      }
      return;
    }

    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const payload = authMode === "login"
      ? { identifier: email, password }
      : { email, password, name, username: regUsername };

    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok) {
        if (data.requiresApproval) {
          setAuthSuccess("Account created. Please wait for admin approval.");
          setAuthMode("login");
        } else {
          setToken(data.token);
          localStorage.setItem("dashmin_token", data.token);
          setUser(data.user);
          if (data.user.name) setProfileName(data.user.name);
          if (data.user.username) setProfileUsername(data.user.username);
          if (data.user.avatar) setProfileAvatar(data.user.avatar);
          if (data.user.custom_proxy) {
            setUserProxy(data.user.custom_proxy);
          }
          fetchJobsList(data.token);
          if (data.user.role === "admin") {
            fetchAdminStats(data.token);
            fetchTeamList(data.token);
            fetchSettings(data.token);
            fetchAdminGlobalLeads(data.token);
          }
        }
      } else {
        setAuthError(data.error || "Authentication failed");
      }
    } catch {
      setAuthError("Could not connect to server");
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

  const handleSaveUserProxy = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/proxy`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ customProxy: userProxy })
      });
      if (res.ok) {
        setProxySaveSuccess(true);
        setTimeout(() => setProxySaveSuccess(false), 2000);
      }
    } catch {}
  };

  const startLeadSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsStarting(true);
    const chosenLocation = searchEngine === "2gis" ? twoGisCity : location;
    const targetQuery = chosenLocation.trim() ? `${keyword.trim()} in ${chosenLocation.trim()}` : keyword.trim();
    const finalCap = customLeadCount ? (parseInt(customLeadCount) || 0) : leadCount;

    try {
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          engine: searchEngine,
          target: targetQuery,
          cap: finalCap,
          proxy: userProxy.trim()
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const lines = content
        .split(/\r?\n/)
        .map(l => l.trim().replace(/^["']|["']$/g, '').trim())
        .filter(l => l.length > 0 && !l.startsWith('#'));
      setBulkQueriesText(lines.join("\n"));
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
    const finalCap = customLeadCount ? (parseInt(customLeadCount) || 0) : leadCount;

    try {
      const res = await fetch(`${API_BASE}/api/jobs/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          engine: searchEngine,
          queries,
          cap: finalCap,
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
    } catch {
      setBulkStatusMsg("Network error starting bulk searches");
    } finally {
      setIsBulkStarting(false);
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

  const fetchAdminGlobalLeads = async (t = token, uFilter = adminLeadUserFilter, q = adminLeadSearch) => {
    setLoadingAdminLeads(true);
    try {
      let url = `${API_BASE}/api/admin/leads?limit=500&userId=${encodeURIComponent(uFilter)}`;
      if (q.trim()) url += `&search=${encodeURIComponent(q.trim())}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${t}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminGlobalLeads(data.leads || []);
        setAdminGlobalTotal(data.total || 0);
      }
    } catch {} finally {
      setLoadingAdminLeads(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg(null);
    if (profileNewPassword && profileNewPassword !== profileConfirmPassword) {
      setProfileMsg({ type: "error", text: "New passwords do not match" });
      return;
    }
    if (profileNewPassword && !profileCurrentPassword) {
      setProfileMsg({ type: "error", text: "Current password is required to set a new password" });
      return;
    }

    setProfileLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name: profileName,
          username: profileUsername,
          avatar: profileAvatar,
          currentPassword: profileCurrentPassword || undefined,
          newPassword: profileNewPassword || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        setProfileCurrentPassword("");
        setProfileNewPassword("");
        setProfileConfirmPassword("");
        setProfileMsg({ type: "success", text: "Profile updated successfully" });
      } else {
        setProfileMsg({ type: "error", text: data.error || "Failed to update profile" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Server communication error" });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleProfileForgotPassword = async () => {
    if (!user?.email) return;
    setProfileMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      const data = await res.json();
      if (res.ok) {
        setProfileMsg({
          type: "success",
          text: `Reset instructions generated. Temporary pass: ${data.temporaryPassword || "Check link"}`
        });
      } else {
        setProfileMsg({ type: "error", text: data.error || "Failed to send reset email" });
      }
    } catch {
      setProfileMsg({ type: "error", text: "Error contacting server" });
    }
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
          status: "active",
          can_use_proxy: newUserCanProxy ? 1 : 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        setShowCreateUserModal(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserCanProxy(false);
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
        status: editUserStatus,
        can_use_proxy: editUserCanProxy ? 1 : 0
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

  const handleToggleUserProxy = async (userId: string) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/toggle-proxy`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminUsers(prev => prev.map(u => u.id === userId ? { ...u, can_use_proxy: data.can_use_proxy } : u));
        if (user && user.id === userId) {
          setUser(prev => prev ? { ...prev, can_use_proxy: data.can_use_proxy } : null);
        }
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

  const handleSaveSettings = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          platform_name: platformName,
          allow_registration: String(publicRegistration),
          proxy_enabled: String(systemProxyEnabled),
          proxy_url: systemProxyUrl,
          parallel_concurrency: String(parallelConcurrency)
        })
      });
      if (res.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 2000);
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
    if (!confirm("Are you sure you want to delete this user?")) return;
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
  const userCanProxy = user?.role === "admin" || user?.can_use_proxy === 1;

  if (!token || !user) {
    return (
      <div className={`relative flex min-h-screen w-full items-center justify-center p-4 transition-colors duration-300 ${isDark ? "bg-[#09090C] text-white" : "bg-[#F9FAFB] text-black"}`}>
        <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-green-500/10 blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-green-500/10 blur-[100px] pointer-events-none"></div>

        <div className={`w-full max-w-[400px] rounded-3xl p-8 transition-all duration-300 ${isDark ? "glass-surface-dark text-white" : "glass-surface-light text-black shadow-lg"}`}>
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-green-600/25">
                D
              </div>
              <span className="text-lg font-bold tracking-tight">{platformName}</span>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl text-xs font-semibold btn-spring ${isDark ? "glass-icon-dark text-zinc-300 hover:text-white" : "glass-icon-light text-zinc-700 hover:text-black"}`}
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>

          <div className={`flex rounded-xl p-1 mb-6 text-xs font-semibold ${isDark ? "bg-black/40 border border-white/5" : "bg-black/[0.04] border border-black/5"}`}>
            <button
              onClick={() => { setAuthMode("login"); setAuthError(""); setForgotResult(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all duration-200 ${authMode === "login" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-white text-black font-bold shadow-sm") : "text-zinc-500"}`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthMode("register"); setAuthError(""); setForgotResult(null); }}
              className={`flex-1 py-1.5 rounded-lg transition-all duration-200 ${authMode === "register" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-white text-black font-bold shadow-sm") : "text-zinc-500"}`}
            >
              Register
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3 rounded-xl text-xs font-semibold border border-red-500/20 bg-red-500/10 text-red-500">
              {authError}
            </div>
          )}
          {authSuccess && (
            <div className="mb-4 p-3 rounded-xl text-xs font-semibold border border-green-500/20 bg-green-500/10 text-green-500">
              {authSuccess}
            </div>
          )}

          {authMode === "forgot" ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-bold">Reset Password</h2>
                <p className="text-xs text-zinc-500 mt-1">Enter your email to receive temporary login credentials.</p>
              </div>

              {!forgotResult ? (
                <form onSubmit={handleAuth} className="space-y-3 pt-1">
                  <input
                    type="email"
                    placeholder="Email address"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 btn-spring shadow-lg shadow-green-600/25"
                  >
                    Reset Password
                  </button>
                  <button
                    type="button"
                    onClick={() => { setAuthMode("login"); setAuthError(""); setForgotResult(null); }}
                    className="w-full py-1 text-xs text-zinc-500 hover:underline"
                  >
                    Back to Sign In
                  </button>
                </form>
              ) : (
                <div className="space-y-3 pt-1">
                  <div className="p-3.5 rounded-xl text-xs border border-green-500/30 bg-green-500/10 text-green-500">
                    <div className="font-bold mb-1">Temporary Password:</div>
                    <code className="font-mono font-bold text-sm bg-black/20 px-2 py-0.5 rounded">{forgotResult.temporaryPassword}</code>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPassword(forgotResult.temporaryPassword);
                      setAuthMode("login");
                      setForgotResult(null);
                    }}
                    className="w-full py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 btn-spring shadow-lg shadow-green-600/25"
                  >
                    Log In Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-3.5">
              {authMode === "register" && (
                <>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Full Name</label>
                    <input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Username</label>
                    <input
                      type="text"
                      placeholder="e.g. alex_leadgen"
                      value={regUsername}
                      onChange={e => setRegUsername(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                      required
                    />
                  </div>
                </>
              )}
              <div>
                <label className="text-xs font-semibold block mb-1">
                  {authMode === "login" ? "Username or Email" : "Work / Company Email"}
                </label>
                <input
                  type={authMode === "login" ? "text" : "email"}
                  placeholder={authMode === "login" ? "e.g. admin or user@company.com" : "alex@company.com"}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                  required
                />
                {authMode === "register" && (
                  <span className="text-[10px] text-zinc-500 mt-1 block">Only trusted business/company emails allowed.</span>
                )}
              </div>
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold">Password</label>
                  {authMode === "login" && (
                    <button
                      type="button"
                      onClick={() => { setAuthMode("forgot"); setAuthError(""); }}
                      className="text-[11px] text-zinc-500 hover:underline"
                    >
                      Forgot?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                  required
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  className={`w-full py-2.5 rounded-xl text-xs font-bold text-white btn-spring ${isDark ? "bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/25" : "bg-black hover:bg-zinc-800 shadow-md shadow-black/10"}`}
                >
                  {authMode === "login" ? "Sign In" : "Create Account"}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-zinc-500/20 text-[11px] text-zinc-500 text-center">
            Admin: <span className="font-semibold text-zinc-700 dark:text-zinc-300">admin@dashmin.local</span> / <span className="font-semibold text-zinc-700 dark:text-zinc-300">admin123</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex h-[100dvh] w-screen max-w-full overflow-hidden transition-colors duration-300 ${isDark ? "bg-[#09090C] text-white" : "bg-[#F9FAFB] text-black"}`}>
      <div className="absolute top-10 -left-20 w-96 h-96 rounded-full bg-green-500/5 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-10 -right-20 w-96 h-96 rounded-full bg-green-500/5 blur-[120px] pointer-events-none"></div>

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] flex flex-col justify-between p-5 shadow-2xl transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full pointer-events-none"
        } ${
          isDark
            ? "bg-[#09090C]/80 border-r border-white/10 text-white backdrop-blur-2xl"
            : "bg-white/80 border-r border-zinc-200 text-black backdrop-blur-2xl"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-green-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-green-600/25">
                D
              </div>
              <span className="text-base font-bold tracking-tight">{platformName}</span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className={`p-1.5 rounded-lg text-xs btn-spring ${isDark ? "glass-icon-dark text-zinc-400 hover:text-white" : "glass-icon-light text-zinc-600 hover:text-black"}`}
              title="Close menu"
            >
              ✕
            </button>
          </div>

          {user.role === "admin" && (
            <div className={`flex rounded-xl p-1 mb-5 text-xs font-semibold ${isDark ? "bg-black/40 border border-white/5" : "bg-black/[0.04] border border-black/5"}`}>
              <button
                onClick={() => { setViewMode("app"); setSidebarOpen(false); }}
                className={`flex-1 py-1.5 rounded-lg transition-all duration-200 ${viewMode === "app" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-white text-black font-bold shadow-sm") : "text-zinc-500"}`}
              >
                App
              </button>
              <button
                onClick={() => { setViewMode("admin"); fetchAdminStats(); fetchTeamList(); fetchSettings(); setSidebarOpen(false); }}
                className={`flex-1 py-1.5 rounded-lg transition-all duration-200 ${viewMode === "admin" ? "bg-green-600 text-white font-bold shadow-sm" : "text-zinc-500"}`}
              >
                Admin
              </button>
            </div>
          )}

          {viewMode === "app" ? (
            <nav className="space-y-1">
              <button
                onClick={() => { setActiveTab("search"); setSelectedJobId(null); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 ${activeTab === "search" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-black/[0.06] text-black font-bold shadow-sm") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
              >
                Find Leads
              </button>
              <button
                onClick={() => { setActiveTab("leads"); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 ${activeTab === "leads" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-black/[0.06] text-black font-bold shadow-sm") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
              >
                <span>Saved Leads</span>
                {jobs.length > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isDark ? "bg-white/10 text-zinc-300" : "bg-black/5 text-zinc-700"}`}>
                    {jobs.length}
                  </span>
                )}
              </button>
              {userCanProxy && (
                <button
                  onClick={() => { setActiveTab("settings"); setSidebarOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 ${activeTab === "settings" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-black/[0.06] text-black font-bold shadow-sm") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
                >
                  Proxy Settings
                </button>
              )}
              <button
                onClick={() => {
                  setProfileName(user?.name || "");
                  setProfileUsername(user?.username || "");
                  setProfileAvatar(user?.avatar || "");
                  setProfileMsg(null);
                  setSidebarOpen(false);
                  setShowProfileModal(true);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 text-zinc-500 hover:text-black dark:hover:text-white"
              >
                My Profile
              </button>
            </nav>
          ) : (
            <nav className="space-y-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 px-3.5 mb-2">Admin Tools</div>
              <button
                onClick={() => { setAdminTab("overview"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 ${adminTab === "overview" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-black/[0.06] text-black font-bold shadow-sm") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
              >
                System & Stats
              </button>
              <button
                onClick={() => { setAdminTab("users"); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 ${adminTab === "users" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-black/[0.06] text-black font-bold shadow-sm") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
              >
                <span>Users & Proxies</span>
                {adminUsers.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-600 text-white shadow-sm">
                    {adminUsers.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setAdminTab("leads"); fetchAdminGlobalLeads(); setSidebarOpen(false); }}
                className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 ${adminTab === "leads" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-black/[0.06] text-black font-bold shadow-sm") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
              >
                <span>All Users Leads</span>
                {adminGlobalTotal > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-600 text-white shadow-sm">
                    {adminGlobalTotal}
                  </span>
                )}
              </button>
              <button
                onClick={() => { setAdminTab("settings"); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-left transition-all duration-200 ${adminTab === "settings" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-black/[0.06] text-black font-bold shadow-sm") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
              >
                System Settings
              </button>
            </nav>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between pt-3 border-t border-zinc-500/20 text-xs">
            <span className="text-zinc-500">Theme</span>
            <button
              onClick={() => { toggleTheme(); setSidebarOpen(false); }}
              className={`px-3 py-1 rounded-xl text-xs font-semibold btn-spring ${isDark ? "glass-icon-dark text-zinc-300" : "glass-icon-light text-zinc-700"}`}
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>

          <div
            onClick={() => {
              setProfileName(user?.name || "");
              setProfileUsername(user?.username || "");
              setProfileAvatar(user?.avatar || "");
              setProfileMsg(null);
              setSidebarOpen(false);
              setShowProfileModal(true);
            }}
            className={`p-3 rounded-2xl border flex items-center justify-between text-xs cursor-pointer btn-spring ${isDark ? "glass-surface-dark border-white/5 hover:border-white/20" : "glass-surface-light border-zinc-200 hover:border-zinc-300"}`}
          >
            <div className="flex items-center gap-2.5 truncate">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover shrink-0 border border-zinc-500/20" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-zinc-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {(user.username || user.name || user.email)[0].toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <div className="font-bold truncate">{user.name || user.username || user.email}</div>
                <div className="text-[10px] text-zinc-500 truncate">@{user.username || user.email.split('@')[0]}</div>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setSidebarOpen(false); logout(); }} className="text-zinc-500 hover:text-red-500 font-semibold ml-2 btn-spring">
              Exit
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden z-10 w-full min-w-0">
        <header className={`h-14 border-b px-4 sm:px-5 flex items-center justify-between shrink-0 transition-colors ${isDark ? "glass-surface-dark border-white/5" : "glass-surface-light border-zinc-200"}`}>
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold btn-spring flex items-center gap-1.5 shrink-0 ${isDark ? "glass-icon-dark text-white" : "glass-icon-light text-black"}`}
              title="Toggle Menu"
            >
              <span>☰</span>
              <span className="hidden sm:inline">Menu</span>
            </button>
            <h2 className="text-sm font-bold tracking-tight truncate">
              {viewMode === "admin"
                ? (adminTab === "overview" ? "System & Stats" : (adminTab === "users" ? "User Management" : (adminTab === "leads" ? "All Users Leads (Global Database)" : "System Settings")))
                : (activeTab === "search" ? "Find Leads" : (activeTab === "leads" ? "Saved Leads" : "Proxy Settings"))}
            </h2>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setProfileName(user?.name || "");
                setProfileUsername(user?.username || "");
                setProfileAvatar(user?.avatar || "");
                setProfileMsg(null);
                setShowProfileModal(true);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold btn-spring ${isDark ? "glass-icon-dark text-white hover:border-white/30" : "glass-icon-light text-black hover:border-black/30"}`}
              title="My Profile & Security"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt="Profile" className="w-4 h-4 rounded-full object-cover" />
              ) : (
                <span className="w-4 h-4 rounded-full bg-green-600 text-white text-[9px] flex items-center justify-center font-bold">
                  {(user?.username || user?.name || user?.email || "U")[0].toUpperCase()}
                </span>
              )}
              <span>Profile</span>
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl text-xs font-semibold btn-spring ${isDark ? "glass-icon-dark text-zinc-300" : "glass-icon-light text-zinc-700"}`}
              title="Toggle Theme"
            >
              {isDark ? "Light" : "Dark"}
            </button>
          </div>
        </header>

        <div className="flex-1 p-3.5 sm:p-5 md:p-8 overflow-y-auto overflow-x-hidden w-full max-w-full">
          {viewMode === "app" && activeTab === "search" && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Find Local Leads</h1>
                <p className="text-xs text-zinc-500 mt-0.5">Search businesses and export phone numbers, websites, and addresses.</p>
              </div>

              <div className={`rounded-3xl p-6 md:p-8 space-y-5 transition-all duration-300 ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                <div className={`flex rounded-2xl p-1 text-xs font-semibold ${isDark ? "bg-black/40 border border-white/5" : "bg-black/[0.04] border border-black/5"}`}>
                  <button
                    type="button"
                    onClick={() => setSearchMode("single")}
                    className={`flex-1 py-2 rounded-xl transition-all duration-200 ${searchMode === "single" ? (isDark ? "bg-white/10 text-white font-bold shadow-sm" : "bg-white text-black font-bold shadow-sm") : "text-zinc-500"}`}
                  >
                    Single Search
                  </button>
                  <button
                    type="button"
                    onClick={() => setSearchMode("bulk")}
                    className={`flex-1 py-2 rounded-xl transition-all duration-200 ${searchMode === "bulk" ? "bg-green-600 text-white font-bold shadow-sm" : "text-zinc-500"}`}
                  >
                    File / Bulk Search
                  </button>
                </div>

                <div className="space-y-4 pt-1">
                  <div>
                    <label className="text-xs font-semibold block mb-1.5">Search Engine</label>
                    <div className={`grid grid-cols-2 gap-2 p-1 rounded-2xl ${isDark ? "bg-black/40 border border-white/5" : "bg-black/[0.04] border border-black/5"}`}>
                      <button
                        type="button"
                        onClick={() => setSearchEngine("gmaps")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 btn-spring flex items-center justify-center gap-2 ${searchEngine === "gmaps" ? (isDark ? "bg-white/10 text-white shadow-sm border border-white/15" : "bg-white text-black shadow-sm border border-zinc-200") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
                      >
                        <span>Google Maps</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-600/20 text-green-500 font-semibold">Global</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchEngine("2gis")}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition-all duration-200 btn-spring flex items-center justify-center gap-2 ${searchEngine === "2gis" ? (isDark ? "bg-white/10 text-white shadow-sm border border-white/15" : "bg-white text-black shadow-sm border border-zinc-200") : "text-zinc-500 hover:text-black dark:hover:text-white"}`}
                      >
                        <span>2GIS Directory</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-600/20 text-green-500 font-semibold">UAE / GCC</span>
                      </button>
                    </div>
                  </div>
                </div>

                {searchMode === "single" ? (
                  <form onSubmit={startLeadSearch} className="space-y-5">
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold">Business Category or Keyword</label>
                        <button
                          type="button"
                          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                          className="text-[11px] text-green-600 hover:underline font-semibold flex items-center gap-1"
                        >
                          <span>{showCategoryDropdown ? "Close List" : "Browse Categories"}</span>
                          <span className="text-[9px]">{showCategoryDropdown ? "▲" : "▼"}</span>
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="text"
                          value={keyword}
                          onChange={e => {
                            setKeyword(e.target.value);
                            if (!showCategoryDropdown) setShowCategoryDropdown(true);
                          }}
                          onFocus={() => setShowCategoryDropdown(true)}
                          placeholder="Type or pick e.g. Real Estate, Dental Clinics, Restaurants"
                          className={`w-full pl-4 pr-10 py-3 rounded-2xl text-xs outline-none transition-all duration-200 ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-black dark:hover:text-white text-xs p-1"
                        >
                          ▼
                        </button>
                      </div>

                      {showCategoryDropdown && (
                        <div className={`absolute left-0 right-0 top-full mt-1.5 z-30 rounded-2xl p-2 border shadow-2xl max-h-56 overflow-y-auto backdrop-blur-2xl transition-all duration-200 ${isDark ? "bg-[#18181D]/95 border-white/10 text-white" : "bg-white/95 border-zinc-200 text-black"}`}>
                          <div className="text-[10px] uppercase tracking-wider text-zinc-500 px-3 py-1 font-bold">
                            {keyword.trim() ? "Matching Categories" : "Popular Categories (Scroll or Pick)"}
                          </div>
                          {POPULAR_CATEGORIES.filter(c => c.toLowerCase().includes(keyword.toLowerCase())).length > 0 ? (
                            POPULAR_CATEGORIES
                              .filter(c => c.toLowerCase().includes(keyword.toLowerCase()))
                              .map((cat, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => {
                                    setKeyword(cat);
                                    setShowCategoryDropdown(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl text-xs transition flex items-center justify-between ${keyword.toLowerCase() === cat.toLowerCase() ? "bg-green-600 text-white font-bold" : (isDark ? "hover:bg-white/[0.08]" : "hover:bg-black/[0.05]")}`}
                                >
                                  <span>{cat}</span>
                                  {keyword.toLowerCase() === cat.toLowerCase() && <span className="text-[10px]">✓</span>}
                                </button>
                              ))
                          ) : (
                            <div className="px-3 py-2 text-xs text-zinc-500">
                              <span>Custom search term: &ldquo;{keyword}&rdquo;</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {searchEngine === "2gis" ? (
                      <div className="space-y-3 p-4 rounded-2xl border border-green-500/25 bg-green-500/[0.04]">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-green-500 flex items-center gap-1.5">
                            <span>2GIS Supported Location</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/15 border border-green-500/20 font-medium">Strict Region Mode</span>
                          </label>
                          <span className="text-[10px] text-zinc-500">Only official 2GIS regions supported</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Country</label>
                            <select
                              value={twoGisCountry}
                              onChange={e => {
                                const newCountry = e.target.value;
                                setTwoGisCountry(newCountry);
                                const found = TWOGIS_SUPPORTED_REGIONS.find(r => r.country === newCountry);
                                if (found && found.cities.length > 0) {
                                  setTwoGisCity(found.cities[0].name);
                                }
                              }}
                              className={`w-full px-3 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 cursor-pointer ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                            >
                              {TWOGIS_SUPPORTED_REGIONS.map(reg => (
                                <option key={reg.country} value={reg.country} className={isDark ? "bg-[#18181D] text-white" : "bg-white text-black"}>
                                  {reg.country}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Emirate / City</label>
                            <select
                              value={twoGisCity}
                              onChange={e => setTwoGisCity(e.target.value)}
                              className={`w-full px-3 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 cursor-pointer ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                            >
                              {(TWOGIS_SUPPORTED_REGIONS.find(r => r.country === twoGisCountry)?.cities || []).map(c => (
                                <option key={c.name} value={c.name} className={isDark ? "bg-[#18181D] text-white" : "bg-white text-black"}>
                                  {c.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {twoGisCountry === "United Arab Emirates" && (
                          <div>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1.5">7 Emirates Quick Select:</span>
                            <div className="flex flex-wrap gap-1.5">
                              {TWOGIS_SUPPORTED_REGIONS[0].cities.map(c => (
                                <button
                                  key={c.name}
                                  type="button"
                                  onClick={() => setTwoGisCity(c.name)}
                                  className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition btn-spring ${twoGisCity === c.name ? "bg-green-600 text-white font-bold shadow-sm shadow-green-600/30" : (isDark ? "glass-icon-dark text-zinc-400 hover:text-white" : "glass-icon-light text-zinc-600 hover:text-black")}`}
                                >
                                  {c.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <label className="text-xs font-semibold block mb-1.5">City or Location</label>
                        <input
                          type="text"
                          value={location}
                          onChange={e => setLocation(e.target.value)}
                          placeholder="e.g. Dubai, Abu Dhabi, Riyadh, London, New York"
                          className={`w-full px-4 py-3 rounded-2xl text-xs outline-none transition-all duration-200 ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                        />
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          <span className="text-[11px] text-zinc-500">Popular:</span>
                          {["Dubai", "Abu Dhabi", "Sharjah", "Riyadh", "Doha", "London", "New York"].map(loc => (
                            <button
                              key={loc}
                              type="button"
                              onClick={() => setLocation(loc)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition btn-spring ${location.toLowerCase() === loc.toLowerCase() ? "bg-green-600 text-white font-bold" : (isDark ? "glass-icon-dark text-zinc-400 hover:text-white" : "glass-icon-light text-zinc-600 hover:text-black")}`}
                            >
                              {loc}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="text-xs font-semibold block mb-1.5">Number of Leads</label>
                      <div className="flex gap-2">
                        {[50, 100, 250, 500].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => { setLeadCount(amt); setCustomLeadCount(""); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold btn-spring ${leadCount === amt && !customLeadCount ? (isDark ? "bg-green-600 text-white shadow-md shadow-green-600/30" : "bg-black text-white shadow-md shadow-black/15") : (isDark ? "glass-icon-dark text-zinc-400 hover:text-white" : "glass-icon-light text-zinc-600 hover:text-black")}`}
                          >
                            {amt}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => { setLeadCount(0); setCustomLeadCount(""); }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold btn-spring ${leadCount === 0 && !customLeadCount ? (isDark ? "bg-green-600 text-white shadow-md shadow-green-600/30" : "bg-black text-white shadow-md shadow-black/15") : (isDark ? "glass-icon-dark text-zinc-400 hover:text-white" : "glass-icon-light text-zinc-600 hover:text-black")}`}
                        >
                          All
                        </button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isStarting || !keyword.trim()}
                        className={`w-full py-3.5 rounded-2xl text-xs font-bold text-white btn-spring ${isDark ? "bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-600/30" : "bg-black hover:bg-zinc-800 disabled:opacity-50 shadow-lg shadow-black/15"}`}
                      >
                        {isStarting ? "Starting..." : (leadCount === 0 ? "Find All Leads" : `Find ${leadCount} Leads`)}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={startBulkSearch} className="space-y-5">
                    <div>
                      <label className="text-xs font-semibold block mb-1.5">Upload Queries File (.txt or .csv)</label>
                      <div className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition ${isDark ? "border-zinc-700 hover:border-green-500 bg-white/[0.02]" : "border-zinc-300 hover:border-black bg-black/[0.01]"}`}>
                        <input
                          type="file"
                          accept=".txt,.csv"
                          onChange={handleFileUpload}
                          className="hidden"
                          id="bulk-file-input"
                        />
                        <label htmlFor="bulk-file-input" className="cursor-pointer block">
                          <div className="text-xs font-bold text-green-600">
                            {bulkFileName ? `Selected File: ${bulkFileName}` : "Click to select a .txt or .csv file"}
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-1">One search query per line</div>
                        </label>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold">Search Queries List</label>
                        {bulkQueriesText.trim().length > 0 && (
                          <span className="text-[11px] text-green-600 font-bold">
                            {bulkQueriesText.split(/\r?\n/).filter(q => q.trim().length > 0).length} searches ready
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={5}
                        value={bulkQueriesText}
                        onChange={e => setBulkQueriesText(e.target.value)}
                        placeholder={"dentists in dubai\ncoffee shops in abu dhabi\nreal estate in sharjah"}
                        className={`w-full px-4 py-3 rounded-2xl text-xs outline-none transition-all duration-200 font-mono ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold block mb-1.5">Leads per Query</label>
                      <div className="flex gap-2">
                        {[50, 100, 250, 500].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => { setLeadCount(amt); setCustomLeadCount(""); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold btn-spring ${leadCount === amt && !customLeadCount ? (isDark ? "bg-green-600 text-white shadow-md shadow-green-600/30" : "bg-black text-white shadow-md shadow-black/15") : (isDark ? "glass-icon-dark text-zinc-400 hover:text-white" : "glass-icon-light text-zinc-600 hover:text-black")}`}
                          >
                            {amt}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => { setLeadCount(0); setCustomLeadCount(""); }}
                          className={`flex-1 py-2.5 rounded-xl text-xs font-bold btn-spring ${leadCount === 0 && !customLeadCount ? (isDark ? "bg-green-600 text-white shadow-md shadow-green-600/30" : "bg-black text-white shadow-md shadow-black/15") : (isDark ? "glass-icon-dark text-zinc-400 hover:text-white" : "glass-icon-light text-zinc-600 hover:text-black")}`}
                        >
                          All
                        </button>
                      </div>
                    </div>

                    {bulkStatusMsg && (
                      <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-semibold">
                        {bulkStatusMsg}
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isBulkStarting || !bulkQueriesText.trim()}
                        className={`w-full py-3.5 rounded-2xl text-xs font-bold text-white btn-spring ${isDark ? "bg-green-600 hover:bg-green-700 disabled:opacity-50 shadow-lg shadow-green-600/30" : "bg-black hover:bg-zinc-800 disabled:opacity-50 shadow-lg shadow-black/15"}`}
                      >
                        {isBulkStarting ? "Starting Searches..." : "Start Batch Searches"}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {jobs.length > 0 && (
                <div className={`rounded-3xl p-6 transition-all duration-300 ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500">Recent Searches</h3>
                    <button onClick={() => setActiveTab("leads")} className="text-xs font-bold text-green-600 hover:underline">
                      View All ({jobs.length})
                    </button>
                  </div>
                  <div className="divide-y divide-zinc-500/10">
                    {jobs.slice(0, 3).map(j => {
                      const isRunning = j.status === "running" || j.status === "pending";
                      return (
                        <div key={j.id} className="py-3.5 flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold capitalize">{j.target}</div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              {j.total_saved || 0} leads saved {isRunning && "• Running..."}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedJobId(j.id);
                              fetchJobDetails(j.id, token, true);
                              setActiveTab("leads");
                            }}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold btn-spring ${isDark ? "glass-icon-dark text-white" : "glass-icon-light text-black"}`}
                          >
                            Open
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {viewMode === "app" && activeTab === "settings" && userCanProxy && (
            <div className="max-w-xl mx-auto space-y-5">
              <div>
                <h1 className="text-xl font-bold tracking-tight">Proxy Settings</h1>
                <p className="text-xs text-zinc-500 mt-0.5">Configure your custom outbound proxy for searches.</p>
              </div>

              <div className={`rounded-3xl p-6 md:p-8 space-y-4 transition-all duration-300 ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                <div>
                  <label className="text-xs font-semibold block mb-1.5">Custom Outbound Proxy</label>
                  <input
                    type="text"
                    placeholder="http://user:password@proxy.example.com:8080 or socks5://..."
                    value={userProxy}
                    onChange={e => setUserProxy(e.target.value)}
                    className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition-all duration-200 ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                  />
                  <span className="text-[11px] text-zinc-500 mt-1 block">Leave empty to use system default proxy.</span>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleSaveUserProxy}
                    className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 btn-spring shadow-md shadow-green-600/25"
                  >
                    {proxySaveSuccess ? "Saved!" : "Save Proxy"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {viewMode === "app" && activeTab === "leads" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold tracking-tight">Saved Leads</h1>
                  <p className="text-xs text-zinc-500 mt-0.5">Select a search to view contacts and export.</p>
                </div>
                <button
                  onClick={() => { setActiveTab("search"); setSelectedJobId(null); }}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl btn-spring shadow-md shadow-green-600/25 self-start"
                >
                  + New Search
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                <div className="lg:col-span-1 space-y-2.5">
                  {jobs.length === 0 ? (
                    <div className={`p-6 rounded-2xl text-center text-xs text-zinc-500 ${isDark ? "glass-surface-dark" : "glass-surface-light"}`}>
                      No searches run yet.
                    </div>
                  ) : (
                    jobs.map(j => {
                      const isSelected = j.id === selectedJobId;
                      const isRunning = j.status === "running" || j.status === "pending";
                      return (
                        <div
                          key={j.id}
                          onClick={() => fetchJobDetails(j.id, token, true)}
                          className={`p-4 rounded-2xl cursor-pointer transition-all duration-200 ${isSelected ? (isDark ? "glass-surface-dark border-green-500 shadow-md ring-1 ring-green-500/50" : "glass-surface-light border-black shadow-md ring-1 ring-black") : (isDark ? "glass-surface-dark hover:border-white/20" : "glass-surface-light hover:border-zinc-300")}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-xs capitalize truncate">{j.target}</span>
                            {isRunning ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-500/20 text-green-500 shrink-0">
                                Running
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-semibold shrink-0">
                                Done
                              </span>
                            )}
                          </div>

                          {isRunning && (
                            <div className="mt-2.5">
                              <div className="w-full h-1.5 rounded-full overflow-hidden bg-black/10 dark:bg-white/10">
                                <div className="h-full w-full bg-green-600 clean-progress-bar rounded-full"></div>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2.5 pt-2 border-t border-zinc-500/15">
                            <span>{j.total_saved || 0} leads</span>
                            <div className="flex items-center gap-3">
                              {isRunning && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); stopSearch(j.id); }}
                                  className="text-zinc-500 hover:underline font-bold"
                                >
                                  Stop
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); setExportJobId(j.id); }}
                                className="text-green-600 hover:underline font-bold"
                              >
                                Export
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); deleteSearch(j.id); }}
                                className="text-zinc-400 hover:text-red-500 font-semibold"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="lg:col-span-2">
                  {!selectedJobId ? (
                    <div className={`p-12 rounded-3xl text-center text-xs text-zinc-500 ${isDark ? "glass-surface-dark" : "glass-surface-light"}`}>
                      Select a search on the left to inspect leads.
                    </div>
                  ) : (
                    <div className={`rounded-3xl overflow-hidden transition-all duration-300 ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                      <div className="p-4 md:p-5 border-b border-zinc-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-bold capitalize">{selectedJob?.target}</h3>
                          <span className="text-[11px] text-zinc-500">{jobResults.length} leads saved</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="text"
                            placeholder="Filter..."
                            value={searchFilter}
                            onChange={e => setSearchFilter(e.target.value)}
                            className={`flex-1 sm:flex-none px-3 py-1.5 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                          />
                          <button
                            onClick={() => {
                              setSidebarOpen(false);
                              setIsTableZoomed(true);
                            }}
                            className={`p-2 rounded-xl text-xs font-bold btn-spring flex items-center gap-1.5 ${isDark ? "glass-icon-dark text-zinc-300 hover:text-white" : "glass-icon-light text-zinc-700 hover:text-black"}`}
                            title="Zoom In (Fullscreen View)"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                            <span>Zoom In</span>
                          </button>
                          <button
                            onClick={() => setExportJobId(selectedJobId)}
                            disabled={jobResults.length === 0}
                            className="px-3.5 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl btn-spring shadow-sm shadow-green-600/25"
                          >
                            Export
                          </button>
                        </div>
                      </div>

                      {loadingResults ? (
                        <div className="p-12 text-center text-xs text-zinc-500">Loading leads...</div>
                      ) : filteredResults.length === 0 ? (
                        <div className="p-12 text-center text-xs text-zinc-500">No records found.</div>
                      ) : (
                        <div className="overflow-x-auto max-h-[500px] w-full">
                          <table className="w-full min-w-[650px] text-left text-xs">
                            <thead className={`text-[11px] font-bold uppercase tracking-wider border-b border-zinc-500/15 sticky top-0 backdrop-blur-md ${isDark ? "bg-black/60 text-zinc-400" : "bg-white/80 text-zinc-600"}`}>
                              <tr>
                                <th className="px-4 py-2.5">Business</th>
                                <th className="px-4 py-2.5">Phone</th>
                                <th className="px-4 py-2.5">Website</th>
                                <th className="px-4 py-2.5">Category</th>
                                <th className="px-4 py-2.5">Rating</th>
                                <th className="px-4 py-2.5">Address</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-500/10">
                              {filteredResults.map((r, i) => (
                                <tr key={i} className={`transition ${isDark ? "hover:bg-white/[0.03]" : "hover:bg-black/[0.02]"}`}>
                                  <td className="px-4 py-2.5 font-bold max-w-[180px] truncate">{r.title}</td>
                                  <td className="px-4 py-2.5 font-mono text-[11px] whitespace-nowrap">{r.phone_1 || "—"}</td>
                                  <td className="px-4 py-2.5 max-w-[140px] truncate">
                                    {r.website ? (
                                      <a href={r.website} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">
                                        {r.website.replace(/^https?:\/\//, '')}
                                      </a>
                                    ) : "—"}
                                  </td>
                                  <td className="px-4 py-2.5 text-zinc-500 max-w-[120px] truncate">{r.category || "—"}</td>
                                  <td className="px-4 py-2.5 whitespace-nowrap font-semibold">
                                    {r.rating ? `${r.rating} (${r.reviews || 0})` : "—"}
                                  </td>
                                  <td className="px-4 py-2.5 text-zinc-500 max-w-[180px] truncate">{r.address || "—"}</td>
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
            <div className="space-y-6 max-w-4xl mx-auto">
              {adminTab === "overview" && (
                <div className="space-y-5">
                  <div>
                    <h1 className="text-xl font-bold tracking-tight">System Overview</h1>
                    <p className="text-xs text-zinc-500 mt-0.5">Server metrics and database details.</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className={`p-5 rounded-2xl ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                      <span className="text-xs text-zinc-500 font-semibold">Users</span>
                      <div className="text-2xl font-bold mt-1">{adminStats?.totalUsers || adminUsers.length}</div>
                    </div>
                    <div className={`p-5 rounded-2xl ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                      <span className="text-xs text-zinc-500 font-semibold">Total Leads</span>
                      <div className="text-2xl font-bold mt-1 text-green-600">{adminStats?.totalLeads || 0}</div>
                    </div>
                    <div className={`p-5 rounded-2xl ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                      <span className="text-xs text-zinc-500 font-semibold">Total Jobs</span>
                      <div className="text-2xl font-bold mt-1">{adminStats?.totalJobs || jobs.length}</div>
                    </div>
                    <div className={`p-5 rounded-2xl ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                      <span className="text-xs text-zinc-500 font-semibold">Status</span>
                      <div className="text-lg font-bold mt-1 text-green-600">Online</div>
                    </div>
                  </div>
                </div>
              )}

              {adminTab === "users" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">User Accounts</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">Control proxy access, approve accounts, or reset passwords.</p>
                    </div>
                    <button
                      onClick={() => setShowCreateUserModal(true)}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl btn-spring shadow-md shadow-green-600/25"
                    >
                      + Add User
                    </button>
                  </div>

                  <div className={`rounded-3xl overflow-hidden ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                    <table className="w-full text-left text-xs">
                      <thead className={`text-[11px] font-bold uppercase tracking-wider border-b border-zinc-500/15 ${isDark ? "bg-black/40 text-zinc-400" : "bg-black/[0.02] text-zinc-600"}`}>
                        <tr>
                          <th className="px-5 py-3.5">User</th>
                          <th className="px-5 py-3.5">Role</th>
                          <th className="px-5 py-3.5">User Proxy Control</th>
                          <th className="px-5 py-3.5">Status</th>
                          <th className="px-5 py-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-500/10">
                        {adminUsers.map(u => (
                          <tr key={u.id} className={`transition ${isDark ? "hover:bg-white/[0.02]" : "hover:bg-black/[0.02]"}`}>
                            <td className="px-5 py-3.5">
                              <div className="font-bold">{u.name || "Unnamed"}</div>
                              <div className="text-[11px] text-zinc-500">{u.email}</div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className="font-semibold uppercase text-[10px]">{u.role}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleUserProxy(u.id)}
                                  className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${u.can_use_proxy === 1 ? "bg-green-600 justify-end" : "bg-zinc-300 dark:bg-zinc-700 justify-start"}`}
                                >
                                  <span className="bg-white w-4 h-4 rounded-full shadow-sm"></span>
                                </button>
                                <span className={`text-[11px] font-semibold ${u.can_use_proxy === 1 ? "text-green-600" : "text-zinc-400"}`}>
                                  {u.can_use_proxy === 1 ? "Allowed" : "Off"}
                                </span>
                              </div>
                            </td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${u.status === "active" ? "bg-green-500/10 text-green-600" : "bg-zinc-500/10 text-zinc-500"}`}>
                                {u.status}
                              </span>
                            </td>
                            <td className="px-5 py-3.5 text-right space-x-2">
                              <button
                                onClick={() => {
                                  setEditingUser(u);
                                  setEditUserName(u.name || "");
                                  setEditUserEmail(u.email || "");
                                  setEditUserRole(u.role || "user");
                                  setEditUserStatus(u.status || "active");
                                  setEditUserCanProxy(u.can_use_proxy === 1);
                                  setEditUserPassword("");
                                }}
                                className="font-semibold text-zinc-500 hover:text-black dark:hover:text-white btn-spring"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => {
                                  setResetModalUser(u);
                                  setNewResetPassword("");
                                  setResetResultData(null);
                                }}
                                className="font-semibold text-zinc-500 hover:text-black dark:hover:text-white btn-spring"
                              >
                                Reset Pass
                              </button>
                              {u.status !== "active" && (
                                <button onClick={() => approveUser(u.id)} className="font-semibold text-green-600 hover:underline btn-spring">
                                  Approve
                                </button>
                              )}
                              {u.status === "active" && u.id !== user.id && (
                                <button onClick={() => suspendUser(u.id)} className="font-semibold text-zinc-400 hover:text-black dark:hover:text-white btn-spring">
                                  Disable
                                </button>
                              )}
                              {u.id !== user.id && (
                                <button onClick={() => deleteUser(u.id)} className="font-semibold text-red-500 hover:underline btn-spring">
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

              {adminTab === "leads" && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold tracking-tight">All Users Leads Database</h2>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {adminGlobalTotal.toLocaleString()} leads collected across all user accounts
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <select
                        value={adminLeadUserFilter}
                        onChange={e => {
                          setAdminLeadUserFilter(e.target.value);
                          fetchAdminGlobalLeads(token, e.target.value, adminLeadSearch);
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      >
                        <option value="all">All Users (Global)</option>
                        {adminUsers.map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name || u.email} (@{u.username || u.email.split('@')[0]})
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Search any lead..."
                          value={adminLeadSearch}
                          onChange={e => setAdminLeadSearch(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") {
                              fetchAdminGlobalLeads(token, adminLeadUserFilter, adminLeadSearch);
                            }
                          }}
                          className={`w-44 sm:w-56 px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                        />
                        <button
                          type="button"
                          onClick={() => fetchAdminGlobalLeads(token, adminLeadUserFilter, adminLeadSearch)}
                          className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl btn-spring shadow-md shadow-green-600/25"
                        >
                          Filter
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`rounded-3xl overflow-hidden ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[850px] text-left text-xs">
                        <thead className={`text-[11px] font-bold uppercase tracking-wider border-b border-zinc-500/15 ${isDark ? "bg-black/40 text-zinc-400" : "bg-black/[0.02] text-zinc-600"}`}>
                          <tr>
                            <th className="px-4 py-3">Owner</th>
                            <th className="px-4 py-3">Business</th>
                            <th className="px-3 py-3">Phone</th>
                            <th className="px-3 py-3">Website</th>
                            <th className="px-3 py-3">Category</th>
                            <th className="px-3 py-3">Rating</th>
                            <th className="px-3 py-3">City</th>
                            <th className="px-4 py-3">Query</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-500/10">
                          {loadingAdminLeads ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-xs text-zinc-500">
                                Loading global database...
                              </td>
                            </tr>
                          ) : adminGlobalLeads.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="py-12 text-center text-xs text-zinc-500">
                                No leads found in this view.
                              </td>
                            </tr>
                          ) : (
                            adminGlobalLeads.map((r, i) => (
                              <tr key={r.id || i} className={`transition ${isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]"}`}>
                                <td className="px-4 py-3 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    {r.user_avatar ? (
                                      <img src={r.user_avatar} alt={r.user_name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                                    ) : (
                                      <span className="w-5 h-5 rounded-full bg-zinc-700 text-white text-[9px] flex items-center justify-center font-bold shrink-0">
                                        {(r.user_username || r.user_name || r.user_email || "U")[0].toUpperCase()}
                                      </span>
                                    )}
                                    <div className="leading-tight">
                                      <div className="font-semibold text-xs">{r.user_name || r.user_email}</div>
                                      <div className="text-[10px] text-zinc-500">@{r.user_username || (r.user_email ? r.user_email.split('@')[0] : 'user')}</div>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-3 font-bold break-words">{r.title}</td>
                                <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap">{r.phone_1 || "—"}</td>
                                <td className="px-3 py-3">
                                  {r.website ? (
                                    <a href={r.website} target="_blank" rel="noreferrer" className="text-green-600 hover:underline truncate block max-w-[140px] text-[11px]">
                                      {r.website.replace(/^https?:\/\//, '')}
                                    </a>
                                  ) : "—"}
                                </td>
                                <td className="px-3 py-3 text-zinc-500 truncate max-w-[120px]">{r.category || "—"}</td>
                                <td className="px-3 py-3 whitespace-nowrap font-semibold">
                                  {r.rating ? `${r.rating} (${r.reviews || 0})` : "—"}
                                </td>
                                <td className="px-3 py-3 text-zinc-500 truncate max-w-[100px]">{r.city || "—"}</td>
                                <td className="px-4 py-3 text-zinc-500 text-[11px] truncate max-w-[130px]">{r.job_target || r.query || "—"}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {adminTab === "settings" && (
                <div className={`rounded-3xl p-6 md:p-8 space-y-5 max-w-xl transition-all duration-300 ${isDark ? "glass-surface-dark" : "glass-surface-light shadow-sm"}`}>
                  <div>
                    <h2 className="text-base font-bold">System Settings</h2>
                    <p className="text-xs text-zinc-500 mt-0.5">Control registration and global outbound proxies.</p>
                  </div>

                  {settingsSuccess && (
                    <div className="p-3 rounded-xl border text-xs font-semibold bg-green-500/10 border-green-500/30 text-green-500">
                      Settings saved!
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Platform Name</label>
                      <input
                        type="text"
                        value={platformName}
                        onChange={e => setPlatformName(e.target.value)}
                        className={`w-full px-4 py-2.5 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold block mb-1">Public Registration</label>
                      <button
                        type="button"
                        onClick={() => setPublicRegistration(!publicRegistration)}
                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition btn-spring ${publicRegistration ? "bg-green-500/10 border border-green-500/30 text-green-500" : (isDark ? "glass-icon-dark text-zinc-400" : "glass-icon-light text-zinc-600")}`}
                      >
                        {publicRegistration ? "Enabled (Users can register)" : "Disabled (Admin creates users)"}
                      </button>
                    </div>

                    <div className="pt-3 border-t border-zinc-500/15 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-semibold block">Global Outbound Proxy</label>
                          <span className="text-[11px] text-zinc-500">Route all scraping jobs through proxy</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSystemProxyEnabled(!systemProxyEnabled)}
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${systemProxyEnabled ? "bg-green-600 justify-end" : "bg-zinc-300 dark:bg-zinc-700 justify-start"}`}
                        >
                          <span className="bg-white w-4 h-4 rounded-full shadow-sm"></span>
                        </button>
                      </div>

                      <div>
                        <label className="text-xs font-semibold block mb-1">Proxy URL</label>
                        <input
                          type="text"
                          placeholder="http://user:password@server.com:8080 or socks5://..."
                          value={systemProxyUrl}
                          onChange={e => setSystemProxyUrl(e.target.value)}
                          className={`w-full px-4 py-2.5 rounded-xl text-xs font-mono outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                        />
                      </div>
                    </div>

                    <div className="pt-3 border-t border-zinc-500/15 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <label className="text-xs font-semibold block">Parallel Area Workers</label>
                          <span className="text-[11px] text-zinc-500">Multi-instance area scanning (2x - 12x)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {[2, 4, 6, 8, 12].map(num => (
                            <button
                              key={num}
                              type="button"
                              onClick={() => setParallelConcurrency(num)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold btn-spring ${parallelConcurrency === num ? "bg-green-600 text-white shadow-md shadow-green-600/30" : (isDark ? "glass-icon-dark text-zinc-400 hover:text-white" : "glass-icon-light text-zinc-600 hover:text-black")}`}
                            >
                              {num}x
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-zinc-500/15">
                    <button
                      onClick={handleSaveSettings}
                      className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-bold text-xs rounded-xl btn-spring shadow-md shadow-green-600/25"
                    >
                      Save Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {showCreateUserModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
              <div className={`rounded-3xl p-6 max-w-sm w-full space-y-4 ${isDark ? "glass-surface-dark text-white" : "glass-surface-light text-black shadow-2xl"}`}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-500/15">
                  <h3 className="text-sm font-bold">Add User</h3>
                  <button onClick={() => setShowCreateUserModal(false)} className="text-xs text-zinc-500 btn-spring">✕</button>
                </div>

                {createUserMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 text-xs rounded-xl font-bold">{createUserMsg}</div>
                )}

                <form onSubmit={handleCreateUser} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Name</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={e => setNewUserName(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Email</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={e => setNewUserEmail(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Password</label>
                    <input
                      type="text"
                      value={newUserPassword}
                      onChange={e => setNewUserPassword(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Role</label>
                    <select
                      value={newUserRole}
                      onChange={e => setNewUserRole(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "bg-[#18181B] text-white border border-white/10" : "bg-white text-black border border-zinc-200"}`}
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="newProxyCheck"
                      checked={newUserCanProxy}
                      onChange={e => setNewUserCanProxy(e.target.checked)}
                      className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                    <label htmlFor="newProxyCheck" className="text-xs font-medium cursor-pointer">
                      Allow user proxy settings
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreateUserModal(false)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-spring border border-zinc-500/20"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-white text-xs font-bold bg-green-600 hover:bg-green-700 btn-spring shadow-md shadow-green-600/25"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {editingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
              <div className={`rounded-3xl p-6 max-w-sm w-full space-y-4 ${isDark ? "glass-surface-dark text-white" : "glass-surface-light text-black shadow-2xl"}`}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-500/15">
                  <h3 className="text-sm font-bold">Edit User</h3>
                  <button onClick={() => setEditingUser(null)} className="text-xs text-zinc-500 btn-spring">✕</button>
                </div>

                <form onSubmit={handleUpdateUser} className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Name</label>
                    <input
                      type="text"
                      value={editUserName}
                      onChange={e => setEditUserName(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">Email</label>
                    <input
                      type="email"
                      value={editUserEmail}
                      onChange={e => setEditUserEmail(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block mb-1">New Password (optional)</label>
                    <input
                      type="text"
                      placeholder="Leave blank to keep"
                      value={editUserPassword}
                      onChange={e => setEditUserPassword(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs font-semibold block mb-1">Role</label>
                      <select
                        value={editUserRole}
                        onChange={e => setEditUserRole(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "bg-[#18181B] text-white border border-white/10" : "bg-white text-black border border-zinc-200"}`}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold block mb-1">Status</label>
                      <select
                        value={editUserStatus}
                        onChange={e => setEditUserStatus(e.target.value)}
                        className={`w-full px-2.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "bg-[#18181B] text-white border border-white/10" : "bg-white text-black border border-zinc-200"}`}
                      >
                        <option value="active">Active</option>
                        <option value="suspended">Suspended</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="editProxyCheck"
                      checked={editUserCanProxy}
                      onChange={e => setEditUserCanProxy(e.target.checked)}
                      className="w-4 h-4 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                    />
                    <label htmlFor="editProxyCheck" className="text-xs font-medium cursor-pointer">
                      Allow user proxy settings
                    </label>
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingUser(null)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-spring border border-zinc-500/20"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 rounded-xl text-white text-xs font-bold bg-green-600 hover:bg-green-700 btn-spring shadow-md shadow-green-600/25"
                    >
                      Save
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {resetModalUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
              <div className={`rounded-3xl p-6 max-w-sm w-full space-y-4 ${isDark ? "glass-surface-dark text-white" : "glass-surface-light text-black shadow-2xl"}`}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-500/15">
                  <h3 className="text-sm font-bold">Reset Password</h3>
                  <button onClick={() => { setResetModalUser(null); setResetResultData(null); }} className="text-xs text-zinc-500 btn-spring">✕</button>
                </div>

                {!resetResultData ? (
                  <form onSubmit={handleResetPassword} className="space-y-3">
                    <p className="text-xs text-zinc-500">
                      Target: <span className="font-bold text-black dark:text-white">{resetModalUser.email}</span>
                    </p>
                    <div>
                      <label className="text-xs font-semibold block mb-1">New Password (optional)</label>
                      <input
                        type="text"
                        placeholder="Leave empty to auto-generate"
                        value={newResetPassword}
                        onChange={e => setNewResetPassword(e.target.value)}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setResetModalUser(null)}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-spring border border-zinc-500/20"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl text-white text-xs font-bold bg-green-600 hover:bg-green-700 btn-spring shadow-md shadow-green-600/25"
                      >
                        Reset
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-xl text-xs space-y-1 border border-green-500/30 bg-green-500/10 text-green-500">
                      <div className="font-bold">Password Reset Done:</div>
                      <code className="font-mono font-bold text-xs bg-black/20 px-2 py-0.5 rounded">{resetResultData.temporaryPassword}</code>
                    </div>
                    <button
                      onClick={() => { setResetModalUser(null); setResetResultData(null); }}
                      className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-green-600 hover:bg-green-700 btn-spring shadow-md shadow-green-600/25"
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
              <div className={`rounded-3xl p-6 max-w-sm w-full space-y-4 ${isDark ? "glass-surface-dark text-white" : "glass-surface-light text-black shadow-2xl"}`}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-500/15">
                  <h3 className="text-sm font-bold">Export Leads</h3>
                  <button onClick={() => setExportJobId(null)} className="text-xs text-zinc-500 btn-spring">✕</button>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5">Format</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["xlsx", "csv", "json", "html"] as const).map(fmt => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setExportFormat(fmt)}
                        className={`py-2 text-xs font-bold uppercase rounded-xl border transition btn-spring ${exportFormat === fmt ? (isDark ? "bg-green-600 border-green-600 text-white shadow-md shadow-green-600/25" : "bg-black border-black text-white shadow-md shadow-black/15") : (isDark ? "glass-icon-dark text-zinc-400" : "glass-icon-light text-zinc-600")}`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold block mb-1.5">Columns</label>
                  <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {EXPORT_COLUMNS.map(col => {
                      const isChecked = selectedCols.includes(col.key);
                      return (
                        <label key={col.key} className={`flex items-center gap-1.5 p-2 rounded-xl text-xs cursor-pointer btn-spring ${isChecked ? (isDark ? "bg-green-600/15 border border-green-500/40 text-white" : "bg-black/[0.04] border border-black/20 text-black font-semibold") : (isDark ? "glass-icon-dark text-zinc-400" : "glass-icon-light text-zinc-500")}`}>
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
                            className="w-3.5 h-3.5 rounded text-green-600 focus:ring-green-500 cursor-pointer"
                          />
                          <span className="truncate">{col.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setExportJobId(null)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-spring border border-zinc-500/20"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={downloadFile}
                    className="px-4 py-1.5 rounded-xl text-white text-xs font-bold bg-green-600 hover:bg-green-700 btn-spring shadow-md shadow-green-600/25"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>
          )}

          {isTableZoomed && (
            <div className={`fixed inset-0 z-50 flex flex-col p-4 md:p-6 backdrop-blur-3xl animate-in fade-in duration-200 ${isDark ? "bg-black/90 text-white" : "bg-white/95 text-black"}`}>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-500/20 shrink-0 gap-3">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsTableZoomed(false)}
                    className={`p-2.5 rounded-xl text-xs font-bold btn-spring flex items-center gap-2 ${isDark ? "glass-icon-dark text-white hover:border-white/30" : "glass-icon-light text-black hover:border-black/30"}`}
                    title="Zoom Out (Exit Fullscreen)"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="4 14 10 14 10 20"></polyline><polyline points="20 10 14 10 14 4"></polyline><line x1="14" y1="10" x2="21" y2="3"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>
                    <span>Zoom Out</span>
                  </button>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold capitalize">{selectedJob?.target}</h2>
                    <span className="text-[11px] text-zinc-500">{filteredResults.length} leads displayed (Press Esc to zoom out)</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Search in table..."
                    value={searchFilter}
                    onChange={e => setSearchFilter(e.target.value)}
                    className={`px-4 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white focus:border-green-500" : "glass-input-light text-black focus:border-black"}`}
                  />
                  <button
                    onClick={() => setExportJobId(selectedJobId)}
                    disabled={jobResults.length === 0}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl btn-spring shadow-md shadow-green-600/25 flex items-center gap-1.5 shrink-0"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                    Export
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto overflow-x-hidden mt-4 rounded-2xl border border-zinc-500/20">
                <table className="w-full table-fixed text-left text-xs">
                  <thead className={`text-[11px] font-bold uppercase tracking-wider border-b border-zinc-500/20 sticky top-0 z-10 backdrop-blur-2xl ${isDark ? "bg-[#121216]/95 text-zinc-400" : "bg-white/95 text-zinc-600"}`}>
                    <tr>
                      <th className="w-[22%] px-4 py-3">Business</th>
                      <th className="w-[14%] px-3 py-3">Phone</th>
                      <th className="w-[15%] px-3 py-3">Website</th>
                      <th className="w-[13%] px-3 py-3">Category</th>
                      <th className="w-[10%] px-3 py-3">Rating</th>
                      <th className="w-[10%] px-3 py-3">City</th>
                      <th className="w-[16%] px-4 py-3">Address</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-500/10">
                    {filteredResults.map((r, i) => (
                      <tr key={i} className={`transition ${isDark ? "hover:bg-white/[0.04]" : "hover:bg-black/[0.03]"}`}>
                        <td className="px-4 py-3 font-bold truncate" title={r.title}>{r.title}</td>
                        <td className="px-3 py-3 font-mono text-[11px] whitespace-nowrap">{r.phone_1 || "—"}</td>
                        <td className="px-3 py-3">
                          {r.website ? (
                            <a href={r.website} target="_blank" rel="noreferrer" className="text-green-600 hover:underline truncate block text-[11px]" title={r.website}>
                              {r.website.replace(/^https?:\/\//, '')}
                            </a>
                          ) : "—"}
                        </td>
                        <td className="px-3 py-3 text-zinc-500 truncate" title={r.category || ""}>{r.category || "—"}</td>
                        <td className="px-3 py-3 whitespace-nowrap font-semibold">
                          {r.rating ? `${r.rating} (${r.reviews || 0})` : "—"}
                        </td>
                        <td className="px-3 py-3 text-zinc-500 truncate" title={r.city || ""}>{r.city || "—"}</td>
                        <td className="px-4 py-3 text-zinc-500 truncate text-[11px]" title={r.address || ""}>{r.address || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {showProfileModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4">
              <div className={`rounded-3xl p-6 max-w-md w-full space-y-4 max-h-[90vh] overflow-y-auto ${isDark ? "glass-surface-dark text-white" : "glass-surface-light text-black shadow-2xl"}`}>
                <div className="flex items-center justify-between border-b pb-3 border-zinc-500/15">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-500/20 bg-zinc-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {profileAvatar ? (
                        <img src={profileAvatar} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span>{(profileUsername || profileName || user?.email || "U")[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">My Profile & Security</h3>
                      <p className="text-[11px] text-zinc-500">{user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowProfileModal(false);
                      setProfileMsg(null);
                    }}
                    className="text-xs text-zinc-500 hover:text-black dark:hover:text-white btn-spring"
                  >
                    ✕
                  </button>
                </div>

                {profileMsg && (
                  <div className={`p-3 rounded-xl border text-xs font-semibold ${profileMsg.type === "success" ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500"}`}>
                    {profileMsg.text}
                  </div>
                )}

                <form onSubmit={handleUpdateProfile} className="space-y-3.5">
                  <div>
                    <label className="text-xs font-semibold block mb-1">Display Name</label>
                    <input
                      type="text"
                      placeholder="Your Full Name"
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-zinc-500">@</span>
                      <input
                        type="text"
                        placeholder="username"
                        value={profileUsername}
                        onChange={e => setProfileUsername(e.target.value)}
                        className={`w-full pl-7 pr-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold block mb-1">Avatar Image URL</label>
                    <input
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={profileAvatar}
                      onChange={e => setProfileAvatar(e.target.value)}
                      className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                    />
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[11px] text-zinc-500">Presets:</span>
                      {[
                        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=60",
                        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=60",
                        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=60"
                      ].map((presetUrl, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setProfileAvatar(presetUrl)}
                          className="w-6 h-6 rounded-full overflow-hidden border border-zinc-500/20 hover:scale-110 transition shrink-0"
                        >
                          <img src={presetUrl} alt="preset" className="w-full h-full object-cover" />
                        </button>
                      ))}
                      {profileAvatar && (
                        <button
                          type="button"
                          onClick={() => setProfileAvatar("")}
                          className="text-[10px] text-zinc-400 hover:text-red-500 ml-1"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-zinc-500/15 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold block">Change Password</label>
                      <button
                        type="button"
                        onClick={handleProfileForgotPassword}
                        className="text-[11px] text-green-600 hover:underline font-semibold"
                      >
                        Forgot password? Reset via mail
                      </button>
                    </div>

                    <div>
                      <label className="text-[11px] text-zinc-500 block mb-1">Current Password (required to change)</label>
                      <input
                        type="password"
                        placeholder="Current Password"
                        value={profileCurrentPassword}
                        onChange={e => setProfileCurrentPassword(e.target.value)}
                        className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">New Password</label>
                        <input
                          type="password"
                          placeholder="New Password"
                          value={profileNewPassword}
                          onChange={e => setProfileNewPassword(e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-zinc-500 block mb-1">Confirm New Password</label>
                        <input
                          type="password"
                          placeholder="Repeat New Password"
                          value={profileConfirmPassword}
                          onChange={e => setProfileConfirmPassword(e.target.value)}
                          className={`w-full px-3.5 py-2 rounded-xl text-xs outline-none transition ${isDark ? "glass-input-dark text-white" : "glass-input-light text-black"}`}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileModal(false);
                        setProfileMsg(null);
                      }}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold btn-spring border border-zinc-500/20"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={profileLoading}
                      className="px-4 py-1.5 rounded-xl text-white text-xs font-bold bg-green-600 hover:bg-green-700 btn-spring shadow-md shadow-green-600/25 disabled:opacity-50"
                    >
                      {profileLoading ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
