import React, { useState } from "react";
import {
  X,
  MapPin,
  Phone,
  ShieldCheck,
  Heart,
  Info,
  Clock,
  AlertTriangle,
  MessageSquare,
  Share2,
  Check,
  Sparkles,
  Copy,
} from "lucide-react";
import { Listing } from "../types";

interface ListingDetailsModalProps {
  listing: Listing;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

export function ListingDetailsModal({
  listing,
  onClose,
  isFavorite = false,
  onToggleFavorite,
}: ListingDetailsModalProps) {
  // Share link feedback
  const [copiedShare, setCopiedShare] = useState(false);
  const [copiedSellerDetails, setCopiedSellerDetails] = useState(false);

  const handleShare = () => {
    const text = `Pranam! Check out this livestock listing on GauSeva Connect:\n\n*${listing.title}*\nBreed: ${listing.breed}\nAge: ${listing.age}\nLocation: ${listing.location}\nType: ${listing.type === "adopt" ? "For Free Adoption" : `For Sale (₹${listing.price})`}\nContact: ${listing.contactNumber}\n\nIn devotion to cow protection and welfare! 🙏`;
    navigator.clipboard.writeText(text);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  const handleCopySellerDetails = () => {
    const text = `Seller details for ${listing.title}:\nName: ${listing.sellerName}\nContact: ${listing.contactNumber}`;
    navigator.clipboard.writeText(text);
    setCopiedSellerDetails(true);
    setTimeout(() => setCopiedSellerDetails(false), 2000);
  };

  // Safe formatting for WhatsApp click-to-chat
  const cleanPhone = listing.contactNumber.replace(/[^0-9]/g, "");
  const basePhone = cleanPhone.length >= 10 ? cleanPhone.slice(-10) : cleanPhone;
  const whatsappNumber = `91${basePhone}`;
  const formattedPhoneUrl = `+91${basePhone}`;
  
  const whatsappMsg = `Pranam! I am interested in inquiring about the gaumata listing *"${listing.title}"* posted on GauSeva Connect.\n\n*Gaumata Details:*\n- Breed: *${listing.breed}*\n- Milking Status: *${listing.milkingStatus}*\n- Age: *${listing.age}*\n- Location / District: *${listing.location}*\n\nPlease let me know when we can conduct a short call or shelter visit to discuss further! 🙏`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;

  const formattedDate = new Date(listing.postedAt).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-stone-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bg-[#FFFDF9] rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-auto relative flex flex-col max-h-[90vh] border-2 border-amber-300">
        
        {/* Banner Picture Area */}
        <div className="relative h-48 sm:h-64 shrink-0 bg-[#FDFBF7] border-b border-amber-100">
          <img
            src={
              listing.imageUrl ||
              "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?auto=format&fit=crop&q=80&w=800"
            }
            alt={listing.title}
            className="w-full h-full object-contain"
          />
          
          {/* Top Floating Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {/* Favorite Bookmark Button */}
            {onToggleFavorite && (
              <button
                onClick={() => onToggleFavorite(listing.id)}
                className={`p-2.5 bg-[#FFFDF9]/95 text-amber-800 hover:scale-110 active:scale-90 rounded-full transition-all backdrop-blur-sm shadow-md flex items-center justify-center border border-amber-200`}
                title={isFavorite ? "Remove from Watchlist" : "Pin to Watchlist"}
              >
                <Heart
                  className={`w-4 h-4 ${
                    isFavorite
                      ? "text-rose-600 fill-rose-600 animate-pulse"
                      : "text-amber-800"
                  }`}
                />
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 bg-black/60 text-white hover:bg-black/80 rounded-full transition-colors backdrop-blur-sm border border-white/20"
              title="Close Details view"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="absolute top-4 left-4 flex gap-2">
            {listing.type !== "adopt" && (
              <span className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-emerald-50 text-xs font-extrabold px-4 py-2 rounded-lg shadow-lg border border-emerald-500/30">
                ₹ {listing.price ? listing.price.toLocaleString("en-IN") : 0}
              </span>
            )}
          </div>
        </div>

        {/* Modal Scroll Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Main heading / posted date row */}
          <div className="flex items-start justify-between gap-4 border-b border-amber-100 pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-sanatan font-bold text-[#450A0A] mb-1.5 leading-snug">
                {listing.title}
              </h2>
              <div className="flex items-center text-amber-800 text-xs font-medium font-sanatan">
                <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Listed Seva: {formattedDate}
              </div>
            </div>
          </div>

          {/* Core specs bento tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#FCF9F2] p-3 rounded-xl border border-amber-200/60 text-left">
              <span className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 font-sanatan">
                Nasl / Breed
              </span>
              <span className="text-xs font-bold text-amber-950 truncate block font-sanatan">
                {listing.breed}
              </span>
            </div>
            <div className="bg-[#FCF9F2] p-3 rounded-xl border border-amber-200/60 text-left">
              <span className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 font-sanatan">
                Age
              </span>
              <span className="text-xs font-bold text-amber-950 truncate block font-sanatan">
                {listing.age} {typeof listing.age === 'number' || !isNaN(Number(listing.age)) ? ' Years' : ''}
              </span>
            </div>
            <div className="bg-[#FCF9F2] p-3 rounded-xl border border-amber-200/60 text-left">
              <span className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 font-sanatan">
                Status
              </span>
              <span className="text-xs font-bold text-amber-950 capitalize truncate block font-sanatan">
                {listing.milkingStatus === 'milking' ? '🍼 Active Milking' : listing.milkingStatus === 'pregnant' ? '🤰 Pregnant' : listing.milkingStatus === 'heifer' ? '🐄 Heifer': listing.milkingStatus === 'dry' || listing.milkingStatus === 'non-milking' ? '🕉️ Retired / Dry' : '🐄 Devotional Calf'}
              </span>
            </div>
            {listing.dailyMilkYield && listing.milkingStatus === 'milking' && (
              <div className="bg-[#FCF9F2] p-3 rounded-xl border border-amber-200/60 text-left">
                <span className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 font-sanatan">
                  Daily Yield
                </span>
                <span className="text-xs font-bold text-amber-950 truncate block font-sanatan">
                  {listing.dailyMilkYield} L
                </span>
              </div>
            )}
            <div className="bg-[#FCF9F2] p-3 rounded-xl border border-amber-200/60 text-left">
              <span className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest mb-0.5 font-sanatan">
                District / Location
              </span>
              <span
                className="text-xs font-bold text-amber-950 truncate block font-sanatan"
                title={listing.location}
              >
                {listing.location}
              </span>
            </div>
          </div>

          {/* About Listing Statement */}
          <div className="text-left">
            <h3 className="text-xs font-bold text-amber-900 uppercase tracking-widest mb-2.5 font-sanatan">
              Background & Devotional Remarks
            </h3>
            {listing.reasonForRehoming && (
                <p className="inline-block px-3 py-1 bg-amber-100/80 border border-amber-200 text-amber-900 font-bold font-sanatan rounded-md text-xs mb-3">
                    Reason for Rehoming: {listing.reasonForRehoming}
                </p>
            )}
            <p className="text-amber-950/90 text-sm leading-relaxed whitespace-pre-wrap bg-[#FCF9F2]/60 p-4 rounded-xl border border-amber-100/40 mb-3">
              {listing.description || "The caretaker has not provided any supplementary explanation statements for this listing yet."}
            </p>
            
            {/* Optional Metadata Traits */}
            {(listing.healthStatus || listing.temperament || listing.transportAssistance) && (
                <div className="flex flex-wrap gap-2 mt-3">
                    {listing.healthStatus && (
                        <div className="bg-green-50 text-green-800 border border-green-200 px-3 py-1.5 rounded-lg text-xs font-bold font-sanatan flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                            Health: {listing.healthStatus}
                        </div>
                    )}
                    {listing.temperament && (
                        <div className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1.5 rounded-lg text-xs font-bold font-sanatan flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                            Nature: {listing.temperament}
                        </div>
                    )}
                    {listing.transportAssistance && (
                        <div className="bg-sky-50 text-sky-800 border border-sky-200 px-3 py-1.5 rounded-lg text-xs font-bold font-sanatan flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
                            Transport: {listing.transportAssistance}
                        </div>
                    )}
                </div>
            )}
          </div>

          {/* Retired gaumata details logic */}
          {listing.milkingStatus === "non-milking" && (
            <div className="bg-[#FFF8EB] border-l-4 border-[#800000] rounded-r-xl p-4 flex items-start text-amber-950 text-xs text-left">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mr-3 mt-0.5 text-[#800000]" />
              <p className="leading-relaxed font-sanatan">
                <strong>Important Stewardship Notice:</strong> This is a dry period or retired non-milking cow. We strongly advise that she be adopted or acquired only by verified gaushalas, agricultural families pursuing natural manure production, or individuals committed to life-long companion service (Seva).
              </p>
            </div>
          )}

          {/* Quick share or watch highlights link */}
          <div className="flex flex-wrap gap-2.5 justify-end">
            <button
              onClick={handleCopySellerDetails}
              className="inline-flex items-center text-xs font-bold text-amber-900 hover:text-white bg-amber-150 hover:bg-[#800000] px-4 py-2 rounded-lg transition-all shadow-xs border border-amber-200"
              title="Copy Seller Details"
            >
              {copiedSellerDetails ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-emerald-600 font-extrabold" />
                  Details Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1" />
                  Copy Seller Details
                </>
              )}
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center text-xs font-bold text-amber-900 hover:text-white bg-amber-150 hover:bg-[#800000] px-4 py-2 rounded-lg transition-all shadow-xs border border-amber-200"
              title="Copy pre-filled listing invite card Text"
            >
              {copiedShare ? (
                <>
                  <Check className="w-4 h-4 mr-1 text-emerald-600 font-extrabold" />
                  Invite Copied!
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 mr-1" />
                  Copy Invite Details
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Contact bar block with Dual Whatsapp and Call button */}
        <div className="p-4 sm:p-5 bg-[#FCF9F2] border-t border-amber-100 shrink-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            
            <div className="flex items-center text-left">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center font-extrabold text-lg mr-3 shadow-md border border-amber-200">
                {(listing.sellerName || "G").charAt(0).toUpperCase()}
              </div>
              <div>
                <span className="block text-[9px] font-bold text-amber-800 uppercase tracking-widest leading-none mb-1 font-sanatan">
                  Posted by Gausevak
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-950 block leading-tight font-sanatan">
                  {listing.sellerName}
                </span>
              </div>
            </div>

            {/* Direct Contact triggers with clear, safe structure */}
            <div className="flex flex-col sm:flex-row items-stretch gap-2 shrink-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[#15803d] hover:bg-[#166534] hover:scale-[1.01] active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
              >
                <MessageSquare className="w-4 h-4" />
                Chat on WhatsApp
              </a>

              <a
                href={`tel:${formattedPhoneUrl}`}
                className="bg-[#800000] hover:bg-[#450A0A] hover:scale-[1.01] active:scale-95 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 border border-amber-300/20"
              >
                <Phone className="w-4 h-4" />
                Call {formattedPhoneUrl}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
