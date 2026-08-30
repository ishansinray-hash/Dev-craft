import React, { useState, useMemo } from "react";
import {
  Send,
  Sparkles,
  Scissors,
  AlertCircle,
  CheckCircle2,
  Calendar,
  IndianRupee,
  User,
  ShieldCheck,
  FileCheck,
  RotateCcw,
  Tag,
} from "lucide-react";
import confetti from "canvas-confetti";
import { parse, InputRecord } from "../core/parsar/parse.js";
import { clientStore } from "../store/clientStore.js";
import { Snapshot } from "../store/db.js";
import { BillingReceipt } from "./BillingReceipt.js";

const TAILOR_PRESETS = [
  {
    label: "3 Linen Shirts & Kurta",
    text: "Sunil bhai, 3 white linen shirts chest 42 waist 36 and 1 kurta pajama by Friday urgently, 500 advance diya",
  },
  {
    label: "Blouse & Slim Pants",
    text: "Meena aunty ke liye 2 pant chest 40, aur 1 blouse slim waist 38 chest 44, agle somwar tak chahiye",
  },
  {
    label: "Silk Sherwani & Trouser",
    text: "Ramesh Sharma, 1 royal blue silk sherwani chest 44 length 40 and 1 churidar pajama by next month 10th",
  },
  {
    label: "2 Safari Suits Urgent",
    text: "2 safari suits charcoal grey chest 40 waist 34, urgently by 15th Sep",
  },
];

