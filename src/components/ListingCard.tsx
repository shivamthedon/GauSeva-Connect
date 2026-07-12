import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { MapPin, ArrowUpRight, ShieldCheck, Heart, Share2, Check, AlertCircle, Droplets, Calendar, Phone } from "lucide-react";
import { Listing } from "../types";

interface ListingCardProps {
  key?: string | number | null;
  listing: Listing;
  onClick: (listing: Listing) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  isUploaderVerified?: boolean;
}

export function ListingCard({
  listing,
  onClick,
  isFavorite = false,
  onToggleFavorite,
  isUploaderVerified = false,
}: ListingCardProps) {
  const navigate = useNavigate();
  const [showShareToast, setShowShareToast] = useState(false);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite?.(listing.id);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/listing/${listing.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: listing.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        setShowShareToast(true);
        setTimeout(() => setShowShareToast(false), 2000);
      }
    } catch {}
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = listing.contactNumber?.replace(/[^0-9+]/g, "");
    if (phone) window.open(`tel:${phone}`, "_self");
  };

  const getDaysAgo = (dateStr: string) => {
    const days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return `${Math.floor(days / 30)}mo ago`;
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "milking": return { label: "Milking", color: "bg-emerald-500 text-white" };
      case "pregnant": return { label: "Pregnant", color: "bg-violet-500 text-white" };
      case "dry": return { label: "Dry", color: "bg-amber-500 text-white" };
      case "non-milking": return { label: "Retired", color: "bg-slate-500 text-white" };
      case "heifer": return { label: "Heifer", color: "bg-sky-500 text-white" };
      case "calf": return { label: "Calf", color: "bg-orange-500 text-white" };
      default: return { label: status || "—", color: "bg-slate-400 text-white" };
    }
  };

  const statusConfig = getStatusConfig(listing.milkingStatus);

  return (
    <motion.article
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      whileHover={{ y: -4 }}
      onClick={() => navigate(`/listing/${listing.id}`)}
      className="bg-white rounded-2xl overflow-hidden border border-slate-200/90 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/60 transition-all duration-300 cursor-pointer group flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
        <img
          src={listing.imageUrl || "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?auto=format&fit=crop&q=80&w=800"}
          alt={listing.title}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 via-black/15 to-transparent" />

        <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {listing.type === "adopt" ? (
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600 text-white shadow-md flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Adoption
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-white/95 text-emerald-800 shadow-md backdrop-blur-sm">
                ₹{(listing.price || 0).toLocaleString("en-IN")}
              </span>
            )}
            {listing.featured && (
              <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-500 text-white shadow-md">
                Featured
              </span>
            )}
          </div>
          {onToggleFavorite && (
            <button
              onClick={handleFavoriteClick}
              className="bg-white/95 backdrop-blur-sm p-2 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all"
              aria-label={isFavorite ? "Remove from watchlist" : "Add to watchlist"}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "text-rose-500 fill-rose-500" : "text-slate-400"}`} />
            </button>
          )}
        </div>

        <div className="absolute bottom-3 left-3">
          <span className={`${statusConfig.color} px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-md`}>
            {statusConfig.label}
            {listing.dailyMilkYield ? ` · ${listing.dailyMilkYield}L/day` : ""}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="font-bold text-slate-900 text-[0.95rem] mb-2 line-clamp-1 group-hover:text-[#800000] transition-colors tracking-tight">
          {listing.title}
        </h3>

        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700">
            {listing.breed || "Indigenous"}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-700">
            <Calendar className="w-3 h-3 text-slate-400" /> {listing.age ?? "—"} yrs
          </span>
          {listing.dailyMilkYield ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-100 text-[10px] font-bold text-emerald-800">
              <Droplets className="w-3 h-3" /> {listing.dailyMilkYield}L
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-3">
          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
          <span className="truncate">{listing.location || "India"}</span>
        </div>

        <div className="flex-1" />

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#800000] to-[#c2410c] text-white flex items-center justify-center font-bold text-[10px] shrink-0 shadow-sm">
              {listing.sellerName?.charAt(0).toUpperCase() || "G"}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-800 truncate flex items-center gap-1">
                {listing.sellerName || "Gausevak"}
                {isUploaderVerified && <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />}
              </p>
              <p className="text-[10px] text-slate-400">{getDaysAgo(listing.postedAt)}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleCall}
              title="Call"
              className="p-2 rounded-xl bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleShare}
              title="Share"
              className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors relative"
            >
              {showShareToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Share2 className="w-3.5 h-3.5" />}
              {showShareToast && (
                <span className="absolute -top-7 right-0 bg-slate-900 text-white text-[9px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap">
                  Copied!
                </span>
              )}
            </button>
            <div className="p-2 rounded-xl bg-[#800000]/8 text-[#800000] group-hover:bg-[#800000] group-hover:text-white transition-all">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>
      </div>
    </motion.article>
  );
}
