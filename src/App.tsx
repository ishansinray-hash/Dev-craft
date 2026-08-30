import React, { useState, useEffect } from "react";
import { Navbar, ActiveTab } from "./components/Navbar.js";
import { CustomerOrderView } from "./components/CustomerOrderView.js";
import { Shopkeeper3DDashboard } from "./components/Shopkeeper3DDashboard.js";
import { ShopkeeperQueryPage } from "./components/ShopkeeperQueryPage.js";
import { OrderListPage } from "./components/OrderListPage.js";
import { SyncListPage } from "./components/SyncListPage.js";
import { LiveTestingGuideModal } from "./components/LiveTestingGuideModal.js";
import { BillingReceipt } from "./components/BillingReceipt.js";
import { clientStore } from "./store/clientStore.js";
import { Snapshot } from "./store/db.js";

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("customer");
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [unsentCount, setUnsentCount] = useState(0);
  const [relayOpsCount, setRelayOpsCount] = useState(0);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Snapshot | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    async function setup() {
      await clientStore.init();
      setIsInitialized(true);
      updateState();
    }
    setup();

    const unsub = clientStore.subscribe(() => {
      updateState();
    });
    return unsub;
  }, []);

  const updateState = () => {
    setIsOnline(clientStore.getIsOnline());
    setIsSyncing(clientStore.getIsSyncing());
    setUnsentCount(clientStore.getUnsentCount());
    setRelayOpsCount(clientStore.getRelayOpsCount());
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 space-y-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-mono">Initializing IndexedDB Offline Store & HLC Clock...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenGuide={() => setIsGuideOpen(true)}
        isOnline={isOnline}
        isSyncing={isSyncing}
        unsentCount={unsentCount}
        relayOpsCount={relayOpsCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {activeTab === "customer" && <CustomerOrderView />}

        {activeTab === "dashboard" && (
          <Shopkeeper3DDashboard
            onNavigateOrders={() => setActiveTab("orders")}
            onNavigateSync={() => setActiveTab("sync")}
            onNavigateQuery={() => setActiveTab("query")}
            onSelectOrder={(order) => setSelectedReceiptOrder(order)}
          />
        )}

        {activeTab === "query" && (
          <ShopkeeperQueryPage
            onSelectOrder={(order) => setSelectedReceiptOrder(order)}
          />
        )}

        {activeTab === "orders" && (
          <OrderListPage
            onSelectOrder={(order) => setSelectedReceiptOrder(order)}
          />
        )}

        {activeTab === "sync" && <SyncListPage />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>
            OrderKaro &bull; 100% Offline Hybrid Logical Clock & CRDT Sync Platform
          </p>
          <p className="font-mono text-[11px] text-slate-400">
            Node: {clientStore.getClock()?.node || "client"} &bull; Fastify SQLite Relay Ready
          </p>
        </div>
      </footer>

      {/* Live Testing Guide Modal */}
      {isGuideOpen && (
        <LiveTestingGuideModal
          onClose={() => setIsGuideOpen(false)}
          onSelectTab={(tab) => {
            setActiveTab(tab);
            setIsGuideOpen(false);
          }}
        />
      )}

      {/* Order Receipt Modal (when triggered from dashboard or orders) */}
      {selectedReceiptOrder && (
        <BillingReceipt
          order={selectedReceiptOrder}
          onClose={() => setSelectedReceiptOrder(null)}
        />
      )}
    </div>
  );
}
export default App;
