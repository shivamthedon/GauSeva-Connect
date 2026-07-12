import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Mail, CheckCircle, UserPlus, ShieldCheck } from "lucide-react";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
} from "firebase/auth";
import { auth } from "../lib/firebase";

export function SignUpPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"details" | "email">("details");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);
      setStep("email");
    } catch (err: any) {
      setError(
        err.code === "auth/email-already-in-use" ? "This email is already registered. Try signing in." :
        err.code === "auth/weak-password" ? "Password must be at least 6 characters." :
        err.code === "auth/invalid-email" ? "Invalid email address." :
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setError("");
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (user) await sendEmailVerification(user);
    } catch {
      setError("Failed to send verification email. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCheckEmailVerified = async () => {
    setError("");
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user found.");
      await user.reload();
      if (user.emailVerified) {
        navigate("/onboarding");
      } else {
        setError("Email not verified yet. Please check your inbox and click the verification link.");
      }
    } catch (err: any) {
      setError(err.message);
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
            {step === "email" ? <Mail className="w-6 h-6 text-white" /> : <UserPlus className="w-6 h-6 text-white" />}
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {step === "details" ? "Create your account" : "Verify your email"}
          </h1>
          <p className="text-sm text-slate-500 mt-1.5">
            {step === "details"
              ? "Join the GauSeva community of devotees"
              : "One more step to activate your account"}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm font-medium rounded-xl text-center">
            {error}
          </div>
        )}

        {step === "details" && (
          <form onSubmit={handleCreateAccount} className="space-y-4">
            <div>
              <label className="gs-label">Full name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="gs-input"
                autoComplete="name"
              />
            </div>
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
                  placeholder="Min 6 characters"
                  className="gs-input pr-11"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="gs-btn-primary w-full py-3 mt-1">
              {loading ? "Creating account…" : "Continue"}
            </button>
          </form>
        )}

        {step === "email" && (
          <div className="space-y-4 text-center">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-sm text-slate-600 mb-1">We sent a verification link to</p>
              <p className="text-base font-bold text-[#800000] break-all">{email}</p>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Open the email, click the link, then return here to continue.
            </p>
            <button
              onClick={handleCheckEmailVerified}
              disabled={loading}
              className="gs-btn-primary w-full py-3"
            >
              {loading ? "Checking…" : (
                <>
                  <CheckCircle className="w-4 h-4" /> I&apos;ve verified my email
                </>
              )}
            </button>
            <button
              onClick={handleResendEmail}
              disabled={loading}
              className="w-full py-2 text-sm font-semibold text-slate-500 hover:text-[#800000] transition-colors"
            >
              Resend verification email
            </button>
          </div>
        )}

        <p className="mt-6 pt-5 border-t border-slate-100 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/sign-in" className="text-[#800000] font-bold hover:underline">
            Sign in
          </Link>
        </p>

        <div className="mt-5 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure registration · GauSeva Connect
        </div>
      </div>
    </div>
  );
}
