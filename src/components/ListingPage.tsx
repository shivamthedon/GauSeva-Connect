import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, Share2, MapPin, Calendar, Phone, MessageCircle, ShieldCheck, User, Flag, Star, Send, X } from "lucide-react";
import { Listing } from "../types";
import { useAuth } from "../hooks/useAuth";
import { auth } from "../lib/firebase";

export function ListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [reportSent, setReportSent] = useState(false);

  // Reviews & Comments
  const [reviews, setReviews] = useState<any[]>([]);
  const [comments, setComments] = useState<any[]>([]);
  const [userRating, setUserRating] = useState(5);
  const [userReview, setUserReview] = useState("");
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showAdoptForm, setShowAdoptForm] = useState(false);
  const [adoptMsg, setAdoptMsg] = useState("");
  const [adoptPhone, setAdoptPhone] = useState("");
  const [adoptCity, setAdoptCity] = useState("");
  const [adoptShelter, setAdoptShelter] = useState("home");
  const [adoptExperience, setAdoptExperience] = useState("");
  const [adoptStatus, setAdoptStatus] = useState<"idle" | "ok" | "err">("idle");
  const [adoptError, setAdoptError] = useState("");

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [dataRes, reviewsRes, commentsRes] = await Promise.all([
          fetch(`${backendUrl}/api/data`),
          fetch(`${backendUrl}/api/reviews`),
          fetch(`${backendUrl}/api/comments?listingId=${id}`),
        ]);
        if (dataRes.ok) {
          const data = await dataRes.json();
          const found = (data.listings || []).find((l: Listing) => l.id === id) || null;
          setListing(found);

          // SEO meta tags
          if (found) {
            document.title = `${found.title} - GauSeva Connect`;
            const setMeta = (name: string, content: string) => {
              let meta = document.querySelector(`meta[name="${name}"]`) || document.querySelector(`meta[property="${name}"]`);
              if (!meta) { meta = document.createElement('meta'); meta.setAttribute(name.startsWith('og:') ? 'property' : 'name', name); document.head.appendChild(meta); }
              meta.setAttribute('content', content);
            };
            setMeta('description', found.description?.substring(0, 160) || `${found.title} - ${found.breed} - ${found.location}`);
            setMeta('og:title', `${found.title} - GauSeva Connect`);
            setMeta('og:description', found.description?.substring(0, 160) || '');
            setMeta('og:image', found.imageUrl || '');
            setMeta('og:url', window.location.href);
            setMeta('og:type', 'website');
          }
        }
        if (reviewsRes.ok) {
          const allReviews = await reviewsRes.json();
          setReviews(allReviews.filter((r: any) => r.listingId === id));
        }
        if (commentsRes.ok) setComments(await commentsRes.json());
      } catch {} finally { setLoading(false); }
    };
    fetchAll();

    // Cleanup: reset title on unmount
    return () => { document.title = "GauSeva Connect"; };
  }, [id]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("gauseva_favorites") || "[]");
      setIsFavorite(saved.includes(id));
    } catch {}
  }, [id]);

  const toggleFavorite = () => {
    try {
      const saved: string[] = JSON.parse(localStorage.getItem("gauseva_favorites") || "[]");
      const updated = saved.includes(id!) ? saved.filter(i => i !== id) : [...saved, id!];
      localStorage.setItem("gauseva_favorites", JSON.stringify(updated));
      setIsFavorite(!isFavorite);
    } catch {}
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: listing?.title, url });
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const authHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
    } catch { /* server enforces auth */ }
    return headers;
  };

  const handleReport = async () => {
    if (!reportReason) return;
    if (!user) { alert("Please sign in to report."); return; }
    try {
      const res = await fetch(`${backendUrl}/api/reports`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          reporterId: user.uid,
          reporterName: user.displayName || "User",
          targetType: "listing",
          targetId: id,
          reason: reportReason,
          description: reportDesc,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setReportSent(true);
      setReportReason(""); setReportDesc("");
    } catch { alert("Failed to submit report."); }
  };

  const handleSubmitReview = async () => {
    if (!user) { alert("Please sign in to leave a review."); return; }
    if (!userReview.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/reviews`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          listingId: id,
          userId: user.uid,
          userName: user.displayName || "User",
          rating: userRating,
          comment: userReview,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setUserReview(""); setUserRating(5);
      const list = await fetch(`${backendUrl}/api/reviews`);
      if (list.ok) {
        const all = await list.json();
        setReviews(all.filter((r: any) => r.listingId === id));
      }
    } catch { alert("Failed to submit review."); } finally { setSubmitting(false); }
  };

  const handleSubmitComment = async () => {
    if (!user) { alert("Please sign in to comment."); return; }
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/comments`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          listingId: id,
          userId: user.uid,
          userName: user.displayName || "User",
          text: commentText,
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setCommentText("");
      const list = await fetch(`${backendUrl}/api/comments?listingId=${id}`);
      if (list.ok) setComments(await list.json());
    } catch { alert("Failed to post comment."); } finally { setSubmitting(false); }
  };

  const handleAdoptionRequest = async () => {
    if (!user) {
      navigate("/sign-in");
      return;
    }
    if (!adoptMsg.trim() || !adoptPhone.trim() || !adoptCity.trim()) {
      setAdoptError("Please fill phone, city, and your message.");
      setAdoptStatus("err");
      return;
    }
    setSubmitting(true);
    setAdoptError("");
    setAdoptStatus("idle");
    try {
      const res = await fetch(`${backendUrl}/api/adoptions`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({
          listingId: id,
          requesterName: user.displayName || user.email || "User",
          requesterPhone: adoptPhone.startsWith("+") ? adoptPhone : `+91${adoptPhone.replace(/\D/g, "").slice(-10)}`,
          requesterCity: adoptCity,
          shelterType: adoptShelter,
          experience: adoptExperience,
          message: adoptMsg,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit request");
      setAdoptStatus("ok");
      setShowAdoptForm(false);
      setAdoptMsg("");
    } catch (e: any) {
      setAdoptError(e.message || "Failed");
      setAdoptStatus("err");
    } finally {
      setSubmitting(false);
    }
  };

  const avgRating = reviews.length > 0 ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1) : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#800000]"></div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-[#FFFDF9] flex flex-col justify-center items-center p-4">
        <p className="text-amber-900 font-bold text-lg mb-4">Listing not found</p>
        <Link to="/" className="text-[#800000] font-bold hover:underline">← Back to Home</Link>
      </div>
    );
  }

  const phone = listing.contactNumber?.replace(/[^0-9+]/g, "") || "";
  const whatsappNumber = phone.replace("+91", "").replace(/\s/g, "");
  const whatsappMsg = `Pranam! I am interested in the gaumata listing *"${listing.title}"* on GauSeva Connect.\n\n*Details:*\n- Breed: *${listing.breed}*\n- Status: *${listing.milkingStatus}*\n- Age: *${listing.age}*\n- Location: *${listing.location}*\n\nPlease let me know when we can discuss!`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMsg)}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFFDF9] via-[#FAF6EE] to-[#F5EFE1] font-sans">
      <header className="bg-white/95 backdrop-blur-md sticky top-0 z-40 border-b-2 border-amber-200">
        <div className="bg-gradient-to-r from-[#781B1B] via-[#D97706] to-[#781B1B] h-1.5 w-full"></div>
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-amber-900 hover:text-[#800000] font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-cinzel font-black tracking-widest text-[#450A0A]">GauSeva Connect</h1>
          <div className="flex items-center gap-2">
            <button onClick={toggleFavorite} className={`p-2 rounded-full ${isFavorite ? "bg-red-50 text-red-500" : "bg-amber-50 text-amber-600"}`}>
              <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
            </button>
            <button onClick={handleShare} className="p-2 rounded-full bg-amber-50 text-amber-600 hover:bg-amber-100"><Share2 className="w-5 h-5" /></button>
            <button onClick={() => setShowReport(true)} className="p-2 rounded-full bg-red-50 text-red-500 hover:bg-red-100" title="Report"><Flag className="w-5 h-5" /></button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {listing.imageUrl && (
          <div className="rounded-2xl overflow-hidden border-2 border-amber-200 mb-6">
            <img src={listing.imageUrl} alt={listing.title} className="w-full h-64 sm:h-80 object-cover" />
          </div>
        )}

        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${listing.type === "adopt" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-amber-50 text-amber-700 border-amber-200"}`}>
              {listing.type === "adopt" ? "Free Adoption" : "For Sale"}
            </span>
            {avgRating && (
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-500 text-amber-500" /> {avgRating} ({reviews.length})
              </span>
            )}
          </div>
          <h2 className="text-2xl sm:text-3xl font-cinzel font-black text-[#450A0A] tracking-wide">{listing.title}</h2>
          <p className="text-amber-800/60 text-sm mt-1 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {listing.location}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Breed", value: listing.breed },
            { label: "Age", value: `${listing.age} years` },
            { label: "Status", value: listing.milkingStatus },
            ...(listing.dailyMilkYield ? [{ label: "Milk Yield", value: `${listing.dailyMilkYield} L/day` }] : []),
            ...(listing.price ? [{ label: "Price", value: `₹${listing.price.toLocaleString("en-IN")}` }] : []),
            { label: "Posted", value: new Date(listing.postedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) },
          ].map((item) => (
            <div key={item.label} className="bg-white rounded-xl border border-amber-200 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700/60 mb-1">{item.label}</p>
              <p className="text-sm font-bold text-amber-950 capitalize">{item.value}</p>
            </div>
          ))}
        </div>

        {listing.description && (
          <div className="bg-white rounded-xl border border-amber-200 p-4 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900 mb-2">Description</h3>
            <p className="text-sm text-stone-700 whitespace-pre-wrap leading-relaxed">{listing.description}</p>
          </div>
        )}

        {(listing as any).status === "adopted" || (listing as any).adoptionStatus === "completed" ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 mb-6 text-center">
            <p className="font-bold text-emerald-800">This gaumata has been adopted</p>
            <p className="text-sm text-emerald-700/80 mt-1">Thank you for supporting ethical rehoming on GauSeva Connect.</p>
          </div>
        ) : (
          <div className="bg-[#FCF9F2] rounded-2xl border-2 border-amber-200 p-5 mb-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#800000] mb-3 flex items-center gap-1"><User className="w-4 h-4" /> Contact {listing.sellerName || "Owner"}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <a href={`tel:${phone}`} className="flex items-center justify-center gap-2 py-3 bg-white border-2 border-amber-200 hover:border-amber-400 text-amber-900 font-bold text-sm rounded-xl"><Phone className="w-4 h-4" /> Call Now</a>
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 py-3 bg-green-600 hover:bg-green-700 text-white font-bold text-sm rounded-xl"><MessageCircle className="w-4 h-4" /> WhatsApp</a>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!user) { navigate("/sign-in"); return; }
                setShowAdoptForm((v) => !v);
                setAdoptStatus("idle");
                setAdoptError("");
              }}
              className="w-full py-3 bg-[#800000] hover:bg-[#600000] text-white font-bold text-sm rounded-xl transition-colors"
            >
              {listing.type === "adopt" ? "Request to adopt" : "Express interest / request home"}
            </button>
            {adoptStatus === "ok" && (
              <p className="mt-3 text-sm font-semibold text-emerald-700 text-center">Adoption request sent! The owner can review it in their profile.</p>
            )}
            {showAdoptForm && (
              <div className="mt-4 p-4 bg-white rounded-xl border border-amber-200 space-y-3">
                <p className="text-sm font-bold text-slate-800">Tell the owner about your home</p>
                {adoptStatus === "err" && adoptError && (
                  <p className="text-xs text-red-600 font-medium">{adoptError}</p>
                )}
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Your phone (10 digits)"
                  value={adoptPhone}
                  onChange={(e) => setAdoptPhone(e.target.value)}
                />
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Your city"
                  value={adoptCity}
                  onChange={(e) => setAdoptCity(e.target.value)}
                />
                <select
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  value={adoptShelter}
                  onChange={(e) => setAdoptShelter(e.target.value)}
                >
                  <option value="home">Home / family shelter</option>
                  <option value="farm">Farm</option>
                  <option value="gaushala">Gaushala</option>
                  <option value="other">Other</option>
                </select>
                <input
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  placeholder="Experience with cattle (optional)"
                  value={adoptExperience}
                  onChange={(e) => setAdoptExperience(e.target.value)}
                />
                <textarea
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none"
                  rows={3}
                  placeholder="Why do you want to adopt this gaumata? Describe shelter, fodder & care plan."
                  value={adoptMsg}
                  onChange={(e) => setAdoptMsg(e.target.value)}
                />
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleAdoptionRequest}
                  className="w-full py-2.5 bg-[#800000] text-white font-bold text-sm rounded-lg disabled:opacity-50"
                >
                  {submitting ? "Sending…" : "Submit adoption request"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Reviews Section */}
        <div className="bg-white rounded-xl border border-amber-200 p-5 mb-6">
          <h3 className="text-lg font-bold text-amber-950 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5 text-amber-500" /> Reviews ({reviews.length})
            {avgRating && <span className="text-sm text-amber-600 font-normal">• Average: {avgRating}/5</span>}
          </h3>

          {/* Add Review */}
          {user && (
            <div className="mb-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <div className="flex items-center gap-1 mb-2">
                <span className="text-xs font-bold text-amber-900 mr-2">Your Rating:</span>
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} onClick={() => setUserRating(star)} className="p-0.5">
                    <Star className={`w-5 h-5 ${star <= userRating ? "fill-amber-500 text-amber-500" : "text-stone-300"}`} />
                  </button>
                ))}
              </div>
              <textarea value={userReview} onChange={e => setUserReview(e.target.value)} placeholder="Share your experience with this listing..." rows={2}
                className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm resize-none mb-2" />
              <button onClick={handleSubmitReview} disabled={submitting || !userReview.trim()}
                className="px-4 py-2 bg-[#800000] text-white text-sm font-bold rounded-lg hover:bg-[#600000] disabled:opacity-50">
                {submitting ? "Submitting..." : "Submit Review"}
              </button>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map(r => (
                <div key={r.id} className="p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-stone-900">{r.userName}</span>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= r.rating ? "fill-amber-500 text-amber-500" : "text-stone-300"}`} />)}
                    </div>
                    <span className="text-[10px] text-stone-400">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-stone-700">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400 text-center py-4">No reviews yet. Be the first to review!</p>
          )}
        </div>

        {/* Comments Section */}
        <div className="bg-white rounded-xl border border-amber-200 p-5 mb-6">
          <h3 className="text-lg font-bold text-amber-950 mb-4">Comments ({comments.length})</h3>

          {user && (
            <div className="flex gap-2 mb-4">
              <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="Ask a question or leave a comment..."
                className="flex-1 px-3 py-2 border border-amber-200 rounded-lg text-sm" onKeyDown={e => { if (e.key === 'Enter') handleSubmitComment(); }} />
              <button onClick={handleSubmitComment} disabled={submitting || !commentText.trim()}
                className="px-4 py-2 bg-[#800000] text-white rounded-lg hover:bg-[#600000] disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
          )}

          {comments.length > 0 ? (
            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-sm text-stone-900">{c.userName}</span>
                    <span className="text-[10px] text-stone-400">{new Date(c.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="text-sm text-stone-700">{c.text}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-stone-400 text-center py-4">No comments yet.</p>
          )}
        </div>
      </main>

      {/* Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            {reportSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3"><ShieldCheck className="w-6 h-6 text-emerald-600" /></div>
                <h3 className="font-bold text-stone-900 mb-2">Report Submitted</h3>
                <p className="text-sm text-stone-600 mb-4">Thank you for helping keep GauSeva safe.</p>
                <button onClick={() => { setShowReport(false); setReportSent(false); }} className="px-6 py-2 bg-[#800000] text-white font-bold rounded-xl">Close</button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-stone-900">Report Listing</h3>
                  <button onClick={() => setShowReport(false)} className="p-2 hover:bg-stone-100 rounded-lg"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Reason *</label>
                    <select value={reportReason} onChange={e => setReportReason(e.target.value)} className="w-full px-3 py-2 border border-stone-200 rounded-lg">
                      <option value="">Select reason</option>
                      <option value="fake">Fake listing</option><option value="scam">Scam / Fraud</option><option value="abuse">Animal abuse</option>
                      <option value="duplicate">Duplicate listing</option><option value="wrong_info">Wrong information</option><option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-600 mb-1">Details (optional)</label>
                    <textarea value={reportDesc} onChange={e => setReportDesc(e.target.value)} placeholder="Describe the issue..." rows={3} className="w-full px-3 py-2 border border-stone-200 rounded-lg resize-none" />
                  </div>
                  <button onClick={handleReport} disabled={!reportReason} className="w-full py-2.5 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 disabled:opacity-50">Submit Report</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
