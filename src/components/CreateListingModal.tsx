import React, { useState, useRef } from "react";
import { X, Upload, Trash2, Check, CheckCircle2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { Listing } from "../types";
import { INDIAN_LOCATIONS } from "../data/indianLocations";
import { useAuth } from "../hooks/useAuth";

interface CreateListingModalProps {
  onClose: () => void;
  onSubmit: (listing: Omit<Listing, "id" | "postedAt" | "verified">) => Promise<void> | void;
}

export function CreateListingModal({ onClose, onSubmit }: CreateListingModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    title: "",
    breed: "Desi / Crossbreed",
    age: "",
    location: "",
    type: "adopt" as "adopt" | "sell",
    price: "",
    description: "",
    sellerName: "",
    contactNumber: "+91 ",
    milkingStatus: "milking" as "milking" | "dry" | "pregnant" | "heifer" | "non-milking" | "calf",
    dailyMilkYield: "",
    sacredDeclaration: false,
  });

  const [imageUrl, setImageUrl] = useState<string>("");
  const [imageFile, setImageFile] = useState<Blob | File | null>(null);
  const [fileName, setFileName] = useState<string>("gaumata.jpg");
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [error, setError] = useState("");
  const { width, height } = useWindowSize();

  // Auto-fill name and contact from user profile
  React.useEffect(() => {
    if (user) {
      setFormData(p => ({
        ...p,
        sellerName: user.displayName || user.name || "",
        contactNumber: user.phoneNumber || "+91 ",
      }));
    }
  }, [user]);

  const availableCities = INDIAN_LOCATIONS.find(s => s.stateName === selectedState)?.cities || [];

  const clearImage = () => {
    if (imageUrl?.startsWith("blob:")) URL.revokeObjectURL(imageUrl);
    setImageUrl(""); setImageFile(null);
  };

  const processFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Please upload an image file."); return; }
    if (file.size > 10 * 1024 * 1024) { alert("File too large. Max 10MB."); return; }
    setIsProcessing(true); setFileName(file.name);
    try {
      const MAX_SIZE = 500 * 1024; // 500KB target
      const compressedBlob = await new Promise<Blob>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
          const img = new Image();
          img.src = e.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_DIM = 800;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX_DIM) { h = Math.round((h * MAX_DIM) / w); w = MAX_DIM; } }
            else { if (h > MAX_DIM) { w = Math.round((w * MAX_DIM) / h); h = MAX_DIM; } }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext("2d");
            if (ctx) { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h); ctx.drawImage(img, 0, 0, w, h); }

            // Binary search for quality to hit 500KB
            let low = 0.1, high = 0.8, bestBlob: Blob | null = null;
            for (let i = 0; i < 6; i++) {
              const mid = (low + high) / 2;
              canvas.toBlob((b) => {
                if (b) bestBlob = b;
              }, "image/jpeg", mid);
              // Synchronous toBlob doesn't exist, so we use a different approach
            }
            // Iterative compression
            let quality = 0.7;
            const tryCompress = (q: number) => {
              canvas.toBlob((b) => {
                if (!b) { reject(new Error("Compression failed")); return; }
                if (b.size <= MAX_SIZE || q <= 0.1) {
                  resolve(b);
                } else {
                  tryCompress(q - 0.1);
                }
              }, "image/jpeg", q);
            };
            tryCompress(quality);
          };
          img.onerror = () => reject(new Error("Image load failed"));
        };
        reader.onerror = () => reject(new Error("File read failed"));
      });
      setImageUrl(URL.createObjectURL(compressedBlob));
      setImageFile(compressedBlob);
    } catch { alert("Error processing image."); } finally { setIsProcessing(false); }
  };

  const handleSubmit = async () => {
    setError("");
    if (!formData.title.trim()) { setError("Please enter the gaumata name."); return; }
    if (!formData.age.trim()) { setError("Please enter the age."); return; }
    if (!selectedState) { setError("Please select a state."); return; }
    if (!selectedCity) { setError("Please select a city."); return; }
    if (!formData.description.trim()) { setError("Please enter a description."); return; }
    if (!imageFile) { setError("Please upload a gaumata photo."); return; }
    if (!formData.sacredDeclaration) { setError("Please confirm the Sacred Declaration."); return; }
    if (formData.type === "sell" && (!formData.price || Number(formData.price) <= 0)) { setError("Please enter a valid price."); return; }

    setIsSubmitting(true);
    try {
      let finalImageUrl = "";
      if (imageFile) {
        const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
        const headers: Record<string, string> = {
          "Content-Type": "image/jpeg",
          "X-File-Name": fileName,
        };
        try {
          const { auth } = await import("../lib/firebase");
          if (auth.currentUser) {
            const idToken = await auth.currentUser.getIdToken();
            if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
          }
        } catch { /* server returns 401 if missing */ }
        const res = await fetch(`${backendUrl}/api/upload`, {
          method: "POST",
          headers,
          body: imageFile,
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error((err as any).error || "Image upload failed");
        }
        const { publicUrl } = await res.json();
        finalImageUrl = publicUrl;
      }

      const finalData: any = {
        ...formData,
        location: `${selectedCity}, ${selectedState}`,
        dailyMilkYield: formData.dailyMilkYield ? Number(formData.dailyMilkYield) : undefined,
        imageUrl: finalImageUrl,
      };
      if (formData.type === "sell") finalData.price = Number(formData.price);
      else delete finalData.price;
      if (!finalData.dailyMilkYield) delete finalData.dailyMilkYield;
      delete finalData.sacredDeclaration;

      await onSubmit(finalData);
      setIsSubmitted(true);
      setTimeout(onClose, 3000);
    } catch (e: any) { setError(e.message || "Failed to submit."); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-stone-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto relative border-2 border-amber-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-amber-100 flex items-center justify-between sticky top-0 bg-[#FFFDF9] z-10">
          <h2 className="text-lg font-sanatan font-bold text-[#800000]">Gau Mata Panjikaran</h2>
          <button onClick={onClose} className="p-2 text-amber-800 hover:text-[#800000] hover:bg-amber-100/50 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <AnimatePresence mode="wait">
            {isSubmitted ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center">
                <Confetti width={width} height={height} recycle={false} numberOfPieces={200} gravity={0.15}
                  colors={['#800000', '#FFB347', '#FFF200', '#9E2A2B', '#D97706']} style={{ zIndex: 100 }} />
                <div className="w-20 h-20 bg-green-100 text-green-700 rounded-full flex items-center justify-center mb-6 shadow-lg border-4 border-green-200">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-sanatan font-bold text-[#800000] mb-2">Seva Request Submitted!</h3>
                <p className="text-amber-800 text-sm font-sanatan max-w-md mb-4">May your noble intentions bring blessings.</p>
                <div className="bg-[#FCF9F2] border border-amber-200 rounded-xl p-4 max-w-sm w-full">
                  <p className="text-[#800000] font-sanatan font-bold text-center text-sm">गो सेवा परमो धर्मः ।</p>
                </div>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
                {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl text-center">{error}</div>}

                {/* Type */}
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Category</label>
                  <div className="flex gap-2 rounded-lg overflow-hidden border border-amber-200 p-1 bg-[#FCF9F2]">
                    <button type="button" onClick={() => setFormData(p => ({ ...p, type: "adopt" }))}
                      className={`flex-1 py-2 text-xs font-bold font-sanatan rounded-md transition-all ${formData.type === "adopt" ? "bg-[#800000] text-amber-100 shadow-md" : "text-amber-800 hover:bg-amber-200/40"}`}>
                      Free Adoption
                    </button>
                    <button type="button" onClick={() => setFormData(p => ({ ...p, type: "sell" }))}
                      className={`flex-1 py-2 text-xs font-bold font-sanatan rounded-md transition-all ${formData.type === "sell" ? "bg-amber-700 text-amber-50 shadow-md" : "text-amber-800 hover:bg-amber-200/40"}`}>
                      Sell / Transfer
                    </button>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">Gaumata Name *</label>
                  <input type="text" placeholder="e.g., Kapila, Nandini" value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-amber-950 font-sanatan text-sm" />
                </div>

                {/* Breed & Age */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">Breed *</label>
                    <select value={formData.breed} onChange={e => setFormData(p => ({ ...p, breed: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-amber-950 font-sanatan text-sm">
                      <option value="Desi / Crossbreed">Desi / Crossbreed</option>
                      <option value="Gir">Gir</option><option value="Sahiwal">Sahiwal</option>
                      <option value="Red Sindhi">Red Sindhi</option><option value="Tharparkar">Tharparkar</option>
                      <option value="Kankrej">Kankrej</option><option value="Rathi">Rathi</option>
                      <option value="Hariana">Hariana</option><option value="Ongole">Ongole</option>
                      <option value="Deoni">Deoni</option><option value="Amritmahal">Amritmahal</option>
                      <option value="Bachaur">Bachaur</option><option value="Badri">Badri</option>
                      <option value="Bargur">Bargur</option><option value="Belahi">Belahi</option>
                      <option value="Binjharpuri">Binjharpuri</option><option value="Dangi">Dangi</option>
                      <option value="Gangatiri">Gangatiri</option><option value="Gaolao">Gaolao</option>
                      <option value="Hallikar">Hallikar</option><option value="Kangayam">Kangayam</option>
                      <option value="Kasargod">Kasargod</option><option value="Kenkatha">Kenkatha</option>
                      <option value="Khillari">Khillari</option><option value="Krishnagiri">Krishnagiri</option>
                      <option value="Malnad Gidda">Malnad Gidda</option><option value="Malvi">Malvi</option>
                      <option value="Mewati">Mewati</option><option value="Nagori">Nagori</option>
                      <option value="Nimari">Nimari</option><option value="Punganur">Punganur</option>
                      <option value="Siri">Siri</option><option value="Vechur">Vechur</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">Age (Years) *</label>
                    <input type="number" min="0" step="0.1" placeholder="e.g., 4.5" value={formData.age}
                      onChange={e => setFormData(p => ({ ...p, age: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-amber-950 font-sanatan text-sm" />
                  </div>
                </div>

                {/* Status & Milk */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">Status *</label>
                    <select value={formData.milkingStatus} onChange={e => setFormData(p => ({ ...p, milkingStatus: e.target.value as any }))}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-amber-950 font-sanatan text-sm">
                      <option value="milking">Active Milking</option><option value="dry">Dry</option>
                      <option value="pregnant">Pregnant</option><option value="heifer">Heifer</option>
                      <option value="non-milking">Non-Milking</option><option value="calf">Calf</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">Milk (Litres/day) *</label>
                    <input type="number" min="0" step="0.5" placeholder="0 if Dry" value={formData.dailyMilkYield}
                      onChange={e => setFormData(p => ({ ...p, dailyMilkYield: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-amber-950 font-sanatan text-sm" />
                  </div>
                </div>

                {/* Price (if sell) */}
                {formData.type === "sell" && (
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">Price (₹)</label>
                    <input type="number" min="0" placeholder="Expected price" value={formData.price}
                      onChange={e => setFormData(p => ({ ...p, price: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-amber-950 font-sanatan text-sm" />
                  </div>
                )}

                {/* Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">State *</label>
                    <select value={selectedState} onChange={e => { setSelectedState(e.target.value); setSelectedCity(""); }}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-amber-950 font-sanatan text-sm">
                      <option value="">Select State</option>
                      {INDIAN_LOCATIONS.map(s => <option key={s.stateName} value={s.stateName}>{s.stateName}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">City *</label>
                    <select value={selectedCity} onChange={e => setSelectedCity(e.target.value)} disabled={!selectedState}
                      className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-amber-950 font-sanatan text-sm disabled:opacity-50">
                      <option value="">{selectedState ? "Select City" : "Select state first"}</option>
                      {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {/* Image Upload */}
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">Gaumata Photo *</label>
                  <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && processFile(e.target.files[0])} />
                  {!imageUrl ? (
                    <div onDragOver={e => { e.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)}
                      onDrop={e => { e.preventDefault(); setIsDragging(false); e.dataTransfer.files[0] && processFile(e.dataTransfer.files[0]); }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${isDragging ? "border-[#800000] bg-amber-50" : "border-amber-200 bg-[#FCF9F2] hover:border-amber-400"}`}>
                      {isProcessing ? (
                        <><Upload className="w-6 h-6 text-amber-700 animate-spin mb-1" /><span className="text-xs font-bold text-amber-900">Processing...</span></>
                      ) : (
                        <><Upload className="w-6 h-6 text-amber-600 mb-1" /><span className="text-xs font-bold text-amber-900">Click or drag photo here</span></>
                      )}
                    </div>
                  ) : (
                    <div className="relative rounded-xl overflow-hidden border border-amber-200 group">
                      <img src={imageUrl} alt="Preview" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-stone-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-white text-stone-800 text-xs font-bold rounded-lg">Change</button>
                        <button type="button" onClick={clearImage} className="p-1.5 bg-rose-600 text-white rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1 font-sanatan">Description *</label>
                  <textarea rows={3} placeholder="Health, habits, reason for rehoming..." value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    className="w-full px-4 py-2.5 bg-white border border-amber-200 rounded-xl resize-none focus:ring-2 focus:ring-amber-500 outline-none text-amber-950 font-sanatan text-sm" />
                </div>

                {/* Declaration */}
                <div className="bg-[#FFF8EB] border border-[#800000]/20 rounded-xl p-3 flex items-start">
                  <input type="checkbox" id="sacredDecl" checked={formData.sacredDeclaration}
                    onChange={e => setFormData(p => ({ ...p, sacredDeclaration: e.target.checked }))}
                    className="mt-1 w-4 h-4 text-[#800000] accent-[#800000] cursor-pointer" />
                  <label htmlFor="sacredDecl" className="ml-3 text-xs text-amber-950 font-sanatan leading-relaxed cursor-pointer font-bold">
                    I declare this Gau Mata is listed strictly for Seva, adoption, or ethical rehoming. She shall not be sold for slaughter or unspiritual purposes.
                  </label>
                </div>

                {/* Submit */}
                <button type="button" onClick={handleSubmit} disabled={isSubmitting || !formData.sacredDeclaration}
                  className="w-full py-3 bg-gradient-to-r from-[#800000] to-[#9E2A2B] hover:from-[#9E2A2B] hover:to-[#D97706] text-white font-bold rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 font-sanatan text-sm tracking-wide">
                  {isSubmitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Submitting...</> : <><Check className="w-4 h-4" /> Submit Listing</>}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
