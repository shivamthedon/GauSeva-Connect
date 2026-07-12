import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Mail, ShieldCheck, Lock } from "lucide-react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";

export function SignInPage() {
  const navigate = useNavigate();
  const [view, setView] = useState<"signin" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate("/");
    } catch (err: any) {
      setError(
        err.code === "auth/invalid-credential" ? "Invalid email or password." :
        err.code === "auth/user-not-found" ? "No account found with this email." :
        err.code === "auth/wrong-password" ? "Incorrect password." :
        err.code === "auth/too-many-requests" ? "Too many failed attempts. Try again later." :
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccess("Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(
        err.code === "auth/user-not-found" ? "No account found with this email." :
        err.code === "auth/invalid-email" ? "Invalid email address." :
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gs-page-bg min-h-screen flex flex-col justify-center items-center p-4 relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#800000]/12 via-transparent to-transparent pointer-events-none" />

      <Link
        to="/"
        className="absolute top-6 left-6 z-10 flex items-center gap-2 text-slate-600 hover:text-[#800000] font-semibold text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-8">
        <div className="text-center mb-7">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#800000] to-[#c2410c] flex items-center justify-center shadow-lg shadow-[#800000]/25">
            {view === "signin" ? <Lock className="w-6 h-6 text-white" /> : <Mail className="w-6 h-6 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {view === "signin" ? "Welcome back" : "Reset password"}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {view === "signin"
              ? "Sign in to manage listings and your profile"
              : "We'll email you a secure reset link"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm font-medium rounded-xl text-center">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 text-sm font-medium rounded-xl text-center">
            {success}
          </div>
        )}

        {view === "signin" ? (
          <>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="gs-label">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="gs-input"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="gs-label">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="gs-input pr-11"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => { setView("reset"); setError(""); setSuccess(""); }}
                    className="text-xs font-semibold text-[#800000] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="gs-btn-primary w-full py-3">
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>

            <p className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-600">
              Don&apos;t have an account?{" "}
              <Link to="/sign-up" className="text-[#800000] font-bold hover:underline">
                Sign up
              </Link>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <label className="gs-label">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="gs-input"
                  autoComplete="email"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">Use the email linked to your account.</p>
              </div>
              <button type="submit" disabled={loading} className="gs-btn-primary w-full py-3">
                {loading ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <button
                onClick={() => { setView("signin"); setError(""); setSuccess(""); }}
                className="text-sm font-bold text-[#800000] hover:underline"
              >
                ← Back to sign in
              </button>
            </div>
          </>
        )}

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure sign-in · GauSeva Connect
        </div>
      </div>
    </div>
  );
}
