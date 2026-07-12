import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Save, Heart } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../lib/firebase";
import { INDIAN_LOCATIONS } from "../data/indianLocations";

export function OnboardingPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const availableCities = INDIAN_LOCATIONS.find(s => s.stateName === selectedState)?.cities || [];

  useEffect(() => {
    if (user) {
      setName(user.displayName || "");
    }
  }, [user]);

  useEffect(() => {
    setSelectedCity("");
  }, [selectedState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  if (!user) {
    navigate("/sign-in");
    return null;
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
    setPhone(val);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!phone || phone.length < 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!fullAddress.trim()) {
      setError("Please enter your full address.");
      return;
    }
    if (!pincode.trim() || pincode.length !== 6) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }
    if (!selectedState) {
      setError("Please select your state.");
      return;
    }
    if (!selectedCity) {
      setError("Please select your city.");
      return;
    }

    setIsSaving(true);
    try {
      const location = `${fullAddress}, ${selectedCity}, ${selectedState} - ${pincode}`;
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
      if (!auth.currentUser) throw new Error("Please sign in again.");
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${backendUrl}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          id: user.uid,
          email: user.email || "",
          name,
          phone: `+91${phone}`,
          fullAddress,
          pincode,
          state: selectedState,
          city: selectedCity,
          location,
          onboarded: true,
          updatedAt: new Date().toISOString()
        })
      });

      if (!res.ok) throw new Error("Failed to save profile details.");
      navigate("/");
    } catch (err: any) {
      console.error("Onboarding error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] flex flex-col justify-center items-center p-4 font-sans">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border-2 border-amber-200 p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 bg-amber-50 rounded-full text-[#800000] mb-3">
            <Heart className="w-8 h-8 fill-current" />
          </div>
          <h1 className="text-3xl font-bold font-sanatan text-[#800000] tracking-wide mb-2">
            Complete Your Profile
          </h1>
          <p className="text-sm font-semibold text-amber-900/60">
            Please fill in these details to access GauSeva Connect.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Full Name / Devotee Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Sharma"
              className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800"
            />
          </div>

          {/* Mobile Number */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Mobile Number *
            </label>
            <div className="flex">
              <span className="flex items-center px-3 py-2.5 rounded-l-xl border border-r-0 border-amber-100 bg-stone-50 text-stone-600 font-bold text-sm select-none">
                +91
              </span>
              <input
                type="tel"
                required
                value={phone}
                onChange={handlePhoneChange}
                placeholder="98765 43210"
                maxLength={10}
                className="flex-1 px-4 py-2.5 rounded-r-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800"
              />
            </div>
          </div>

          {/* Full Address */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Full Address *
            </label>
            <textarea
              required
              value={fullAddress}
              onChange={(e) => setFullAddress(e.target.value)}
              placeholder="House/Flat No., Street, Landmark, Locality"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800 resize-none"
            />
          </div>

          {/* Pincode */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              Pincode *
            </label>
            <input
              type="text"
              required
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="e.g. 110001"
              maxLength={6}
              className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none transition-all font-medium text-stone-800"
            />
          </div>

          {/* State */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              State / UT *
            </label>
            <select
              required
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none bg-white transition-all font-medium text-stone-800"
            >
              <option value="">Select State / UT</option>
              {INDIAN_LOCATIONS.map((s) => (
                <option key={s.stateName} value={s.stateName}>{s.stateName}</option>
              ))}
            </select>
          </div>

          {/* City */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-1.5">
              City *
            </label>
            <select
              required
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              disabled={!selectedState}
              className="w-full px-4 py-2.5 rounded-xl border border-amber-100 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none bg-white transition-all font-medium text-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">{selectedState ? "Select City" : "Select a state first"}</option>
              {availableCities.map((city) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full mt-6 flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-[#800000] to-[#9E2A2B] hover:from-[#9E2A2B] hover:to-[#D97706] text-white font-bold rounded-xl transition-all shadow-md disabled:opacity-70 active:scale-[0.98]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving details..." : "Save and Continue"}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