export const CustomerOrderView: React.FC = () => {
  const [customerName, setCustomerName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Snapshot | null>(null);

  // Live offline parsing preview using the local parser engine
  const liveParsed = useMemo(() => {
    if (!message.trim()) return null;
    const input: InputRecord = {
      id: "preview-temp",
      domain: "tailor",
      received_at: new Date().toISOString(),
      message,
    };
    try {
      return parse(input);
    } catch {
      return null;
    }
  }, [message]);

  const handlePresetSelect = (presetText: string) => {
    setMessage(presetText);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { orderId, state } = await clientStore.submitCustomerOrder(
        message,
        "tailor",
        undefined,
        customerName.trim() || undefined,
      );

      // Trigger celebration confetti
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#6366f1", "#a855f7", "#ec4899", "#10b981"],
        });
      } catch {}

      // Form confirmed snapshot for receipt display
      const r = state.record;
      const snapshot: Snapshot = {
        order_id: orderId,
        due_date: r.due_date,
        customer: r.customer,
        status: r.status,
        balance: (r.amount ?? 0) - (r.paid ?? 0),
        item_count: r.items.reduce((n, i) => n + (i.quantity ?? 1), 0),
        record: r,
        conflict_count: 0,
      };

      setConfirmedOrder(snapshot);
      setMessage("");
      setCustomerName("");
    } catch (err) {
      console.error("Failed to submit order:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-indigo-500/20 p-6 sm:p-8 shadow-2xl">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-semibold mb-3">
            <Scissors className="w-3.5 h-3.5 text-indigo-400" />
            <span>Tailor & Garments Order System &bull; 100% Offline-First</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Outfit']">
            Place Tailoring & Garment Order
          </h1>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Write your tailoring specifications, fabric requirements, and measurements in natural language.
            Our local edge engine automatically extracts garment items, chest/waist measurements, and requested delivery dates.
          </p>
        </div>

        {/* Decorative background glow */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-16 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Main Grid: Input Column & Live Offline Extraction Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Form: Unstructured Input (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-5 sm:p-6 shadow-xl space-y-5">
          
          {/* Craft Mode Indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-indigo-950/40 border border-indigo-500/30">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
                <Scissors className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">Craft: Tailoring & Custom Garments</p>
                <p className="text-[11px] text-indigo-300/80">NLP tailored for shirts, kurtas, blouses, suits, chest & waist sizing</p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
              Active Module
            </span>
          </div>

          {/* Quick 1-Click Sample Templates */}
          <div>
            <label className="text-xs font-mono uppercase tracking-wider text-slate-400 block mb-2">
              1. Quick Sample Templates (Click to Test)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {TAILOR_PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(preset.text)}
                  className="px-2.5 py-1 rounded-lg text-xs bg-slate-950/80 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 text-slate-300 hover:text-indigo-200 transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Customer Name Input (Explicit or Fallback) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-indigo-400" />
                  <span>2. Customer Name</span>
                </label>
                <span className="text-[11px] text-slate-500 italic">
                  Optional (Auto-assigns Customer 1, Customer 2... if empty)
                </span>
              </div>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ramesh Sharma (or leave blank to auto-assign)"
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 font-sans transition shadow-inner"
              />
            </div>

            {/* Natural Language Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-slate-400">
                  3. Enter Tailoring Order Details
                </label>
                {message.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMessage("")}
                    className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                )}
              </div>

              <div className="relative">
                <textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="e.g. 2 navy blue linen shirts chest 42 waist 36 and 1 kurta pajama by Friday urgently"
                  className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 leading-relaxed font-sans resize-none transition shadow-inner"
                />
              </div>
            </div>

            {/* Notice about pricing */}
            <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>
                <strong>Price Policy:</strong> The final price is quoted & set by the shopkeeper at the counter, not determined by the customer.
              </span>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Writes HLC vector clock to local IndexedDB</span>
              </div>

              <button
                type="submit"
                disabled={!message.trim() || isSubmitting}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-xs font-bold text-white shadow-lg transition-all ${
                  message.trim() && !isSubmitting
                    ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-500 hover:opacity-95 shadow-indigo-500/25 active:scale-98"
                    : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                }`}
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? "Processing Local Ops..." : "Submit Order (Offline-First)"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Live Offline Extraction Card (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-5 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-indigo-400" />
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300">
                  Instant Offline Parser Engine
                </h3>
              </div>
              {liveParsed && (
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                    liveParsed.confidence >= 0.8
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  {Math.round(liveParsed.confidence * 100)}% Confidence
                </span>
              )}
            </div>

            {liveParsed ? (
              <div className="mt-4 space-y-4 text-xs">
                {/* Customer name */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-400">
                    <User className="w-4 h-4 text-indigo-400" />
                    <span>Customer Name:</span>
                  </div>
                  <span className="font-semibold text-white">
                    {customerName.trim() || liveParsed.customer || (
                      <span className="text-indigo-400 font-mono">Auto: Customer (Next #)</span>
                    )}
                  </span>
                </div>

                {/* Due Date & Price Policy */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Due Date:</span>
                    </div>
                    <p className="font-mono font-semibold text-slate-100">
                      {liveParsed.due_date || (
                        <span className="text-slate-500 italic text-[11px]">No date specified</span>
                      )}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                    <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                      <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
                      <span>Price:</span>
                    </div>
                    <p className="text-[11px] font-semibold text-amber-300">
                      Quoted by shopkeeper
                    </p>
                  </div>
                </div>

                {/* Items & Attributes */}
                <div>
                  <label className="text-[11px] font-mono text-slate-400 uppercase tracking-wider block mb-2">
                    Extracted Garments ({liveParsed.items.length})
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {liveParsed.items.length > 0 ? (
                      liveParsed.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-800/80 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-200 capitalize">
                              {it.description}
                            </span>
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-bold">
                              Qty: {it.quantity || 1}
                            </span>
                          </div>

                          {it.attributes && Object.keys(it.attributes).length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {Object.entries(it.attributes).map(([k, v]) => (
                                <span
                                  key={k}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                                >
                                  {k}: <strong className="text-indigo-400">{String(v)}</strong>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/50 text-slate-500 italic text-center">
                        No specific garment detected yet
                      </div>
                    )}
                  </div>
                </div>

                {/* Clarification Alert */}
                {liveParsed.needs_clarification && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-start gap-2.5 text-amber-300 text-[11px]">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Review Flagged for Clarification</p>
                      <p className="text-amber-400/80 mt-0.5">
                        Some measurements or dates may be ambiguous. The shopkeeper can clarify at counter.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 text-xs">
                <Sparkles className="w-8 h-8 mx-auto mb-2 text-slate-600 opacity-60 animate-bounce" />
                <p className="font-medium text-slate-400">Type or click a sample template above</p>
                <p className="text-[11px] mt-1 text-slate-500">
                  Instant real-time parsing will show item breakdown, chest/waist measurements, and due dates here.
                </p>
              </div>
            )}
          </div>

          {/* Offline Engine Explanation Widget */}
          <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-indigo-300 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>How Local Parsing Works</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Your message is normalized, tokenized, and resolved against tailoring & garment terminology locally.
              Each field generates an immutable CRDT operation with a Hybrid Logical Clock (<code className="text-indigo-300 font-mono">HLC</code>)
              stored in IndexedDB.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmed Billing Receipt Modal */}
      {confirmedOrder && (
        <BillingReceipt
          order={confirmedOrder}
          onClose={() => setConfirmedOrder(null)}
          isNewOrder={true}
        />
      )}
    </div>
  );
};
