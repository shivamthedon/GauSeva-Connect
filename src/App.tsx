import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  PlusCircle,
  Shield,
  Heart,
  LogIn,
  ChevronDown,
  LayoutGrid,
  IndianRupee,
  User,
  AlertCircle,
  UserPlus,
} from "lucide-react";
import {
  Listing,
} from "./types";
import { ListingCard } from "./components/ListingCard";
import { CreateListingModal } from "./components/CreateListingModal";
import { ListingDetailsModal } from "./components/ListingDetailsModal";
import { ProfileModal } from "./components/ProfileModal";
import { useFirebaseData } from "./hooks/useFirebaseData";
import { useAuth } from "./hooks/useAuth";
import { useSiteSettings } from "./hooks/useSiteSettings";
import { logOut, auth } from "./lib/firebase";

export default function App() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { settings } = useSiteSettings();
  const {
    listings,
    verificationRequests,
    usersInfo,
    loading: dataLoading,
    listingsData,
    listingsLoading,
    fetchListings,
    addVerificationRequest,
    addListing,
    deleteListing,
  } = useFirebaseData();

  // Onboarding check — do NOT wait for full marketplace data load (was causing auth↔DB lag).
  const onboardingChecked = useRef(false);
  useEffect(() => {
    if (authLoading || !user) return;
    if (onboardingChecked.current) return;
    if (window.location.pathname === "/onboarding") return;

    const checkOnboarding = async () => {
      // Fast path: users snapshot already loaded
      const dbUser = usersInfo.find((u: any) => u.id === user.uid);
      if (dbUser) {
        onboardingChecked.current = true;
        if (!dbUser.onboarded) navigate("/onboarding");
        return;
      }

      // If full data still loading, wait for next usersInfo update instead of blocking UI
      if (dataLoading) return;

      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
        const headers: Record<string, string> = {};
        try {
          const { getCachedIdToken } = await import("./lib/firebase");
          const idToken = await getCachedIdToken(false);
          if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
        } catch { /* public projection still includes onboarded */ }
        const res = await fetch(`${backendUrl}/api/users/${user.uid}`, { headers });
        if (res.ok) {
          const userData = await res.json();
          onboardingChecked.current = true;
          if (!userData.onboarded) navigate("/onboarding");
          return;
        }
      } catch {}

      onboardingChecked.current = true;
    };

    checkOnboarding();
  }, [user, authLoading, dataLoading, usersInfo, navigate]);

  // Modal States
  const [isListingModalOpen, setIsListingModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // States for Marketplace filtering
  const [searchInput, setSearchInput] = useState(""); // What the user types
  const [searchQuery, setSearchQuery] = useState(""); // Debounced value sent to API
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input - wait 400ms after user stops typing
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setSearchQuery(value);
    }, 400);
  }, []);
  const [filterType, setFilterType] = useState<"all" | "adopt" | "sell" | "favorites">("all");
  const [milkingFilter, setMilkingFilter] = useState<
    "all" | "milking" | "non-milking" | "calf" | "dry" | "pregnant" | "heifer"
  >("all");
  
  // New Filter & Sort controls
  const [maxPrice, setMaxPrice] = useState<number>(150000);
  const [sortBy, setSortBy] = useState<"newest" | "priceAsc" | "priceDesc" | "age">("newest");

  const verifiedUserIds = useMemo(() => new Set(verificationRequests.filter(r => r.status === 'approved').map(r => r.userId)), [verificationRequests]);

  // Local storage favorites state
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("gauseva_favorites");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Server-side pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch listings from server when filters change
  useEffect(() => {
    if (filterType === "favorites") return; // Favorites are client-side only
    setCurrentPage(1);
    fetchListings({
      type: filterType === "all" ? undefined : filterType,
      status: milkingFilter === "all" ? undefined : milkingFilter,
      maxPrice: maxPrice < 150000 ? maxPrice : undefined,
      search: searchQuery || undefined,
      sort: sortBy,
      page: 1,
      limit: 20,
    });
  }, [filterType, milkingFilter, maxPrice, searchQuery, sortBy, fetchListings]);

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    fetchListings({
      type: filterType === "all" ? undefined : filterType,
      status: milkingFilter === "all" ? undefined : milkingFilter,
      maxPrice: maxPrice < 150000 ? maxPrice : undefined,
      search: searchQuery || undefined,
      sort: sortBy,
      page: nextPage,
      limit: 20,
    });
  };

  const handleToggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem("gauseva_favorites", JSON.stringify(updated));
      } catch (err) {
        console.error("Local storage sync issue: ", err);
      }
      return updated;
    });
  };

  const handleAddListing = async (
    newListing: Omit<Listing, "id" | "postedAt" | "verified">,
  ) => {
    let currentUser = user || auth.currentUser;
    if (!currentUser) {
      setIsListingModalOpen(false);
      navigate("/sign-in");
      return;
    }
    
    try {
      await addListing(newListing);
      // Refresh listings after adding
      fetchListings({ page: 1, limit: 20 });
    } catch (e: any) {
      alert("Failed: " + e.message);
      throw e;
    }
  };

  // Use server-side filtered listings, or client-side for favorites.
  // Favorites: prefer paginated cache + dump cache so we don't require full /api/data listings.
  const filteredListings = [...(filterType === "favorites"
    ? (() => {
        const pool = [
          ...(listingsData?.listings || []),
          ...listings,
        ];
        const seen = new Set<string>();
        return pool.filter((l) => {
          if (!favorites.includes(l.id) || seen.has(l.id)) return false;
          seen.add(l.id);
          return true;
        });
      })()
    : (listingsData?.listings || [])
  )].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

  const hasMore = filterType === "favorites" ? false : (listingsData?.pagination?.hasMore || false);

  const renderMarketplacePage = () => (
    <>
      {/* Hero */}
      <section className="relative mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-950 text-white shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-[#5c0000] via-[#800000] to-[#9a3412]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(251,191,36,0.25),_transparent_55%)]" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="relative z-10 p-6 sm:p-10 lg:p-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-wider text-amber-100 mb-4">
            <Heart className="w-3.5 h-3.5" /> Gau Seva Marketplace
          </div>
          <h2 className="font-yatra text-3xl sm:text-5xl text-amber-50 mb-2 tracking-wide drop-shadow-sm">
            गावो विश्वस्य मातरः
          </h2>
          <p className="font-sanatan text-base sm:text-xl text-amber-100/90 mb-2">
            “Cows are the Mothers of the Universe”
          </p>
          <p className="text-white/75 text-sm max-w-xl leading-relaxed mb-6">
            Connect with verified devotees to adopt and serve indigenous Gaumata.
            List, discover, and protect with devotion — built for the seva community.
          </p>
          <div className="flex flex-wrap gap-3">
            {user ? (
              <button onClick={() => setIsListingModalOpen(true)} className="gs-btn-primary bg-amber-400 hover:brightness-105 text-[#450A0A] shadow-amber-950/30 border-amber-200/40">
                <PlusCircle className="w-4 h-4" /> List Gaumata
              </button>
            ) : (
              <button onClick={() => navigate("/sign-up")} className="gs-btn-primary bg-amber-400 text-[#450A0A] border-amber-200/40">
                <UserPlus className="w-4 h-4" /> Join the community
              </button>
            )}
            <a href="#marketplace" className="gs-btn-secondary bg-white/10 border-white/20 text-white hover:bg-white/15">
              Browse listings
            </a>
          </div>
        </div>
      </section>

      {/* Filter Panel */}
      <section id="marketplace" className="gs-card p-4 sm:p-5 mb-8 scroll-mt-24">
        <div className="relative w-full mb-4">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
          <input
            type="search"
            placeholder="Search by name, breed, location…"
            className="gs-input pl-11"
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { key: "all", label: "All", icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { key: "adopt", label: "Adoption", icon: <AlertCircle className="w-3.5 h-3.5" /> },
            { key: "sell", label: "For sale", icon: <IndianRupee className="w-3.5 h-3.5" /> },
            { key: "favorites", label: "Watchlist", icon: <Heart className="w-3.5 h-3.5" />, count: favorites.length },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setFilterType(item.key as any)}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 border ${
                filterType === item.key
                  ? "bg-[#800000] text-white border-[#800000] shadow-sm"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              {item.icon}
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-extrabold ${filterType === item.key ? "bg-white/20" : "bg-slate-100 text-slate-600"}`}>
                  {item.count}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-end">
          <div className="relative flex-1 min-w-[140px]">
            <label className="gs-label">Status</label>
            <select
              value={milkingFilter}
              onChange={(e) => setMilkingFilter(e.target.value as any)}
              className="gs-input appearance-none pr-10 text-sm font-semibold cursor-pointer"
            >
              <option value="all">All status</option>
              <option value="milking">Active milking</option>
              <option value="dry">Dry</option>
              <option value="pregnant">Pregnant</option>
              <option value="heifer">Heifer</option>
              <option value="non-milking">Retired</option>
              <option value="calf">Calf</option>
            </select>
            <ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative flex-1 min-w-[140px]">
            <label className="gs-label">Sort</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="gs-input appearance-none pr-10 text-sm font-semibold cursor-pointer"
            >
              <option value="newest">Newest first</option>
              <option value="priceAsc">Price: low → high</option>
              <option value="priceDesc">Price: high → low</option>
              <option value="age">Age: youngest</option>
            </select>
            <ChevronDown className="absolute right-3 bottom-3 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {(filterType === "all" || filterType === "sell" || filterType === "favorites") && (
            <div className="flex-1 min-w-[200px]">
              <div className="flex justify-between items-center mb-1.5">
                <span className="gs-label mb-0">Budget</span>
                <span className="text-xs font-extrabold text-[#800000] flex items-center">
                  <IndianRupee className="w-3 h-3" />{maxPrice.toLocaleString("en-IN")}
                </span>
              </div>
              <input
                type="range"
                min="1000"
                max="150000"
                step="2000"
                className="w-full accent-[#800000] cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none focus:outline-none"
                style={{
                  background: `linear-gradient(to right, #800000 0%, #800000 ${((maxPrice - 1000) / (150000 - 1000)) * 100}%, #e2e8f0 ${((maxPrice - 1000) / (150000 - 1000)) * 100}%, #e2e8f0 100%)`,
                }}
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
              />
            </div>
          )}

          {(searchQuery || filterType !== "all" || milkingFilter !== "all" || maxPrice !== 150000 || sortBy !== "newest") && (
            <button
              onClick={() => { setSearchInput(""); setSearchQuery(""); setFilterType("all"); setMilkingFilter("all"); setMaxPrice(150000); setSortBy("newest"); }}
              className="gs-btn-secondary whitespace-nowrap h-[42px]"
            >
              Clear all
            </button>
          )}
        </div>
      </section>

      {filteredListings.length > 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
          }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
        >
          {filteredListings.map((listing) => (
            <motion.div key={listing.id} variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}>
              <ListingCard
                listing={listing}
                onClick={() => setSelectedListing(listing)}
                isFavorite={favorites.includes(listing.id)}
                onToggleFavorite={handleToggleFavorite}
                isUploaderVerified={listing.userId ? verifiedUserIds.has(listing.userId) : false}
              />
            </motion.div>
          ))}
        </motion.div>
      ) : listingsLoading && currentPage === 1 ? (
        <div className="text-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#800000] mx-auto" />
          <p className="text-sm text-slate-500 mt-3 font-medium">Loading gaumata…</p>
        </div>
      ) : (
        <div className="text-center py-16 gs-card max-w-lg mx-auto p-8">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Shield className="w-7 h-7 text-slate-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-1.5">No gaumata found</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">Try adjusting your search or filters.</p>
          <button
            onClick={() => { setSearchInput(""); setSearchQuery(""); setFilterType("all"); setMilkingFilter("all"); setMaxPrice(150000); setSortBy("newest"); }}
            className="gs-btn-secondary mt-6"
          >
            Clear filters
          </button>
        </div>
      )}

      {hasMore && filteredListings.length > 0 && (
        <div className="text-center mt-10">
          <button
            onClick={handleLoadMore}
            disabled={listingsLoading}
            className="gs-btn-secondary px-8 py-3 disabled:opacity-50"
          >
            {listingsLoading ? "Loading…" : "Load more gaumata"}
          </button>
          <p className="text-xs text-slate-400 mt-2">
            Showing {filteredListings.length} of {listingsData?.pagination?.total || 0}
          </p>
        </div>
      )}
    </>
  );



  // Check if user is banned
  const isBanned = useMemo(() => {
    if (!user) return false;
    const dbUser = usersInfo.find((u: any) => u.id === user.uid);
    return dbUser?.banned || false;
  }, [user, usersInfo]);

  // Maintenance mode check — require a real admin session token, not the weak adminAuth flag alone.
  const isMaintenanceMode = settings?.maintenance_mode?.enabled || false;
  const isAdminUser =
    typeof window !== "undefined" &&
    !!localStorage.getItem("adminToken") &&
    localStorage.getItem("adminToken")!.trim().length > 0;

  // Banned user screen
  if (isBanned && !isAdminUser) {
    return (
      <div className="gs-page-bg min-h-screen flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-red-700 mb-2 tracking-tight">Account suspended</h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            Your account has been suspended by an administrator. Contact support if you believe this is an error.
          </p>
          <button
            onClick={() => { logOut(); window.location.reload(); }}
            className="gs-btn-primary bg-red-600 hover:brightness-110"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  // Maintenance mode screen
  if (isMaintenanceMode && !isAdminUser) {
    return (
      <div className="gs-page-bg min-h-screen flex flex-col justify-center items-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-amber-100">
            <Shield className="w-8 h-8 text-amber-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Under maintenance</h1>
          <p className="text-slate-500 text-sm mb-6 leading-relaxed">
            {settings.maintenance_mode?.message || "We're performing maintenance. Please check back soon."}
          </p>
          <p className="text-xs text-slate-400 font-medium">GauSeva Connect</p>
        </div>
      </div>
    );
  }

  return (
    <div className="gs-page-bg font-sans flex flex-col min-h-screen">
      {/* Site Banner / Announcement */}
      {settings?.site_banner?.active && settings?.site_banner?.message && (
        <div className={`text-white text-center py-2.5 px-4 text-sm font-semibold tracking-wide ${
          settings.site_banner.type === 'warning' ? 'bg-amber-600'
            : settings.site_banner.type === 'success' ? 'bg-emerald-600'
            : 'bg-[#800000]'
        }`}>
          {settings.site_banner.message}
        </div>
      )}

      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-[#800000] via-amber-500 to-[#800000]" />
        <div className="gs-container">
          <div className="flex items-center justify-between gap-3 h-16 sm:h-[4.25rem]">
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#800000] to-[#c2410c] flex items-center justify-center shadow-md shadow-[#800000]/20 shrink-0">
                <Heart className="w-4 h-4 text-white fill-white/20" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-slate-900 group-hover:text-[#800000] transition-colors leading-tight">
                  GauSeva Connect
                </h1>
                <p className="text-[10px] text-slate-400 font-medium hidden sm:block tracking-wide">
                  गावो विश्वस्य मातरः
                </p>
              </div>
            </button>

            <div className="hidden md:block absolute left-1/2 -translate-x-1/2 pointer-events-none">
              <span className="text-sm font-sanatan font-semibold text-[#800000]/80 tracking-wider whitespace-nowrap">
                Protect · Adopt · Serve
              </span>
            </div>

            <div className="flex items-center gap-2 sm:gap-2.5">
              <Link
                to="/about"
                className="hidden sm:inline-flex text-xs font-semibold text-slate-500 hover:text-[#800000] px-2 py-1.5 transition-colors"
              >
                About
              </Link>
              <Link
                to="/contact"
                className="hidden sm:inline-flex text-xs font-semibold text-slate-500 hover:text-[#800000] px-2 py-1.5 transition-colors"
              >
                Contact
              </Link>
              {user ? (
                <>
                  <button
                    onClick={() => setIsProfileModalOpen(true)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 border border-slate-200 pl-1.5 pr-3 py-1.5 rounded-xl transition-all"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt="Profile"
                        className="w-7 h-7 rounded-lg object-cover border border-slate-200"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-lg bg-slate-100 border border-slate-200 flex justify-center items-center">
                        <User className="w-3.5 h-3.5 text-slate-600" />
                      </div>
                    )}
                    <span className="truncate max-w-[100px] hidden sm:inline-block text-xs">
                      Profile
                    </span>
                  </button>
                  <button onClick={() => setIsListingModalOpen(true)} className="gs-btn-primary !py-2.5 !px-3.5 sm:!px-4">
                    <PlusCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">List Gaumata</span>
                    <span className="sm:hidden">List</span>
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <button onClick={() => navigate("/sign-in")} className="gs-btn-secondary !py-2.5">
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign in</span>
                  </button>
                  <button onClick={() => navigate("/sign-up")} className="gs-btn-primary !py-2.5">
                    <UserPlus className="w-4 h-4" />
                    <span className="hidden sm:inline">Sign up</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="gs-container py-6 sm:py-8 w-full flex-grow">
        {renderMarketplacePage()}
      </main>

      <footer className="mt-auto border-t border-slate-200 bg-white/70">
        <div className="gs-container py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#800000] to-[#c2410c] flex items-center justify-center">
                <Heart className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">GauSeva Connect</p>
                <p className="text-[11px] text-slate-400">Serve Gaumata with devotion</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500">
              <Link to="/about" className="hover:text-[#800000] transition-colors">About</Link>
              <Link to="/legal/terms" className="hover:text-[#800000] transition-colors">Terms</Link>
              <Link to="/legal/privacy" className="hover:text-[#800000] transition-colors">Privacy</Link>
              <Link to="/legal/guidelines" className="hover:text-[#800000] transition-colors">Guidelines</Link>
              <Link to="/legal/disclaimer" className="hover:text-[#800000] transition-colors">Disclaimer</Link>
              <Link to="/contact" className="hover:text-[#800000] transition-colors">Contact</Link>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">
            © {new Date().getFullYear()} GauSeva Connect. All rights reserved.
            <button
              onClick={() => { window.location.href = '/admin'; }}
              className="opacity-0 hover:opacity-10 w-2 h-2 rounded-full inline-block ml-2 focus:outline-none"
              aria-label="Admin Access"
            />
          </p>
        </div>
      </footer>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={user}
        listings={listings}
        favorites={favorites}
        verificationRequests={verificationRequests}
        onAddVerificationRequest={addVerificationRequest}
        onDeleteListing={deleteListing}
        onListingClick={(listing) => {
          setIsProfileModalOpen(false); // Close profile modal first
          setSelectedListing(listing); // Open details modal
        }}
      />

      {isListingModalOpen && (
        <CreateListingModal
          onClose={() => setIsListingModalOpen(false)}
          onSubmit={handleAddListing}
        />
      )}

      {selectedListing && (
        <ListingDetailsModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          isFavorite={favorites.includes(selectedListing.id)}
          onToggleFavorite={handleToggleFavorite}
        />
      )}

    </div>
  );
}
