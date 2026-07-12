import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, LayoutGrid, Clock, Trash2, Heart, ShieldAlert, ShieldCheck, Settings, Save, LogOut, CheckCircle, Camera, Upload, FileText, Ticket, Plus, MessageSquare } from "lucide-react";
import { Listing, VerificationRequest, SupportTicket } from "../types";
import { useAuth } from "../hooks/useAuth";
import { logOut, auth } from "../lib/firebase";
import { updateProfile } from "firebase/auth";
import { INDIAN_LOCATIONS } from "../data/indianLocations";

// Verification Form Component
function VerificationForm({ user, displayName, onAddVerificationRequest }: { user: any; displayName: string; onAddVerificationRequest?: (req: Omit<VerificationRequest, "id" | "status" | "submittedAt">) => Promise<void> }) {
  const [idFile, setIdFile] = useState<File | null>(null);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const MAX_SIZE = 500 * 1024; // 500KB

  const handleIdFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_SIZE) { setError("ID proof must be under 500KB."); return; }
    setError(""); setIdFile(file);
  };

  const handleSelfieFile = (file: File | undefined) => {
    if (!file) return;
    if (file.size > MAX_SIZE) { setError("Selfie must be under 500KB."); return; }
    setError(""); setSelfieFile(file);
  };
  const [idProofType, setIdProofType] = useState("aadhaar");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (file: File): Promise<string> => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
    const headers: Record<string, string> = {
      "Content-Type": file.type || "image/jpeg",
      "X-File-Name": file.name,
    };
    try {
      if (auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken();
        if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
      }
    } catch { /* server 401 if missing */ }
    const res = await fetch(`${backendUrl}/api/upload`, {
      method: "POST",
      headers,
      body: file,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Upload failed");
    }
    const { publicUrl } = await res.json();
    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idFile) { setError("Please upload your ID proof."); return; }
    if (!selfieFile) { setError("Please upload a selfie with your ID."); return; }
    setError("");
    setIsSubmitting(true);
    try {
      const idProofUrl = await uploadFile(idFile);
      const selfieUrl = await uploadFile(selfieFile);
      if (!onAddVerificationRequest) throw new Error("Verification not available.");
      await onAddVerificationRequest({
        userId: user.uid,
        userName: displayName || user.email || "Devotee",
        idProofType,
        idProofUrl,
        selfieUrl,
      } as any);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to submit verification.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 p-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h4 className="text-lg font-bold text-amber-950 mb-2">Verification Submitted!</h4>
        <p className="text-sm text-amber-800/80">Your documents have been submitted for review. We'll verify your identity within 48 hours.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-amber-100 text-center">
        <h4 className="font-bold text-amber-950 mb-1">Verify Your Identity</h4>
        <p className="text-xs text-amber-800/60">Upload your ID proof and a selfie to get verified.</p>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl text-center">{error}</div>
      )}

      {/* ID Proof Type */}
      <div>
        <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">ID Proof Type *</label>
        <select value={idProofType} onChange={(e) => setIdProofType(e.target.value)}
          className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm">
          <option value="aadhaar">Aadhaar Card</option>
          <option value="pan">PAN Card</option>
          <option value="voter">Voter ID</option>
          <option value="driving">Driving License</option>
          <option value="passport">Passport</option>
        </select>
      </div>

      {/* ID Proof Upload */}
      <div>
        <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Upload ID Proof *</label>
        <input ref={idInputRef} type="file" accept="image/*,.pdf" onChange={(e) => handleIdFile(e.target.files?.[0])} className="hidden" />
        <div onClick={() => idInputRef.current?.click()}
          className="w-full p-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-all text-center">
          {idFile ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 text-amber-700" />
              <span className="text-sm font-semibold text-amber-900 truncate max-w-[250px]">{idFile.name}</span>
              <span className="text-xs text-amber-600">({(idFile.size / 1024).toFixed(0)} KB)</span>
            </div>
          ) : (
            <div>
              <Upload className="w-8 h-8 text-amber-400 mx-auto mb-1" />
              <p className="text-sm font-semibold text-amber-700">Click to upload ID proof</p>
              <p className="text-[10px] text-amber-600/60">JPG, PNG or PDF. Max 500KB.</p>
            </div>
          )}
        </div>
      </div>

      {/* Selfie Upload */}
      <div>
        <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Upload Selfie with ID *</label>
        <input ref={selfieInputRef} type="file" accept="image/*" onChange={(e) => handleSelfieFile(e.target.files?.[0])} className="hidden" />
        <div onClick={() => selfieInputRef.current?.click()}
          className="w-full p-4 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-all text-center">
          {selfieFile ? (
            <div className="flex items-center justify-center gap-2">
              <FileText className="w-5 h-5 text-amber-700" />
              <span className="text-sm font-semibold text-amber-900 truncate max-w-[250px]">{selfieFile.name}</span>
              <span className="text-xs text-amber-600">({(selfieFile.size / 1024).toFixed(0)} KB)</span>
            </div>
          ) : (
            <div>
              <Camera className="w-8 h-8 text-amber-400 mx-auto mb-1" />
              <p className="text-sm font-semibold text-amber-700">Click to upload selfie with ID</p>
              <p className="text-[10px] text-amber-600/60">Hold your ID next to your face. JPG or PNG.</p>
            </div>
          )}
        </div>
      </div>

      <button type="submit" disabled={isSubmitting}
        className="w-full bg-[#800000] text-white hover:bg-[#990000] font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 font-sanatan text-sm tracking-wide">
        {isSubmitting ? (
          <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Submitting...</>
        ) : (
          <><CheckCircle className="w-4 h-4" /> Submit for Verification</>
        )}
      </button>
    </form>
  );
}

