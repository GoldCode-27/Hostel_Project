import React, { useEffect, useRef, useState, useContext } from "react";
import axios from "axios";
import { Outlet, Navigate, Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { API_BASE_URL } from "../config/api";
import {
  LayoutDashboard,
  Users,
  UserCog,
  LogOut,
  Wrench,
  Receipt,
  Home,
  BedDouble,
  Megaphone,
  Menu,
  X,
  ChevronRight,
  Sparkles,
  MessageCircle,
  Camera,
  ChevronDown,
} from "lucide-react";
import NotificationBell from "../components/NotificationBell";
import FloatingAssistant from "../components/FloatingAssistant";

// ── Soft pastel role palettes ─────────────────────────────────────────────
const ROLE_THEME = {
  admin: {
    // Soft sky blue
    sidebar: "bg-gradient-to-b from-sky-50 to-blue-50",
    sidebarBorder: "border-blue-100",
    topStripe: "bg-gradient-to-r from-sky-400 to-blue-500",
    logoRing: "ring-blue-200",
    logoBg: "bg-gradient-to-br from-sky-400 to-blue-500",
    logoShadow: "shadow-blue-200",
    navActive:
      "bg-white text-blue-700 font-semibold shadow-sm border border-blue-100",
    navHover: "hover:bg-white/70 hover:text-blue-700",
    navText: "text-slate-500",
    navIcon: "text-blue-300",
    navIconActive: "text-blue-500",
    badge: "bg-blue-100 text-blue-600 ring-1 ring-blue-200",
    badgeDot: "bg-blue-400",
    sectionLabel: "text-blue-400",
    headerStripe: "bg-gradient-to-r from-sky-400 to-blue-500",
    headerBorder: "border-blue-100",
    pageTitle: "text-blue-700",
    avatarBg: "bg-gradient-to-br from-sky-400 to-blue-500",
    avatarShadow: "shadow-blue-200",
    userCardBg: "bg-white/80",
    userCardBorder: "border-blue-100",
    userName: "text-slate-800",
    userRole: "text-blue-400",
    logoutHover: "hover:bg-red-50 hover:text-red-500",
    contentBg: "bg-gradient-to-br from-sky-50/60 to-blue-50/40",
    sparkle: "text-blue-400",
  },
  staff: {
    // Blush rose / pink
    sidebar: "bg-gradient-to-b from-rose-50 to-pink-50",
    sidebarBorder: "border-pink-100",
    topStripe: "bg-gradient-to-r from-rose-400 to-pink-400",
    logoRing: "ring-pink-200",
    logoBg: "bg-gradient-to-br from-rose-400 to-pink-500",
    logoShadow: "shadow-pink-200",
    navActive:
      "bg-white text-rose-600 font-semibold shadow-sm border border-pink-100",
    navHover: "hover:bg-white/70 hover:text-rose-600",
    navText: "text-slate-500",
    navIcon: "text-rose-300",
    navIconActive: "text-rose-500",
    badge: "bg-rose-100 text-rose-600 ring-1 ring-rose-200",
    badgeDot: "bg-rose-400",
    sectionLabel: "text-rose-400",
    headerStripe: "bg-gradient-to-r from-rose-400 to-pink-400",
    headerBorder: "border-pink-100",
    pageTitle: "text-rose-600",
    avatarBg: "bg-gradient-to-br from-rose-400 to-pink-500",
    avatarShadow: "shadow-pink-200",
    userCardBg: "bg-white/80",
    userCardBorder: "border-pink-100",
    userName: "text-slate-800",
    userRole: "text-rose-400",
    logoutHover: "hover:bg-red-50 hover:text-red-500",
    contentBg: "bg-gradient-to-br from-rose-50/60 to-pink-50/40",
    sparkle: "text-rose-400",
  },
  resident: {
    // Warm cream / amber
    sidebar: "bg-gradient-to-b from-amber-50 to-orange-50",
    sidebarBorder: "border-amber-100",
    topStripe: "bg-gradient-to-r from-amber-400 to-orange-400",
    logoRing: "ring-amber-200",
    logoBg: "bg-gradient-to-br from-amber-400 to-orange-400",
    logoShadow: "shadow-amber-200",
    navActive:
      "bg-white text-amber-700 font-semibold shadow-sm border border-amber-100",
    navHover: "hover:bg-white/70 hover:text-amber-700",
    navText: "text-slate-500",
    navIcon: "text-amber-300",
    navIconActive: "text-amber-500",
    badge: "bg-amber-100 text-amber-700 ring-1 ring-amber-200",
    badgeDot: "bg-amber-400",
    sectionLabel: "text-amber-400",
    headerStripe: "bg-gradient-to-r from-amber-400 to-orange-400",
    headerBorder: "border-amber-100",
    pageTitle: "text-amber-700",
    avatarBg: "bg-gradient-to-br from-amber-400 to-orange-400",
    avatarShadow: "shadow-amber-200",
    userCardBg: "bg-white/80",
    userCardBorder: "border-amber-100",
    userName: "text-slate-800",
    userRole: "text-amber-500",
    logoutHover: "hover:bg-red-50 hover:text-red-500",
    contentBg: "bg-gradient-to-br from-amber-50/60 to-orange-50/40",
    sparkle: "text-amber-400",
  },
};

const DashboardLayout = () => {
  const { user, authLoading, logout, updateUser } = useContext(AuthContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSavingProfilePicture, setIsSavingProfilePicture] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const profileMenuRef = useRef(null);
  const profileInputRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!isProfileMenuOpen) return undefined;

    const closeOnOutsideClick = (event) => {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setIsProfileMenuOpen(false);
    };

    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isProfileMenuOpen]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-9 h-9 mb-4 rounded-full border-[3px] border-slate-200 border-t-sky-400 animate-spin" />
        <p className="text-slate-400 text-sm font-medium tracking-wide">
          Loading your workspace…
        </p>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;

  const theme = ROLE_THEME[user.role] || ROLE_THEME.resident;
  const toggleSidebar = () => setIsSidebarOpen((prev) => !prev);

  const handleProfilePictureChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      setProfileMessage("Choose an image smaller than 5 MB.");
      return;
    }

    setIsSavingProfilePicture(true);
    setProfileMessage("");

    try {
      const profilePic = await resizeProfilePicture(file);
      const { data } = await axios.put(
        `${API_BASE_URL}/users/me/profile-picture`,
        { profilePic },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      updateUser({ profilePic: data.profilePic });
      setProfileMessage("Profile photo updated.");
    } catch (error) {
      setProfileMessage(
        error.response?.data?.message || "Could not update profile photo.",
      );
    } finally {
      setIsSavingProfilePicture(false);
    }
  };

  const getNavItems = () => {
    const base = [
      { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { path: "/dashboard/assistant", label: "Assistant", icon: MessageCircle },
    ];
    if (user.role === "admin") {
      base.push(
        { path: "/dashboard/staff", label: "Manage Staff", icon: UserCog },
        { path: "/dashboard/residents", label: "Residents", icon: Users },
        { path: "/dashboard/rooms", label: "Room Allocation", icon: Home },
        { path: "/dashboard/maintenance", label: "Maintenance", icon: Wrench },
        {
          path: "/dashboard/announcements",
          label: "Announcements",
          icon: Megaphone,
        },
        { path: "/dashboard/billing", label: "Billing", icon: Receipt },
      );
    } else if (user.role === "staff") {
      base.push(
        { path: "/dashboard/residents", label: "Residents", icon: Users },
        { path: "/dashboard/rooms", label: "Room Allocation", icon: Home },
        { path: "/dashboard/maintenance", label: "Maintenance", icon: Wrench },
        {
          path: "/dashboard/announcements",
          label: "Announcements",
          icon: Megaphone,
        },
      );
    } else if (user.role === "resident") {
      base.push(
        { path: "/dashboard/my-room", label: "My Room", icon: BedDouble },
        { path: "/dashboard/maintenance", label: "Maintenance", icon: Wrench },
        { path: "/dashboard/billing", label: "My Bills", icon: Receipt },
      );
    }
    return base;
  };

  const navItems = getNavItems();
  const pageLabel =
    location.pathname.split("/").filter(Boolean).pop()?.replace(/-/g, " ") ||
    "Dashboard";

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-700/20 z-40 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* ── SIDEBAR ──────────────────────────────────────────────────────── */}
      <aside
        className={`
        fixed lg:static inset-y-0 left-0 z-50 flex flex-col
        w-[260px] ${theme.sidebar} border-r ${theme.sidebarBorder}
        transform transition-transform duration-300 ease-out
        ${isSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}
      >
        {/* Colored top accent stripe */}
        <div className={`h-1 w-full ${theme.topStripe} shrink-0`} />

        {/* Logo */}
        <div
          className={`px-5 py-4 flex items-center justify-between border-b ${theme.sidebarBorder}`}
        >
          <div className="flex min-w-0 items-center gap-2">
            <img
              src="/logo.jpg"
              alt="ማረፊያ logo"
              className="h-20 w-[59px] shrink-0 object-contain"
            />
            <span className="truncate text-xl font-extrabold text-slate-800">
              ማረፊያ
            </span>
          </div>
          <button
            onClick={toggleSidebar}
            className="lg:hidden w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Section label */}
        <div className="px-5 pt-5 pb-2">
          <span
            className={`text-[10px] font-bold tracking-widest uppercase ${theme.sectionLabel}`}
          >
            Navigation
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)}
                className={`
                  group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm
                  transition-all duration-150
                  ${
                    isActive
                      ? theme.navActive
                      : `${theme.navText} ${theme.navHover}`
                  }
                `}
              >
                <Icon
                  size={17}
                  className={`shrink-0 transition-colors ${isActive ? theme.navIconActive : theme.navIcon}`}
                />
                <span className="flex-1 font-medium">{item.label}</span>
                {isActive && (
                  <ChevronRight size={13} className={theme.navIconActive} />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User card + logout */}
        <div className={`p-4 border-t ${theme.sidebarBorder}`}>
          <div
            className={`flex items-center gap-3 mb-3 p-3 rounded-2xl ${theme.userCardBg} border ${theme.userCardBorder} shadow-sm`}
          >
            <Avatar
              user={user}
              className="h-9 w-9 rounded-xl text-sm"
              theme={theme}
            />
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-bold truncate leading-tight ${theme.userName}`}
              >
                {user.name}
              </p>
              <p
                className={`text-[11px] capitalize font-medium ${theme.userRole}`}
              >
                {user.role}
              </p>
            </div>
          </div>
          <button
            type="button"
            data-button-variant="signout"
            onClick={logout}
            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-400 transition-all duration-150 ${theme.logoutHover}`}
          >
            <LogOut size={13} />
            Sign out
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── FANCY NAVBAR ─────────────────────────────────────────────── */}
        <header className={`shrink-0 bg-white border-b ${theme.headerBorder}`}>
          {/* Thin gradient top stripe */}
          <div className={`h-[3px] w-full ${theme.headerStripe}`} />

          <div className="h-14 flex items-center justify-between px-4 lg:px-6 gap-3">
            {/* Left: hamburger + breadcrumb */}
            <div className="flex items-center gap-3 min-w-0">
              {/* Hamburger button — mobile only */}
              <button
                onClick={toggleSidebar}
                className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 border border-slate-200 transition-colors shrink-0"
              >
                <Menu size={18} />
              </button>

              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-300 text-xs font-semibold hidden sm:inline tracking-wide">
                  ማረፊያ
                </span>
                <span className="text-slate-200 hidden sm:inline text-sm">
                  ›
                </span>
                <div className="flex items-center gap-1.5 min-w-0">
                  <Sparkles size={13} className={`${theme.sparkle} shrink-0`} />
                  <h2
                    className={`text-sm font-bold capitalize truncate ${theme.pageTitle}`}
                  >
                    {pageLabel}
                  </h2>
                </div>
              </div>
            </div>

            {/* Right: date pill + bell + role badge + avatar */}
            <div className="flex items-center gap-2 shrink-0">
              {/* Date pill — md+ */}
              <span className="hidden md:inline-flex items-center text-[11px] text-slate-400 font-medium bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-full whitespace-nowrap">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>

              <NotificationBell />

              {/* Role badge */}
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-full capitalize whitespace-nowrap ${theme.badge}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${theme.badgeDot}`}
                />
                {user.role}
              </span>

              <div className="relative" ref={profileMenuRef}>
                <input
                  ref={profileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />
                <button
                  type="button"
                  aria-label="Open profile menu"
                  aria-expanded={isProfileMenuOpen}
                  onClick={() => setIsProfileMenuOpen((open) => !open)}
                  className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-[#064E3B] shadow-md ring-2 ring-emerald-100"
                >
                  <Avatar
                    user={user}
                    className="absolute inset-0 h-full w-full rounded-full text-xs"
                    theme={theme}
                    branded
                  />
                </button>
                {isProfileMenuOpen && (
                  <div className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-64 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
                    <div className="flex items-center gap-3 border-b border-slate-100 px-1 pb-3">
                      <Avatar
                        user={user}
                        className="h-10 w-10 rounded-xl text-sm"
                        theme={theme}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-800">
                          {user.name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {user.email}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingProfilePicture}
                      onClick={() => profileInputRef.current?.click()}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-60"
                    >
                      <Camera size={16} />
                      {isSavingProfilePicture
                        ? "Saving photo..."
                        : "Change profile photo"}
                    </button>
                    {profileMessage && (
                      <p
                        role="status"
                        className="px-1 pt-2 text-xs text-slate-600"
                      >
                        {profileMessage}
                      </p>
                    )}
                    <button
                      type="button"
                      data-button-variant="signout"
                      onClick={logout}
                      className="mt-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                    >
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                )}
              </div>
              <ChevronDown
                size={14}
                className="text-slate-400"
                aria-hidden="true"
              />
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className={`flex-1 overflow-auto p-4 lg:p-6 ${theme.contentBg}`}>
          <Outlet />
        </div>
      </main>
      {location.pathname !== "/dashboard/assistant" && <FloatingAssistant />}
    </div>
  );
};

const Avatar = ({ user, className, theme, branded = false }) => (
  <span
    className={`relative flex shrink-0 items-center justify-center overflow-hidden font-black text-white ${branded ? "bg-[#064E3B]" : theme.avatarBg} ${className}`}
  >
    {user.profilePic ? (
      <img
        src={user.profilePic}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
    ) : (
      user.name?.charAt(0)?.toUpperCase() || "U"
    )}
  </span>
);

const resizeProfilePicture = (file) =>
  new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 512 / Math.max(image.width, image.height));
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      const context = canvas.getContext("2d");

      if (!context) {
        reject(new Error("Could not process this image."));
        return;
      }

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("Could not read this image."));
    };
    image.src = imageUrl;
  });

export default DashboardLayout;
