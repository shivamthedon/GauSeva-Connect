import { useState, useEffect, useRef, useCallback } from "react";
import { auth, getCachedIdToken } from "../lib/firebase";
import {
  Listing,
  Gaushala,
  EmergencyAlert,
  TransportService,
  VetService,
  Sponsorship,
  VerificationRequest,
} from "../types";

export interface ListingsResponse {
  listings: Listing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ListingFilters {
  type?: string;
  status?: string;
  maxPrice?: number;
  search?: string;
  sort?: string;
  page?: number;
  limit?: number;
}

export function useFirebaseData() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [gaushalas, setGaushalas] = useState<Gaushala[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [transports, setTransportServices] = useState<TransportService[]>([]);
  const [vets, setVets] = useState<VetService[]>([]);
  const [sponsorships, setSponsorships] = useState<Sponsorship[]>([]);
  const [verificationRequests, setVerificationRequests] = useState<VerificationRequest[]>([]);
  const [usersInfo, setUsersInfo] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsData, setListingsData] = useState<ListingsResponse | null>(null);
  const lastDataRef = useRef<string>("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  // When an admin is logged in, forward their session token so the backend
  // returns the full (unsanitized) dataset. Harmless for normal users (null).
  const adminHeaders = (): Record<string, string> => {
    const t = typeof window !== "undefined" ? localStorage.getItem("adminToken") : null;
    return t ? { "X-Admin-Token": t } : {};
  };

  /** Admin token + Firebase ID token (for owner-scoped deletes/writes). */
  const authWriteHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { ...adminHeaders() };
    try {
      const idToken = await getCachedIdToken(false);
      if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
    } catch {
      // ignore token failures; server will 401 if required
    }
    return headers;
  };