// Support Tickets Component
function TicketsSection({ user, displayName }: { user: any; displayName: string }) {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<SupportTicket["category"]>("general");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [comment, setComment] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const MAX_SIZE = 500 * 1024;

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";

  useEffect(() => {
    if (user) fetchTickets();
  }, [user]);

  const fetchTickets = async () => {
    try {
      const headers: Record<string, string> = {};
      try {
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        }
      } catch { /* ignore */ }
      const res = await fetch(`${backendUrl}/api/tickets/${user.uid}`, { headers });
      if (res.ok) setTickets(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const handleFile = (f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_SIZE) { setError("Attachment must be under 500KB."); return; }
    setError(""); setAttachment(f);
  };

  const uploadFile = async (file: File): Promise<string> => {
    const headers: Record<string, string> = {
      "Content-Type": file.type || "image/jpeg",
      "X-File-Name": file.name,
    };
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
    } catch { /* ignore */ }
    const res = await fetch(`${backendUrl}/api/upload`, {
      method: "POST",
      headers,
      body: file,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as any).error || "Upload failed");
    }
    const { publicUrl } = await res.json();
    return publicUrl;
  };

  const userAuthHeaders = async (): Promise<Record<string, string>> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    try {
      if (auth.currentUser) {
        const token = await auth.currentUser.getIdToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      }
    } catch { /* server will 401 if required */ }
    return headers;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) { setError("Fill in all fields."); return; }
    setError(""); setIsSubmitting(true);
    try {
      let attachmentUrl = "";
      if (attachment) attachmentUrl = await uploadFile(attachment);
      const res = await fetch(`${backendUrl}/api/tickets`, {
        method: "POST",
        headers: await userAuthHeaders(),
        body: JSON.stringify({
          userId: user.uid, userName: displayName || user.email || "User",
          userEmail: user.email || "", category, subject, description, attachmentUrl
        })
      });
      if (!res.ok) throw new Error("Failed to submit ticket.");
      setShowForm(false); setSubject(""); setDescription(""); setAttachment(null);
      fetchTickets();
    } catch (err: any) { setError(err.message); } finally { setIsSubmitting(false); }
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !selectedTicket) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`${backendUrl}/api/tickets/${selectedTicket.id}`, {
        method: "PUT",
        headers: await userAuthHeaders(),
        body: JSON.stringify({ userComment: comment })
      });
      if (!res.ok) throw new Error("Failed to add comment.");
      const updated = await res.json();
      setSelectedTicket(updated);
      setComment("");
      fetchTickets();
    } catch (err: any) { setError(err.message); } finally { setIsSubmitting(false); }
  };

  const handleDeleteTicket = async (ticketId: string) => {
    if (!confirm("Are you sure you want to delete this ticket?")) return;
    try {
      const res = await fetch(`${backendUrl}/api/tickets/${ticketId}`, {
        method: "DELETE",
        headers: await userAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to delete ticket.");
      setSelectedTicket(null);
      fetchTickets();
    } catch (err: any) { setError(err.message); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-blue-100 text-blue-700 border-blue-200";
      case "in_progress": return "bg-amber-100 text-amber-700 border-amber-200";
      case "resolved": return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "closed": return "bg-stone-100 text-stone-600 border-stone-200";
      default: return "bg-stone-100 text-stone-600 border-stone-200";
    }
  };

  // Ticket detail view
  if (selectedTicket) {
    return (
      <div className="max-w-xl">
        <button onClick={() => setSelectedTicket(null)} className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-[#800000] mb-4 transition-colors">
          ← Back to tickets
        </button>
        <div className="bg-white rounded-2xl border border-amber-200 p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold text-amber-950">{selectedTicket.subject}</h3>
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(selectedTicket.status)}`}>
              {selectedTicket.status.replace("_", " ")}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-amber-700/60">
            <span className="uppercase font-bold tracking-wider">{selectedTicket.category}</span>
            <span>•</span>
            <span>{new Date(selectedTicket.createdAt).toLocaleString()}</span>
          </div>
          <p className="text-sm text-stone-700 whitespace-pre-wrap">{selectedTicket.description}</p>
          {selectedTicket.attachmentUrl && (
            <a href={selectedTicket.attachmentUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-[#800000]">
              <FileText className="w-3.5 h-3.5" /> View Attachment
            </a>
          )}
          {selectedTicket.adminReply && (
            <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-2 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Admin Reply
              </p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{selectedTicket.adminReply}</p>
            </div>
          )}
          {selectedTicket.userComment && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-800 mb-2 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" /> Your Comment
              </p>
              <p className="text-sm text-stone-700 whitespace-pre-wrap">{selectedTicket.userComment}</p>
            </div>
          )}
        </div>

        {/* Add Comment */}
        {!selectedTicket.userComment && selectedTicket.status !== "closed" && (
          <div className="mt-4 space-y-3">
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest font-sanatan">Add Comment</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add more details or updates to your ticket..." rows={3}
              className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/40 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm resize-none" />
            <button onClick={handleAddComment} disabled={!comment.trim() || isSubmitting}
              className="w-full bg-amber-100 text-amber-900 hover:bg-amber-200 font-bold py-2.5 rounded-xl transition-all shadow-sm active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2 font-sanatan text-sm tracking-wide border border-amber-200">
              {isSubmitting ? <><span className="w-4 h-4 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin"></span> Adding...</> : <><MessageSquare className="w-4 h-4" /> Add Comment</>}
            </button>
          </div>
        )}

        {/* Delete Ticket */}
        <div className="mt-4 pt-4 border-t border-amber-100">
          <button onClick={() => handleDeleteTicket(selectedTicket.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 font-bold text-xs rounded-xl border border-red-200 transition-all active:scale-[0.98]">
            <Trash2 className="w-4 h-4" /> Delete Ticket
          </button>
        </div>
      </div>
    );
  }

  // New ticket form
  if (showForm) {
    return (
      <div className="max-w-xl">
        <button onClick={() => { setShowForm(false); setError(""); }} className="flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-[#800000] mb-4 transition-colors">
          ← Back to tickets
        </button>
        <h3 className="text-lg font-bold text-amber-950 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-amber-600" /> New Support Ticket
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold rounded-xl text-center">{error}</div>}
          <div>
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Category *</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm">
              <option value="general">General Inquiry</option>
              <option value="listing">Listing Issue</option>
              <option value="account">Account Problem</option>
              <option value="payment">Payment Issue</option>
              <option value="report">Report Abuse</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Subject *</label>
            <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description of your issue"
              className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/40 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Description *</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your issue in detail" rows={4}
              className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/40 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Attachment (optional)</label>
            <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={(e) => handleFile(e.target.files?.[0])} className="hidden" />
            <div onClick={() => fileRef.current?.click()}
              className="w-full p-3 border-2 border-dashed border-amber-300 rounded-xl bg-amber-50/50 hover:bg-amber-50 cursor-pointer transition-all text-center">
              {attachment ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-4 h-4 text-amber-700" />
                  <span className="text-sm font-semibold text-amber-900 truncate max-w-[200px]">{attachment.name}</span>
                  <span className="text-xs text-amber-600">({(attachment.size / 1024).toFixed(0)} KB)</span>
                </div>
              ) : (
                <div><Upload className="w-6 h-6 text-amber-400 mx-auto mb-1" /><p className="text-xs font-semibold text-amber-700">Click to upload (max 500KB)</p></div>
              )}
            </div>
          </div>
          <button type="submit" disabled={isSubmitting}
            className="w-full bg-[#800000] text-white hover:bg-[#990000] font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 font-sanatan text-sm tracking-wide">
            {isSubmitting ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Submitting...</> : <><CheckCircle className="w-4 h-4" /> Submit Ticket</>}
          </button>
        </form>
      </div>
    );
  }

  // Ticket list
  return (
    <div className="max-w-xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-amber-950 font-sanatan flex items-center gap-2">
            <Ticket className="w-5 h-5 text-amber-600" /> Support Tickets
          </h3>
          <p className="text-sm text-amber-800/80">Raise a ticket for any issues or queries.</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#800000] text-white hover:bg-[#990000] font-bold text-xs rounded-xl transition-all shadow-sm active:scale-[0.98]">
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>
      {loading ? (
        <div className="text-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#800000] mx-auto"></div></div>
      ) : tickets.length > 0 ? (
        <div className="space-y-3">
          {tickets.map((t) => (
            <div key={t.id} onClick={() => setSelectedTicket(t)}
              className="bg-white rounded-xl border border-amber-200 p-4 cursor-pointer hover:border-[#800000] hover:shadow-md transition-all">
              <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="font-bold text-amber-950 text-sm truncate">{t.subject}</h4>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getStatusColor(t.status)}`}>
                  {t.status.replace("_", " ")}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-amber-700/60">
                <span className="uppercase font-bold tracking-wider">{t.category}</span>
                <span>•</span>
                <span>{new Date(t.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl border border-amber-100">
          <Ticket className="w-12 h-12 text-amber-200 mx-auto mb-3" />
          <p className="text-amber-900 font-semibold mb-1">No tickets yet</p>
          <p className="text-xs text-amber-600/70">Raise a ticket if you need any help.</p>
        </div>
      )}
    </div>
  );
}

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  listings: Listing[];
  favorites?: string[];
  verificationRequests?: VerificationRequest[];
  onAddVerificationRequest?: (req: Omit<VerificationRequest, "id" | "status" | "submittedAt">) => Promise<void>;
  onDeleteListing?: (id: string) => void;
  onListingClick?: (listing: Listing) => void;
}

