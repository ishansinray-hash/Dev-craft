import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Sparkles,
  Bot,
  Calendar,
  IndianRupee,
  Scissors,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  User,
  ArrowRight,
  RefreshCw,
  HelpCircle,
  Tag,
  Mic,
  MessageSquare,
  Receipt,
  Layers,
  ChevronRight,
  TrendingUp,
  Cpu,
  BarChart3,
  X,
  Volume2,
} from "lucide-react";
import { clientStore } from "../store/clientStore.js";
import { Snapshot } from "../store/db.js";
import {
  dueBuckets,
  outstanding,
  customerHistory,
  capacity,
  needsReview,
  interpret,
  Debtor,
  DueBuckets,
  CapacityDay,
} from "../store/queries.js";
import { BillingReceipt } from "./BillingReceipt.js";

interface ShopkeeperQueryPageProps {
  onSelectOrder?: (order: Snapshot) => void;
}

export const ShopkeeperQueryPage: React.FC<ShopkeeperQueryPageProps> = ({ onSelectOrder }) => {
  const [orders, setOrders] = useState<Snapshot[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<string | null>(null);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Snapshot | null>(null);

  // Structured query results state
  const [dueData, setDueData] = useState<DueBuckets | null>(null);
  const [debtorsData, setDebtorsData] = useState<{ debtors: Debtor[]; total: number } | null>(null);
  const [capacityData, setCapacityData] = useState<{ perDay: CapacityDay[]; orders: number; items: number } | null>(null);
  const [conflictOrders, setConflictOrders] = useState<Snapshot[]>([]);
  const [customerHistoryData, setCustomerHistoryData] = useState<any[] | null>(null);
  const [searchedCustomer, setSearchedCustomer] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const loadData = async () => {
    const store = clientStore.getStore();
    const all = await store.snapshots.toArray();
    setOrders(all);

    // Compute base query buckets
    const b = await dueBuckets(store, todayStr);
    setDueData(b);

    const d = await outstanding(store);
    setDebtorsData(d);

    const c = await capacity(store, todayStr);
    setCapacityData(c);

    const conf = await needsReview(store);
    setConflictOrders(conf);
  };

  useEffect(() => {
    loadData();
    const unsub = clientStore.subscribe(() => {
      loadData();
    });
    return unsub;
  }, [todayStr]);

  // Handle running deterministic query locally
  const runOfflineQuery = async (question: string) => {
    const store = clientStore.getStore();
    const ask = interpret(question);
    setCustomerHistoryData(null);
    setSearchedCustomer(null);

    if (ask.kind === "due") {
      setActiveCategory("due");
    } else if (ask.kind === "outstanding") {
      setActiveCategory("outstanding");
    } else if (ask.kind === "capacity") {
      setActiveCategory("capacity");
    } else if (ask.kind === "review") {
      setActiveCategory("review");
    } else if (ask.kind === "customer") {
      setActiveCategory("customer");
      setSearchedCustomer(ask.name);
      const hist = await customerHistory(store, ask.name);
      setCustomerHistoryData(hist);
    }
  };

  // Run AI question answering when online or clicked
  const handleAskAssistant = async (questionText?: string) => {
    const targetQuery = questionText || query;
    if (!targetQuery.trim()) return;

    // First, run deterministic query interpretation locally
    await runOfflineQuery(targetQuery);

    // If online, also ask server AI assistant
    if (clientStore.getIsOnline()) {
      setIsLoadingAi(true);
      try {
        const res = await fetch("/api/query/assistant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: targetQuery,
            orders: orders.map((o) => ({
              order_id: o.order_id,
              customer: o.customer,
              status: o.status,
              due_date: o.due_date,
              total_amount: o.record.amount,
              advance_paid: o.record.paid,
              balance_due: o.balance,
              items: o.record.items,
              conflicts: o.conflict_count,
              raw_notes: o.record.raw_message,
            })),
            today: todayStr,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.ok && data.answer) {
            setAiAnswer(data.answer);
            setAiSource(data.source || "gemini-3.7-flash");
          } else {
            setAiAnswer(null);
            setAiSource(null);
          }
        }
      } catch {
        setAiAnswer(null);
        setAiSource(null);
      } finally {
        setIsLoadingAi(false);
      }
    } else {
      setAiAnswer(null);
      setAiSource("Local Offline Engine");
    }
  };

  // Filtered orders based on current search and category
  const filteredOrders = useMemo(() => {
    const q = query.toLowerCase().trim();

    return orders.filter((o) => {
      // Category filter
      if (activeCategory === "due_today" && o.due_date !== todayStr) return false;
      if (activeCategory === "overdue" && (!o.due_date || o.due_date >= todayStr || o.status === "delivered")) return false;
      if (activeCategory === "outstanding" && o.balance <= 0) return false;
      if (activeCategory === "unquoted" && (o.record.amount !== null && o.record.amount !== undefined)) return false;
      if (activeCategory === "review" && o.conflict_count === 0) return false;
      if (activeCategory === "customer" && searchedCustomer) {
        const custMatch = (o.customer || "").toLowerCase().includes(searchedCustomer.toLowerCase());
        if (!custMatch) return false;
      }

      // Free text search
      if (!q) return true;

      const customer = (o.customer || "").toLowerCase();
      const orderId = (o.order_id || "").toLowerCase();
      const itemsText = o.record.items.map((i) => `${i.description} ${JSON.stringify(i.attributes)}`).join(" ").toLowerCase();
      const rawText = (o.record.raw_message || "").toLowerCase();

      return (
        customer.includes(q) ||
        orderId.includes(q) ||
        itemsText.includes(q) ||
        rawText.includes(q)
      );
    });
  }, [orders, query, activeCategory, todayStr, searchedCustomer]);

  // Quick preset questions
  const sampleQueries = [
    { label: "Kisne paisa dena hai?", q: "kisne paisa dena hai", icon: IndianRupee, cat: "outstanding" },
    { label: "Aaj kya delivery hai?", q: "aaj kya delivery hai", icon: Clock, cat: "due_today" },
    { label: "Kya late ho gaya?", q: "kya late ho gaya", icon: AlertTriangle, cat: "overdue" },
    { label: "Is hafte ka load?", q: "is hafte ka load", icon: BarChart3, cat: "capacity" },
    { label: "Pending price quotes?", q: "orders pending price quote", icon: Tag, cat: "unquoted" },
    { label: "Kurtas & sizing specs?", q: "kurta", icon: Scissors, cat: "all" },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-3xl border border-indigo-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40">
                <Bot className="w-5 h-5 text-indigo-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white font-['Outfit'] tracking-tight">
                Shopkeeper Query Hub & Data Assistant
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
              Ask any question about active tailoring orders, sizing measurements, pending balances, delivery timelines, or workshop capacity.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-2 text-xs">
              <Cpu className="w-4 h-4 text-orange-400" />
              <span className="text-slate-300">
                {clientStore.getIsOnline() ? (
                  <strong className="text-orange-400">OrderKaro Local + Mistral AI</strong>
                ) : (
                  <strong className="text-emerald-400">100% Offline Dexie Engine</strong>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Search & Query Input Bar */}
        <div className="mt-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskAssistant();
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-4 top-3.5" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  runOfflineQuery(e.target.value);
                }}
                placeholder="Ask anything... e.g. 'Kisne paisa dena hai', 'Sunil chest measurements', 'overdue orders', 'kurta quantity'..."
                className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 rounded-2xl pl-11 pr-10 py-3 text-sm text-white placeholder-slate-500 font-sans shadow-inner transition"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setActiveCategory("all");
                    setAiAnswer(null);
                    setSearchedCustomer(null);
                  }}
                  className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoadingAi}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/25 transition"
            >
              {isLoadingAi ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Analyzing Data...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-200" />
                  <span>Answer Query</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Voice / Natural Language Preset Chips */}
          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
              <Mic className="w-3 h-3 text-indigo-400" /> Quick Queries:
            </span>
            {sampleQueries.map((item, idx) => {
              const Icon = item.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setQuery(item.q);
                    setActiveCategory(item.cat);
                    handleAskAssistant(item.q);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-slate-800 border border-slate-700/60 hover:border-indigo-500/50 text-[11px] text-slate-300 hover:text-white flex items-center gap-1.5 transition"
                >
                  <Icon className="w-3 h-3 text-indigo-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* AI Assistant Answer Card (When available) */}
      {aiAnswer && (
        <div className="p-5 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 shadow-lg space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
              <span className="text-xs font-bold text-indigo-300 font-['Outfit'] uppercase tracking-wider">
                AI Workshop Intelligence Answer
              </span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
              Powered by {aiSource || "Gemini"}
            </span>
          </div>
          <div className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            {aiAnswer}
          </div>
        </div>
      )}

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveCategory("all")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
            activeCategory === "all"
              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/25"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
          }`}
        >
          All Orders ({orders.length})
        </button>

        <button
          onClick={() => setActiveCategory("due_today")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
            activeCategory === "due_today"
              ? "bg-amber-600 text-white shadow-md shadow-amber-500/25"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400"
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Due Today ({dueData?.today.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveCategory("overdue")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
            activeCategory === "overdue"
              ? "bg-rose-600 text-white shadow-md shadow-rose-500/25"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue ({dueData?.overdue.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveCategory("outstanding")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
            activeCategory === "outstanding"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-emerald-400"
          }`}
        >
          <IndianRupee className="w-3.5 h-3.5" />
          <span>Balances & Debtors ({debtorsData?.debtors.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveCategory("capacity")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
            activeCategory === "capacity"
              ? "bg-purple-600 text-white shadow-md shadow-purple-500/25"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-purple-400"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>7-Day Capacity ({capacityData?.orders || 0} orders)</span>
        </button>

        <button
          onClick={() => setActiveCategory("unquoted")}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition ${
            activeCategory === "unquoted"
              ? "bg-blue-600 text-white shadow-md shadow-blue-500/25"
              : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-blue-400"
          }`}
        >
          <Tag className="w-3.5 h-3.5" />
          <span>Pending Quotes ({orders.filter((o) => o.record.amount === null || o.record.amount === undefined).length})</span>
        </button>
      </div>

      {/* Summary KPI Cards Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Total Orders Found
          </span>
          <p className="text-xl font-bold text-white font-['Outfit'] mt-1">
            {filteredOrders.length}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Total Due Uncollected
          </span>
          <p className="text-xl font-bold text-amber-400 font-mono mt-1">
            ₹{debtorsData?.total || 0}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            Due Today / Overdue
          </span>
          <p className="text-xl font-bold text-rose-400 font-['Outfit'] mt-1">
            {(dueData?.today.length || 0) + (dueData?.overdue.length || 0)}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
            7-Day Garment Load
          </span>
          <p className="text-xl font-bold text-indigo-400 font-['Outfit'] mt-1">
            {capacityData?.items || 0} items
          </p>
        </div>
      </div>

      {/* SPECIAL VIEW 1: Outstanding Debtors Leaderboard */}
      {activeCategory === "outstanding" && debtorsData && debtorsData.debtors.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-emerald-400" />
              <span>Outstanding Balances by Customer</span>
            </h3>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              Total Unpaid: ₹{debtorsData.total}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {debtorsData.debtors.map((debtor, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between"
              >
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{debtor.customer}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {debtor.orders} active order{debtor.orders > 1 ? "s" : ""} &bull; Oldest due: {debtor.oldest || "None"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-400 font-mono">
                    ₹{debtor.balance}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SPECIAL VIEW 2: 7-Day Capacity Workload Chart */}
      {activeCategory === "capacity" && capacityData && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-purple-500/30 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-purple-400" />
              <span>Committed Capacity Next 7 Days</span>
            </h3>
            <span className="text-xs font-mono text-purple-300">
              {capacityData.orders} orders &bull; {capacityData.items} garment units
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {capacityData.perDay.map((day, idx) => {
              const isToday = day.date === todayStr;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border flex flex-col justify-between text-center ${
                    isToday
                      ? "bg-indigo-950/60 border-indigo-500/50"
                      : "bg-slate-950 border-slate-800"
                  }`}
                >
                  <span className="text-[10px] font-mono text-slate-400">
                    {day.date.slice(5)} {isToday && "(Today)"}
                  </span>
                  <div className="my-2">
                    <span className="text-lg font-bold text-white font-mono block">
                      {day.items}
                    </span>
                    <span className="text-[10px] text-slate-400">garments</span>
                  </div>
                  <span className="text-[10px] text-indigo-300 font-mono">
                    {day.orders} order{day.orders > 1 ? "s" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Itemized Order Matches List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400">
            Matching Orders & Garments ({filteredOrders.length})
          </h3>
        </div>

        {filteredOrders.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredOrders.map((order) => {
              const isQuoted = order.record.amount !== null && order.record.amount !== undefined;
              const hasConflict = order.conflict_count > 0;
              const isOverdue = order.due_date && order.due_date < todayStr && order.status !== "delivered";
              const isToday = order.due_date === todayStr;

              return (
                <div
                  key={order.order_id}
                  className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 transition flex flex-col justify-between space-y-4 group"
                >
                  {/* Top Bar */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-indigo-400">
                          {order.order_id}
                        </span>
                        <h4 className="text-sm font-bold text-white font-['Outfit']">
                          {order.customer || "Customer"}
                        </h4>
                        {hasConflict && (
                          <span className="px-2 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold">
                            Conflict
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span
                            className={
                              isOverdue
                                ? "text-rose-400 font-semibold"
                                : isToday
                                ? "text-amber-400 font-semibold"
                                : "text-slate-300"
                            }
                          >
                            Due: {order.due_date || "Not set"}
                            {isOverdue && " (Overdue)"}
                            {isToday && " (Today)"}
                          </span>
                        </span>

                        <span className="px-2 py-0.5 rounded-full text-[10px] bg-slate-950 border border-slate-800 text-slate-300 capitalize">
                          {order.status}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedReceiptOrder(order)}
                      className="p-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-white transition"
                      title="View Invoice & Receipt"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Garment Items & Measurements Sizing Specs */}
                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-2">
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                      Garment Specifications & Sizing
                    </span>
                    <div className="space-y-1.5">
                      {order.record.items.map((item, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <span className="font-semibold text-slate-200 capitalize flex items-center gap-1.5">
                            <Scissors className="w-3 h-3 text-indigo-400" />
                            {item.quantity}x {item.description || "Garment"}
                          </span>

                          <div className="flex flex-wrap gap-1">
                            {item.attributes && Object.keys(item.attributes).length > 0 ? (
                              Object.entries(item.attributes).map(([k, v], vIdx) => (
                                <span
                                  key={vIdx}
                                  className="px-2 py-0.5 rounded-md bg-indigo-950/50 text-indigo-300 border border-indigo-800/50 text-[10px] font-mono"
                                >
                                  {k}: {String(v)}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 text-[10px] italic">Standard sizing</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Pricing Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs font-mono">
                    <div className="flex items-center gap-3">
                      {isQuoted ? (
                        <>
                          <span className="text-slate-400">Total: ₹{order.record.amount}</span>
                          <span className="text-emerald-400">Paid: ₹{order.record.paid ?? 0}</span>
                          <span className={order.balance > 0 ? "text-amber-400 font-bold" : "text-emerald-400"}>
                            {order.balance > 0 ? `Due: ₹${order.balance}` : "Settled"}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-400/90 italic text-[11px]">
                          Price quote pending
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setSelectedReceiptOrder(order)}
                      className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Invoice</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-500 text-xs space-y-2">
            <Search className="w-8 h-8 mx-auto text-slate-600" />
            <p className="font-semibold text-slate-400 text-sm">No matching orders found.</p>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              Try searching with another keyword like 'kurta', 'Meena', a date, or click one of the quick query chips above.
            </p>
          </div>
        )}
      </div>

      {/* Order Receipt Modal */}
      {selectedReceiptOrder && (
        <BillingReceipt
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}
    </div>
  );
};
