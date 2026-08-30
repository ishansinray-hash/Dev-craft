import React, { useState, useEffect } from "react";
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Layers,
  Database,
  ShieldAlert,
  CheckCircle2,
  Clock,
  ArrowRight,
  Server,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
} from "lucide-react";
import { clientStore } from "../store/clientStore.js";
import { Op } from "../core/sync/types.js";

export const SyncListPage: React.FC = () => {
  const [unsentOps, setUnsentOps] = useState<Op[]>([]);
  const [allLocalOps, setAllLocalOps] = useState<Op[]>([]);
  const [relayStats, setRelayStats] = useState<{ total_ops: number; total_orders: number; latest_ops: any[] }>({
    total_ops: 0,
    total_orders: 0,
    latest_ops: [],
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(clientStore.getIsOnline());
  const [selectedScenario, setSelectedScenario] = useState<number | null>(null);
  const [scenarioStatus, setScenarioStatus] = useState<string | null>(null);

  const loadData = async () => {
    const store = clientStore.getStore();
    const unsent = await store.unsent();
    const ops = await (store as any).db.ops.toArray();
    setUnsentOps(unsent);
    setAllLocalOps(ops);
    setIsOnline(clientStore.getIsOnline());

    try {
      const res = await fetch(`${window.location.origin}/api/relay/stats`);
      if (res.ok) {
        const data = await res.json();
        setRelayStats(data);
      }
    } catch {
      // offline
    }
  };

  useEffect(() => {
    loadData();
    const unsub = clientStore.subscribe(() => {
      loadData();
    });
    return unsub;
  }, []);

  const handleToggleOnline = () => {
    const next = !isOnline;
    setIsOnline(next);
    clientStore.setNetworkMode(next);
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      await clientStore.triggerSync();
      await loadData();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRunScenario = async (num: number) => {
    setSelectedScenario(num);
    setScenarioStatus("Running scenario locally on device...");
    const orderId = "ORD-1042";
    // Seed the baseline order first, otherwise the scenarios write onto an id
    // that may not exist and mint an empty ghost order.
    await clientStore.ensureScenarioOrder(orderId);

    if (num === 1) {
      // Scenario 1: Disjoint field edits
      await clientStore.updateOrderField(orderId, "due_date", "2026-09-08");
      await clientStore.updateOrderField(orderId, "amount", 1600);
      setScenarioStatus("✅ Scenario 1 Complete: Disjoint fields (due_date & amount) merged cleanly without data loss.");
    } else if (num === 2) {
      // Scenario 2: Competing edits on same field
      await clientStore.simulateConflict(orderId);
      setScenarioStatus("⚠️ Scenario 2 Complete: Competing due_date edits submitted. CRDT LWW resolved newest & flagged conflict badge.");
    } else if (num === 3) {
      // Scenario 3: Causality across a reconnection
      const { remote, local } = await clientStore.simulateCausalHandoff(orderId);
      setScenarioStatus(
        `✅ Scenario 3 Complete: local clock observed remote HLC ${remote.hlc} and issued ${local.hlc} strictly after it, ` +
        "so the later edit wins despite this device's clock running behind.",
      );
    }
    await loadData();
  };

  const handleResetDb = async () => {
    if (confirm("Reset the local database? This clears every order and operation on this device.")) {
      await clientStore.resetDatabase();
      await loadData();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-['Outfit']">
            Offline Queue & Relay Synchronization
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            Inspect local IndexedDB outbox, Hybrid Logical Clocks, and SQLite relay convergence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
              isOnline
                ? "bg-emerald-950/40 border-emerald-500/40 text-emerald-400"
                : "bg-amber-950/40 border-amber-500/40 text-amber-400"
            }`}
          >
            {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
            <span>{isOnline ? "Network: Online" : "Network: Offline Sim"}</span>
          </button>

          <button
            onClick={handleTriggerSync}
            disabled={!isOnline || isSyncing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-amber-400 font-semibold">
              Unsent Local Outbox
            </span>
            <Database className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit'] mt-2">
            {unsentOps.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {unsentOps.length > 0
              ? "Queued locally in IndexedDB (server_seq: 0)"
              : "All local operations synced with relay"}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-indigo-400 font-semibold">
              Total Local Ops Log
            </span>
            <Layers className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit'] mt-2">
            {allLocalOps.length}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Immutable append-only CRDT operations
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-emerald-400 font-semibold">
              Server SQLite Relay
            </span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-white font-['Outfit'] mt-2">
            {relayStats.total_ops} ops
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {relayStats.total_orders} distinct orders acknowledged
          </p>
        </div>
      </div>

      {/* Interactive CRDT Conflict Scenario Lab */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-indigo-500/30 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Interactive Conflict Resolution Simulator</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Simulate concurrent offline edits from multiple devices to verify CRDT convergence
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            onClick={() => handleRunScenario(1)}
            className="p-3.5 rounded-xl bg-slate-950 hover:bg-indigo-950/30 border border-slate-800 hover:border-indigo-500/40 text-left transition space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-300">Scenario 1</span>
              <Play className="w-3.5 h-3.5 text-indigo-400" />
            </div>
            <p className="text-xs font-semibold text-white">Disjoint Field Edits</p>
            <p className="text-[11px] text-slate-400">
              Device A edits due date, Device B edits amount. Merged with zero data loss.
            </p>
          </button>

          <button
            onClick={() => handleRunScenario(2)}
            className="p-3.5 rounded-xl bg-slate-950 hover:bg-rose-950/30 border border-slate-800 hover:border-rose-500/40 text-left transition space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-rose-300">Scenario 2</span>
              <Play className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <p className="text-xs font-semibold text-white">Competing Same-Field Edits</p>
            <p className="text-[11px] text-slate-400">
              Both devices edit due date. HLC LWW picks winner & flags conflict badge for shopkeeper.
            </p>
          </button>

          <button
            onClick={() => handleRunScenario(3)}
            className="p-3.5 rounded-xl bg-slate-950 hover:bg-emerald-950/30 border border-slate-800 hover:border-emerald-500/40 text-left transition space-y-1.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-300">Scenario 3</span>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="text-xs font-semibold text-white">Causal Order Preserved</p>
            <p className="text-[11px] text-slate-400">
              Device clocks learn from remote HLCs to preserve causality across reconnections.
            </p>
          </button>
        </div>

        {scenarioStatus && (
          <div className="p-3 rounded-xl bg-slate-950 border border-indigo-500/30 text-xs text-indigo-200 font-mono animate-in fade-in">
            {scenarioStatus}
          </div>
        )}
      </div>

      {/* Outbox Operations Queue Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white font-['Outfit'] flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Local IndexedDB Operations Log (Outbox & Synced)</span>
          </h3>
          <button
            onClick={handleResetDb}
            className="text-[11px] text-slate-400 hover:text-rose-300 flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Local Database</span>
          </button>
        </div>

        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Order ID</th>
                <th className="py-2.5 px-3">Mutation Path</th>
                <th className="py-2.5 px-3">Value</th>
                <th className="py-2.5 px-3">HLC Timestamp</th>
                <th className="py-2.5 px-3 text-right">Sync Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {allLocalOps.slice(0, 15).map((op) => (
                <tr key={op.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-2.5 px-3 text-indigo-300 font-bold">{op.order_id}</td>
                  <td className="py-2.5 px-3 text-slate-300">{op.path}</td>
                  <td className="py-2.5 px-3 text-slate-200 truncate max-w-[150px]">
                    {JSON.stringify(op.value)}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-[11px]">{op.hlc}</td>
                  <td className="py-2.5 px-3 text-right">
                    {(op.server_seq ?? 0) > 0 ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        seq: {op.server_seq}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Unsent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
