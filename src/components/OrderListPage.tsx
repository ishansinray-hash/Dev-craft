import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Package,
  Calendar,
  IndianRupee,
  User,
  Scissors,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Printer,
  ChevronRight,
  Eye,
  ShieldAlert,
  Sparkles,
  Layers,
  Check,
  X,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { clientStore } from "../store/clientStore.js";
import { Snapshot } from "../store/db.js";
import { OrderState } from "../core/sync/types.js";
import { BillingReceipt } from "./BillingReceipt.js";

interface OrderListPageProps {
  onSelectOrder?: (order: Snapshot) => void;
}

export const OrderListPage: React.FC<OrderListPageProps> = () => {
  const [orders, setOrders] = useState<Snapshot[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Snapshot | null>(null);
  const [detailedState, setDetailedState] = useState<OrderState | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptOrder, setReceiptOrder] = useState<Snapshot | null>(null);
  const [isSimulatingConflict, setIsSimulatingConflict] = useState(false);

  // Shopkeeper price quoting inputs
  const [priceQuote, setPriceQuote] = useState<string>("");
  const [paidQuote, setPaidQuote] = useState<string>("");
  const [isUpdatingPrice, setIsUpdatingPrice] = useState(false);
  const [priceSavedSuccess, setPriceSavedSuccess] = useState(false);

  const loadOrders = async () => {
    const store = clientStore.getStore();
    const rows = await store.snapshots.toArray();
    setOrders(rows);
  };

  useEffect(() => {
    loadOrders();
    const unsub = clientStore.subscribe(() => {
      loadOrders();
    });
    return unsub;
  }, []);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      // Search
      const term = search.toLowerCase();
      const matchSearch =
        !term ||
        o.order_id.toLowerCase().includes(term) ||
        (o.customer && o.customer.toLowerCase().includes(term)) ||
        o.record.items.some((i) => i.description.toLowerCase().includes(term));

      // Status
      const matchStatus = statusFilter === "all" || o.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, search, statusFilter]);

  const handleSelectOrder = async (order: Snapshot) => {
    setSelectedOrder(order);
    const store = clientStore.getStore();
    const state = await store.loadState(order.order_id);
    setDetailedState(state);
    setPriceQuote(state.record.amount !== null && state.record.amount !== undefined ? String(state.record.amount) : "");
    setPaidQuote(state.record.paid !== null && state.record.paid !== undefined ? String(state.record.paid) : "0");
    setPriceSavedSuccess(false);
  };

  const handleSavePriceQuote = async () => {
    if (!selectedOrder) return;
    setIsUpdatingPrice(true);
    try {
      const amountVal = priceQuote.trim() === "" ? null : Number(priceQuote);
      const paidVal = paidQuote.trim() === "" ? 0 : Number(paidQuote);
      await clientStore.updateOrderPricing(selectedOrder.order_id, amountVal, paidVal);
      await loadOrders();
      const store = clientStore.getStore();
      const state = await store.loadState(selectedOrder.order_id);
      setDetailedState(state);
      const updatedSnap = await store.snapshots.get(selectedOrder.order_id);
      if (updatedSnap) setSelectedOrder(updatedSnap);
      setPriceSavedSuccess(true);
      setTimeout(() => setPriceSavedSuccess(false), 2500);
    } finally {
      setIsUpdatingPrice(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    await clientStore.updateOrderField(orderId, "status", newStatus);
    await loadOrders();
    if (selectedOrder?.order_id === orderId) {
      const store = clientStore.getStore();
      const state = await store.loadState(orderId);
      setDetailedState(state);
      const updatedSnap = await store.snapshots.get(orderId);
      if (updatedSnap) setSelectedOrder(updatedSnap);
    }
  };

  const handleResolveConflict = async (orderId: string, path: string, chosenValue: any) => {
    await clientStore.resolveConflict(orderId, path, chosenValue);
    await loadOrders();
    if (selectedOrder?.order_id === orderId) {
      const store = clientStore.getStore();
      const state = await store.loadState(orderId);
      setDetailedState(state);
      const updatedSnap = await store.snapshots.get(orderId);
      if (updatedSnap) setSelectedOrder(updatedSnap);
    }
  };

  const handleTriggerSimulatedConflict = async (orderId: string) => {
    setIsSimulatingConflict(true);
    try {
      await clientStore.simulateConflict(orderId);
      await loadOrders();
      if (selectedOrder?.order_id === orderId) {
        const store = clientStore.getStore();
        const state = await store.loadState(orderId);
        setDetailedState(state);
        const updatedSnap = await store.snapshots.get(orderId);
        if (updatedSnap) setSelectedOrder(updatedSnap);
      }
    } finally {
      setIsSimulatingConflict(false);
    }
  };

  const handleResetDatabase = async () => {
    if (confirm("Are you sure you want to clear all orders? This will wipe the local store for fresh testing.")) {
      await clientStore.resetDatabase();
      setSelectedOrder(null);
      setDetailedState(null);
      await loadOrders();
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight font-['Outfit']">
            Master Order Directory
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm">
            {orders.length} orders recorded &bull; Tailoring & Garment Workshop
          </p>
        </div>

        {orders.length > 0 && (
          <button
            onClick={handleResetDatabase}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/40 text-slate-400 hover:text-rose-400 text-xs transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All Orders</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
        {/* Search */}
        <div className="sm:col-span-8 relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name, order ID, or item (e.g. 'Customer 1', 'kurta', 'blouse')..."
            className="w-full bg-slate-900 border border-slate-700/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 font-sans"
          />
        </div>

        {/* Status Filter */}
        <div className="sm:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:border-indigo-500"
          >
            <option value="all">All Statuses</option>
            <option value="open">Open (Pending Quote / Start)</option>
            <option value="in_progress">In Progress</option>
            <option value="ready">Ready for Pickup</option>
            <option value="delivered">Delivered / Settled</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Grid / List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left List (7 or 12 cols) */}
        <div className={`${selectedOrder ? "lg:col-span-7" : "lg:col-span-12"} space-y-3`}>
          {filteredOrders.length > 0 ? (
            filteredOrders.map((order) => {
              const isSelected = selectedOrder?.order_id === order.order_id;
              const hasConflict = order.conflict_count > 0;
              const isQuoted = order.record.amount !== null && order.record.amount !== undefined;
              const remaining = order.balance;

              return (
                <div
                  key={order.order_id}
                  onClick={() => handleSelectOrder(order)}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-slate-900 border-indigo-500 shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500"
                      : "bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-950 border border-slate-800">
                        <Scissors className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-indigo-400">
                            {order.order_id}
                          </span>
                          <span className="text-sm font-bold text-white font-['Outfit']">
                            {order.customer ?? "Customer"}
                          </span>
                          {hasConflict && (
                            <span className="px-2 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" />
                              {order.conflict_count} Conflict
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                          <Calendar className="w-3 h-3 text-slate-500" />
                          <span>Due: <strong className="text-slate-200">{order.due_date || "Standard (7 days)"}</strong></span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold capitalize font-mono ${
                          order.status === "ready"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                            : order.status === "in_progress"
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : order.status === "cancelled"
                            ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                            : "bg-slate-800 text-slate-300 border border-slate-700"
                        }`}
                      >
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Items list snippet */}
                  <div className="pt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {order.record.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 text-[11px]"
                        >
                          <strong className="text-indigo-400 capitalize">{item.description}</strong> ({item.quantity})
                        </span>
                      ))}
                    </div>

                    {/* Financial balance pill */}
                    <div className="flex items-center gap-2 font-mono text-xs">
                      {isQuoted ? (
                        <>
                          <span className="text-slate-400">Total: ₹{order.record.amount}</span>
                          <span className={`font-semibold ${remaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                            {remaining > 0 ? `Due: ₹${remaining}` : "Settled"}
                          </span>
                        </>
                      ) : (
                        <span className="text-amber-400/90 italic text-[11px] bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Price Quote Pending
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-500 text-xs">
              <Package className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="font-semibold text-slate-400">No orders currently in workshop.</p>
              <p className="text-slate-500 text-[11px] mt-1">New customer orders will appear here automatically.</p>
            </div>
          )}
        </div>

        {/* Right Details Inspector Drawer (5 cols) */}
        {selectedOrder && detailedState && (
          <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 p-6 shadow-2xl space-y-6 sticky top-24">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider">
                  Order Inspector & Workshop Control
                </span>
                <h3 className="text-lg font-bold text-white font-['Outfit'] flex items-center gap-2 mt-0.5">
                  <span>{selectedOrder.customer || "Customer"}</span>
                  <span className="text-xs font-mono text-slate-400">({selectedOrder.order_id})</span>
                </h3>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Shopkeeper Pricing Quote Box */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <IndianRupee className="w-3.5 h-3.5" />
                  Shopkeeper Price Quote & Advance
                </span>
                {detailedState.record.customer_proposed_price ? (
                  <span className="text-[10px] text-slate-400 font-mono">
                    Customer ref: ₹{detailedState.record.customer_proposed_price}
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Total Amount (₹)</label>
                  <input
                    type="number"
                    value={priceQuote}
                    onChange={(e) => setPriceQuote(e.target.value)}
                    placeholder="e.g. 1200"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Advance Paid (₹)</label>
                  <input
                    type="number"
                    value={paidQuote}
                    onChange={(e) => setPaidQuote(e.target.value)}
                    placeholder="e.g. 500"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] font-mono">
                  {priceQuote ? (
                    <span className="text-slate-300">
                      Balance: <strong className="text-amber-400">₹{Math.max(0, Number(priceQuote || 0) - Number(paidQuote || 0))}</strong>
                    </span>
                  ) : (
                    <span className="text-slate-500 italic">No price quoted yet</span>
                  )}
                </div>

                <button
                  onClick={handleSavePriceQuote}
                  disabled={isUpdatingPrice}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition"
                >
                  {priceSavedSuccess ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>{isUpdatingPrice ? "Saving..." : "Update Pricing"}</span>
                  )}
                </button>
              </div>
            </div>

            {/* Conflict Alert & One-Click Field Resolver */}
            {Object.keys(detailedState.conflicts).length > 0 && (
              <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>Concurrent Offline Conflict Detected</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Another device edited this order while offline. Pick which value to keep:
                </p>

                <div className="space-y-2">
                  {Object.entries(detailedState.conflicts).map(([path, losingHlc]) => (
                    <div key={path} className="p-2.5 rounded-lg bg-slate-950 border border-rose-500/20 space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
                        <span>Field: <strong className="text-white">{path}</strong></span>
                        <span className="text-rose-400">Conflicting HLC: {losingHlc.slice(-12)}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => handleResolveConflict(selectedOrder.order_id, path, "2026-09-12")}
                          className="flex-1 py-1 px-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] transition"
                        >
                          Accept Newer Value
                        </button>
                        <button
                          onClick={() => handleResolveConflict(selectedOrder.order_id, path, "2026-09-08")}
                          className="flex-1 py-1 px-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] transition"
                        >
                          Keep Prior Value
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Garment Details & Extracted Measurements */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                Garments & Sizing Specs
              </h4>
              <div className="space-y-2">
                {detailedState.record.items.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white capitalize">{item.description}</span>
                      <span className="font-mono text-indigo-300 font-bold">Qty: {item.quantity}</span>
                    </div>
                    {item.attributes && Object.keys(item.attributes).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(item.attributes).map(([k, v]) => (
                          <span
                            key={k}
                            className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                          >
                            <strong className="text-indigo-400">{k}:</strong> {String(v)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Original Transcribed Message */}
            {detailedState.record.raw_message && (
              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1">
                  Customer Input Message
                </h4>
                <p className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs italic font-mono leading-relaxed">
                  "{detailedState.record.raw_message}"
                </p>
              </div>
            )}

            {/* Status Workflow Action Buttons */}
            <div>
              <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-2">
                Order Workflow Status
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.order_id, "in_progress")}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    selectedOrder.status === "in_progress"
                      ? "bg-indigo-600 border-indigo-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.order_id, "ready")}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    selectedOrder.status === "ready"
                      ? "bg-emerald-600 border-emerald-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Mark Ready
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedOrder.order_id, "delivered")}
                  className={`py-2 rounded-xl text-xs font-semibold border transition ${
                    selectedOrder.status === "delivered"
                      ? "bg-cyan-600 border-cyan-500 text-white"
                      : "bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  Delivered
                </button>
              </div>
            </div>

            {/* Bottom Actions: Print Receipt / Simulate Conflict */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={() => {
                  setReceiptOrder(selectedOrder);
                  setIsReceiptOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition"
              >
                <Printer className="w-4 h-4" />
                <span>View / Print Customer Receipt</span>
              </button>

              <button
                onClick={() => handleTriggerSimulatedConflict(selectedOrder.order_id)}
                disabled={isSimulatingConflict}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-semibold bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-amber-300 border border-slate-800 hover:border-amber-500/40 transition"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSimulatingConflict ? "Generating Conflict..." : "Simulate Multi-Device Edit Conflict"}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Receipt Modal */}
      {isReceiptOpen && receiptOrder && (
        <BillingReceipt
          order={receiptOrder}
          onClose={() => setIsReceiptOpen(false)}
        />
      )}
    </div>
  );
};
