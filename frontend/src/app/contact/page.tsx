"use client";

import React, { useState } from "react";
import Link from "next/link";

const REASONS = [
  { id: "password_reset", label: "Password Reset Request" },
  { id: "registration", label: "New Account Registration Request" },
  { id: "proxy_issue", label: "Proxy Configuration or Setup" },
  { id: "tool_crash", label: "Tool Crash or Performance Error" },
  { id: "team_management", label: "Team or Company Account Inquiry" },
  { id: "other", label: "General Support and Inquiries" }
];

const APPS = [
  { id: "whatsapp", label: "WhatsApp", target: "+1 315-370-1897" },
  { id: "telegram", label: "Telegram", target: "@kiri0507" },
  { id: "email", label: "Email", target: "reinhart96x@gmail.com" }
];

export default function ContactHelpPage() {
  const [selectedReason, setSelectedReason] = useState(REASONS[0].id);
  const [selectedApp, setSelectedApp] = useState(APPS[0].id);
  const [userIdentifier, setUserIdentifier] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  const selectedReasonObj = REASONS.find(r => r.id === selectedReason) || REASONS[0];

  const buildMessage = () => {
    let msg = `Hello Admin, I am reaching out regarding: ${selectedReasonObj.label}.`;
    if (userIdentifier.trim()) {
      msg += `\nAccount: ${userIdentifier.trim()}`;
    }
    if (additionalNotes.trim()) {
      msg += `\nDetails: ${additionalNotes.trim()}`;
    }
    return msg;
  };

  const handleSend = () => {
    const rawMsg = buildMessage();
    const encoded = encodeURIComponent(rawMsg);

    if (selectedApp === "whatsapp") {
      window.open(`https://wa.me/13153701897?text=${encoded}`, "_blank");
    } else if (selectedApp === "telegram") {
      window.open(`https://t.me/kiri0507?text=${encoded}`, "_blank");
    } else {
      window.open(
        `mailto:reinhart96x@gmail.com?subject=${encodeURIComponent(
          `7Strokes Support: ${selectedReasonObj.label}`
        )}&body=${encoded}`,
        "_blank"
      );
    }
  };

  return (
    <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black flex flex-col font-sans">
      {/* Top Bar */}
      <header className="border-b border-white/20 bg-black">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-3 text-white hover:text-white/80 transition-colors"
          >
            <span className="font-mono font-bold tracking-widest text-lg uppercase">
              7STROKES
            </span>
            <span className="text-white/40 text-xs tracking-wider">/</span>
            <span className="text-white/60 text-xs font-mono uppercase tracking-wider">
              Help &amp; Contact
            </span>
          </Link>

          <Link
            href="/"
            className="text-xs font-mono border border-white px-3 py-1.5 uppercase tracking-wider hover:bg-white hover:text-black transition-colors"
          >
            Back to App
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col justify-center">
        <div className="border border-white/20 bg-black p-8 md:p-12">
          {/* Header */}
          <div className="border-b border-white/20 pb-8 mb-8">
            <h1 className="text-2xl md:text-3xl font-mono uppercase tracking-widest mb-3">
              Support &amp; Account Inquiries
            </h1>
            <p className="text-white/60 text-sm leading-relaxed max-w-2xl">
              Select your inquiry topic and destination app below. Your pre-formatted request will be automatically prepared and dispatched to the administrator.
            </p>
          </div>

          <div className="space-y-8">
            {/* Step 1: Reason */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/80 mb-3">
                1. Select Reason
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {REASONS.map(r => {
                  const isChecked = selectedReason === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedReason(r.id)}
                      className={`text-left p-3.5 border text-xs font-mono uppercase tracking-wider transition-colors ${
                        isChecked
                          ? "bg-white text-black border-white"
                          : "bg-black text-white/70 border-white/20 hover:border-white/60 hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span>{r.label}</span>
                        {isChecked && <span className="font-bold">[SELECTED]</span>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Account Identifier */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/80 mb-2">
                  2. Your Username or Email (Optional)
                </label>
                <input
                  type="text"
                  value={userIdentifier}
                  onChange={e => setUserIdentifier(e.target.value)}
                  placeholder="e.g. john_doe or john@company.com"
                  className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-white/80 mb-2">
                  3. Additional Notes (Optional)
                </label>
                <input
                  type="text"
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="Describe your request or issue..."
                  className="w-full bg-black border border-white/20 px-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white font-mono"
                />
              </div>
            </div>

            {/* Step 3: Destination App */}
            <div>
              <label className="block text-xs font-mono uppercase tracking-wider text-white/80 mb-3">
                4. Select Communication App
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {APPS.map(app => {
                  const isChecked = selectedApp === app.id;
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedApp(app.id)}
                      className={`text-left p-4 border text-xs font-mono uppercase tracking-wider transition-colors ${
                        isChecked
                          ? "bg-white text-black border-white"
                          : "bg-black text-white/70 border-white/20 hover:border-white/60 hover:text-white"
                      }`}
                    >
                      <div className="font-bold mb-1">{app.label}</div>
                      <div className={`text-[11px] ${isChecked ? "text-black/70" : "text-white/50"}`}>
                        {app.target}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 4: Preview and Action */}
            <div className="pt-4 border-t border-white/20">
              <div className="mb-4 bg-white/5 border border-white/10 p-4 font-mono text-xs text-white/80 whitespace-pre-line">
                <span className="text-white/40 block mb-1 uppercase tracking-wider">
                  [MESSAGE PREVIEW]
                </span>
                {buildMessage()}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={handleSend}
                  className="flex-1 bg-white text-black font-mono font-bold text-xs uppercase tracking-widest py-4 px-6 hover:bg-white/90 active:scale-[0.99] transition-all text-center"
                >
                  Send via {APPS.find(a => a.id === selectedApp)?.label} &rarr;
                </button>
                <Link
                  href="/"
                  className="border border-white/30 text-white font-mono text-xs uppercase tracking-widest py-4 px-6 hover:border-white hover:bg-white/10 transition-colors text-center"
                >
                  Cancel
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/20 py-6 text-center text-xs font-mono text-white/40 uppercase tracking-widest">
        7Strokes Platform &bull; Pure Monochrome Support
      </footer>
    </div>
  );
}
