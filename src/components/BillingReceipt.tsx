import React from "react";
import {
  Printer,
  CheckCircle2,
  Calendar,
  User,
  Scissors,
  Zap,
  Cake,
  Utensils,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Clock,
  X,
} from "lucide-react";
import { Snapshot } from "../store/db.js";
import { OrderKaroLogo } from "./OrderKaroLogo.js";

interface BillingReceiptProps {
  order: Snapshot | null;
  onClose: () => void;
  isNewOrder?: boolean;
}

export const BillingReceipt: React.FC<BillingReceiptProps> = ({ order, onClose, isNewOrder }) => {
  if (!order) return null;

  const { record, order_id, due_date, customer, balance } = order;
  const isQuoted = record.amount !== null && record.amount !== undefined;
  const totalAmount = isQuoted ? record.amount : null;
  const paidAmount = record.paid ?? 0;
  const remaining = totalAmount !== null ? Math.max(0, totalAmount - paidAmount) : null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-8 animate-in fade-in zoom-in duration-200">
        {/* Top Accent Header */}
        <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-1">
          <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                <Scissors className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-['Outfit'] flex items-center gap-2">
                  Official Tailoring Receipt & Invoice
                  {isNewOrder && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      Confirmed
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">Order ID: <span className="font-mono text-indigo-300 font-semibold">{order_id}</span></p>
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

        {/* Invoice Printable Area */}
        <div className="p-6 sm:p-8 space-y-6 print:p-0 print:bg-white print:text-black">
          {/* Shop and Customer Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-slate-800 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <OrderKaroLogo size="sm" showText={false} />
                <h2 className="text-xl font-bold text-white tracking-tight font-['Outfit']">
                  Order<span className="text-orange-500">Karo</span> Studio
                </h2>
              </div>
              <p className="text-xs text-slate-400">Bespoke Tailoring & Smart Order Processing</p>
              <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Verified Offline-Processed Contract</span>
              </div>
            </div>

            <div className="text-left sm:text-right bg-slate-950/60 sm:bg-transparent p-3 sm:p-0 rounded-xl w-full sm:w-auto border sm:border-0 border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Customer Details</span>
              <p className="text-sm font-semibold text-white flex items-center sm:justify-end gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                {customer ?? "Customer 1"}
              </p>
              <p className="text-xs text-slate-400 mt-0.5 flex items-center sm:justify-end gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Due: <span className="text-slate-200 font-medium">{due_date ?? "Standard turn (7 days)"}</span>
              </p>
            </div>
          </div>

          {/* Itemized Specification Table */}
          <div>
            <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
              Itemized Garments & Sizing Specs
            </h4>
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Garment & Description</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Qty</th>
                    <th className="py-2.5 px-4 font-semibold">Chest / Waist / Measurements</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                  {record.items && record.items.length > 0 ? (
                    record.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-medium text-slate-200 capitalize">
                          {item.description || "Custom Garment"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-semibold text-indigo-300">
                          {item.quantity || 1}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1.5">
                            {item.attributes && Object.keys(item.attributes).length > 0 ? (
                              Object.entries(item.attributes).map(([key, val]) => (
                                <span
                                  key={key}
                                  className="px-2 py-0.5 rounded text-[11px] bg-slate-800 text-slate-300 border border-slate-700 font-mono"
                                >
                                  <strong className="text-indigo-400">{key}:</strong> {String(val)}
                                </span>
                              ))
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Standard measurements</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-slate-400 italic text-center">
                        Standard custom tailoring order
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pricing & Advance Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Payment & QR box */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center gap-4">
              <div className="p-3 bg-white rounded-xl shadow-md">
                <QrCode className="w-12 h-12 text-slate-950" />
              </div>
              <div className="text-xs">
                <p className="font-semibold text-slate-200">UPI Instant Settlement</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Scan to pay balance at counter</p>
                <div className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>UPI: devcraft@upi</span>
                </div>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Amount:</span>
                <span className="font-mono font-medium text-slate-200">
                  {isQuoted ? `₹${totalAmount}` : <span className="text-amber-400 italic text-[11px]">Pending Shopkeeper Quote</span>}
                </span>
              </div>
              <div className="flex justify-between text-emerald-400">
                <span>Advance Paid:</span>
                <span className="font-mono font-medium">₹{paidAmount}</span>
              </div>
              <div className="border-t border-slate-800 pt-2 flex justify-between text-sm font-bold text-white">
                <span>Balance Due:</span>
                <span className={`font-mono ${remaining && remaining > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                  {remaining !== null ? `₹${remaining}` : <span className="text-slate-400 text-xs font-normal">Calculated after quote</span>}
                </span>
              </div>
            </div>
          </div>

          {/* Raw NLP Message Audit */}
          {record.raw_message && (
            <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/20 text-xs">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 block mb-1">
                Original Message Transcription (Parsed Locally)
              </span>
              <p className="text-slate-300 italic font-mono text-[11px] leading-relaxed">
                "{record.raw_message}"
              </p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-800 print:hidden">
            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Status: <strong className="text-white capitalize">{record.status}</strong></span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handlePrint}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>

              <button
                onClick={onClose}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/25 transition"
              >
                <span>Done</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
