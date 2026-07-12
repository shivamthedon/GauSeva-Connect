import { useState, useEffect, useCallback, useRef } from "react";

const CACHE_KEY = "gauseva_settings_cache_v1";
const CACHE_TTL_MS = 60_000;

function readCache(): any | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - (parsed.ts || 0) > CACHE_TTL_MS) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeCache(data: any) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch {
    /* ignore quota */
  }
}

export function useSiteSettings() {
  const cached = typeof window !== "undefined" ? readCache() : null;
  const [settings, setSettings] = useState<any>(cached || {});
  const [loading, setLoading] = useState(!cached);
  const inflight = useRef<Promise<void> | null>(null);

  const fetchSettings = useCallback(async (force = false) => {
    if (inflight.current && !force) return inflight.current;
    const run = (async () => {
      try {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
        const res = await fetch(`${backendUrl}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          writeCache(data);
        }
      } catch {
        /* keep last known */
      } finally {
        setLoading(false);
        inflight.current = null;
      }
    })();
    inflight.current = run;
    return run;
  }, []);

  useEffect(() => {
    fetchSettings();
    const onVisible = () => {
      if (document.visibilityState === "visible") fetchSettings();
    };
    document.addEventListener("visibilitychange", onVisible);
    // Refresh less often — settings rarely change
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") fetchSettings();
    }, 120_000);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [fetchSettings]);

  return { settings, loading, refreshSettings: () => fetchSettings(true) };
}
