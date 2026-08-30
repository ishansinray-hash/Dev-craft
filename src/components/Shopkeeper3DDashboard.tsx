import React, { useState, useEffect, useMemo } from "react";
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  IndianRupee,
  Users,
  Package,
  Layers,
  Sparkles,
  Search,
  CheckCircle2,
  Calendar,
  Zap,
  Scissors,
  Cake,
  Utensils,
  ArrowUpRight,
  ShieldAlert,
  RotateCw,
  Box,
  Flame,
} from "lucide-react";
import { clientStore } from "../store/clientStore.js";
import { isActiveStatus } from "../core/sync/types.js";
import { Snapshot } from "../store/db.js";
import {
  dueBuckets,
  outstanding,
  capacity,
  needsReview,
  interpret,
  Ask,
  Debtor,
  CapacityDay,
} from "../store/queries.js";

interface DashboardProps {
  onNavigateOrders: () => void;
  onNavigateSync: () => void;
  onNavigateQuery?: () => void;
  onSelectOrder: (order: Snapshot) => void;
}

export const Shopkeeper3DDashboard: React.FC<DashboardProps> = ({
  onNavigateOrders,
  onNavigateSync,
  onNavigateQuery,
  onSelectOrder,
}) => {
  const [orders, setOrders] = useState<Snapshot[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [totalDebt, setTotalDebt] = useState(0);
  const [capacityData, setCapacityData] = useState<{ perDay: CapacityDay[]; orders: number; items: number }>({
    perDay: [],
    orders: 0,
    items: 0,
  });
  const [dueData, setDueData] = useState<{
    overdue: Snapshot[];
    today: Snapshot[];
    upcoming: Snapshot[];
    undated: Snapshot[];
  }>({
    overdue: [],
    today: [],
    upcoming: [],
    undated: [],
  });
  const [conflicts, setConflicts] = useState<Snapshot[]>([]);

  // Ask Store Query Assistant State
  const [queryText, setQueryText] = useState("");
  const [queryResult, setQueryResult] = useState<{
    intent: Ask;
    data: any;
    explanation: string;
  } | null>(null);
  const [isQuerying, setIsQuerying] = useState(false);

  // 3D Canvas / Bar Hover State
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  const loadData = async () => {
    const store = clientStore.getStore();
    const today = new Date().toISOString().slice(0, 10);

    const [allOrders, debts, cap, buckets, rev] = await Promise.all([
      store.snapshots.toArray(),
      outstanding(store),
      capacity(store, today, 7),
      dueBuckets(store, today),
      needsReview(store),
    ]);

    setOrders(allOrders);
    setDebtors(debts.debtors);
    setTotalDebt(debts.total);
    setCapacityData(cap);
    setDueData(buckets);
    setConflicts(rev);
  };

  useEffect(() => {
    loadData();
    const unsub = clientStore.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  // Quick stats calculation
  const totalRevenue = useMemo(() => {
    return orders.reduce((acc, o) => acc + (o.record.amount ?? 0), 0);
  }, [orders]);

  const totalAdvance = useMemo(() => {
    return orders.reduce((acc, o) => acc + (o.record.paid ?? 0), 0);
  }, [orders]);

  // "In queue" means work still on the bench. Delivered orders are finished, so
  // excluding only cancelled ones overstated the queue.
  const activeOrdersCount = useMemo(() => {
    return orders.filter((o) => isActiveStatus(o.status)).length;
  }, [orders]);

  // Handle Natural Language "Ask the Store" Query
  const handleAskQuery = async (e?: React.FormEvent, customQ?: string) => {
    if (e) e.preventDefault();
    const q = customQ || queryText;
    if (!q.trim()) return;

    setIsQuerying(true);
    const store = clientStore.getStore();
    const today = new Date().toISOString().slice(0, 10);
    const intent = interpret(q);

    let data: any = null;
    let explanation = "";

    switch (intent.kind) {
      case "outstanding": {
        const res = await outstanding(store);
        data = res;
        explanation = `Found ${res.debtors.length} customer(s) with unpaid balance. Total outstanding: ₹${res.total}.`;
        break;
      }
      case "due": {
        const buckets = await dueBuckets(store, today);
        data = buckets[intent.bucket];
        explanation = `Showing ${intent.bucket} orders (${data.length} found).`;
        break;
      }
      case "capacity": {
        const cap = await capacity(store, today, 7);
        data = cap;
        explanation = `Next 7 days: ${cap.orders} active orders containing ${cap.items} total garments/items.`;
        break;
      }
      case "review": {
        const rev = await needsReview(store);
        data = rev;
        explanation = `Found ${rev.length} order(s) requiring conflict or ambiguity review.`;
        break;
      }
      case "customer": {
        const hist = await store.snapshots
          .where("customer")
          .equalsIgnoreCase(intent.name)
          .toArray();
        data = hist;
        explanation = `Found ${hist.length} historical order(s) for customer '${intent.name}'.`;
        break;
      }
      default: {
        explanation = "Could not parse query with offline rules. Try asking about due orders, payments, capacity, or customer names.";
      }
    }

    setQueryResult({ intent, data, explanation });
    setIsQuerying(false);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 3D Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold mb-1.5">
            <Box className="w-3.5 h-3.5 text-purple-400" />
            <span>3D Interactive Perspective View</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-['Outfit']">
            Shopkeeper Command Center
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Real-time moving metrics, 3D capacity load graphs, debt ledgers, and NLP assistant.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {conflicts.length > 0 && (
            <button
              onClick={onNavigateOrders}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-pulse"
            >
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              <span>{conflicts.length} Conflict(s) to Resolve</span>
            </button>
          )}

          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 3D Moving Metrics Grid (4 perspective tilt cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 perspective-1000">
        {/* Card 1: Total Active Orders */}
        <div
          onClick={onNavigateOrders}
          className="card-3d-tilt cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/95 border border-indigo-500/30 p-5 shadow-xl group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-indigo-400 font-semibold">
              Active Orders
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-['Outfit']">
              {activeOrdersCount}
            </span>
            <span className="text-xs text-indigo-300 font-medium">in queue</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Ready: {orders.filter((o) => o.status === "ready").length}</span>
            <span className="text-indigo-400 flex items-center gap-0.5">
              View List <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 2: Total Revenue & Advance */}
        <div className="card-3d-tilt relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/95 border border-emerald-500/30 p-5 shadow-xl group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">
              Revenue Booked
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-['Outfit']">
              ₹{totalRevenue.toLocaleString()}
            </span>
            <span className="text-xs text-emerald-400 font-medium">
              (+₹{totalAdvance} adv)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Advance: ₹{totalAdvance}</span>
            <span className="text-emerald-400 font-mono">
              {totalRevenue > 0 ? Math.round((totalAdvance / totalRevenue) * 100) : 0}% collected
            </span>
          </div>
        </div>

        {/* Card 3: Outstanding Debtors */}
        <div
          onClick={() => handleAskQuery(undefined, "kisne paisa dena hai")}
          className="card-3d-tilt cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/95 border border-amber-500/30 p-5 shadow-xl group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
              Pending Balance (Udhaar)
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-amber-300 font-['Outfit']">
              ₹{totalDebt.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              ({debtors.length} debtors)
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Largest: {debtors[0]?.customer || "None"}</span>
            <span className="text-amber-400 flex items-center gap-0.5">
              Breakdown <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* Card 4: Due Today & Overdue Alerts */}
        <div
          onClick={() => handleAskQuery(undefined, "aaj kya hai")}
          className="card-3d-tilt cursor-pointer relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900/90 to-slate-950/95 border border-rose-500/30 p-5 shadow-xl group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-rose-400 font-semibold">
              Urgent & Due Today
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 group-hover:scale-110 transition">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-black text-white font-['Outfit']">
              {dueData.today.length}
            </span>
            <span className="text-xs text-rose-400 font-bold">
              {dueData.overdue.length > 0 ? `(${dueData.overdue.length} Overdue!)` : "Due Today"}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>Upcoming (7d): {dueData.upcoming.length}</span>
            <span className="text-rose-400 flex items-center gap-0.5">
              Inspect <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Main 3D Graphs & Visualizer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Isometric / Dynamic Bar Graph: Weekly Capacity Load (7 cols) */}
        <div className="lg:col-span-7 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400" />
                <span>3D Weekly Workshop Capacity Load</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Calculated offline from IndexedDB snapshot indexes ({capacityData.orders} orders &bull; {capacityData.items} garments)
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
              Next 7 Days
            </span>
          </div>

          {/* 3D Bar Graph Visualization */}
          <div className="pt-4 pb-2">
            <div className="grid grid-cols-7 gap-2 sm:gap-3 h-48 items-end">
              {capacityData.perDay.map((day, idx) => {
                const maxVal = Math.max(5, ...capacityData.perDay.map((d) => d.items));
                const heightPercent = Math.max(15, Math.round((day.items / maxVal) * 100));
                const isHovered = hoveredBar === idx;

                return (
                  <div
                    key={day.date}
                    onMouseEnter={() => setHoveredBar(idx)}
                    onMouseLeave={() => setHoveredBar(null)}
                    className="flex flex-col items-center h-full justify-end group cursor-pointer"
                  >
                    {/* Tooltip on hover */}
                    <div
                      className={`text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-slate-200 mb-2 transition-all ${
                        isHovered ? "opacity-100 scale-100 -translate-y-1" : "opacity-0 scale-90 pointer-events-none"
                      }`}
                    >
                      {day.items} items
                    </div>

                    {/* 3D Isometric Bar */}
                    <div className="w-full max-w-[36px] relative perspective-1000 flex flex-col justify-end" style={{ height: `${heightPercent}%` }}>
                      <div
                        className={`w-full h-full rounded-t-xl transition-all duration-300 transform-style-3d ${
                          isHovered
                            ? "bg-gradient-to-t from-indigo-600 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/40 scale-105"
                            : day.items > 0
                            ? "bg-gradient-to-t from-indigo-800 to-indigo-500 shadow-md shadow-indigo-500/20"
                            : "bg-slate-800/60"
                        }`}
                        style={{
                          transform: isHovered ? "rotateX(-12deg) rotateY(15deg) scaleY(1.05)" : "rotateX(-5deg) rotateY(8deg)",
                        }}
                      >
                        {/* Top cap of 3D bar */}
                        <div className="absolute top-0 inset-x-0 h-2 bg-indigo-300/40 rounded-t-xl" />
                      </div>
                    </div>

                    {/* Day Date Label */}
                    <span className="text-[10px] font-mono text-slate-400 mt-2.5 truncate max-w-full">
                      {day.date.slice(5)}
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold">
                      {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500" />
                <span>Scheduled Workload</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded bg-slate-800" />
                <span>Available Slots</span>
              </div>
            </div>

            <span className="text-indigo-400 font-medium">Zero-Latency IndexedDB Read</span>
          </div>
        </div>

        {/* 3D Order Flow Pipeline Visualizer (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
          <div className="pb-3 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Offline CRDT Architecture</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              LWW + HLC
            </span>
          </div>

          {/* 3D Flow Nodes */}
          <div className="space-y-2.5 text-xs">
            {/* Step 1 */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-indigo-500/30 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                1
              </div>
              <div>
                <p className="font-semibold text-slate-200">Customer Input</p>
                <p className="text-slate-400 text-[11px]">Unstructured speech/text parsed offline</p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-purple-500/30 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                2
              </div>
              <div>
                <p className="font-semibold text-slate-200">Local HLC Vector Clock</p>
                <p className="text-slate-400 text-[11px]">Timestamped ops stored in Dexie IndexedDB</p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-pink-500/30 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                3
              </div>
              <div>
                <p className="font-semibold text-slate-200">Field-Level Materialization</p>
                <p className="text-slate-400 text-[11px]">Conflict detection + Last-Write-Wins</p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                4
              </div>
              <div>
                <p className="font-semibold text-slate-200">Relay SQLite Synchronization</p>
                <p className="text-slate-400 text-[11px]">Bi-directional sync when network restores</p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={onNavigateSync}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition"
            >
              <span>Inspect Outbox Queue & Clock Log</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Natural Language Assistant ("Ask the Store") */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Offline Store Query Assistant ("Objective 4 Ask")</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Instant offline answers mapped to IndexedDB queries (no cloud model required)
            </p>
          </div>

          {/* Preset queries pill bar */}
          <div className="flex flex-wrap items-center gap-1.5">
            {onNavigateQuery && (
              <button
                onClick={onNavigateQuery}
                className="px-2.5 py-1 rounded-lg text-xs bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-semibold flex items-center gap-1 shadow-sm transition"
              >
                <span>Full Query Hub</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => handleAskQuery(undefined, "kisne paisa dena hai")}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
            >
              Who owes money?
            </button>
            <button
              onClick={() => handleAskQuery(undefined, "aaj kya hai")}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
            >
              What is due today?
            </button>
            <button
              onClick={() => handleAskQuery(undefined, "hafte ka capacity")}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
            >
              Weekly Load
            </button>
            <button
              onClick={() => handleAskQuery(undefined, "koi conflict hai?")}
              className="px-2.5 py-1 rounded-lg text-xs bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
            >
              Conflicts
            </button>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAskQuery} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Ask anything (e.g., 'kisne paisa dena hai', 'aaj kya delivery hai', 'Meena aunty ka order')"
              className="w-full bg-slate-950 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 font-sans"
            />
          </div>
          <button
            type="submit"
            disabled={isQuerying}
            className="px-5 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20 transition"
          >
            {isQuerying ? "Evaluating..." : "Ask Store"}
          </button>
        </form>

        {/* Query Result Card */}
        {queryResult && (
          <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3 animate-in fade-in">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded font-mono font-bold bg-indigo-500/20 text-indigo-300 uppercase text-[10px]">
                  Intent: {queryResult.intent.kind}
                </span>
                <span className="text-slate-300 font-medium">{queryResult.explanation}</span>
              </div>
            </div>

            {/* Display rendered data according to intent */}
            {queryResult.intent.kind === "outstanding" && queryResult.data?.debtors && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                {queryResult.data.debtors.map((d: Debtor, idx: number) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-white">{d.customer}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({d.orders} orders)</span>
                    </div>
                    <span className="font-mono font-bold text-amber-400">₹{d.balance}</span>
                  </div>
                ))}
              </div>
            )}

            {queryResult.intent.kind === "due" && Array.isArray(queryResult.data) && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pt-1">
                {queryResult.data.length > 0 ? (
                  queryResult.data.map((o: Snapshot, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => onSelectOrder(o)}
                      className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 flex items-center justify-between text-xs cursor-pointer"
                    >
                      <div>
                        <span className="font-mono text-indigo-300 font-semibold mr-2">{o.order_id}</span>
                        <span className="font-semibold text-white">{o.customer || "Direct Customer"}</span>
                        <span className="text-[11px] text-slate-400 ml-2">
                          ({o.item_count} items &bull; Due: {o.due_date || "N/A"})
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-semibold capitalize">
                        {o.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic">No orders in this bucket.</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
