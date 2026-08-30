import React from "react";
import {
  X,
  Sparkles,
  ShoppingBag,
  LayoutDashboard,
  Layers,
  FileText,
  WifiOff,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Bot,
} from "lucide-react";
import { ActiveTab } from "./Navbar.js";

interface LiveTestingGuideModalProps {
  onClose: () => void;
  onSelectTab: (tab: ActiveTab) => void;
}

export const LiveTestingGuideModal: React.FC<LiveTestingGuideModalProps> = ({
  onClose,
  onSelectTab,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-1">
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                <Sparkles className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-['Outfit']">
                  How to Access & Test Live Data
                </h3>
                <p className="text-xs text-slate-400">
                  Step-by-step walkthrough of the Customer-to-Backend-to-Shopkeeper Pipeline
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 text-xs text-slate-300 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Customer natural language pipeline */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-sm">
              <ShoppingBag className="w-4 h-4" />
              <span>Step 1: Test Customer Unstructured Order & Billing</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Navigate to <strong>"Customer Order & Receipt"</strong>. Type any natural language message or click one of the quick templates (e.g. <em>"Sunil bhai, 3 white linen shirts chest 42 waist 36 and 1 kurta pajama by Friday urgently, 500 advance diya total 2400"</em>).
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>Notice the <strong>instant real-time offline extraction</strong> card updating live without network latency.</li>
              <li>Click <strong>"Submit Order (Offline-First)"</strong> — celebration confetti triggers, and the official <strong>Printable Billing & Invoice Receipt</strong> window appears.</li>
            </ul>
          </div>

          {/* Section 2: Shopkeeper 3D Hub & moving numbers */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
              <LayoutDashboard className="w-4 h-4" />
              <span>Step 2: Explore Shopkeeper 3D Hub & NLP Assistant</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Switch to <strong>"Shopkeeper 3D Hub"</strong> to see moving numbers, 3D tilt perspective cards, 7-day capacity load bars, and financial metrics.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>Hover over the 3D cards and capacity bars to inspect interactive depth and measurements.</li>
              <li>Test the <strong>Offline Store Assistant ("Objective 4 Ask")</strong> by clicking presets like <em>"Who owes money?"</em> or <em>"What is due today?"</em> to execute instant IndexedDB queries.</li>
            </ul>
          </div>

          {/* Section 3: Shopkeeper Query Hub & AI Assistant */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-pink-400 font-bold text-sm">
                <Bot className="w-4 h-4" />
                <span>Step 3: Test Shopkeeper Query Hub & Data Assistant</span>
              </div>
              <button
                onClick={() => onSelectTab("query")}
                className="px-2.5 py-1 rounded-lg bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 border border-pink-500/30 text-[11px] font-semibold flex items-center gap-1 transition"
              >
                <span>Go to Query Hub</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Open <strong>"Query Assistant"</strong> to ask natural language or business questions about the placed orders (e.g. <em>"Kisne paisa dena hai?"</em>, <em>"What are Sunil's chest and waist measurements?"</em>, <em>"Show all kurta orders"</em>, <em>"Who hasn't paid advance?"</em>).
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>Works <strong>100% offline</strong> with the deterministic query engine, and leverages <strong>Mistral AI / Local Parser</strong> for rich reasoning.</li>
              <li>Includes direct categorized filters for Overdue, Due Today, Debtors, 7-Day Capacity, and Pending Quotes.</li>
            </ul>
          </div>

          {/* Section 4: Order List & Workflow */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
              <FileText className="w-4 h-4" />
              <span>Step 4: Master Order Directory & Status Workflow</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Open <strong>"Order List"</strong> to search, filter by domain, inspect detailed garment measurements, and transition orders through workflow stages (<em>In Progress &rarr; Ready &rarr; Delivered</em>).
            </p>
          </div>

          {/* Section 5: Offline Mode & CRDT Conflict Simulator */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <Layers className="w-4 h-4" />
              <span>Step 5: Test Offline Queue & CRDT Sync Relay</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Click the <strong>"Online / Offline Mode"</strong> toggle in the header.
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>While in <strong>Offline Mode</strong>, submit new customer orders or edit existing ones. Notice they are safely queued in local IndexedDB outbox (<code className="text-amber-300">server_seq: 0</code>).</li>
              <li>Switch back to <strong>Online</strong> or click <strong>"Sync Now"</strong>: the sync loop automatically pushes outbox ops to the Fastify SQLite relay and updates server sequence stamps.</li>
              <li>Run the <strong>Interactive Conflict Simulator</strong> in the Sync tab to see Last-Write-Wins and conflict badges in action!</li>
            </ul>
          </div>

          {/* Section 5: Terminal / CLI Tests */}
          <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-slate-300 font-bold text-sm">
              <Terminal className="w-4 h-4 text-indigo-400" />
              <span>CLI & Automated Test Suite</span>
            </div>
            <p className="text-slate-400">
              You can run the full automated test suite at any time via terminal:
            </p>
            <pre className="p-2.5 rounded-lg bg-black text-indigo-300 font-mono text-[11px] overflow-x-auto">
npm test
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition"
          >
            Got it, Let's Test!
          </button>
        </div>
      </div>
    </div>
  );
};
