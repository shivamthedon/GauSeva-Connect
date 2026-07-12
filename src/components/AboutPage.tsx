import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Heart, ShieldCheck, Users, HandHeart, Phone, AlertTriangle } from "lucide-react";

export function AboutPage() {
  return (
    <div className="gs-page-bg min-h-screen font-sans">
      <header className="bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200/80 shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-[#800000] via-amber-500 to-[#800000]" />
        <div className="gs-container flex items-center justify-between h-14">
          <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-[#800000] font-semibold text-sm">
            <ArrowLeft className="w-4 h-4" /> Home
          </Link>
          <span className="text-sm font-bold text-slate-900">About</span>
          <Link to="/contact" className="text-xs font-semibold text-slate-500 hover:text-[#800000]">
            Contact
          </Link>
        </div>
      </header>

      <main className="gs-container max-w-3xl py-10 space-y-8">
        <section className="gs-card p-6 sm:p-8 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-[#800000]/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#800000] to-[#c2410c] flex items-center justify-center mb-4 shadow-md">
              <Heart className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">About GauSeva Connect</h1>
            <p className="text-slate-500 leading-relaxed">
              GauSeva Connect is a community marketplace for adopting, listing, and protecting indigenous
              gaumata (cattle) in India. We help devotees, farmers, and gaushalas find ethical homes —
              guided by <em className="text-[#800000] not-italic font-semibold">गावो विश्वस्य मातरः</em>.
            </p>
          </div>
        </section>

        <section className="grid sm:grid-cols-3 gap-4">
          {[
            { icon: <Users className="w-5 h-5" />, title: "Community", text: "Connect with verified devotees and caretakers across India." },
            { icon: <HandHeart className="w-5 h-5" />, title: "Adoption & listing", text: "Post gaumata for adoption or ethical sale with clear details and photos." },
            { icon: <ShieldCheck className="w-5 h-5" />, title: "Trust & moderation", text: "Identity verification, reports, and admin tools keep the platform safer." },
          ].map((c) => (
            <div key={c.title} className="gs-card p-5">
              <div className="w-10 h-10 rounded-xl bg-[#800000]/8 text-[#800000] flex items-center justify-center mb-3">
                {c.icon}
              </div>
              <h2 className="font-bold text-slate-900 mb-1">{c.title}</h2>
              <p className="text-sm text-slate-500 leading-relaxed">{c.text}</p>
            </div>
          ))}
        </section>

        <section className="gs-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">How it works</h2>
          <ol className="space-y-3 text-sm text-slate-600">
            <li className="flex gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">1</span>
              <span><strong className="text-slate-800">Create an account</strong> with email, verify, and complete your profile (name, phone, address).</span>
            </li>
            <li className="flex gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">2</span>
              <span><strong className="text-slate-800">Browse or list</strong> gaumata for adoption or sale. Add clear photos and honest details.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">3</span>
              <span><strong className="text-slate-800">Connect safely</strong> via Call or WhatsApp. Prefer in-person visits and veterinary checks.</span>
            </li>
            <li className="flex gap-3">
              <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">4</span>
              <span><strong className="text-slate-800">Optional verification</strong> builds trust. Admins review ID documents manually.</span>
            </li>
          </ol>
        </section>

        <section className="gs-card p-6 sm:p-8 space-y-3 border-amber-200/60">
          <div className="flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-lg font-bold tracking-tight">Safety tips</h2>
          </div>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
            <li>We do not take payments for animal sales — deals are between users.</li>
            <li>Never share OTPs, banking passwords, or full Aadhaar numbers with strangers.</li>
            <li>Meet in safe locations; verify the animal in person before any transfer.</li>
            <li>Report scams or cruelty using the Report tools or Contact page.</li>
          </ul>
        </section>

        <section className="gs-card p-6 sm:p-8 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900 mb-1">Need help?</h2>
            <p className="text-sm text-slate-500">Questions, feedback, or data requests — we are here.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/contact" className="gs-btn-primary">
              <Phone className="w-4 h-4" /> Contact us
            </Link>
            <Link to="/legal/guidelines" className="gs-btn-secondary">
              Community guidelines
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
