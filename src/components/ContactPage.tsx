import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, Send, CheckCircle } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";

export function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — must stay empty (hidden from humans)
  const [website, setWebsite] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (website) {
      // Bot filled honeypot — fake success
      setSent(true);
      return;
    }
    if (siteKey && !turnstileToken) {
      setError("Please complete the bot check.");
      return;
    }
    setLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
      const res = await fetch(`${backendUrl}/api/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          subject,
          message,
          website: website || undefined,
          turnstileToken: turnstileToken || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((data as any).error || "Failed to send message");
      setSent(true);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gs-page-bg min-h-screen font-sans">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-[#800000] via-amber-500 to-[#800000]" />
        <div className="gs-container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-[#800000] font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <span className="text-sm font-bold tracking-wide text-slate-900">GauSeva Connect</span>
          <div className="w-14" />
        </div>
      </header>

      <main className="gs-container max-w-lg py-10">
        {sent ? (
          <div className="gs-card p-8 text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2 tracking-tight">Message sent</h2>
            <p className="text-slate-500 text-sm mb-6">Thank you for contacting us. We&apos;ll get back to you soon.</p>
            <Link to="/" className="gs-btn-primary inline-flex">Back to Home</Link>
          </div>
        ) : (
          <div className="gs-card p-6 sm:p-8">
            <div className="text-center mb-7">
              <div className="w-12 h-12 bg-[#800000]/8 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Mail className="w-6 h-6 text-[#800000]" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Contact us</h2>
              <p className="text-sm text-slate-500 mt-1.5">Questions, rescue help, or data requests — we&apos;re here for gaumata seva.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl text-center font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Honeypot field — visually hidden, must remain empty */}
              <div
                aria-hidden="true"
                style={{ position: "absolute", left: "-10000px", top: "auto", width: "1px", height: "1px", overflow: "hidden" }}
              >
                <label htmlFor="website">Website</label>
                <input
                  id="website"
                  type="text"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                />
              </div>

              <div>
                <label className="gs-label">Name *</label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="gs-input"
                />
              </div>
              <div>
                <label className="gs-label">Email *</label>
                <input
                  type="email"
                  required
                  maxLength={200}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="gs-input"
                />
              </div>
              <div>
                <label className="gs-label">Subject *</label>
                <select
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="gs-input"
                >
                  <option value="">Select a subject</option>
                  <option value="general">General inquiry</option>
                  <option value="support">Technical support</option>
                  <option value="listing">Listing help</option>
                  <option value="verification">Verification</option>
                  <option value="feedback">Feedback</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="gs-label">Message *</label>
                <textarea
                  required
                  maxLength={5000}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can we help?"
                  rows={5}
                  className="gs-input resize-none"
                />
              </div>

              {siteKey ? (
                <div className="flex justify-center">
                  <Turnstile
                    siteKey={siteKey}
                    onSuccess={(token) => setTurnstileToken(token)}
                    onExpire={() => setTurnstileToken("")}
                    onError={() => setTurnstileToken("")}
                    options={{ theme: "light" }}
                  />
                </div>
              ) : null}

              <button type="submit" disabled={loading} className="gs-btn-primary w-full py-3">
                {loading ? "Sending…" : (
                  <>
                    <Send className="w-4 h-4" /> Send message
                  </>
                )}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
