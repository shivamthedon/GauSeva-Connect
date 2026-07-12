import { StrictMode, lazy, Suspense, Component, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import App from "./App.tsx";
import "./index.css";

// Lazy load route components for code splitting
const AdminPanel = lazy(() => import("./components/AdminPanel").then(m => ({ default: m.AdminPanel })));
const LegalPage = lazy(() => import("./components/LegalPage").then(m => ({ default: m.LegalPage })));
const SignInPage = lazy(() => import("./components/SignInPage").then(m => ({ default: m.SignInPage })));
const SignUpPage = lazy(() => import("./components/SignUpPage").then(m => ({ default: m.SignUpPage })));
const OnboardingPage = lazy(() => import("./components/OnboardingPage").then(m => ({ default: m.OnboardingPage })));
const ListingPage = lazy(() => import("./components/ListingPage").then(m => ({ default: m.ListingPage })));
const ContactPage = lazy(() => import("./components/ContactPage").then(m => ({ default: m.ContactPage })));
const AboutPage = lazy(() => import("./components/AboutPage").then(m => ({ default: m.AboutPage })));

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center gap-3">
      <div className="animate-spin rounded-full h-10 w-10 border-2 border-slate-200 border-t-[#800000]" />
      <p className="text-xs font-semibold text-slate-400 tracking-wide">Loading…</p>
    </div>
  );
}

/** Catches render crashes so routes never fail as a silent blank page. */
class RouteErrorBoundary extends Component<
  { children: ReactNode; label?: string },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-red-200 rounded-2xl p-6 shadow-sm">
            <h1 className="text-lg font-bold text-red-700 mb-2">
              {this.props.label || "Page"} failed to load
            </h1>
            <p className="text-sm text-slate-600 mb-4 break-words">
              {this.state.error.message || "Unknown error"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#800000] text-white text-sm font-bold rounded-lg"
              >
                Reload
              </button>
              <a href="/" className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-lg">
                Home
              </a>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/sign-in/*" element={<SignInPage />} />
          <Route path="/sign-up/*" element={<SignUpPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/listing/:id" element={<ListingPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/admin"
            element={
              <RouteErrorBoundary label="Admin panel">
                <AdminPanel onClose={() => { window.location.href = "/"; }} />
              </RouteErrorBoundary>
            }
          />
          <Route path="/legal/:tabId" element={<LegalPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>,
);