  const fetchData = useCallback(async (force = false) => {
    try {
      // lite=1 skips heavy full listings dump (marketplace uses /api/listings).
      // Admins still need full data for the panel.
      const isAdmin = typeof window !== "undefined" && !!localStorage.getItem("adminToken");
      const qs = isAdmin ? "" : "?lite=1";
      const res = await fetch(`${backendUrl}/api/data${qs}`, {
        headers: adminHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch data");
      const data = (await res.json()) as Record<string, any>;

      // Cheap signature — avoid JSON.stringify of entire payload every poll (major lag).
      const sig = [
        data.listings?.length ?? 0,
        data.gaushalas?.length ?? 0,
        data.alerts?.length ?? 0,
        data.users?.length ?? 0,
        data.verificationRequests?.length ?? 0,
        data.listings?.[0]?.id || "",
        data.users?.[0]?.id || "",
      ].join("|");
      if (!force && sig === lastDataRef.current) {
        setLoading(false);
        return;
      }
      lastDataRef.current = sig;

      // Only overwrite listings from dump if server sent them (lite may omit)
      if (Array.isArray(data.listings) && data.listings.length > 0) {
        setListings(data.listings as Listing[]);
      }
      setGaushalas((data.gaushalas as Gaushala[]) || []);
      setAlerts((data.alerts as EmergencyAlert[]) || []);
      setTransportServices((data.transports as TransportService[]) || []);
      setVets((data.vets as VetService[]) || []);
      setSponsorships((data.sponsorships as Sponsorship[]) || []);
      setVerificationRequests((data.verificationRequests as VerificationRequest[]) || []);
      setUsersInfo((data.users as any[]) || []);
    } catch (error) {
      console.error("Error loading data from API:", error);
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchData(true);
    // Poll less aggressively; pause when tab is hidden (saves DB + auth traffic)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      fetchData(false);
    }, 90_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchData(false);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchData]);

  // Paginated listings fetch with server-side filtering
  const fetchListings = useCallback(async (filters: ListingFilters = {}) => {
    setListingsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type && filters.type !== "all") params.set("type", filters.type);
      if (filters.status && filters.status !== "all") params.set("status", filters.status);
      if (filters.maxPrice) params.set("maxPrice", String(filters.maxPrice));
      if (filters.search) params.set("search", filters.search);
      if (filters.sort) params.set("sort", filters.sort);
      params.set("page", String(filters.page || 1));
      params.set("limit", String(filters.limit || 20));

      const res = await fetch(`${backendUrl}/api/listings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch listings");
      const data: ListingsResponse = await res.json();

      if (filters.page && filters.page > 1) {
        // Append for "load more"
        setListingsData(prev => prev ? {
          ...data,
          listings: [...prev.listings, ...data.listings],
        } : data);
      } else {
        setListingsData(data);
      }
    } catch (error) {
      console.error("Error fetching listings:", error);
    } finally {
      setListingsLoading(false);
    }
  }, [backendUrl]);

  const addListing = async (
    listing: Omit<Listing, "id" | "postedAt" | "verified" | "userId">,
  ) => {
    if (!auth.currentUser) throw new Error("Must be logged in");
    const response = await fetch(`${backendUrl}/api/data/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authWriteHeaders()) },
      body: JSON.stringify({
        ...listing,
        userId: auth.currentUser.uid,
        postedAt: new Date().toISOString(),
        verified: false,
      })
    });
    if (!response.ok) throw new Error("Failed to add listing");
    await fetchData(true); // force refresh after mutation
  };

  const addGaushala = async (
    gaushala: Omit<Gaushala, "id" | "verified" | "imageUrl" | "userId">,
  ) => {
    if (!auth.currentUser) throw new Error("Must be logged in");
    const response = await fetch(`${backendUrl}/api/data/gaushalas`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authWriteHeaders()) },
      body: JSON.stringify({
        ...gaushala,
        userId: auth.currentUser.uid,
        verified: false,
        imageUrl: "https://images.unsplash.com/photo-1596733430284-f74370603735?auto=format&fit=crop&q=80&w=600",
      })
    });
    if (!response.ok) throw new Error("Failed to add gaushala");
    await fetchData(true);
  };

  const addAlert = async (
    alert: Omit<EmergencyAlert, "id" | "postedAt" | "status" | "userId">,
  ) => {
    if (!auth.currentUser) throw new Error("Must be logged in");
    const response = await fetch(`${backendUrl}/api/data/alerts`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authWriteHeaders()) },
      body: JSON.stringify({
        ...alert,
        userId: auth.currentUser.uid,
        status: "active",
        postedAt: new Date().toISOString(),
      })
    });
    if (!response.ok) throw new Error("Failed to add alert");
    await fetchData(true);
  };

  const addVet = async (
    vet: Omit<VetService, "id" | "verified" | "userId">,
  ) => {
    if (!auth.currentUser) throw new Error("Must be logged in");
    const response = await fetch(`${backendUrl}/api/data/vets`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authWriteHeaders()) },
      body: JSON.stringify({
        ...vet,
        userId: auth.currentUser.uid,
        verified: false,
      })
    });
    if (!response.ok) throw new Error("Failed to add vet service");
    await fetchData(true);
  };

  const addTransport = async (
    transport: Omit<TransportService, "id" | "verified" | "userId">,
  ) => {
    if (!auth.currentUser) throw new Error("Must be logged in");
    const response = await fetch(`${backendUrl}/api/data/transports`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authWriteHeaders()) },
      body: JSON.stringify({
        ...transport,
        userId: auth.currentUser.uid,
        verified: false,
      })
    });
    if (!response.ok) throw new Error("Failed to add transport service");
    await fetchData(true);
  };

  const addSponsorship = async (
    sponsorship: Omit<Sponsorship, "id" | "status" | "submittedAt">,
  ) => {
    if (!auth.currentUser) throw new Error("Must be logged in");
    const response = await fetch(`${backendUrl}/api/data/sponsorships`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authWriteHeaders()) },
      body: JSON.stringify({
        ...sponsorship,
        userId: auth.currentUser.uid,
        status: "pending",
        submittedAt: new Date().toISOString(),
      })
    });
    if (!response.ok) throw new Error("Failed to add sponsorship");
    await fetchData(true);
  };

  const addVerificationRequest = async (
    request: Omit<VerificationRequest, "id" | "status" | "submittedAt">,
  ) => {
    if (!auth.currentUser) throw new Error("Must be logged in");
    const response = await fetch(`${backendUrl}/api/data/verificationRequests`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authWriteHeaders()) },
      body: JSON.stringify({
        ...request,
        userId: auth.currentUser.uid,
        status: "pending",
        submittedAt: new Date().toISOString(),
      })
    });
    if (!response.ok) throw new Error("Failed to submit verification request");
    await fetchData(true);
  };

  const checkAuth = () => {
    // Require a real admin session token (not the forgeable adminAuth flag alone).
    const isAdmin =
      typeof window !== "undefined" &&
      !!localStorage.getItem("adminToken") &&
      localStorage.getItem("adminToken")!.trim().length > 0;
    if (!auth.currentUser && !isAdmin) throw new Error("Must be logged in");
  };

  const deleteListing = async (id: string) => {
    checkAuth();
    const response = await fetch(`${backendUrl}/api/data/listings/${id}`, {
      method: "DELETE",
      headers: await authWriteHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete listing");
    await fetchData(true);
  };

  const deleteUser = async (id: string) => {
    const response = await fetch(`${backendUrl}/api/users?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: await authWriteHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete user");
    await fetchData(true);
  };

  const deleteGaushala = async (id: string) => {
    checkAuth();
    const response = await fetch(`${backendUrl}/api/data/gaushalas/${id}`, {
      method: "DELETE",
      headers: await authWriteHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete gaushala");
    await fetchData(true);
  };

  const deleteAlert = async (id: string) => {
    checkAuth();
    const response = await fetch(`${backendUrl}/api/data/alerts/${id}`, {
      method: "DELETE",
      headers: await authWriteHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete alert");
    await fetchData(true);
  };

  const deleteVet = async (id: string) => {
    checkAuth();
    const response = await fetch(`${backendUrl}/api/data/vets/${id}`, {
      method: "DELETE",
      headers: await authWriteHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete vet service");
    await fetchData(true);
  };

  const deleteTransport = async (id: string) => {
    checkAuth();
    const response = await fetch(`${backendUrl}/api/data/transports/${id}`, {
      method: "DELETE",
      headers: await authWriteHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete transport service");
    await fetchData(true);
  };

  const deleteSponsorship = async (id: string) => {
    checkAuth();
    const response = await fetch(`${backendUrl}/api/data/sponsorships/${id}`, {
      method: "DELETE",
      headers: await authWriteHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete sponsorship record");
    await fetchData(true);
  };

  const deleteVerificationRequest = async (id: string) => {
    checkAuth();
    const response = await fetch(`${backendUrl}/api/data/verificationRequests/${id}`, {
      method: "DELETE",
      headers: await authWriteHeaders(),
    });
    if (!response.ok) throw new Error("Failed to delete verification request");
    await fetchData(true);
  };

  const verifyItem = async (collectionName: string, id: string, verified: boolean) => {
    checkAuth();
    const response = await fetch(`${backendUrl}/api/data/${collectionName}/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...(await authWriteHeaders()) },
      body: JSON.stringify({ verified })
    });
    if (!response.ok) throw new Error("Failed to verify item");
    await fetchData(true);
  };

  const refreshData = useCallback(() => fetchData(true), [fetchData]);

  return {
    listings,
    gaushalas,
    alerts,
    transports,
    vets,
    sponsorships,
    verificationRequests,
    usersInfo,
    loading,
    listingsData,
    listingsLoading,
    fetchListings,
    refreshData,
    addListing,
    addGaushala,
    addAlert,
    addVet,
    addTransport,
    addSponsorship,
    addVerificationRequest,
    deleteListing,
    deleteUser,
    deleteGaushala,
    deleteAlert,
    deleteVet,
    deleteTransport,
    deleteSponsorship,
    deleteVerificationRequest,
    verifyItem,
  };
}
