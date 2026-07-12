import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { User, Phone, MapPin, UserCheck, ShieldCheck, HelpCircle } from "lucide-react";

interface ProfileCompletionModalProps {
  isOpen: boolean;
  user: any;
  onComplete: (updatedUser: any) => void;
}

export function ProfileCompletionModal({ isOpen, user, onComplete }: ProfileCompletionModalProps) {
  const [name, setName] = useState("");
  const [gender, setGender] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [location, setLocation] = useState("");
  const [role, setRole] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.displayName || user.name || "");
      setGender(user.gender || "");
      setPhoneNumber(user.phoneNumber || "");
      setLocation(user.location || "");
      setRole(user.role || "");
    }
  }, [user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return setError("Please enter your name.");
    if (!gender) return setError("Please select your gender.");
    if (!phoneNumber.trim()) return setError("Please enter your phone number.");
    if (!location.trim()) return setError("Please enter your location.");
    if (!role) return setError("Please select your role.");

    setIsLoading(true);
    setError("");

    try {
      const idToken = user?.getIdToken
        ? await user.getIdToken()
        : (await import("../lib/firebase")).auth.currentUser
          ? await (await import("../lib/firebase")).auth.currentUser!.getIdToken()
          : null;
      if (!idToken) throw new Error("Please sign in again.");
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          id: user.uid || user.id,
          email: user.email || "",
          name: name,
          displayName: name,
          gender,
          phoneNumber,
          location,
          role,
        }),
      });

      const updatedData = await response.json() as any;

      if (!response.ok) {
        throw new Error(updatedData.error || "Failed to update profile details.");
      }

      onComplete(updatedData);
    } catch (err: any) {
      console.error("Profile completion error:", err);
      setError(err.message || "Failed to save details. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-[#FFFDF9] rounded-2xl shadow-2xl border-2 border-amber-200 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-50 to-[#FCF9F2] p-6 border-b border-amber-100 text-center">
          <div className="mx-auto w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-800 mb-3">
            <UserCheck className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-[#800000] font-sanatan tracking-wide">
            Complete Your Profile
          </h2>
          <p className="text-xs text-amber-900/70 font-outfit mt-1">
            Welcome to GauSeva Connect! Please enter your details below to activate your account.
          </p>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
              {error}
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
                placeholder="Enter your full name"
                className="w-full pl-10 pr-4 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/30 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-outfit text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Gender */}
            <div>
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">
                Gender
              </label>
              <div className="relative">
                <HelpCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600 pointer-events-none" />
                <select
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-outfit text-sm appearance-none"
                >
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Organization">Gaushala Trust / Org</option>
                </select>
              </div>
            </div>

            {/* Role / Profile Type */}
            <div>
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">
                I am a...
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600 pointer-events-none" />
                <select
                  required
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-outfit text-sm appearance-none"
                >
                  <option value="">Select Profile Type</option>
                  <option value="Gau Sevak">Gau Sevak (Individual)</option>
                  <option value="Gaushala Admin">Gaushala Shelter Admin</option>
                  <option value="Veterinary Doctor">Veterinary Doctor</option>
                  <option value="Milk Vendor">Milk Buyer / Seller</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mobile Number */}
            <div>
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">
                Mobile Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  disabled={isLoading}
                  placeholder="e.g. +91 98765 43210"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/30 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-outfit text-sm"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">
                Location
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                <input
                  type="text"
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isLoading}
                  placeholder="e.g. Jaipur, Rajasthan"
                  className="w-full pl-10 pr-4 py-2 bg-white border border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/30 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-outfit text-sm"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[#800000] text-white hover:bg-[#990000] font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 flex justify-center items-center font-sanatan text-sm tracking-wide gap-2 mt-4"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Save Profile Details</span>
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
