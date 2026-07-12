import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from "motion/react";
import {
  X, ShieldCheck, Trash2, CheckCircle, AlertTriangle, LayoutDashboard, Users, Ticket, Settings,
  Eye, Search, RefreshCw, Download, Edit3, Pin, Ban, Megaphone, FileText, BarChart3, Wrench,
  Upload, Star, Mail, Home, Stethoscope, Truck, HandHeart, ScrollText, Send, Lock, KeyRound,
  Menu, ExternalLink, ChevronRight, Clock, Filter, Inbox, Activity, LogOut, Image as ImageIcon,
} from 'lucide-react';
import { useFirebaseData } from '../hooks/useFirebaseData';
import { auth } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
} from 'firebase/auth';

/* ───────────────────────── helpers ───────────────────────── */

const friendlyAuthError = (err: any): string => {
  const code = err?.code || '';
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again in a few minutes.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Use it to sign in.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled in your Firebase project.';
    default:
      return err?.message?.replace('Firebase: ', '') || 'Something went wrong. Please try again.';
  }
};

const fmtDate = (v?: string) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
};

const fmtDateTime = (v?: string) => {
  if (!v) return '—';
  try { return new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
};

const Badge = ({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info' | 'brand' }) => {
  const tones: Record<string, string> = {
    neutral: 'bg-slate-100 text-slate-700 ring-slate-200',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    warning: 'bg-amber-50 text-amber-800 ring-amber-200',
    danger: 'bg-red-50 text-red-700 ring-red-200',
    info: 'bg-sky-50 text-sky-700 ring-sky-200',
    brand: 'bg-[#800000]/10 text-[#800000] ring-[#800000]/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  );
};

const EmptyState = ({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle?: string }) => (
  <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-4">{icon}</div>
    <p className="text-sm font-semibold text-slate-700">{title}</p>
    {subtitle && <p className="text-xs text-slate-400 mt-1 max-w-xs">{subtitle}</p>}
  </div>
);

const PageHeader = ({
  title, subtitle, actions, count,
}: {
  title: string; subtitle?: string; actions?: React.ReactNode; count?: number;
}) => (
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
    <div>
      <div className="flex items-center gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{title}</h2>
        {count !== undefined && (
          <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{count}</span>
        )}
      </div>
      {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
);

const SearchBox = ({ value, onChange, placeholder = 'Search…' }: { value: string; onChange: (v: string) => void; placeholder?: string }) => (
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm w-full sm:w-64 focus:outline-none focus:ring-2 focus:ring-[#800000]/20 focus:border-[#800000]/40"
    />
  </div>
);

const TableShell = ({ children, toolbar }: { children: React.ReactNode; toolbar?: React.ReactNode }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
    {toolbar && (
      <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap items-center gap-2 bg-slate-50/60">
        {toolbar}
      </div>
    )}
    <div className="overflow-x-auto">{children}</div>
  </div>
);

const th = "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50 border-b border-slate-200 whitespace-nowrap";
const td = "px-4 py-3 text-sm text-slate-700 align-middle";
const tr = "border-b border-slate-100 last:border-0 hover:bg-slate-50/80 transition-colors";

const Btn = ({
  children, onClick, variant = 'ghost', size = 'md', className = '', disabled, title, type = 'button',
}: {
  children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'danger' | 'success' | 'ghost' | 'outline' | 'soft';
  size?: 'sm' | 'md' | 'icon'; className?: string; disabled?: boolean; title?: string; type?: 'button' | 'submit';
}) => {
  const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none';
  const sizes = { sm: 'px-2.5 py-1.5 text-xs', md: 'px-3.5 py-2 text-sm', icon: 'p-2' };
  const variants = {
    primary: 'bg-[#800000] text-white hover:bg-[#600000] shadow-sm',
    danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
    success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50',
    soft: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
  };
  return (
    <button type={type} title={title} disabled={disabled} onClick={onClick} className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const ConfirmModal = ({
  open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel, inputLabel, inputPlaceholder, onInput,
}: {
  open: boolean; title: string; message: string; confirmLabel?: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void; inputLabel?: string; inputPlaceholder?: string; onInput?: (v: string) => void;
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onCancel} />
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 8 }}
          className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">{message}</p>
          {inputLabel && (
            <div className="mt-4">
              <label className="block text-xs font-bold text-slate-600 mb-1">{inputLabel}</label>
              <input
                autoFocus
                placeholder={inputPlaceholder}
                onChange={(e) => onInput?.(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/20"
              />
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Btn variant="outline" onClick={onCancel}>Cancel</Btn>
            <Btn variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Btn>
          </div>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const Drawer = ({
  open, title, subtitle, onClose, children, width = 'max-w-lg',
}: {
  open: boolean; title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; width?: string;
}) => (
  <AnimatePresence>
    {open && (
      <div className="fixed inset-0 z-[80] flex justify-end">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/40" onClick={onClose} />
        <motion.aside
          initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className={`relative h-full w-full ${width} bg-white shadow-2xl border-l border-slate-200 flex flex-col`}>
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3 shrink-0">
            <div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">{children}</div>
        </motion.aside>
      </div>
    )}
  </AnimatePresence>
);

/* ───────────────────────── nav model ───────────────────────── */

type TabId =
  | 'dashboard' | 'listings' | 'gaushalas' | 'alerts' | 'vets' | 'transports' | 'sponsorships'
  | 'users' | 'identities' | 'tickets' | 'contacts' | 'reports' | 'reviews'
  | 'analytics' | 'audit' | 'settings';

const NAV_GROUPS: { label: string; items: { id: TabId; label: string; icon: React.ReactNode; badgeKey?: string }[] }[] = [
  {
    label: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
      { id: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
  {
    label: 'Marketplace',
    items: [
      { id: 'listings', label: 'Listings', icon: <CheckCircle className="w-4 h-4" />, badgeKey: 'listings' },
      { id: 'gaushalas', label: 'Gaushalas', icon: <Home className="w-4 h-4" />, badgeKey: 'gaushalas' },
      { id: 'alerts', label: 'Alerts', icon: <AlertTriangle className="w-4 h-4" />, badgeKey: 'alerts' },
      { id: 'vets', label: 'Veterinarians', icon: <Stethoscope className="w-4 h-4" />, badgeKey: 'vets' },
      { id: 'transports', label: 'Transport', icon: <Truck className="w-4 h-4" />, badgeKey: 'transports' },
      { id: 'sponsorships', label: 'Sponsorships', icon: <HandHeart className="w-4 h-4" />, badgeKey: 'sponsorships' },
    ],
  },
  {
    label: 'People',
    items: [
      { id: 'users', label: 'Users', icon: <Users className="w-4 h-4" />, badgeKey: 'users' },
      { id: 'identities', label: 'Verification', icon: <ShieldCheck className="w-4 h-4" />, badgeKey: 'pendingVerifications' },
    ],
  },
  {
    label: 'Support',
    items: [
      { id: 'tickets', label: 'Tickets', icon: <Ticket className="w-4 h-4" />, badgeKey: 'openTickets' },
      { id: 'contacts', label: 'Messages', icon: <Mail className="w-4 h-4" />, badgeKey: 'unreadContacts' },
      { id: 'reports', label: 'Reports', icon: <Ban className="w-4 h-4" />, badgeKey: 'pendingReports' },
      { id: 'reviews', label: 'Reviews', icon: <Star className="w-4 h-4" />, badgeKey: 'reviews' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
      { id: 'audit', label: 'Audit Log', icon: <ScrollText className="w-4 h-4" />, badgeKey: 'audit' },
    ],
  },
];

const TAB_META: Record<TabId, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard', subtitle: 'Platform overview and items that need attention' },
  analytics: { title: 'Analytics', subtitle: 'Listing mix, locations, breeds and user stats' },
  listings: { title: 'Listings', subtitle: 'Manage cattle listings, feature and edit content' },
  gaushalas: { title: 'Gaushalas', subtitle: 'Verify and moderate gaushala profiles' },
  alerts: { title: 'Emergency Alerts', subtitle: 'Resolve and remove community alerts' },
  vets: { title: 'Veterinarians', subtitle: 'Verify and manage vet service listings' },
  transports: { title: 'Transport', subtitle: 'Verify and manage transport services' },
  sponsorships: { title: 'Sponsorships', subtitle: 'Review and verify donor contributions' },
  users: { title: 'Users', subtitle: 'Ban, verify or remove platform users' },
  identities: { title: 'Identity Verification', subtitle: 'Approve or reject ID verification requests' },
  tickets: { title: 'Support Tickets', subtitle: 'Reply and resolve user support requests' },
  contacts: { title: 'Contact Messages', subtitle: 'Inbox from the public contact form' },
  reports: { title: 'Reports', subtitle: 'Moderate user and listing reports' },
  reviews: { title: 'Reviews', subtitle: 'Moderate listing ratings and comments' },
  settings: { title: 'Settings', subtitle: 'Site banner, maintenance mode and data tools' },
  audit: { title: 'Audit Log', subtitle: 'History of admin actions on the platform' },
};

/* ───────────────────────── main component ───────────────────────── */

export function AdminPanel({ onClose }: { onClose?: () => void }) {
  const {
    listings, gaushalas, alerts, transports, vets, sponsorships,
    verificationRequests, usersInfo, deleteListing, deleteGaushala,
    deleteAlert, deleteVet, deleteTransport, deleteSponsorship,
    deleteVerificationRequest, refreshData, deleteUser, verifyItem,
  } = useFirebaseData();

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminExists, setAdminExists] = useState<boolean | null>(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [authView, setAuthView] = useState<'password' | 'otp' | 'reset'>('password');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [loginInfo, setLoginInfo] = useState('');
  const [loginError, setLoginError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [tickets, setTickets] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [auditLog, setAuditLog] = useState<any[]>([]);
  const [siteSettings, setSiteSettings] = useState<any>({});
  const [editingListing, setEditingListing] = useState<any>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [contacts, setContacts] = useState<any[]>([]);
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [confirm, setConfirm] = useState<null | {
    title: string; message: string; confirmLabel?: string; danger?: boolean;
    inputLabel?: string; inputPlaceholder?: string; onConfirm: (input?: string) => void;
  }>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [drawer, setDrawer] = useState<null | { type: 'user' | 'ticket' | 'report' | 'verification'; data: any }>(null);
  const [userDossierTab, setUserDossierTab] = useState<'overview' | 'listings' | 'content' | 'tickets' | 'activity'>('overview');
  const [refreshing, setRefreshing] = useState(false);

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3200);
  };

  const apiCall = async (method: string, path: string, body?: any) => {
    const { adminAuthHeaders } = await import("../lib/adminSession");
    const headers = adminAuthHeaders({ "Content-Type": "application/json" });
    const opts: any = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${backendUrl}${path}`, opts);
    if (!res.ok) {
      let msg = `Failed: ${res.status}`;
      try { const j = await res.json(); if (j?.error) msg = j.error; } catch {}
      throw new Error(msg);
    }
    return res.json();
  };

  const logAudit = async (action: string, target: string, targetId: string, details?: string) => {
    try {
      await apiCall('POST', '/api/audit-log', {
        action, target, targetId, details,
        adminUser: adminUsername || 'admin',
      });
    } catch {}
  };

  const fetchAll = useCallback(async () => {
    const safe = async <T,>(label: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
      try {
        return await fn();
      } catch (e: any) {
        console.warn(`[admin] ${label} failed:`, e?.message || e);
        return fallback;
      }
    };

    // Independent fetches so one failing endpoint does not wipe the whole panel.
    const [dataBundle, reportsRes, auditRes, settingsRes, contactsRes, reviewsRes] = await Promise.all([
      safe('data', () => apiCall('GET', '/api/data'), {} as any),
      safe('reports', () => apiCall('GET', '/api/reports'), [] as any[]),
      safe('audit-log', () => apiCall('GET', '/api/audit-log'), [] as any[]),
      safe('settings', () => apiCall('GET', '/api/settings'), {} as any),
      safe('contacts', () => apiCall('GET', '/api/contacts'), [] as any[]),
      safe('reviews', () => apiCall('GET', '/api/reviews'), [] as any[]),
    ]);

    setTickets(Array.isArray(dataBundle?.tickets) ? dataBundle.tickets : []);
    setReports(Array.isArray(reportsRes) ? reportsRes : []);
    setAuditLog(Array.isArray(auditRes) ? auditRes : []);
    setSiteSettings(settingsRes && typeof settingsRes === 'object' ? settingsRes : {});
    setContacts(Array.isArray(contactsRes) ? contactsRes : []);
    setAllReviews(Array.isArray(reviewsRes) ? reviewsRes : []);
  }, [backendUrl]);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      // Prefer header-based token (avoids token in access logs / Referer).
      fetch(`${backendUrl}/api/admin-session`, {
        headers: { "X-Admin-Token": token, Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setIsAdminAuthenticated(true);
            if (data.username) setAdminUsername(data.username);
          } else {
            localStorage.removeItem('adminToken');
            localStorage.removeItem('adminAuth');
            setIsAdminAuthenticated(false);
            if (data.message) showMessage('error', data.message);
          }
        })
        .catch(() => {
          localStorage.removeItem('adminToken');
          localStorage.removeItem('adminAuth');
          setIsAdminAuthenticated(false);
        });
    }
  }, []);

  useEffect(() => {
    fetch(`${backendUrl}/api/admin-account`)
      .then(res => res.json())
      .then(data => setAdminExists(!!data.exists))
      .catch(() => setAdminExists(true));

    (async () => {
      try {
        if (isSignInWithEmailLink(auth, window.location.href)) {
          let email = window.localStorage.getItem('adminEmailForSignIn') || '';
          if (!email) email = window.prompt('Please confirm your email to finish signing in') || '';
          if (!email) return;
          setAuthBusy(true);
          const cred = await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('adminEmailForSignIn');
          window.history.replaceState({}, document.title, '/admin');
          const idToken = await cred.user.getIdToken();
          await establishSession(idToken);
        }
      } catch (err: any) {
        setLoginError(friendlyAuthError(err));
      } finally {
        setAuthBusy(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    const interval = setInterval(async () => {
      const token = localStorage.getItem('adminToken');
      if (!token) { handleLogout(); return; }
      try {
        const res = await fetch(`${backendUrl}/api/admin-session`, {
          headers: { "X-Admin-Token": token, Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.valid) {
          showMessage('error', data.message || 'Admin session expired.');
          handleLogout();
        }
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [isAdminAuthenticated]);

  useEffect(() => {
    if (isAdminAuthenticated) {
      fetchAll();
      refreshData();
    }
  }, [isAdminAuthenticated]);

  useEffect(() => {
    setSearchTerm('');
    setFilterStatus('all');
    setSelectedItems(new Set());
    setSidebarOpen(false);
  }, [activeTab]);

  const establishSession = async (idToken: string) => {
    const res = await fetch(`${backendUrl}/api/admin-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed.");
    const { setAdminSession } = await import("../lib/adminSession");
    setAdminSession(data.token);
    setAdminUsername(data.username || '');
    setIsAdminAuthenticated(true);
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(''); setLoginInfo(''); setAuthBusy(true);
    try {
      const email = adminEmail.trim();
      if (!email || !adminPassword) throw new Error('Enter an email and password.');
      let cred;
      try {
        cred = await createUserWithEmailAndPassword(auth, email, adminPassword);
      } catch (err: any) {
        if (err?.code === 'auth/email-already-in-use') {
          cred = await signInWithEmailAndPassword(auth, email, adminPassword);
        } else {
          throw err;
        }
      }
      const idToken = await cred.user.getIdToken();
      const res = await fetch(`${backendUrl}/api/admin-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Setup failed.");
      setAdminExists(true);
      await establishSession(idToken);
    } catch (err: any) {
      setLoginError(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(''); setLoginInfo(''); setAuthBusy(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, adminEmail.trim(), adminPassword);
      const idToken = await cred.user.getIdToken();
      await establishSession(idToken);
    } catch (err: any) {
      setLoginError(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSendOtpLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(''); setLoginInfo(''); setAuthBusy(true);
    try {
      const email = adminEmail.trim();
      if (!email) throw new Error('Enter your email first.');
      await sendSignInLinkToEmail(auth, email, {
        url: `${window.location.origin}/admin`,
        handleCodeInApp: true,
      });
      window.localStorage.setItem('adminEmailForSignIn', email);
      setLoginInfo(`A one-time sign-in link was sent to ${email}. Open it on this device to log in.`);
    } catch (err: any) {
      setLoginError(friendlyAuthError(err));
    } finally {
      setAuthBusy(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(''); setLoginInfo(''); setAuthBusy(true);
    try {
      const email = adminEmail.trim();
      if (!email) throw new Error('Enter your email first.');
      await sendPasswordResetEmail(auth, email);
      setLoginInfo(`If an account exists for ${email}, a reset link is on its way. Check your inbox and spam folder.`);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found') {
        setLoginError('No admin account exists for that email yet. Create it from the setup screen first.');
      } else if (code === 'auth/operation-not-allowed') {
        setLoginError('Email/Password sign-in is disabled in your Firebase project. Enable it in Firebase Console → Authentication → Sign-in method.');
      } else {
        setLoginError(friendlyAuthError(err));
      }
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      try {
        await fetch(`${backendUrl}/api/admin-session`, {
          method: "DELETE",
          headers: { "X-Admin-Token": token, Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    try { await auth.signOut(); } catch {}
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminAuth');
    setIsAdminAuthenticated(false);
    setAdminUsername('');
    onClose?.();
  };

  const askConfirm = (opts: NonNullable<typeof confirm>) => {
    setConfirmInput('');
    setConfirm(opts);
  };

  /* ─── actions ─── */

  const handleDelete = async (type: string, id: string) => {
    askConfirm({
      title: 'Delete item?',
      message: 'This action cannot be undone. The item will be permanently removed.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          if (type === 'listings') await deleteListing(id);
          else if (type === 'gaushalas') await deleteGaushala(id);
          else if (type === 'alerts') await deleteAlert(id);
          else if (type === 'vets') await deleteVet(id);
          else if (type === 'transports') await deleteTransport(id);
          else if (type === 'sponsorships') await deleteSponsorship(id);
          else if (type === 'identities') await deleteVerificationRequest(id);
          await logAudit('delete', type, id);
          refreshData();
          showMessage('success', 'Deleted successfully');
        } catch (e: any) { showMessage('error', e.message); }
      },
    });
  };

  const handleBulkDelete = async () => {
    askConfirm({
      title: `Delete ${selectedItems.size} listings?`,
      message: 'Selected listings will be permanently deleted.',
      confirmLabel: 'Delete all',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        const ids = Array.from(selectedItems);
        for (const id of ids) {
          try { await deleteListing(id); } catch {}
        }
        await logAudit('bulk_delete', 'listings', ids.join(','));
        setSelectedItems(new Set());
        refreshData();
        showMessage('success', `${ids.length} items deleted`);
      },
    });
  };

  const handleApproveReject = async (id: string, status: string) => {
    try {
      await apiCall('PUT', `/api/data/verificationRequests/${id}`, { status });
      await logAudit(status === 'approved' ? 'approve' : 'reject', 'verification', id);
      refreshData();
      showMessage('success', `Verification ${status}`);
      if (drawer?.type === 'verification') setDrawer(null);
    } catch (e: any) { showMessage('error', e.message); }
  };

  const handleUserVerify = async (userId: string, userName: string, isVerified: boolean) => {
    askConfirm({
      title: isVerified ? `Revoke verification?` : `Verify user?`,
      message: isVerified
        ? `Remove verified status from ${userName}.`
        : `Mark ${userName} as a verified user.`,
      confirmLabel: isVerified ? 'Revoke' : 'Verify',
      danger: isVerified,
      onConfirm: async () => {
        setConfirm(null);
        try {
          if (isVerified) {
            // Soft-revoke: mark approved requests as rejected instead of deleting history.
            const reqs = verificationRequests.filter(r => r.userId === userId && r.status === 'approved');
            for (const r of reqs) {
              await apiCall('PUT', `/api/data/verificationRequests/${r.id}`, {
                status: 'rejected',
                revokedAt: new Date().toISOString(),
              });
            }
            await logAudit('revoke_verification', 'user', userId);
          } else {
            // Prefer approving an existing pending request; otherwise create one.
            const pending = verificationRequests.find(r => r.userId === userId && r.status === 'pending');
            if (pending) {
              await apiCall('PUT', `/api/data/verificationRequests/${pending.id}`, { status: 'approved' });
            } else {
              const existing = verificationRequests.find(r => r.userId === userId);
              if (existing) {
                await apiCall('PUT', `/api/data/verificationRequests/${existing.id}`, { status: 'approved' });
              } else {
                await apiCall('POST', '/api/data/verificationRequests', {
                  userId, userName, status: 'approved', submittedAt: new Date().toISOString(),
                });
              }
            }
            await logAudit('verify', 'user', userId);
          }
          refreshData();
          showMessage('success', isVerified ? 'Verification revoked' : 'User verified');
        } catch (e: any) { showMessage('error', e.message); }
      },
    });
  };

  const handleBanUser = async (userId: string, userName: string, isBanned: boolean) => {
    if (isBanned) {
      askConfirm({
        title: `Unban ${userName}?`,
        message: 'They will regain full access to the platform.',
        confirmLabel: 'Unban',
        onConfirm: async () => {
          setConfirm(null);
          try {
            await apiCall('POST', '/api/users', { id: userId, banned: false, banReason: '', bannedAt: '' });
            await logAudit('unban', 'user', userId);
            refreshData();
            showMessage('success', 'User unbanned');
          } catch (e: any) { showMessage('error', e.message); }
        },
      });
    } else {
      askConfirm({
        title: `Ban ${userName}?`,
        message: 'They will be blocked from posting and may see a suspension screen.',
        confirmLabel: 'Ban user',
        danger: true,
        inputLabel: 'Reason (optional)',
        inputPlaceholder: 'e.g. Spam / abuse',
        onConfirm: async (reason) => {
          setConfirm(null);
          try {
            await apiCall('POST', '/api/users', {
              id: userId,
              banned: true,
              banReason: reason || '',
              bannedAt: new Date().toISOString(),
            });
            await logAudit('ban', 'user', userId, reason || undefined);
            refreshData();
            showMessage('success', 'User banned');
          } catch (e: any) { showMessage('error', e.message); }
        },
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    askConfirm({
      title: `Delete ${userName}?`,
      message: 'User record and their related content will be removed. This cannot be undone.',
      confirmLabel: 'Delete user',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteUser(userId);
          await logAudit('delete_user', 'user', userId);
          refreshData();
          setDrawer(null);
          showMessage('success', 'User deleted');
        } catch (e: any) { showMessage('error', e.message); }
      },
    });
  };

  const handleFeatureListing = async (id: string, currentFeatured: boolean) => {
    try {
      await apiCall('PUT', `/api/data/listings/${id}`, { featured: !currentFeatured });
      await logAudit(currentFeatured ? 'unfeature' : 'feature', 'listing', id);
      refreshData();
      showMessage('success', currentFeatured ? 'Listing unfeatured' : 'Listing featured');
    } catch (e: any) { showMessage('error', e.message); }
  };

  const handleSaveListingEdit = async () => {
    if (!editingListing) return;
    try {
      await apiCall('PUT', `/api/data/listings/${editingListing.id}`, editingListing);
      await logAudit('edit', 'listing', editingListing.id);
      setEditingListing(null);
      refreshData();
      showMessage('success', 'Listing updated');
    } catch (e: any) { showMessage('error', e.message); }
  };

  const handleSaveBanner = async (msg: string, active: boolean, type: string = 'info') => {
    const newBanner = { message: msg, active, type };
    setSiteSettings((prev: any) => ({ ...prev, site_banner: newBanner }));
    try {
      await apiCall('PUT', '/api/settings', { site_banner: newBanner });
      await logAudit('update_banner', 'settings', 'site_banner');
      showMessage('success', 'Announcement updated');
    } catch (e: any) {
      showMessage('error', e.message || 'Failed to save announcement');
    }
  };

  const handleMaintenanceMode = async (enabled: boolean, msg?: string) => {
    const previous = siteSettings.maintenance_mode;
    const newSettings = { enabled, message: msg || 'Site is under maintenance' };
    setSiteSettings((prev: any) => ({ ...prev, maintenance_mode: newSettings }));
    try {
      await apiCall('PUT', '/api/settings', { maintenance_mode: newSettings });
      await logAudit(enabled ? 'enable_maintenance' : 'disable_maintenance', 'settings', 'maintenance');
      showMessage('success', enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled');
    } catch (e: any) {
      setSiteSettings((prev: any) => ({ ...prev, maintenance_mode: previous }));
      showMessage('error', e.message || 'Failed to update maintenance mode');
    }
  };

  const handleTicketStatus = async (ticketId: string, status: string, adminReply?: string) => {
    try {
      const body: any = { status };
      if (adminReply) body.adminReply = adminReply;
      await apiCall('PUT', `/api/tickets/${ticketId}`, body);
      await logAudit('ticket_update', 'ticket', ticketId, `Status: ${status}`);
      fetchAll();
      showMessage('success', 'Ticket updated');
    } catch (e: any) { showMessage('error', e.message); }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    askConfirm({
      title: 'Delete ticket?',
      message: 'This support ticket will be permanently removed.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await apiCall('DELETE', `/api/tickets/${ticketId}`);
          await logAudit('delete_ticket', 'ticket', ticketId);
          fetchAll();
          setDrawer(null);
          showMessage('success', 'Ticket deleted');
        } catch (e: any) { showMessage('error', e.message); }
      },
    });
  };

  const handleReportStatus = async (reportId: string, status: string) => {
    try {
      await apiCall('PUT', `/api/data/reports/${reportId}`, { status, resolvedAt: new Date().toISOString() });
      await logAudit('resolve_report', 'report', reportId);
      fetchAll();
      setDrawer(null);
      showMessage('success', 'Report resolved');
    } catch (e: any) { showMessage('error', e.message); }
  };

  const handleVerifyContent = async (collection: string, id: string, verified: boolean) => {
    try {
      await verifyItem(collection, id, !verified);
      await logAudit(verified ? 'unverify' : 'verify', collection, id);
      refreshData();
      showMessage('success', verified ? 'Unverified' : 'Verified');
    } catch (e: any) { showMessage('error', e.message); }
  };

  const handleContactReply = async (contactId: string, reply: string) => {
    if (!reply.trim()) return;
    try {
      await apiCall('PUT', `/api/data/contacts/${contactId}`, {
        status: 'read', adminReply: reply, repliedAt: new Date().toISOString(),
      });
      await logAudit('reply_contact', 'contact', contactId);
      fetchAll();
      showMessage('success', 'Reply saved');
    } catch (e: any) { showMessage('error', e.message); }
  };

  const handleReportDeleteTarget = async (report: any) => {
    askConfirm({
      title: 'Delete reported listing?',
      message: 'The listing will be deleted and this report marked resolved.',
      confirmLabel: 'Delete listing',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await deleteListing(report.targetId);
          await apiCall('PUT', `/api/data/reports/${report.id}`, {
            status: 'resolved', resolvedAt: new Date().toISOString(), action: 'deleted_listing',
          });
          await logAudit('report_delete_listing', 'report', report.id, report.targetId);
          fetchAll(); refreshData();
          setDrawer(null);
          showMessage('success', 'Listing deleted & report resolved');
        } catch (e: any) { showMessage('error', e.message); }
      },
    });
  };

  const handleReportBanUser = async (report: any) => {
    askConfirm({
      title: 'Ban reported user?',
      message: 'User will be banned and this report marked resolved.',
      confirmLabel: 'Ban user',
      danger: true,
      onConfirm: async () => {
        setConfirm(null);
        try {
          await apiCall('POST', '/api/users', {
            id: report.targetId, banned: true,
            banReason: `Report: ${report.reason}`, bannedAt: new Date().toISOString(),
          });
          await apiCall('PUT', `/api/data/reports/${report.id}`, {
            status: 'resolved', resolvedAt: new Date().toISOString(), action: 'banned_user',
          });
          await logAudit('report_ban_user', 'report', report.id, report.targetId);
          fetchAll(); refreshData();
          setDrawer(null);
          showMessage('success', 'User banned & report resolved');
        } catch (e: any) { showMessage('error', e.message); }
      },
    });
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = []; let cur = ''; let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else inQuotes = false; }
        else cur += ch;
      } else {
        if (ch === '"') inQuotes = true;
        else if (ch === ',') { result.push(cur); cur = ''; }
        else cur += ch;
      }
    }
    result.push(cur);
    return result;
  };

  const handleCsvImport = async (file: File) => {
    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');
      const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
      const get = (row: string[], name: string) => {
        const i = headers.indexOf(name.toLowerCase());
        return i >= 0 ? (row[i] || '').trim() : '';
      };
      let count = 0;
      for (let i = 1; i < lines.length; i++) {
        const cells = parseCsvLine(lines[i]);
        const title = get(cells, 'title');
        if (!title) continue;
        const listing = {
          title,
          breed: get(cells, 'breed'),
          type: get(cells, 'type').toLowerCase() === 'adopt' ? 'adopt' : 'sell',
          price: Number(get(cells, 'price')) || 0,
          age: get(cells, 'age'),
          location: get(cells, 'location'),
          milkingStatus: get(cells, 'status') || get(cells, 'milkingstatus') || 'milking',
          sellerName: get(cells, 'seller') || get(cells, 'sellername') || 'Admin Import',
          contactNumber: get(cells, 'contact') || get(cells, 'contactnumber') || '',
          description: get(cells, 'description') || '',
          imageUrl: get(cells, 'imageurl') || '',
          postedAt: new Date().toISOString(),
          verified: true,
        };
        await apiCall('POST', '/api/data/listings', listing);
        count++;
      }
      await logAudit('csv_import', 'listings', String(count));
      refreshData();
      showMessage('success', `Imported ${count} listing(s)`);
    } catch (e: any) { showMessage('error', 'Import failed: ' + e.message); }
  };

  const TICKET_TEMPLATES = [
    "Thank you for reaching out. We're looking into this and will update you shortly.",
    "Your issue has been resolved. Please let us know if you need anything else.",
    "Could you please share more details or a screenshot so we can assist you better?",
    "This has been escalated to our team. We appreciate your patience.",
  ];

  const platformUsers = useMemo(() => {
    const userMap: Record<string, any> = {};
    const verifiedIds = new Set(verificationRequests.filter(r => r.status === 'approved').map(r => r.userId));
    usersInfo.forEach(u => {
      userMap[u.id] = {
        ...u,
        id: u.id,
        activeListings: 0,
        name: u.name || u.displayName || 'Unknown',
        email: u.email || '',
        phone: u.phone || u.phoneNumber || '',
        city: u.city || '',
        state: u.state || '',
        address: u.fullAddress || u.address || '',
        pincode: u.pincode || '',
        location: u.location || '',
        photoURL: u.photoURL || '',
        items: [] as { type: string; id: string }[],
        isVerified: verifiedIds.has(u.id),
        banned: u.banned || false,
        banReason: u.banReason || '',
        onboarded: u.onboarded,
        createdAt: u.createdAt,
      };
    });
    const process = (item: any, type: string) => {
      if (!item.userId) return;
      if (!userMap[item.userId]) {
        userMap[item.userId] = {
          id: item.userId, activeListings: 0, name: item.sellerName || item.userName || 'Unknown',
          email: '', phone: item.contactNumber || '', city: '', state: '', address: '',
          items: [], isVerified: false, banned: false,
        };
      }
      userMap[item.userId].activeListings++;
      userMap[item.userId].items.push({ type, id: item.id });
    };
    listings.forEach(i => process(i, 'listings'));
    gaushalas.forEach(i => process(i, 'gaushalas'));
    alerts.forEach(i => process(i, 'alerts'));
    vets.forEach(i => process(i, 'vets'));
    transports.forEach(i => process(i, 'transports'));
    sponsorships.forEach(i => process(i, 'sponsorships'));
    verificationRequests.forEach(r => {
      if (!userMap[r.userId]) {
        userMap[r.userId] = {
          id: r.userId, activeListings: 0, name: r.userName || 'Unknown',
          email: '', phone: '', city: '', state: '', address: '', items: [],
          isVerified: r.status === 'approved', banned: false,
        };
      } else if (r.status === 'approved') {
        userMap[r.userId].isVerified = true;
      }
    });
    return Object.values(userMap);
  }, [listings, gaushalas, alerts, vets, transports, sponsorships, verificationRequests, usersInfo]);

  /** Full dossier for the open user drawer — every related record on the platform. */
  const userDossier = useMemo(() => {
    if (drawer?.type !== 'user' || !drawer.data?.id) return null;
    const uid = drawer.data.id;
    const profile = usersInfo.find((u: any) => u.id === uid) || drawer.data;
    const name = profile.name || profile.displayName || drawer.data.name || 'Unknown';

    const userListings = listings.filter(l => l.userId === uid);
    const userGaushalas = gaushalas.filter(g => g.userId === uid);
    const userAlerts = alerts.filter(a => a.userId === uid);
    const userVets = vets.filter(v => v.userId === uid);
    const userTransports = transports.filter(t => t.userId === uid);
    const userSponsorships = sponsorships.filter(s => s.userId === uid || (s as any).donorUserId === uid);
    const userVerifications = verificationRequests.filter(r => r.userId === uid);
    const userTickets = tickets.filter(t => t.userId === uid);
    const userReviews = allReviews.filter(r => r.userId === uid);
    const reportsFiled = reports.filter(r => r.reporterId === uid);
    const reportsAgainst = reports.filter(r => r.targetType === 'user' && r.targetId === uid);
    const relatedAudit = auditLog.filter(log =>
      String(log.targetId || '').includes(uid) ||
      String(log.details || '').includes(uid) ||
      (log.target === 'user' && log.targetId === uid)
    );

    const isVerified = userVerifications.some(r => r.status === 'approved') || !!drawer.data.isVerified;

    return {
      uid,
      profile: {
        ...drawer.data,
        ...profile,
        name,
        email: profile.email || drawer.data.email || '',
        phone: profile.phone || profile.phoneNumber || drawer.data.phone || '',
        fullAddress: profile.fullAddress || profile.address || drawer.data.address || '',
        pincode: profile.pincode || '',
        city: profile.city || drawer.data.city || '',
        state: profile.state || drawer.data.state || '',
        location: profile.location || '',
        photoURL: profile.photoURL || '',
        onboarded: profile.onboarded,
        banned: profile.banned ?? drawer.data.banned,
        banReason: profile.banReason || drawer.data.banReason || '',
        bannedAt: profile.bannedAt || '',
        createdAt: profile.createdAt || '',
        updatedAt: profile.updatedAt || '',
        isVerified,
      },
      listings: userListings,
      gaushalas: userGaushalas,
      alerts: userAlerts,
      vets: userVets,
      transports: userTransports,
      sponsorships: userSponsorships,
      verifications: userVerifications,
      tickets: userTickets,
      reviews: userReviews,
      reportsFiled,
      reportsAgainst,
      audit: relatedAudit,
      counts: {
        listings: userListings.length,
        gaushalas: userGaushalas.length,
        alerts: userAlerts.length,
        vets: userVets.length,
        transports: userTransports.length,
        sponsorships: userSponsorships.length,
        tickets: userTickets.length,
        reviews: userReviews.length,
        reportsFiled: reportsFiled.length,
        reportsAgainst: reportsAgainst.length,
        verifications: userVerifications.length,
      },
    };
  }, [
    drawer, usersInfo, listings, gaushalas, alerts, vets, transports, sponsorships,
    verificationRequests, tickets, allReviews, reports, auditLog,
  ]);

  const stats = useMemo(() => ({
    totalUsers: platformUsers.length,
    verifiedUsers: platformUsers.filter(u => u.isVerified).length,
    bannedUsers: platformUsers.filter(u => u.banned).length,
    totalListings: listings.length,
    featuredListings: listings.filter(l => l.featured).length,
    adoptListings: listings.filter(l => l.type === 'adopt').length,
    totalAlerts: alerts.length,
    totalSponsorships: sponsorships.reduce((sum, s) => sum + (s.amount || 0), 0),
    pendingVerifications: verificationRequests.filter(r => r.status === 'pending').length,
    openTickets: tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    unreadContacts: contacts.filter(c => c.status === 'unread').length,
    listings: listings.length,
    gaushalas: gaushalas.length,
    alerts: alerts.length,
    vets: vets.length,
    transports: transports.length,
    sponsorships: sponsorships.length,
    users: platformUsers.length,
    reviews: allReviews.length,
    audit: auditLog.length,
  }), [platformUsers, listings, alerts, sponsorships, verificationRequests, tickets, reports, contacts, gaushalas, vets, transports, allReviews, auditLog]);

  const badgeCounts: Record<string, number> = {
    listings: stats.listings,
    gaushalas: stats.gaushalas,
    alerts: stats.alerts,
    vets: stats.vets,
    transports: stats.transports,
    sponsorships: stats.sponsorships,
    users: stats.users,
    pendingVerifications: stats.pendingVerifications,
    openTickets: stats.openTickets,
    unreadContacts: stats.unreadContacts,
    pendingReports: stats.pendingReports,
    reviews: stats.reviews,
    audit: stats.audit,
  };

  const attentionItems = useMemo(() => {
    const items: { tab: TabId; label: string; count: number; tone: 'warning' | 'danger' | 'info' }[] = [];
    if (stats.pendingVerifications) items.push({ tab: 'identities', label: 'Pending verifications', count: stats.pendingVerifications, tone: 'warning' });
    if (stats.openTickets) items.push({ tab: 'tickets', label: 'Open tickets', count: stats.openTickets, tone: 'info' });
    if (stats.pendingReports) items.push({ tab: 'reports', label: 'Pending reports', count: stats.pendingReports, tone: 'danger' });
    if (stats.unreadContacts) items.push({ tab: 'contacts', label: 'Unread messages', count: stats.unreadContacts, tone: 'info' });
    if (alerts.filter(a => a.status === 'active').length) {
      items.push({ tab: 'alerts', label: 'Active alerts', count: alerts.filter(a => a.status === 'active').length, tone: 'danger' });
    }
    return items;
  }, [stats, alerts]);

  // Filtered lists MUST be computed before any conditional return (Rules of Hooks).
  const filteredListings = useMemo(() => {
    let list = listings;
    if (filterStatus === 'featured') list = list.filter(l => l.featured);
    if (filterStatus === 'adopt') list = list.filter(l => l.type === 'adopt');
    if (filterStatus === 'sell') list = list.filter(l => l.type === 'sell');
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(l =>
        l.title?.toLowerCase().includes(q) ||
        l.location?.toLowerCase().includes(q) ||
        l.breed?.toLowerCase().includes(q) ||
        l.sellerName?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [listings, searchTerm, filterStatus]);

  const filteredUsers = useMemo(() => {
    let list = platformUsers;
    if (filterStatus === 'banned') list = list.filter(u => u.banned);
    if (filterStatus === 'verified') list = list.filter(u => u.isVerified);
    if (filterStatus === 'active') list = list.filter(u => !u.banned);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        (u.phone || '').includes(searchTerm)
      );
    }
    return list;
  }, [platformUsers, searchTerm, filterStatus]);

  const filteredTickets = useMemo(() => {
    let list = tickets;
    if (filterStatus !== 'all') list = list.filter(t => t.status === filterStatus);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(t => t.subject?.toLowerCase().includes(q) || t.userName?.toLowerCase().includes(q));
    }
    return list;
  }, [tickets, searchTerm, filterStatus]);

  const doRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshData(), fetchAll()]);
      showMessage('success', 'Data refreshed');
    } finally {
      setRefreshing(false);
    }
  };

  const goTab = (id: TabId) => {
    setActiveTab(id);
    setSidebarOpen(false);
  };

  /* ─────────────────── AUTH SCREEN ─────────────────── */

  if (!isAdminAuthenticated) {
    const inputClass = "w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#800000] focus:ring-2 focus:ring-[#800000]/15 outline-none disabled:opacity-60 bg-white";
    const primaryBtn = "w-full py-3 bg-[#800000] text-white font-bold rounded-xl hover:bg-[#600000] disabled:opacity-60 flex items-center justify-center gap-2 shadow-sm";
    const isSetup = adminExists === false;

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#800000]/30 via-slate-950 to-slate-950" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#800000]/20 blur-3xl rounded-full" />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className="relative bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full border border-slate-200">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-[#800000] to-[#a52a2a] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#800000]/30">
              {isSetup ? <KeyRound className="w-7 h-7 text-white" /> : <ShieldCheck className="w-7 h-7 text-white" />}
            </div>
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isSetup ? 'Create Admin Account' : 'Admin Console'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">
              {adminExists === null ? 'Loading…'
                : isSetup ? 'First-time setup — create your admin login'
                : authView === 'otp' ? 'Sign in with a one-time email link'
                : authView === 'reset' ? 'Reset your admin password'
                : 'GauSeva Connect control center'}
            </p>
          </div>

          {loginError && <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">{loginError}</div>}
          {loginInfo && <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium">{loginInfo}</div>}

          {isSetup && (
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Admin Email</label>
                <input type="email" required autoComplete="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Create Password</label>
                <input type="password" required autoComplete="new-password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className={inputClass} />
                <p className="text-[11px] text-slate-400 mt-1.5">At least 6 characters. This becomes the only admin account.</p>
              </div>
              <button type="submit" disabled={authBusy} className={primaryBtn}>
                {authBusy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound className="w-4 h-4" />}
                Create Admin Account
              </button>
            </form>
          )}

          {!isSetup && adminExists !== null && authView === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required autoComplete="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Password</label>
                <input type="password" required autoComplete="current-password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className={inputClass} />
              </div>
              <button type="submit" disabled={authBusy} className={primaryBtn}>
                {authBusy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Lock className="w-4 h-4" />}
                Sign In
              </button>
              <div className="flex items-center justify-between text-xs pt-1">
                <button type="button" onClick={() => { setLoginError(''); setLoginInfo(''); setAuthView('otp'); }} className="text-[#800000] font-semibold hover:underline flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5" /> Email link
                </button>
                <button type="button" onClick={() => { setLoginError(''); setLoginInfo(''); setAuthView('reset'); }} className="text-slate-500 font-semibold hover:text-[#800000]">
                  Forgot password?
                </button>
              </div>
            </form>
          )}

          {!isSetup && adminExists !== null && authView === 'otp' && (
            <form onSubmit={handleSendOtpLink} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required autoComplete="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className={inputClass} />
                <p className="text-[11px] text-slate-400 mt-1.5">We'll email a secure link. Open it on this device to sign in.</p>
              </div>
              <button type="submit" disabled={authBusy} className={primaryBtn}>
                {authBusy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-4 h-4" />}
                Send Sign-In Link
              </button>
              <button type="button" onClick={() => { setLoginError(''); setLoginInfo(''); setAuthView('password'); }} className="w-full text-xs text-slate-500 font-semibold hover:text-[#800000]">← Back to password login</button>
            </form>
          )}

          {!isSetup && adminExists !== null && authView === 'reset' && (
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Email</label>
                <input type="email" required autoComplete="email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className={inputClass} />
              </div>
              <button type="submit" disabled={authBusy} className={primaryBtn}>
                {authBusy ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Send Reset Link
              </button>
              <button type="button" onClick={() => { setLoginError(''); setLoginInfo(''); setAuthView('password'); }} className="w-full text-xs text-slate-500 font-semibold hover:text-[#800000]">← Back to password login</button>
            </form>
          )}

          <button onClick={() => window.location.href = '/'} className="w-full mt-5 text-sm text-slate-500 hover:text-[#800000] font-medium">← Back to Website</button>
        </motion.div>
      </div>
    );
  }

  /* ─────────────────── SIDEBAR (function, not nested component — avoids remount) ─────────────────── */

  const renderSidebarNav = (collapsed = false) => (
    <div className="flex flex-col h-full">
      <div className={`px-4 py-5 border-b border-white/10 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/30 shrink-0">
          <ShieldCheck className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="text-white font-bold text-sm tracking-tight truncate">GauSeva Admin</p>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-semibold">Control Center</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {NAV_GROUPS.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = activeTab === item.id;
                const count = item.badgeKey ? badgeCounts[item.badgeKey] : undefined;
                const highlight = item.badgeKey && ['pendingVerifications', 'openTickets', 'pendingReports', 'unreadContacts'].includes(item.badgeKey) && (count || 0) > 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => goTab(item.id)}
                    title={item.label}
                    className={`w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all ${
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2'
                    } ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className={active ? 'text-[#800000]' : 'text-white/50'}>{item.icon}</span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left truncate">{item.label}</span>
                        {count !== undefined && count > 0 && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md min-w-[1.25rem] text-center ${
                            active ? 'bg-slate-100 text-slate-700'
                              : highlight ? 'bg-amber-400 text-amber-950'
                              : 'bg-white/10 text-white/70'
                          }`}>{count}</span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className={`p-3 border-t border-white/10 ${collapsed ? 'flex flex-col items-center gap-2' : ''}`}>
        {!collapsed && (
          <div className="px-2 mb-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {(adminUsername || 'A').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-white text-xs font-semibold truncate">{adminUsername || 'Administrator'}</p>
              <p className="text-white/40 text-[10px]">Super Admin</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`flex items-center gap-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg text-sm font-medium transition-colors ${
            collapsed ? 'p-2.5' : 'w-full px-3 py-2'
          }`}
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && 'Logout'}
        </button>
      </div>
    </div>
  );

  /* ─────────────────── PAGE CONTENT ─────────────────── */

  const renderDashboard = () => (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="Overview of platform health and work queue" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Users', value: stats.totalUsers, sub: `${stats.bannedUsers} banned`, tab: 'users' as TabId, icon: <Users className="w-4 h-4" />, color: 'from-violet-500 to-purple-600' },
          { label: 'Listings', value: stats.totalListings, sub: `${stats.featuredListings} featured`, tab: 'listings' as TabId, icon: <CheckCircle className="w-4 h-4" />, color: 'from-emerald-500 to-teal-600' },
          { label: 'Open Tickets', value: stats.openTickets, sub: 'need reply', tab: 'tickets' as TabId, icon: <Ticket className="w-4 h-4" />, color: 'from-sky-500 to-blue-600' },
          { label: 'Pending KYC', value: stats.pendingVerifications, sub: 'to review', tab: 'identities' as TabId, icon: <ShieldCheck className="w-4 h-4" />, color: 'from-amber-500 to-orange-600' },
          { label: 'Reports', value: stats.pendingReports, sub: 'pending', tab: 'reports' as TabId, icon: <Ban className="w-4 h-4" />, color: 'from-red-500 to-rose-600' },
          { label: 'Messages', value: stats.unreadContacts, sub: 'unread', tab: 'contacts' as TabId, icon: <Mail className="w-4 h-4" />, color: 'from-pink-500 to-rose-600' },
          { label: 'Alerts', value: stats.totalAlerts, sub: 'total', tab: 'alerts' as TabId, icon: <AlertTriangle className="w-4 h-4" />, color: 'from-orange-500 to-red-600' },
          { label: 'Sponsorships', value: `₹${stats.totalSponsorships.toLocaleString('en-IN')}`, sub: 'total', tab: 'sponsorships' as TabId, icon: <HandHeart className="w-4 h-4" />, color: 'from-[#800000] to-[#a52a2a]' },
        ].map((s) => (
          <button
            key={s.label}
            onClick={() => goTab(s.tab)}
            className="group text-left bg-white rounded-xl border border-slate-200 p-4 shadow-sm hover:shadow-md hover:border-slate-300 transition-all"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${s.color} text-white flex items-center justify-center shadow-sm`}>
                {s.icon}
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label} · <span className="text-slate-400">{s.sub}</span></p>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-[#800000]" />
            <h3 className="font-bold text-slate-900 text-sm">Needs Attention</h3>
          </div>
          {attentionItems.length === 0 ? (
            <div className="p-6 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">All clear</p>
              <p className="text-xs text-slate-400 mt-0.5">No pending admin work</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {attentionItems.map(item => (
                <button key={item.tab + item.label} onClick={() => goTab(item.tab)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors text-left">
                  <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  <Badge tone={item.tone === 'danger' ? 'danger' : item.tone === 'warning' ? 'warning' : 'info'}>{item.count}</Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-[#800000]" />
              <h3 className="font-bold text-slate-900 text-sm">Recent Admin Activity</h3>
            </div>
            <button onClick={() => goTab('audit')} className="text-xs font-semibold text-[#800000] hover:underline">View all</button>
          </div>
          {auditLog.length === 0 ? (
            <EmptyState icon={<ScrollText className="w-6 h-6" />} title="No activity yet" subtitle="Admin actions will appear here" />
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {auditLog.slice(0, 12).map((log, i) => (
                <div key={log.id || i} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 truncate">
                      <span className="font-semibold">{log.action}</span>
                      <span className="text-slate-400"> · </span>
                      <span className="text-slate-600">{log.target}</span>
                      {log.targetId && <span className="text-slate-400 font-mono text-xs"> #{String(log.targetId).slice(0, 10)}</span>}
                    </p>
                    <p className="text-[11px] text-slate-400">{fmtDateTime(log.timestamp)} · {log.adminUser || 'admin'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Listing mix</h3>
          <div className="space-y-3">
            {[
              { label: 'Adoption', count: listings.filter(l => l.type === 'adopt').length, color: 'bg-rose-500' },
              { label: 'For sale', count: listings.filter(l => l.type === 'sell').length, color: 'bg-emerald-500' },
              { label: 'Featured', count: stats.featuredListings, color: 'bg-amber-500' },
            ].map(row => (
              <div key={row.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-600 font-medium">{row.label}</span>
                  <span className="font-bold text-slate-900">{row.count}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${row.color} rounded-full transition-all`} style={{ width: `${listings.length ? (row.count / listings.length) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
          <h3 className="font-bold text-slate-900 text-sm mb-3">Quick actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Review KYC', tab: 'identities' as TabId, icon: <ShieldCheck className="w-4 h-4" /> },
              { label: 'Open tickets', tab: 'tickets' as TabId, icon: <Ticket className="w-4 h-4" /> },
              { label: 'Site banner', tab: 'settings' as TabId, icon: <Megaphone className="w-4 h-4" /> },
              { label: 'Export data', tab: 'settings' as TabId, icon: <Download className="w-4 h-4" /> },
            ].map(a => (
              <button key={a.label} onClick={() => goTab(a.tab)}
                className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-slate-200 hover:border-[#800000]/30 hover:bg-[#800000]/5 text-sm font-medium text-slate-700 transition-colors">
                <span className="text-[#800000]">{a.icon}</span>{a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderListings = () => (
    <div>
      <PageHeader
        title="Listings"
        subtitle="Manage marketplace cattle listings"
        count={listings.length}
        actions={
          <>
            {selectedItems.size > 0 && (
              <Btn variant="danger" size="sm" onClick={handleBulkDelete}>
                <Trash2 className="w-3.5 h-3.5" /> Delete {selectedItems.size}
              </Btn>
            )}
            <SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Search title, breed, location…" />
          </>
        }
      />
      <TableShell
        toolbar={
          <>
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            {['all', 'featured', 'adopt', 'sell'].map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-2.5 py-1 rounded-md text-xs font-bold capitalize ${filterStatus === f ? 'bg-[#800000] text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                {f}
              </button>
            ))}
            <span className="text-xs text-slate-400 ml-auto">{filteredListings.length} shown</span>
          </>
        }
      >
        <table className="w-full">
          <thead>
            <tr>
              <th className={th}>
                <input type="checkbox" className="rounded border-slate-300"
                  checked={filteredListings.length > 0 && filteredListings.every(l => selectedItems.has(l.id))}
                  onChange={e => {
                    if (e.target.checked) setSelectedItems(new Set(filteredListings.map(l => l.id)));
                    else setSelectedItems(new Set());
                  }} />
              </th>
              <th className={th}>Listing</th>
              <th className={th}>Type</th>
              <th className={th}>Seller</th>
              <th className={th}>Status</th>
              <th className={`${th} text-right`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredListings.map(l => (
              <tr key={l.id} className={tr}>
                <td className={td}>
                  <input type="checkbox" className="rounded border-slate-300" checked={selectedItems.has(l.id)}
                    onChange={e => {
                      const next = new Set(selectedItems);
                      if (e.target.checked) next.add(l.id); else next.delete(l.id);
                      setSelectedItems(next);
                    }} />
                </td>
                <td className={td}>
                  <div className="flex items-center gap-3 min-w-[200px]">
                    {l.imageUrl
                      ? <img src={l.imageUrl} alt="" className="w-11 h-11 rounded-lg object-cover bg-slate-100" />
                      : <div className="w-11 h-11 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400"><ImageIcon className="w-4 h-4" /></div>}
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{l.title}</p>
                      <p className="text-xs text-slate-500 truncate">{l.breed} · {l.location}</p>
                    </div>
                  </div>
                </td>
                <td className={td}>
                  <Badge tone={l.type === 'adopt' ? 'danger' : 'success'}>
                    {l.type === 'adopt' ? 'Adoption' : `₹${(l.price || 0).toLocaleString('en-IN')}`}
                  </Badge>
                </td>
                <td className={`${td} text-xs`}>{l.sellerName || '—'}</td>
                <td className={td}>{l.featured ? <Badge tone="warning">Featured</Badge> : <Badge>Standard</Badge>}</td>
                <td className={`${td} text-right`}>
                  <div className="flex items-center justify-end gap-0.5">
                    <Btn size="icon" title="Edit" onClick={() => setEditingListing({ ...l })}><Edit3 className="w-4 h-4" /></Btn>
                    <Btn size="icon" title={l.featured ? 'Unfeature' : 'Feature'} onClick={() => handleFeatureListing(l.id, !!l.featured)}
                      className={l.featured ? 'text-amber-600' : ''}>
                      <Pin className="w-4 h-4" />
                    </Btn>
                    <a href={`/listing/${l.id}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg text-slate-500 hover:bg-slate-100" title="View">
                      <Eye className="w-4 h-4" />
                    </a>
                    <Btn size="icon" title="Delete" className="hover:text-red-600" onClick={() => handleDelete('listings', l.id)}><Trash2 className="w-4 h-4" /></Btn>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredListings.length === 0 && (
          <EmptyState icon={<CheckCircle className="w-6 h-6" />} title="No listings found" subtitle="Try another filter or search term" />
        )}
      </TableShell>
    </div>
  );

  const simpleContentTable = (
    title: string,
    subtitle: string,
    count: number,
    emptyLabel: string,
    headers: string[],
    rows: React.ReactNode,
    empty: boolean,
  ) => (
    <div>
      <PageHeader title={title} subtitle={subtitle} count={count} />
      <TableShell>
        <table className="w-full">
          <thead>
            <tr>{headers.map(h => <th key={h} className={h === 'Actions' ? `${th} text-right` : th}>{h}</th>)}</tr>
          </thead>
          <tbody>{rows}</tbody>
        </table>
        {empty && <EmptyState icon={<Home className="w-6 h-6" />} title={emptyLabel} />}
      </TableShell>
    </div>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'listings': return renderListings();

      case 'gaushalas':
        return simpleContentTable('Gaushalas', 'Verify and moderate gaushala profiles', gaushalas.length, 'No gaushalas yet',
          ['Name', 'Location', 'Capacity', 'Status', 'Actions'],
          gaushalas.map(g => (
            <tr key={g.id} className={tr}>
              <td className={td}>
                <div className="flex items-center gap-3">
                  {g.imageUrl && <img src={g.imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                  <div><p className="font-semibold text-slate-900">{g.name}</p><p className="text-xs text-slate-500 max-w-xs truncate">{g.description}</p></div>
                </div>
              </td>
              <td className={`${td} text-xs`}>{g.location}</td>
              <td className={`${td} text-xs`}>{g.capacity}</td>
              <td className={td}>{g.verified ? <Badge tone="success">Verified</Badge> : <Badge>Unverified</Badge>}</td>
              <td className={`${td} text-right`}>
                <div className="flex justify-end gap-1">
                  <Btn size="sm" variant="soft" onClick={() => handleVerifyContent('gaushalas', g.id, !!g.verified)}>{g.verified ? 'Unverify' : 'Verify'}</Btn>
                  <Btn size="icon" className="hover:text-red-600" onClick={() => handleDelete('gaushalas', g.id)}><Trash2 className="w-4 h-4" /></Btn>
                </div>
              </td>
            </tr>
          )),
          gaushalas.length === 0);

      case 'alerts':
        return simpleContentTable('Emergency Alerts', 'Resolve and remove community alerts', alerts.length, 'No alerts',
          ['Type', 'Location', 'Urgency', 'Status', 'Actions'],
          alerts.map(a => (
            <tr key={a.id} className={tr}>
              <td className={td}><p className="font-semibold capitalize">{a.type}</p><p className="text-xs text-slate-500 max-w-xs truncate">{a.description}</p></td>
              <td className={`${td} text-xs`}>{a.location}</td>
              <td className={td}><Badge tone={a.urgency === 'critical' ? 'danger' : 'warning'}>{a.urgency}</Badge></td>
              <td className={td}><Badge tone={a.status === 'active' ? 'info' : 'neutral'}>{a.status}</Badge></td>
              <td className={`${td} text-right`}>
                <div className="flex justify-end gap-1">
                  {a.status === 'active' && (
                    <Btn size="sm" variant="soft" onClick={async () => {
                      try {
                        await apiCall('PUT', `/api/data/alerts/${a.id}`, { status: 'resolved' });
                        await logAudit('resolve', 'alert', a.id); refreshData(); showMessage('success', 'Alert resolved');
                      } catch (e: any) { showMessage('error', e.message); }
                    }}>Resolve</Btn>
                  )}
                  <Btn size="icon" className="hover:text-red-600" onClick={() => handleDelete('alerts', a.id)}><Trash2 className="w-4 h-4" /></Btn>
                </div>
              </td>
            </tr>
          )),
          alerts.length === 0);

      case 'vets':
        return simpleContentTable('Veterinarians', 'Verify and manage vet listings', vets.length, 'No vets',
          ['Name', 'Specialization', 'Location', 'Contact', 'Status', 'Actions'],
          vets.map(v => (
            <tr key={v.id} className={tr}>
              <td className={`${td} font-semibold`}>{v.name}</td>
              <td className={`${td} text-xs`}>{v.specialization}</td>
              <td className={`${td} text-xs`}>{v.location}</td>
              <td className={`${td} text-xs`}>{v.contactNumber}</td>
              <td className={td}>{v.verified ? <Badge tone="success">Verified</Badge> : <Badge>Unverified</Badge>}</td>
              <td className={`${td} text-right`}>
                <div className="flex justify-end gap-1">
                  <Btn size="sm" variant="soft" onClick={() => handleVerifyContent('vets', v.id, !!v.verified)}>{v.verified ? 'Unverify' : 'Verify'}</Btn>
                  <Btn size="icon" className="hover:text-red-600" onClick={() => handleDelete('vets', v.id)}><Trash2 className="w-4 h-4" /></Btn>
                </div>
              </td>
            </tr>
          )),
          vets.length === 0);

      case 'transports':
        return simpleContentTable('Transport', 'Verify and manage transport services', transports.length, 'No transport services',
          ['Name', 'Vehicle', 'Location', 'Contact', 'Status', 'Actions'],
          transports.map(t => (
            <tr key={t.id} className={tr}>
              <td className={`${td} font-semibold`}>{t.name}</td>
              <td className={`${td} text-xs`}>{t.vehicleType}</td>
              <td className={`${td} text-xs`}>{t.location}</td>
              <td className={`${td} text-xs`}>{t.contactNumber}</td>
              <td className={td}>{t.verified ? <Badge tone="success">Verified</Badge> : <Badge>Unverified</Badge>}</td>
              <td className={`${td} text-right`}>
                <div className="flex justify-end gap-1">
                  <Btn size="sm" variant="soft" onClick={() => handleVerifyContent('transports', t.id, !!t.verified)}>{t.verified ? 'Unverify' : 'Verify'}</Btn>
                  <Btn size="icon" className="hover:text-red-600" onClick={() => handleDelete('transports', t.id)}><Trash2 className="w-4 h-4" /></Btn>
                </div>
              </td>
            </tr>
          )),
          transports.length === 0);

      case 'sponsorships':
        return simpleContentTable('Sponsorships', 'Review donor contributions', sponsorships.length, 'No sponsorships',
          ['Donor', 'Gaushala', 'Amount', 'Method', 'Reference', 'Status', 'Actions'],
          sponsorships.map(s => (
            <tr key={s.id} className={tr}>
              <td className={td}><p className="font-semibold">{s.donorName}</p><p className="text-xs text-slate-500">{s.donorPhone}</p></td>
              <td className={`${td} text-xs`}>{s.gaushalaName}</td>
              <td className={`${td} font-bold`}>₹{(s.amount || 0).toLocaleString('en-IN')}</td>
              <td className={`${td} text-xs uppercase`}>{s.paymentMethod}</td>
              <td className={`${td} text-xs font-mono text-slate-500`}>{s.referenceNo}</td>
              <td className={td}><Badge tone={s.status === 'verified' ? 'success' : 'warning'}>{s.status}</Badge></td>
              <td className={`${td} text-right`}>
                <div className="flex justify-end gap-1">
                  {s.status !== 'verified' && (
                    <Btn size="sm" variant="soft" onClick={async () => {
                      try {
                        await apiCall('PUT', `/api/data/sponsorships/${s.id}`, { status: 'verified' });
                        await logAudit('verify', 'sponsorship', s.id); refreshData(); showMessage('success', 'Sponsorship verified');
                      } catch (e: any) { showMessage('error', e.message); }
                    }}>Verify</Btn>
                  )}
                  <Btn size="icon" className="hover:text-red-600" onClick={() => handleDelete('sponsorships', s.id)}><Trash2 className="w-4 h-4" /></Btn>
                </div>
              </td>
            </tr>
          )),
          sponsorships.length === 0);

      case 'users':
        return (
          <div>
            <PageHeader title="Users" subtitle="Ban, verify or remove platform users" count={platformUsers.length}
              actions={<SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Name, email, phone…" />} />
            <TableShell toolbar={
              <>
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                {['all', 'active', 'verified', 'banned'].map(f => (
                  <button key={f} onClick={() => setFilterStatus(f)}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold capitalize ${filterStatus === f ? 'bg-[#800000] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>{f}</button>
                ))}
                <span className="text-xs text-slate-400 ml-auto">{filteredUsers.length} shown</span>
              </>
            }>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>User</th><th className={th}>Contact</th><th className={th}>Location</th>
                    <th className={th}>Listings</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id} className={`${tr} ${u.banned ? 'bg-red-50/40' : ''}`}>
                      <td className={td}>
                        <button
                          onClick={() => { setUserDossierTab('overview'); setDrawer({ type: 'user', data: u }); }}
                          className="flex items-center gap-2.5 text-left group"
                          title="Open full user dossier"
                        >
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                            {u.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 flex items-center gap-1 group-hover:text-[#800000]">
                              {u.name}
                              {u.isVerified && <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />}
                              {u.banned && <Ban className="w-3.5 h-3.5 text-red-500" />}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono">{String(u.id).slice(0, 14)}…</p>
                            <p className="text-[10px] text-[#800000] font-semibold opacity-0 group-hover:opacity-100 transition-opacity">View full dossier →</p>
                          </div>
                        </button>
                      </td>
                      <td className={td}><p className="text-xs">{u.email || '—'}</p><p className="text-xs text-slate-500">{u.phone || '—'}</p></td>
                      <td className={`${td} text-xs`}>{u.city && u.state ? `${u.city}, ${u.state}` : '—'}</td>
                      <td className={td}><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">{u.activeListings}</span></td>
                      <td className={td}>
                        <Badge tone={u.banned ? 'danger' : u.isVerified ? 'success' : 'neutral'}>
                          {u.banned ? 'Banned' : u.isVerified ? 'Verified' : 'Active'}
                        </Badge>
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Btn size="sm" variant="soft" onClick={() => handleUserVerify(u.id, u.name, u.isVerified)}>{u.isVerified ? 'Revoke' : 'Verify'}</Btn>
                          <Btn size="sm" variant={u.banned ? 'soft' : 'outline'} className={!u.banned ? 'text-red-600 border-red-200 hover:bg-red-50' : ''} onClick={() => handleBanUser(u.id, u.name, u.banned)}>
                            {u.banned ? 'Unban' : 'Ban'}
                          </Btn>
                          <Btn size="icon" className="hover:text-red-600" onClick={() => handleDeleteUser(u.id, u.name)}><Trash2 className="w-4 h-4" /></Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredUsers.length === 0 && <EmptyState icon={<Users className="w-6 h-6" />} title="No users found" />}
            </TableShell>
          </div>
        );

      case 'tickets':
        return (
          <div>
            <PageHeader title="Support Tickets" subtitle="Reply and resolve user requests" count={tickets.length}
              actions={<SearchBox value={searchTerm} onChange={setSearchTerm} placeholder="Subject or user…" />} />
            <div className="flex flex-wrap gap-2 mb-4">
              {['all', 'open', 'in_progress', 'resolved', 'closed'].map(f => (
                <button key={f} onClick={() => setFilterStatus(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold capitalize ${filterStatus === f ? 'bg-[#800000] text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
                  {f.replace('_', ' ')}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              {filteredTickets.map(t => (
                <div key={t.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 hover:border-slate-300 transition-colors">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="text-left min-w-0 flex-1">
                      <button type="button" onClick={() => setDrawer({ type: 'ticket', data: t })} className="group text-left w-full">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-900 group-hover:text-[#800000]">{t.subject}</h3>
                          <Badge tone={t.status === 'open' ? 'info' : t.status === 'in_progress' ? 'warning' : t.status === 'resolved' ? 'success' : 'neutral'}>{t.status}</Badge>
                        </div>
                      </button>
                      <p className="text-xs text-slate-500">
                        {t.userId ? (
                          <button
                            type="button"
                            className="font-semibold text-[#800000] hover:underline"
                            onClick={() => {
                              const u = platformUsers.find((x: any) => x.id === t.userId) || {
                                id: t.userId, name: t.userName || 'User', email: t.userEmail || '',
                              };
                              setUserDossierTab('overview');
                              setDrawer({ type: 'user', data: u });
                            }}
                          >
                            {t.userName || 'User'}
                          </button>
                        ) : (t.userName || 'User')}
                        {' · '}{t.category} · {fmtDate(t.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <select value={t.status} onChange={e => handleTicketStatus(t.id, e.target.value)}
                        className="text-xs border border-slate-200 rounded-lg px-2 py-1.5 font-bold bg-white">
                        <option value="open">Open</option>
                        <option value="in_progress">In Progress</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>
                      <Btn size="icon" className="hover:text-red-600" onClick={() => handleDeleteTicket(t.id)}><Trash2 className="w-4 h-4" /></Btn>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mb-3 whitespace-pre-wrap line-clamp-3">{t.description}</p>
                  {t.adminReply && (
                    <div className="mb-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-xs font-bold text-amber-800">Admin Reply</p>
                      <p className="text-sm text-amber-900 mt-0.5">{t.adminReply}</p>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {TICKET_TEMPLATES.map((tpl, idx) => (
                      <button key={idx} onClick={() => {
                        const inp = document.getElementById(`reply-${t.id}`) as HTMLInputElement;
                        if (inp) inp.value = tpl;
                      }} className="px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded-md hover:bg-slate-200" title={tpl}>
                        Template {idx + 1}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Type reply…" id={`reply-${t.id}`}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]/15" />
                    <Btn variant="primary" onClick={() => {
                      const inp = document.getElementById(`reply-${t.id}`) as HTMLInputElement;
                      if (inp?.value) { handleTicketStatus(t.id, 'in_progress', inp.value); inp.value = ''; }
                    }}>
                      <Send className="w-3.5 h-3.5" /> Reply
                    </Btn>
                  </div>
                </div>
              ))}
              {filteredTickets.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200">
                  <EmptyState icon={<Ticket className="w-6 h-6" />} title="No tickets" subtitle="Support requests will show here" />
                </div>
              )}
            </div>
          </div>
        );

      case 'identities':
        return (
          <div>
            <PageHeader title="Identity Verification" subtitle="Approve or reject ID verification" count={verificationRequests.length} />
            <TableShell>
              <table className="w-full">
                <thead>
                  <tr><th className={th}>User</th><th className={th}>Documents</th><th className={th}>Status</th><th className={`${th} text-right`}>Actions</th></tr>
                </thead>
                <tbody>
                  {verificationRequests.map(r => (
                    <tr key={r.id} className={tr}>
                      <td className={td}>
                        <button onClick={() => setDrawer({ type: 'verification', data: r })} className="text-left hover:text-[#800000]">
                          <p className="font-semibold">{r.userName}</p>
                          <p className="text-xs text-slate-500">{fmtDate(r.submittedAt)}</p>
                        </button>
                      </td>
                      <td className={td}>
                        <div className="flex items-center gap-2 flex-wrap">
                          {r.idProofType && <Badge>{r.idProofType}</Badge>}
                          {(r.idProofUrl || r.idDocumentBase64) && <a href={r.idProofUrl || r.idDocumentBase64} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline font-medium">ID</a>}
                          {(r.selfieUrl || r.selfieBase64) && <a href={r.selfieUrl || r.selfieBase64} target="_blank" rel="noreferrer" className="text-xs text-blue-600 underline font-medium">Selfie</a>}
                          {!(r.idProofUrl || r.idDocumentBase64) && !(r.selfieUrl || r.selfieBase64) && <span className="text-xs text-slate-400">No docs</span>}
                        </div>
                      </td>
                      <td className={td}>
                        <Badge tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>{r.status}</Badge>
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-1">
                          <Btn size="sm" variant="success" onClick={() => handleApproveReject(r.id, 'approved')}>Approve</Btn>
                          <Btn size="sm" variant="danger" onClick={() => handleApproveReject(r.id, 'rejected')}>Reject</Btn>
                          <Btn size="icon" className="hover:text-red-600" onClick={() => handleDelete('identities', r.id)}><Trash2 className="w-4 h-4" /></Btn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {verificationRequests.length === 0 && <EmptyState icon={<ShieldCheck className="w-6 h-6" />} title="No verification requests" />}
            </TableShell>
          </div>
        );

      case 'reports':
        return (
          <div>
            <PageHeader title="Reports" subtitle="Moderate user and listing reports" count={reports.length} />
            <div className="space-y-3">
              {reports.map(r => (
                <div key={r.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4">
                    <button onClick={() => setDrawer({ type: 'report', data: r })} className="text-left min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-900">{r.reason}</h3>
                        <Badge tone={r.status === 'pending' ? 'warning' : 'success'}>{r.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">By {r.reporterName} · {r.targetType}: {String(r.targetId).slice(0, 16)} · {fmtDate(r.createdAt)}</p>
                      {r.description && <p className="text-sm text-slate-700 mt-2">{r.description}</p>}
                    </button>
                    <div className="flex gap-2 flex-wrap justify-end shrink-0">
                      {r.targetType === 'listing' && (
                        <a href={`/listing/${r.targetId}`} target="_blank" rel="noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="View listing">
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      {r.status === 'pending' && r.targetType === 'listing' && (
                        <Btn size="sm" variant="danger" onClick={() => handleReportDeleteTarget(r)}>Delete Listing</Btn>
                      )}
                      {r.status === 'pending' && r.targetType === 'user' && (
                        <Btn size="sm" variant="danger" onClick={() => handleReportBanUser(r)}>Ban User</Btn>
                      )}
                      {r.status === 'pending' && (
                        <Btn size="sm" variant="success" onClick={() => handleReportStatus(r.id, 'resolved')}>Resolve</Btn>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {reports.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200">
                  <EmptyState icon={<Ban className="w-6 h-6" />} title="No reports" />
                </div>
              )}
            </div>
          </div>
        );

      case 'contacts':
        return (
          <div>
            <PageHeader title="Contact Messages" subtitle="Public contact form inbox" count={contacts.length} />
            <div className="space-y-3">
              {contacts.map(c => (
                <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-bold text-slate-900">{c.subject}</h3>
                        <Badge tone={c.status === 'unread' ? 'info' : 'neutral'}>{c.status}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{c.name} · {c.email} · {fmtDate(c.createdAt)}</p>
                    </div>
                    <Btn size="sm" variant="soft" onClick={async () => {
                      try { await apiCall('PUT', `/api/data/contacts/${c.id}`, { status: 'read' }); fetchAll(); }
                      catch (e: any) { showMessage('error', e.message); }
                    }}>Mark read</Btn>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{c.message}</p>
                  {c.adminReply && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                      <p className="text-xs font-bold text-amber-800">Your Reply</p>
                      <p className="text-sm text-amber-900 whitespace-pre-wrap mt-0.5">{c.adminReply}</p>
                    </div>
                  )}
                  <div className="flex gap-2 mt-3">
                    <input type="text" placeholder="Write a reply…" id={`contact-reply-${c.id}`}
                      className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#800000]/15" />
                    <Btn variant="primary" onClick={() => {
                      const inp = document.getElementById(`contact-reply-${c.id}`) as HTMLInputElement;
                      if (inp?.value) { handleContactReply(c.id, inp.value); inp.value = ''; }
                    }}>
                      <Send className="w-3.5 h-3.5" /> Reply
                    </Btn>
                  </div>
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="bg-white rounded-xl border border-slate-200">
                  <EmptyState icon={<Mail className="w-6 h-6" />} title="No contact messages" />
                </div>
              )}
            </div>
          </div>
        );

      case 'reviews':
        return (
          <div>
            <PageHeader title="Reviews" subtitle="Moderate listing ratings" count={allReviews.length} />
            <TableShell>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>User</th><th className={th}>Listing</th><th className={th}>Rating</th>
                    <th className={th}>Comment</th><th className={th}>Date</th><th className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allReviews.map(r => (
                    <tr key={r.id} className={tr}>
                      <td className={`${td} font-semibold`}>{r.userName}</td>
                      <td className={`${td} text-xs font-mono`}>{r.listingId?.slice(0, 12)}…</td>
                      <td className={td}>
                        <div className="flex items-center gap-0.5">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? 'fill-amber-500 text-amber-500' : 'text-slate-300'}`} />
                          ))}
                        </div>
                      </td>
                      <td className={`${td} text-xs max-w-xs truncate`}>{r.comment}</td>
                      <td className={`${td} text-xs text-slate-500`}>{fmtDate(r.createdAt)}</td>
                      <td className={`${td} text-right`}>
                        <Btn size="icon" className="hover:text-red-600" onClick={() => {
                          askConfirm({
                            title: 'Delete review?',
                            message: 'This review will be permanently removed.',
                            confirmLabel: 'Delete',
                            danger: true,
                            onConfirm: async () => {
                              setConfirm(null);
                              try {
                                await apiCall('DELETE', `/api/data/reviews/${r.id}`);
                                await logAudit('delete', 'review', r.id);
                                fetchAll();
                                showMessage('success', 'Review deleted');
                              } catch (e: any) { showMessage('error', e.message); }
                            },
                          });
                        }}><Trash2 className="w-4 h-4" /></Btn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allReviews.length === 0 && <EmptyState icon={<Star className="w-6 h-6" />} title="No reviews" />}
            </TableShell>
          </div>
        );

      case 'analytics':
        return (
          <div>
            <PageHeader title="Analytics" subtitle="Snapshot of marketplace activity" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-sm">Listings by Type</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Adoption', count: listings.filter(l => l.type === 'adopt').length, color: 'bg-rose-500' },
                    { label: 'For Sale', count: listings.filter(l => l.type === 'sell').length, color: 'bg-emerald-500' },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-slate-700">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${row.color} rounded-full`} style={{ width: `${listings.length ? (row.count / listings.length) * 100 : 0}%` }} />
                        </div>
                        <span className="text-sm font-bold text-slate-900 w-6 text-right">{row.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-sm">Top Locations</h3>
                <div className="space-y-2">
                  {Object.entries(listings.reduce((acc: Record<string, number>, l) => {
                    const loc = l.location?.split(',')[1]?.trim() || l.location || 'Unknown';
                    acc[loc] = (acc[loc] || 0) + 1; return acc;
                  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([loc, count]) => (
                    <div key={loc} className="flex items-center justify-between"><span className="text-sm text-slate-700 truncate">{loc}</span><span className="text-sm font-bold">{count}</span></div>
                  ))}
                  {listings.length === 0 && <p className="text-sm text-slate-400">No data</p>}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-sm">Listings by Status</h3>
                <div className="space-y-2">
                  {['milking', 'dry', 'pregnant', 'heifer', 'calf', 'non-milking'].map(status => {
                    const count = listings.filter(l => l.milkingStatus === status).length;
                    return <div key={status} className="flex items-center justify-between"><span className="text-sm text-slate-700 capitalize">{status}</span><span className="text-sm font-bold">{count}</span></div>;
                  })}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-sm">User Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm"><span className="text-slate-700">Total Users</span><span className="font-bold">{platformUsers.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-700">Verified</span><span className="font-bold text-emerald-700">{stats.verifiedUsers}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-700">Banned</span><span className="font-bold text-red-700">{stats.bannedUsers}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-slate-700">With Listings</span><span className="font-bold">{platformUsers.filter(u => u.activeListings > 0).length}</span></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-sm">Top Breeds</h3>
                <div className="space-y-2">
                  {Object.entries(listings.reduce((acc: Record<string, number>, l) => {
                    const b = (l.breed || 'Unknown').trim() || 'Unknown';
                    acc[b] = (acc[b] || 0) + 1; return acc;
                  }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([breed, count]) => (
                    <div key={breed} className="flex justify-between text-sm"><span className="text-slate-700 truncate">{breed}</span><span className="font-bold">{count}</span></div>
                  ))}
                  {listings.length === 0 && <p className="text-sm text-slate-400">No data</p>}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 text-sm">Price Distribution (For Sale)</h3>
                <div className="space-y-2">
                  {[{ label: '< ₹25k', min: 0, max: 25000 }, { label: '₹25k–50k', min: 25000, max: 50000 }, { label: '₹50k–1L', min: 50000, max: 100000 }, { label: '> ₹1L', min: 100000, max: Infinity }].map(bk => {
                    const sells = listings.filter(l => l.type === 'sell');
                    const count = sells.filter(l => (l.price || 0) >= bk.min && (l.price || 0) < bk.max).length;
                    return (
                      <div key={bk.label} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-slate-700">{bk.label}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-28 h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${sells.length ? (count / sells.length) * 100 : 0}%` }} />
                          </div>
                          <span className="text-sm font-bold w-5 text-right">{count}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );

      case 'audit':
        return (
          <div>
            <PageHeader title="Audit Log" subtitle="History of admin actions" count={auditLog.length} />
            <TableShell>
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={th}>Time</th><th className={th}>Admin</th><th className={th}>Action</th>
                    <th className={th}>Target</th><th className={th}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLog.map((log, i) => (
                    <tr key={log.id || i} className={tr}>
                      <td className={`${td} text-xs text-slate-500 whitespace-nowrap`}>{fmtDateTime(log.timestamp)}</td>
                      <td className={`${td} text-xs font-semibold`}>{log.adminUser || 'admin'}</td>
                      <td className={td}><Badge>{log.action}</Badge></td>
                      <td className={`${td} text-xs`}>{log.target}{log.targetId ? `: ${String(log.targetId).slice(0, 24)}` : ''}</td>
                      <td className={`${td} text-xs text-slate-500 max-w-sm truncate`}>{log.details || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {auditLog.length === 0 && <EmptyState icon={<ScrollText className="w-6 h-6" />} title="No audit entries yet" />}
            </TableShell>
          </div>
        );

      case 'settings':
        return (
          <div>
            <PageHeader title="Settings" subtitle="Site controls and data tools" />
            <div className="space-y-4 max-w-3xl">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                  <Megaphone className="w-4 h-4 text-[#800000]" /> Announcement Banner
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <input
                      type="text"
                      placeholder="Announcement message…"
                      value={siteSettings.site_banner?.message || ''}
                      onChange={(e) => setSiteSettings((prev: any) => ({
                        ...prev,
                        site_banner: {
                          message: e.target.value,
                          active: !!prev.site_banner?.active,
                          type: prev.site_banner?.type || 'info',
                        },
                      }))}
                      className="flex-1 min-w-[200px] px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/15"
                    />
                    <select
                      value={siteSettings.site_banner?.type || 'info'}
                      onChange={(e) => setSiteSettings((prev: any) => ({
                        ...prev,
                        site_banner: {
                          message: prev.site_banner?.message || '',
                          active: !!prev.site_banner?.active,
                          type: e.target.value,
                        },
                      }))}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold"
                    >
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="success">Success</option>
                    </select>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!siteSettings.site_banner?.active}
                        onChange={(e) => setSiteSettings((prev: any) => ({
                          ...prev,
                          site_banner: {
                            message: prev.site_banner?.message || '',
                            active: e.target.checked,
                            type: prev.site_banner?.type || 'info',
                          },
                        }))}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-sm font-semibold text-slate-700">Active</span>
                    </label>
                  </div>
                  <Btn
                    variant="primary"
                    onClick={() => handleSaveBanner(
                      siteSettings.site_banner?.message || '',
                      !!siteSettings.site_banner?.active,
                      siteSettings.site_banner?.type || 'info',
                    )}
                  >
                    Save Announcement
                  </Btn>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                  <Wrench className="w-4 h-4 text-[#800000]" /> Maintenance Mode
                </h3>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-slate-700 font-medium">Site maintenance page</p>
                    <p className="text-xs text-slate-500">When enabled, non-admin visitors see a maintenance screen</p>
                  </div>
                  <Btn
                    variant={siteSettings.maintenance_mode?.enabled ? 'danger' : 'soft'}
                    onClick={() => handleMaintenanceMode(!siteSettings.maintenance_mode?.enabled)}
                  >
                    {siteSettings.maintenance_mode?.enabled ? 'Disable' : 'Enable'}
                  </Btn>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm">
                  <Download className="w-4 h-4 text-[#800000]" /> Export & Import
                </h3>
                <div className="flex gap-3 flex-wrap">
                  <Btn variant="outline" onClick={() => {
                    const data = JSON.stringify({ listings, users: platformUsers, tickets, reports, auditLog, verificationRequests }, null, 2);
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `gauseva-export-${Date.now()}.json`; a.click();
                  }}>
                    <Download className="w-3.5 h-3.5" /> Export All (JSON)
                  </Btn>
                  <Btn variant="outline" onClick={() => {
                    const csv = ['ID,Title,Breed,Type,Price,Location,Seller,Date,Featured'].concat(
                      listings.map(l => `"${l.id}","${l.title}","${l.breed}","${l.type}","${l.price || ''}","${l.location}","${l.sellerName || ''}","${l.postedAt}","${l.featured || false}"`)
                    ).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a'); a.href = url; a.download = `listings-${Date.now()}.csv`; a.click();
                  }}>
                    <FileText className="w-3.5 h-3.5" /> Export Listings (CSV)
                  </Btn>
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-600 mb-1 flex items-center gap-2">
                    <Upload className="w-3.5 h-3.5" /> Import Listings (CSV)
                  </p>
                  <p className="text-[11px] text-slate-500 mb-2">
                    Columns: <span className="font-mono">title, breed, type, price, age, location, status, seller, contact, description, imageUrl</span>
                  </p>
                  <input type="file" accept=".csv,text/csv" onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) { handleCsvImport(f); e.target.value = ''; }
                  }} className="text-sm" />
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  /* ─────────────────── MAIN SHELL ─────────────────── */

  return (
    <div className="min-h-screen bg-slate-100 flex text-slate-900">
      {/* Toast */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: -12, x: 12 }} animate={{ opacity: 1, y: 0, x: 0 }} exit={{ opacity: 0, y: -12 }}
            className={`fixed top-4 right-4 z-[100] px-4 py-3 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!confirm}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        inputLabel={confirm?.inputLabel}
        inputPlaceholder={confirm?.inputPlaceholder}
        onInput={setConfirmInput}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm?.onConfirm(confirmInput)}
      />

      {/* Edit listing modal */}
      <AnimatePresence>
        {editingListing && (
          <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50" onClick={() => setEditingListing(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Edit Listing</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Update listing details</p>
                </div>
                <button onClick={() => setEditingListing(null)} className="p-2 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
              </div>
              <div className="space-y-3">
                {[
                  { key: 'title', label: 'Title' },
                  { key: 'breed', label: 'Breed' },
                  { key: 'age', label: 'Age' },
                  { key: 'location', label: 'Location' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-bold text-slate-600 mb-1">{f.label}</label>
                    <input value={editingListing[f.key] || ''} onChange={e => setEditingListing({ ...editingListing, [f.key]: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/15" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Price</label>
                  <input type="number" value={editingListing.price || ''} onChange={e => setEditingListing({ ...editingListing, price: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#800000]/15" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Description</label>
                  <textarea value={editingListing.description || ''} rows={3}
                    onChange={e => setEditingListing({ ...editingListing, description: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#800000]/15" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Btn variant="primary" className="flex-1" onClick={handleSaveListingEdit}>Save Changes</Btn>
                  <Btn variant="outline" onClick={() => setEditingListing(null)}>Cancel</Btn>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* User dossier — full profile + all related platform activity */}
      <Drawer
        open={drawer?.type === 'user'}
        title={userDossier?.profile.name || drawer?.data?.name || 'User dossier'}
        subtitle="Complete profile & activity"
        onClose={() => setDrawer(null)}
        width="max-w-2xl"
      >
        {drawer?.type === 'user' && userDossier && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              {userDossier.profile.photoURL ? (
                <img
                  src={userDossier.profile.photoURL}
                  alt=""
                  className="w-16 h-16 rounded-2xl object-cover border border-slate-200 shrink-0"
                />
              ) : (
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white flex items-center justify-center text-2xl font-bold shrink-0">
                  {userDossier.profile.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900 text-xl flex items-center gap-2 flex-wrap">
                  {userDossier.profile.name}
                  {userDossier.profile.isVerified && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  {userDossier.profile.banned && <Ban className="w-5 h-5 text-red-500" />}
                </p>
                <p className="text-xs font-mono text-slate-400 break-all mt-0.5">{userDossier.uid}</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  <Badge tone={userDossier.profile.banned ? 'danger' : userDossier.profile.isVerified ? 'success' : 'neutral'}>
                    {userDossier.profile.banned ? 'Banned' : userDossier.profile.isVerified ? 'Verified' : 'Active'}
                  </Badge>
                  {userDossier.profile.onboarded !== undefined && (
                    <Badge tone={userDossier.profile.onboarded ? 'info' : 'warning'}>
                      {userDossier.profile.onboarded ? 'Onboarded' : 'Not onboarded'}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Quick counts */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {[
                ['Listings', userDossier.counts.listings],
                ['Tickets', userDossier.counts.tickets],
                ['Reviews', userDossier.counts.reviews],
                ['Reports', userDossier.counts.reportsFiled],
                ['Alerts', userDossier.counts.alerts],
              ].map(([label, n]) => (
                <div key={String(label)} className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 text-center">
                  <p className="text-lg font-bold text-slate-900">{n}</p>
                  <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            {/* Sub-tabs */}
            <div className="flex flex-wrap gap-1 border-b border-slate-100 pb-2">
              {([
                ['overview', 'Overview'],
                ['listings', `Listings (${userDossier.counts.listings})`],
                ['content', 'Other content'],
                ['tickets', `Tickets (${userDossier.counts.tickets})`],
                ['activity', 'Reports & audit'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setUserDossierTab(id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                    userDossierTab === id
                      ? 'bg-[#800000] text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* OVERVIEW */}
            {userDossierTab === 'overview' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Contact & identity</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    {[
                      ['Email', userDossier.profile.email || '—'],
                      ['Phone', userDossier.profile.phone || '—'],
                      ['Created', userDossier.profile.createdAt ? fmtDateTime(userDossier.profile.createdAt) : '—'],
                      ['Updated', userDossier.profile.updatedAt ? fmtDateTime(userDossier.profile.updatedAt) : '—'],
                    ].map(([k, v]) => (
                      <div key={k} className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <p className="text-[10px] font-bold uppercase text-slate-400">{k}</p>
                        <p className="font-medium text-slate-800 mt-0.5 break-all">{v}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Address</p>
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-sm">
                    <p className="font-medium text-slate-800 whitespace-pre-wrap">
                      {userDossier.profile.fullAddress || 'No street address on file'}
                    </p>
                    <div className="grid grid-cols-3 gap-2 pt-1">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">City</p>
                        <p className="font-semibold text-slate-700">{userDossier.profile.city || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">State</p>
                        <p className="font-semibold text-slate-700">{userDossier.profile.state || '—'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Pincode</p>
                        <p className="font-semibold text-slate-700">{userDossier.profile.pincode || '—'}</p>
                      </div>
                    </div>
                    {userDossier.profile.location && (
                      <p className="text-xs text-slate-500 pt-1 border-t border-slate-200">
                        Full location: {userDossier.profile.location}
                      </p>
                    )}
                  </div>
                </div>

                {userDossier.profile.banReason && (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-800">
                    <span className="font-bold">Ban reason:</span> {userDossier.profile.banReason}
                    {userDossier.profile.bannedAt && (
                      <span className="block text-xs mt-1 opacity-80">Since {fmtDateTime(userDossier.profile.bannedAt)}</span>
                    )}
                  </div>
                )}

                {userDossier.verifications.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Verification</p>
                    <div className="space-y-2">
                      {userDossier.verifications.map((r: any) => (
                        <div key={r.id} className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-sm">
                          <div>
                            <Badge tone={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}>{r.status}</Badge>
                            <p className="text-xs text-slate-500 mt-1">{r.idProofType || 'ID'} · {fmtDate(r.submittedAt)}</p>
                          </div>
                          <Btn size="sm" variant="soft" onClick={() => setDrawer({ type: 'verification', data: r })}>Open</Btn>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* LISTINGS */}
            {userDossierTab === 'listings' && (
              <div className="space-y-2">
                {userDossier.listings.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">No listings posted by this user.</p>
                )}
                {userDossier.listings.map((l: any) => (
                  <div key={l.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                    {l.imageUrl ? (
                      <img src={l.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-200 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 text-sm truncate">{l.title}</p>
                      <p className="text-xs text-slate-500">
                        {l.type === 'adopt' ? 'Adoption' : `₹${(l.price || 0).toLocaleString('en-IN')}`}
                        {l.location ? ` · ${l.location}` : ''}
                        {l.featured ? ' · Featured' : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <a href={`/listing/${l.id}`} target="_blank" rel="noreferrer" className="p-2 rounded-lg hover:bg-white text-slate-500" title="View">
                        <Eye className="w-4 h-4" />
                      </a>
                      <Btn size="icon" title="Edit" onClick={() => setEditingListing({ ...l })}><Edit3 className="w-4 h-4" /></Btn>
                      <Btn size="icon" className="hover:text-red-600" title="Delete" onClick={() => handleDelete('listings', l.id)}><Trash2 className="w-4 h-4" /></Btn>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* OTHER CONTENT */}
            {userDossierTab === 'content' && (
              <div className="space-y-5">
                {[
                  { title: 'Gaushalas', items: userDossier.gaushalas, nameKey: 'name' },
                  { title: 'Alerts', items: userDossier.alerts, nameKey: 'type' },
                  { title: 'Veterinarians', items: userDossier.vets, nameKey: 'name' },
                  { title: 'Transport', items: userDossier.transports, nameKey: 'name' },
                  { title: 'Sponsorships', items: userDossier.sponsorships, nameKey: 'gaushalaName' },
                  { title: 'Reviews written', items: userDossier.reviews, nameKey: 'comment' },
                ].map(section => (
                  <div key={section.title}>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      {section.title} ({section.items.length})
                    </p>
                    {section.items.length === 0 ? (
                      <p className="text-xs text-slate-400 mb-3">None</p>
                    ) : (
                      <div className="space-y-1.5 mb-3">
                        {section.items.map((item: any) => (
                          <div key={item.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                            <p className="font-medium text-slate-800 truncate">
                              {item[section.nameKey] || item.title || item.id}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400">{item.id}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* TICKETS */}
            {userDossierTab === 'tickets' && (
              <div className="space-y-2">
                {userDossier.tickets.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">No support tickets.</p>
                )}
                {userDossier.tickets.map((t: any) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setDrawer({ type: 'ticket', data: t })}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-semibold text-slate-900 text-sm truncate">{t.subject}</p>
                      <Badge tone={t.status === 'open' ? 'info' : t.status === 'in_progress' ? 'warning' : 'success'}>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2">{t.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">{t.category} · {fmtDate(t.createdAt)}</p>
                  </button>
                ))}
              </div>
            )}

            {/* ACTIVITY */}
            {userDossierTab === 'activity' && (
              <div className="space-y-5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Reports filed by user ({userDossier.reportsFiled.length})
                  </p>
                  {userDossier.reportsFiled.length === 0 ? (
                    <p className="text-xs text-slate-400">None</p>
                  ) : userDossier.reportsFiled.map((r: any) => (
                    <div key={r.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm mb-1.5">
                      <div className="flex items-center gap-2">
                        <Badge tone={r.status === 'pending' ? 'warning' : 'success'}>{r.status}</Badge>
                        <span className="font-medium">{r.reason}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{r.targetType}: {String(r.targetId).slice(0, 20)}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Reports against user ({userDossier.reportsAgainst.length})
                  </p>
                  {userDossier.reportsAgainst.length === 0 ? (
                    <p className="text-xs text-slate-400">None</p>
                  ) : userDossier.reportsAgainst.map((r: any) => (
                    <div key={r.id} className="p-2.5 bg-red-50 rounded-lg border border-red-100 text-sm mb-1.5">
                      <Badge tone="danger">{r.reason}</Badge>
                      <p className="text-xs text-red-800/80 mt-1">By {r.reporterName} · {fmtDate(r.createdAt)}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                    Related audit log ({userDossier.audit.length})
                  </p>
                  {userDossier.audit.length === 0 ? (
                    <p className="text-xs text-slate-400">No audit entries linked to this user.</p>
                  ) : (
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {userDossier.audit.slice(0, 30).map((log: any, i: number) => (
                        <div key={log.id || i} className="flex items-center gap-2 text-xs p-2 bg-slate-50 rounded-lg">
                          <span className="text-slate-400 whitespace-nowrap">{fmtDateTime(log.timestamp)}</span>
                          <Badge>{log.action}</Badge>
                          <span className="text-slate-600 truncate">{log.target}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Sticky actions */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100 sticky bottom-0 bg-white pb-1">
              <Btn
                variant="soft"
                onClick={() => handleUserVerify(userDossier.uid, userDossier.profile.name, !!userDossier.profile.isVerified)}
              >
                {userDossier.profile.isVerified ? 'Revoke verification' : 'Verify user'}
              </Btn>
              <Btn
                variant={userDossier.profile.banned ? 'soft' : 'danger'}
                onClick={() => handleBanUser(userDossier.uid, userDossier.profile.name, !!userDossier.profile.banned)}
              >
                {userDossier.profile.banned ? 'Unban' : 'Ban'}
              </Btn>
              <Btn
                variant="outline"
                className="text-red-600 border-red-200"
                onClick={() => handleDeleteUser(userDossier.uid, userDossier.profile.name)}
              >
                Delete user
              </Btn>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        open={drawer?.type === 'ticket'}
        title={drawer?.data?.subject || 'Ticket'}
        subtitle={drawer?.data ? `${drawer.data.userName} · ${drawer.data.category}` : undefined}
        onClose={() => setDrawer(null)}
        width="max-w-xl"
      >
        {drawer?.type === 'ticket' && drawer.data && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge tone={drawer.data.status === 'open' ? 'info' : drawer.data.status === 'in_progress' ? 'warning' : 'success'}>{drawer.data.status}</Badge>
              <span className="text-xs text-slate-500">{fmtDateTime(drawer.data.createdAt)}</span>
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{drawer.data.description}</p>
            {drawer.data.attachmentUrl && (
              <a href={drawer.data.attachmentUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline font-medium">Open attachment</a>
            )}
            {drawer.data.userComment && (
              <div className="p-3 bg-sky-50 rounded-lg border border-sky-100">
                <p className="text-xs font-bold text-sky-800">User comment</p>
                <p className="text-sm text-sky-900 mt-1">{drawer.data.userComment}</p>
              </div>
            )}
            {drawer.data.adminReply && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs font-bold text-amber-800">Admin reply</p>
                <p className="text-sm text-amber-900 mt-1">{drawer.data.adminReply}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Drawer
        open={drawer?.type === 'verification'}
        title={drawer?.data?.userName || 'Verification'}
        subtitle={drawer?.data ? fmtDate(drawer.data.submittedAt) : undefined}
        onClose={() => setDrawer(null)}
      >
        {drawer?.type === 'verification' && drawer.data && (
          <div className="space-y-4">
            <Badge tone={drawer.data.status === 'approved' ? 'success' : drawer.data.status === 'rejected' ? 'danger' : 'warning'}>{drawer.data.status}</Badge>
            {drawer.data.idProofType && <p className="text-sm"><span className="font-bold text-slate-600">ID type:</span> {drawer.data.idProofType}</p>}
            <div className="space-y-3">
              {(drawer.data.idProofUrl || drawer.data.idDocumentBase64) && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">ID document</p>
                  <a href={drawer.data.idProofUrl || drawer.data.idDocumentBase64} target="_blank" rel="noreferrer">
                    <img src={drawer.data.idProofUrl || drawer.data.idDocumentBase64} alt="ID" className="max-w-full rounded-lg border border-slate-200" />
                  </a>
                </div>
              )}
              {(drawer.data.selfieUrl || drawer.data.selfieBase64) && (
                <div>
                  <p className="text-xs font-bold text-slate-500 mb-1">Selfie</p>
                  <a href={drawer.data.selfieUrl || drawer.data.selfieBase64} target="_blank" rel="noreferrer">
                    <img src={drawer.data.selfieUrl || drawer.data.selfieBase64} alt="Selfie" className="max-w-full rounded-lg border border-slate-200" />
                  </a>
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2">
              <Btn variant="success" onClick={() => handleApproveReject(drawer.data.id, 'approved')}>Approve</Btn>
              <Btn variant="danger" onClick={() => handleApproveReject(drawer.data.id, 'rejected')}>Reject</Btn>
            </div>
          </div>
        )}
      </Drawer>

      <Drawer
        open={drawer?.type === 'report'}
        title={drawer?.data?.reason || 'Report'}
        subtitle={drawer?.data ? `By ${drawer.data.reporterName}` : undefined}
        onClose={() => setDrawer(null)}
      >
        {drawer?.type === 'report' && drawer.data && (
          <div className="space-y-4 text-sm">
            <Badge tone={drawer.data.status === 'pending' ? 'warning' : 'success'}>{drawer.data.status}</Badge>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Target</p><p className="font-medium mt-0.5">{drawer.data.targetType}</p></div>
              <div className="bg-slate-50 rounded-lg p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Target ID</p><p className="font-mono text-xs mt-0.5 break-all">{drawer.data.targetId}</p></div>
            </div>
            {drawer.data.description && <p className="text-slate-700 leading-relaxed">{drawer.data.description}</p>}
          </div>
        )}
      </Drawer>

      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col shrink-0 bg-slate-900 transition-all duration-200 ${sidebarCollapsed ? 'w-[72px]' : 'w-64'}`}>
        {renderSidebarNav(sidebarCollapsed)}
      </aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 shadow-2xl">
              {renderSidebarNav(false)}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600">
              <Menu className="w-5 h-5" />
            </button>
            <button onClick={() => setSidebarCollapsed(c => !c)} className="hidden lg:inline-flex p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600" title="Toggle sidebar">
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <span>Admin</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-slate-600 truncate">{TAB_META[activeTab]?.title}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            {siteSettings.maintenance_mode?.enabled && (
              <Badge tone="danger">Maintenance ON</Badge>
            )}
            <Btn size="icon" title="Refresh" onClick={doRefresh} className={refreshing ? 'animate-spin' : ''}>
              <RefreshCw className="w-4 h-4" />
            </Btn>
            <a href="/" target="_blank" rel="noreferrer"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg">
              <ExternalLink className="w-4 h-4" /> View site
            </a>
            <div className="hidden md:flex items-center gap-2 pl-2 ml-1 border-l border-slate-200">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 text-white flex items-center justify-center text-xs font-bold">
                {(adminUsername || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="leading-tight">
                <p className="text-xs font-semibold text-slate-800 max-w-[140px] truncate">{adminUsername || 'Admin'}</p>
                <p className="text-[10px] text-slate-400">Online</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}