export function ProfileModal({ 
  isOpen, onClose, user, listings, favorites = [], verificationRequests = [], onAddVerificationRequest, onDeleteListing, onListingClick 
}: ProfileModalProps) {
  const { user: authUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'listings' | 'settings' | 'favorites' | 'verification' | 'tickets'>('listings');

  // Settings State
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [fullAddress, setFullAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState("");
  const isInitialLoad = useRef(true);
  const hasUserEdits = useRef(false);

  const availableCities = INDIAN_LOCATIONS.find(s => s.stateName === selectedState)?.cities || [];

  useEffect(() => {
    if (isOpen && authUser) {
      isInitialLoad.current = true;
      hasUserEdits.current = false;
      // Fetch current user data from backend
      const fetchUserData = async () => {
        try {
          const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
          const headers: Record<string, string> = {};
          try {
            if (auth.currentUser) {
              const idToken = await auth.currentUser.getIdToken();
              if (idToken) headers["Authorization"] = `Bearer ${idToken}`;
            }
          } catch { /* public projection if unauthenticated */ }
          const res = await fetch(`${backendUrl}/api/users/${authUser.uid}`, { headers });
          if (res.ok) {
            const data = await res.json();
            setDisplayName(data.name || authUser.displayName || "");
            setPhone(data.phone?.replace("+91", "") || "");
            setFullAddress(data.fullAddress || "");
            setPincode(data.pincode || "");
            setSelectedState(data.state || "");
            setSelectedCity(data.city || "");
            setPhotoURL(data.photoURL || authUser.photoURL || "");
          }
        } catch {
          setDisplayName(authUser.displayName || "");
          setPhotoURL(authUser.photoURL || "");
        }
      };
      fetchUserData();
    }
  }, [isOpen, authUser]);

  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    setSelectedCity("");
  }, [selectedState]);

  const handlePhoneChange = (val: string) => {
    setPhone(val.replace(/[^0-9]/g, "").slice(0, 10));
  };

  const handleUpdateProfile = async () => {
    if (!authUser) return;
    
    setIsUpdating(true);
    setUpdateMessage("");
    try {
      // Update Firebase profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { 
          displayName: displayName,
          photoURL: photoURL || undefined
        });
      }

      // Update backend
      const location = fullAddress && selectedCity && selectedState && pincode
        ? `${fullAddress}, ${selectedCity}, ${selectedState} - ${pincode}` : "";
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
      const payload = { 
        id: authUser.uid, 
        name: displayName,
        phone: phone ? `+91${phone}` : "",
        fullAddress,
        pincode,
        state: selectedState,
        city: selectedCity,
        location,
        photoURL
      };
      
      if (!auth.currentUser) throw new Error("Please sign in again.");
      const idToken = await auth.currentUser.getIdToken();
      const res = await fetch(`${backendUrl}/api/users`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify(payload)
      });
      
      const responseData = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(responseData.error || `Server error ${res.status}`);
      }
      
      setUpdateMessage("Profile updated successfully!");
    } catch (error: any) {
      console.error("Error updating profile", error);
      setUpdateMessage("Failed: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!isOpen) return null;

  const userListings = listings.filter((l) => l.userId === user?.uid);
  const userFavoritesList = listings.filter((l) => favorites.includes(l.id));
  const myVerificationRequest = verificationRequests.find(r => r.userId === user?.uid);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
              className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col pointer-events-auto border border-amber-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative bg-gradient-to-r from-[#450A0A] via-[#800000] to-[#450A0A] px-6 pt-10 pb-6 sm:px-8 sm:pt-12 sm:pb-8 flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 shrink-0 overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '16px 16px' }}></div>
                
                <div className="flex items-end gap-5 relative z-10 w-full">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-white/10 rounded-full flex items-center justify-center border-4 border-white/20 shadow-xl overflow-hidden shrink-0 backdrop-blur-sm">
                    {photoURL || user?.photoURL ? (
                      <img src={photoURL || user?.photoURL} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <User className="w-10 h-10 text-white/80" />
                    )}
                  </div>
                  <div className="pb-1 sm:pb-2">
                    <h2 className="text-2xl sm:text-3xl font-cinzel font-black tracking-widest text-white shadow-sm flex items-center gap-2">
                      {displayName || user?.displayName || "My Profile"}
                      {myVerificationRequest?.status === 'approved' && (
                      <span title="Verified Account" className="flex"><ShieldCheck className="w-5 h-5 text-emerald-400" /></span>
                      )}
                    </h2>
                    <p className="text-sm font-semibold text-amber-200 font-sanatan tracking-wide mt-1">
                      {user?.email || "Devotee"}
                    </p>
                  </div>
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
                  <button
                    onClick={() => { logOut(); onClose(); }}
                    className="flex flex-row items-center gap-2 px-3 py-1.5 bg-black/20 hover:bg-black/40 rounded-full transition-colors group"
                  >
                    <LogOut className="w-4 h-4 text-white/80 group-hover:text-white" />
                    <span className="text-white/80 group-hover:text-white text-xs font-bold uppercase tracking-wider">Log Out</span>
                  </button>
                  <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full transition-colors group">
                    <X className="w-5 h-5 text-white/80 group-hover:text-white" />
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex overflow-x-auto bg-[#FCF9F2] border-b border-amber-200 shrink-0 no-scrollbar">
                {(['listings', 'favorites', 'settings', 'verification', 'tickets'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-5 py-3 font-bold text-sm tracking-widest uppercase font-sanatan whitespace-nowrap transition-colors border-b-2 flex items-center gap-2 ${
                      activeTab === tab ? 'border-[#800000] text-[#800000]' : 'border-transparent text-amber-900/60 hover:text-amber-900'
                    }`}
                  >
                    {tab === 'listings' && <><LayoutGrid className="w-4 h-4" /> Listings</>}
                    {tab === 'favorites' && <><Heart className="w-4 h-4" /> Watchlist</>}
                    {tab === 'settings' && <><Settings className="w-4 h-4" /> Settings</>}
                    {tab === 'verification' && <><CheckCircle className="w-4 h-4" /> Verification</>}
                    {tab === 'tickets' && <><Ticket className="w-4 h-4" /> Support</>}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="p-6 sm:p-8 overflow-y-auto bg-amber-50/20 flex-grow">
                {/* Listings Tab */}
                {activeTab === 'listings' && (
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-amber-950 font-sanatan mb-2 flex items-center gap-2">
                        <LayoutGrid className="w-5 h-5 text-amber-600" /> My Gaumata Postings
                      </h3>
                      <p className="text-sm text-amber-800/80 mb-4">Manage the gaumata you have posted for adoption or sale.</p>
                    </div>
                    {userListings.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userListings.map((listing) => (
                          <div key={listing.id} onClick={() => onListingClick?.(listing)}
                            className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm flex flex-col cursor-pointer hover:border-[#800000] hover:shadow-md transition-all group">
                            <div className="h-40 overflow-hidden relative">
                              {listing.imageUrl ? (
                                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full bg-amber-100 flex items-center justify-center"><LayoutGrid className="w-8 h-8 text-amber-300" /></div>
                              )}
                              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-amber-900 border border-amber-200 uppercase tracking-widest">
                                {listing.type === 'adopt' ? 'Adoption' : 'Sale'}
                              </div>
                            </div>
                            <div className="p-4 flex-grow flex flex-col">
                              <h4 className="font-bold text-amber-950 truncate mb-1">{listing.title}</h4>
                              <p className="text-xs text-amber-700/80 mb-2 truncate">{listing.breed} • {listing.location}</p>
                              <div className="mt-auto pt-3 border-t border-amber-100 flex justify-between items-center">
                                <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(listing.postedAt).toLocaleDateString()}
                                </span>
                                {onDeleteListing && (
                                  <button onClick={(e) => { e.stopPropagation(); onDeleteListing(listing.id); }}
                                    className="text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors" title="Delete Listing">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-xl border border-amber-100 flex flex-col items-center justify-center">
                        <LayoutGrid className="w-12 h-12 text-amber-200 mb-3" />
                        <p className="text-amber-900 font-semibold mb-1">No listings found</p>
                        <p className="text-xs text-amber-600/70">You haven't posted any gaumata for adoption or sale yet.</p>
                      </div>
                    )}
                  </>
                )}

                {/* Favorites Tab */}
                {activeTab === 'favorites' && (
                  <>
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-amber-950 font-sanatan mb-2 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-amber-600" /> My Watchlist
                      </h3>
                      <p className="text-sm text-amber-800/80 mb-4">Gaumata listings you have saved for later.</p>
                    </div>
                    {userFavoritesList.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {userFavoritesList.map((listing) => (
                          <div key={listing.id} onClick={() => onListingClick?.(listing)}
                            className="bg-white rounded-xl border border-amber-200 overflow-hidden shadow-sm flex flex-col cursor-pointer hover:border-[#800000] hover:shadow-md transition-all group">
                            <div className="h-40 overflow-hidden relative">
                              {listing.imageUrl ? (
                                <img src={listing.imageUrl} alt={listing.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              ) : (
                                <div className="w-full h-full bg-amber-100 flex items-center justify-center"><LayoutGrid className="w-8 h-8 text-amber-300" /></div>
                              )}
                              <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[10px] font-bold text-amber-900 border border-amber-200 uppercase tracking-widest">
                                {listing.type === 'adopt' ? 'Adoption' : 'Sale'}
                              </div>
                            </div>
                            <div className="p-4 flex-grow flex flex-col">
                              <h4 className="font-bold text-amber-950 truncate mb-1">{listing.title}</h4>
                              <p className="text-xs text-amber-700/80 mb-2 truncate">{listing.breed} • {listing.location}</p>
                              <div className="mt-auto pt-3 border-t border-amber-100">
                                <span className="text-[10px] text-amber-600 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> {new Date(listing.postedAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 bg-white rounded-xl border border-amber-100 flex flex-col items-center justify-center">
                        <Heart className="w-12 h-12 text-amber-200 mb-3" />
                        <p className="text-amber-900 font-semibold mb-1">Watchlist Empty</p>
                        <p className="text-xs text-amber-600/70">You haven't saved any listings yet. Tap the heart on listings to save them.</p>
                      </div>
                    )}
                  </>
                )}

                {/* Settings Tab */}
                {activeTab === 'settings' && (
                  <div className="max-w-xl">
                    <div className="mb-6">
                      <h3 className="text-lg font-bold text-amber-950 font-sanatan mb-2 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-amber-600" /> Account Settings
                      </h3>
                      <p className="text-sm text-amber-800/80 mb-4">Update your personal information and address.</p>
                    </div>

                    <div className="space-y-4">
                      {/* Email (read-only) */}
                      <div>
                        <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Email</label>
                        <input type="text" disabled value={user?.email || "No email linked"}
                          className="w-full px-4 py-2.5 bg-amber-50/50 border-2 border-amber-100 rounded-xl text-amber-900/60 font-medium cursor-not-allowed transition-all font-sanatan text-sm" />
                      </div>

                      {/* Name */}
                      <div>
                        <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Display Name *</label>
                        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} disabled={isUpdating} placeholder="Enter your name"
                          className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/40 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm" />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Mobile Number</label>
                        <div className="flex">
                          <span className="flex items-center px-3 py-2.5 rounded-l-xl border-2 border-r-0 border-amber-100 bg-stone-50 text-stone-600 font-bold text-sm select-none">+91</span>
                          <input type="tel" value={phone} onChange={(e) => handlePhoneChange(e.target.value)} placeholder="98765 43210" maxLength={10} disabled={isUpdating}
                            className="flex-1 px-4 py-2.5 rounded-r-xl border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/40 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm" />
                        </div>
                      </div>

                      {/* Full Address */}
                      <div>
                        <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Full Address</label>
                        <textarea value={fullAddress} onChange={(e) => setFullAddress(e.target.value)} placeholder="House/Flat No., Street, Landmark, Locality" rows={2} disabled={isUpdating}
                          className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/40 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm resize-none" />
                      </div>

                      {/* Pincode */}
                      <div>
                        <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">Pincode</label>
                        <input type="text" value={pincode} onChange={(e) => setPincode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))} placeholder="110001" maxLength={6} disabled={isUpdating}
                          className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium placeholder-amber-800/40 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm" />
                      </div>

                      {/* State & City */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">State / UT</label>
                          <select value={selectedState} onChange={(e) => setSelectedState(e.target.value)} disabled={isUpdating}
                            className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm">
                            <option value="">Select State</option>
                            {INDIAN_LOCATIONS.map(s => <option key={s.stateName} value={s.stateName}>{s.stateName}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-amber-900 uppercase tracking-widest mb-1.5 font-sanatan">City</label>
                          <select value={selectedCity} onChange={(e) => setSelectedCity(e.target.value)} disabled={!selectedState || isUpdating}
                            className="w-full px-4 py-2.5 bg-white border-2 border-amber-100 hover:border-amber-200 focus:border-amber-500 rounded-xl text-amber-950 font-medium focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all font-sanatan text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                            <option value="">{selectedState ? "Select City" : "Select state first"}</option>
                            {availableCities.map(city => <option key={city} value={city}>{city}</option>)}
                          </select>
                        </div>
                      </div>

                      {updateMessage && (
                        <div className={`p-3 rounded-lg text-sm font-semibold flex items-start gap-2 ${updateMessage.includes('Failed') ? 'bg-red-50 text-red-800 border border-red-200' : 'bg-green-50 text-green-800 border border-green-200'}`}>
                          {updateMessage}
                        </div>
                      )}

                      <div className="pt-2">
                        <button onClick={handleUpdateProfile} disabled={isUpdating}
                          className="w-full bg-[#800000] text-white hover:bg-[#990000] font-bold py-3 rounded-xl transition-all shadow-md active:scale-[0.98] disabled:opacity-70 flex justify-center items-center gap-2 font-sanatan text-sm tracking-wide">
                          {isUpdating ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Verification Tab */}
                {activeTab === 'verification' && (
                  <div className="max-w-xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="mb-6 border-b border-amber-200 pb-4">
                      <h3 className="text-xl font-bold text-amber-950 font-sanatan flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-emerald-600" /> Identity Verification
                      </h3>
                      <p className="text-sm text-amber-800/80">Help us keep GauSeva Connect safe by verifying your identity. This is a manual review process.</p>
                    </div>
                    {myVerificationRequest ? (
                      <div className="bg-white rounded-2xl border border-amber-200 p-6 flex items-start gap-4">
                        <div className={`p-3 rounded-full ${
                          myVerificationRequest.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                          myVerificationRequest.status === 'rejected' ? 'bg-rose-100 text-rose-600' :
                          'bg-amber-100 text-amber-600'
                        }`}>
                           <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                          <h4 className="font-bold text-amber-950 mb-1">
                            {myVerificationRequest.status === 'approved' ? 'Verification Approved' :
                             myVerificationRequest.status === 'rejected' ? 'Verification Rejected' : 'Verification Pending'}
                          </h4>
                          <p className="text-sm text-amber-800/80 mb-4">
                            {myVerificationRequest.status === 'approved' ? 'Your identity has been verified by our team.' :
                             myVerificationRequest.status === 'rejected' ? 'Your verification request was rejected. Please review our guidelines.' :
                             'Your documents are currently under manual review. This may take up to 48 hours.'}
                          </p>
                          <span className="text-xs font-bold uppercase tracking-widest text-amber-900/60 font-mono">Request ID: {myVerificationRequest.id}</span>
                        </div>
                      </div>
                    ) : (
                      <VerificationForm
                        user={user}
                        displayName={displayName}
                        onAddVerificationRequest={onAddVerificationRequest}
                      />
                    )}
                  </div>
                )}

                {/* Support Tickets Tab */}
                {activeTab === 'tickets' && (
                  <TicketsSection user={user} displayName={displayName} />
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
