import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, LogIn, UserPlus, Eye, EyeOff, Mail, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../lib/firebase";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup" | "emailVerify" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
    setError("");
    setLoading(false);
  };

  const switchMode = (newMode: typeof mode) => {
    resetForm();
    setMode(newMode);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(
        err.code === "auth/invalid-credential" ? "Invalid email or password." :
        err.code === "auth/too-many-requests" ? "Too many attempts. Try again later." :
        err.message
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      await sendEmailVerification(userCredential.user);
      setMode("emailVerify");
    } catch (err: any) {
      setError(
        err.code === "auth/email-already-in-use" ? "This email is already registered." :
        err.code === "auth/weak-password" ? "Password must be at least 6 characters." :
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

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setMode("signin");
      setPassword("");
      setError("");
      setLoading(false);
      // Show success by setting error to a success message with a special prefix
      setError("SUCCESS: Password reset email sent! Check your inbox.");
    } catch (err: any) {
      setError(
        err.code === "auth/user-not-found" ? "No account found with this email." :
        err.code === "auth/invalid-email" ? "Invalid email address." :
        err.message
      );
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
        resetForm();
        onClose();
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
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="w-full max-w-md bg-[#FFFDF9] rounded-2xl shadow-xl border-2 border-amber-200 overflow-hidden relative"
          >
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-amber-100 bg-[#FCF9F2]">
              <div className="flex items-center gap-2 text-[#800000]">
                {mode === "signin" && <LogIn className="w-5 h-5" />}
                {mode === "signup" && <UserPlus className="w-5 h-5" />}
                <h2 className="text-xl font-bold font-sanatan tracking-wide">
                  {mode === "signin" && "Sign In"}
                  {mode === "signup" && "Create Account"}
                  {mode === "emailVerify" && "Verify Email"}
                  {mode === "reset" && "Reset Password"}
                </h2>
              </div>
              <button
                onClick={() => { resetForm(); onClose(); }}
                className="text-amber-700 hover:text-[#800000] hover:bg-amber-100/50 p-2 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 bg-[#FFFDF9]">
              {error && (
                <div className={`mb-4 p-3 text-sm font-semibold rounded-xl text-center ${error.startsWith("SUCCESS:") ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                  {error.replace("SUCCESS: ", "")}
                </div>
              )}

              {/* Sign In */}
              {mode === "signin" && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password"
                        className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-800">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    <div className="mt-1.5 text-right">
                      <button type="button" onClick={() => switchMode("reset")}
                        className="text-xs font-semibold text-[#800000] hover:text-[#D97706] transition-colors">
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#800000] to-[#9E2A2B] hover:from-[#9E2A2B] hover:to-[#D97706] text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-70 active:scale-[0.98]">
                    {loading ? "Signing In..." : "Sign In"}
                  </button>
                </form>
              )}

              {/* Reset Password */}
              {mode === "reset" && (
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-[#800000]" />
                    </div>
                  </div>
                  <form onSubmit={handleResetPassword} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">Email</label>
                      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800" />
                      <p className="text-[10px] text-amber-700/60 mt-1">Enter the email associated with your account.</p>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-3 bg-gradient-to-r from-[#800000] to-[#9E2A2B] hover:from-[#9E2A2B] hover:to-[#D97706] text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-70 active:scale-[0.98]">
                      {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </form>
                  <div className="text-center">
                    <button onClick={() => switchMode("signin")}
                      className="text-sm font-semibold text-[#800000] hover:text-[#D97706] transition-colors">
                      Back to Sign In
                    </button>
                  </div>
                </div>
              )}

              {/* Sign Up */}
              {mode === "signup" && (
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">Full Name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Rahul Sharma"
                      className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">Email</label>
                    <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com"
                      className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">Password</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters"
                        className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800 pr-10" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-600 hover:text-amber-800">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#800000] to-[#9E2A2B] hover:from-[#9E2A2B] hover:to-[#D97706] text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-70 active:scale-[0.98]">
                    {loading ? "Creating Account..." : "Continue"}
                  </button>
                </form>
              )}

              {/* Email Verification */}
              {mode === "emailVerify" && (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center">
                      <Mail className="w-8 h-8 text-[#800000]" />
                    </div>
                  </div>
                  <div>
                    <p className="text-sm text-stone-700 font-medium mb-1">We sent a verification link to:</p>
                    <p className="text-base font-bold text-[#800000]">{email}</p>
                  </div>
                  <p className="text-xs text-amber-700/70">Click the link in your email to verify your address, then come back here.</p>
                  <button onClick={handleCheckEmailVerified} disabled={loading}
                    className="w-full py-3 bg-gradient-to-r from-[#800000] to-[#9E2A2B] hover:from-[#9E2A2B] hover:to-[#D97706] text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-70 active:scale-[0.98] flex items-center justify-center gap-2">
                    {loading ? "Checking..." : <><CheckCircle className="w-4 h-4" /> I've Verified My Email</>}
                  </button>
                  <button onClick={handleResendEmail} disabled={loading}
                    className="w-full py-2 text-sm font-semibold text-amber-700 hover:text-[#800000] transition-colors">
                    Resend verification email
                  </button>
                </div>
              )}

              {/* Toggle links */}
              {mode === "signin" && (
                <div className="mt-4 pt-4 border-t border-amber-100 text-center text-sm font-semibold">
                  <p className="text-stone-600">
                    Don't have an account?{" "}
                    <button onClick={() => switchMode("signup")} className="text-[#800000] hover:text-[#D97706] font-bold transition-colors ml-1">Sign Up</button>
                  </p>
                </div>
              )}
              {mode === "signup" && (
                <div className="mt-4 pt-4 border-t border-amber-100 text-center text-sm font-semibold">
                  <p className="text-stone-600">
                    Already have an account?{" "}
                    <button onClick={() => switchMode("signin")} className="text-[#800000] hover:text-[#D97706] font-bold transition-colors ml-1">Sign In</button>
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
