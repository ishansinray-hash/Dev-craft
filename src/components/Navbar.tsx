import React from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  HelpCircle,
  ShoppingBag,
  LayoutDashboard,
  Layers,
  FileText,
  Radio,
  Bot,
} from "lucide-react";
import { clientStore } from "../store/clientStore.js";
import { OrderKaroLogo } from "./OrderKaroLogo.js";

export type ActiveTab = "customer" | "dashboard" | "query" | "orders" | "sync";

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenGuide: () => void;
  isOnline: boolean;
  isSyncing: boolean;
  unsentCount: number;
  relayOpsCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenGuide,
  isOnline,
  isSyncing,
  unsentCount,
  relayOpsCount,
}) => {
  const handleToggleOnline = () => {
    clientStore.setNetworkMode(!isOnline);
  };

  const handleManualSync = async () => {
    await clientStore.triggerSync();
  };

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer group"
            onClick={() => setActiveTab("customer")}
          >
            <OrderKaroLogo size="md" />
            <div className="hidden lg:block pl-2 border-l border-slate-800">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Offline-First CRDT
              </span>
              <p className="text-[11px] text-slate-400">
                Smart Order Flow &bull; Local Dexie DB &bull; 3D Hub
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActiveTab("customer")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === "customer"
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Customer Order & Receipt</span>
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === "dashboard"
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Shopkeeper 3D Hub</span>
            </button>

            <button
              onClick={() => setActiveTab("query")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === "query"
                  ? "bg-gradient-to-r from-pink-600 via-indigo-600 to-purple-600 text-white shadow-md shadow-pink-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Bot className="w-4 h-4 text-pink-400" />
              <span>Query Assistant</span>
            </button>

            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                activeTab === "orders"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-blue-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Order List</span>
            </button>

            <button
              onClick={() => setActiveTab("sync")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 relative ${
                activeTab === "sync"
                  ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/25"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Sync & Conflict Relay</span>
              {unsentCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-slate-950 font-bold">
                  {unsentCount}
                </span>
              )}
            </button>
          </nav>

          {/* Controls: Online toggle, Sync trigger, Guide */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Network simulator toggle */}
            <button
              onClick={handleToggleOnline}
              title={isOnline ? "Switch to Offline Mode" : "Switch to Online Mode"}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isOnline
                  ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/40"
                  : "bg-amber-950/40 border-amber-500/30 text-amber-400 hover:bg-amber-900/40"
              }`}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span className="hidden sm:inline">Online</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Offline Mode</span>
                </>
              )}
            </button>

            {/* Quick sync button */}
            <button
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing}
              title="Manual Sync with Server Relay"
              className={`p-2 rounded-lg border border-slate-700/80 bg-slate-800/60 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all ${
                isSyncing ? "opacity-60 cursor-not-allowed" : ""
              }`}
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-indigo-400" : ""}`} />
            </button>

            {/* Help / Testing Guide */}
            <button
              onClick={onOpenGuide}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Live Guide</span>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Row */}
        <div className="flex md:hidden items-center justify-around py-2 border-t border-slate-800/80 text-xs">
          <button
            onClick={() => setActiveTab("customer")}
            className={`flex items-center gap-1 py-1 px-2 rounded-md ${
              activeTab === "customer" ? "text-indigo-400 font-bold bg-indigo-500/10" : "text-slate-400"
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Customer</span>
          </button>
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex items-center gap-1 py-1 px-2 rounded-md ${
              activeTab === "dashboard" ? "text-purple-400 font-bold bg-purple-500/10" : "text-slate-400"
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>3D Hub</span>
          </button>
          <button
            onClick={() => setActiveTab("query")}
            className={`flex items-center gap-1 py-1 px-2 rounded-md ${
              activeTab === "query" ? "text-pink-400 font-bold bg-pink-500/10" : "text-slate-400"
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-pink-400" />
            <span>Query</span>
          </button>
          <button
            onClick={() => setActiveTab("orders")}
            className={`flex items-center gap-1 py-1 px-2 rounded-md ${
              activeTab === "orders" ? "text-blue-400 font-bold bg-blue-500/10" : "text-slate-400"
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Orders</span>
          </button>
          <button
            onClick={() => setActiveTab("sync")}
            className={`flex items-center gap-1 py-1 px-2 rounded-md ${
              activeTab === "sync" ? "text-emerald-400 font-bold bg-emerald-500/10" : "text-slate-400"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Sync ({unsentCount})</span>
          </button>
        </div>
      </div>
    </header>
  );
};
