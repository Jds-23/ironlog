import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import * as Network from "expo-network";
import NetInfo from "@react-native-community/netinfo";

import { useLocalDb } from "./local-db-provider";
import { createSyncScheduler } from "./sync-engine";

type SyncStatus = "syncing" | "synced" | "offline";

interface SyncContextValue {
  status: SyncStatus;
  notifyWrite: () => void;
  triggerSync: () => void;
}

const SyncContext = createContext<SyncContextValue | null>(null);

export function useSyncStatus(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) {
    throw new Error("useSyncStatus must be used within a SyncProvider");
  }
  return ctx;
}

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const db = useLocalDb();
  const [status, setStatus] = useState<SyncStatus>("syncing");
  const isOnlineRef = useRef(true);

  const performSync = useCallback(async () => {
    if (!isOnlineRef.current) {
      setStatus("offline");
      return;
    }
    setStatus("syncing");
    try {
      // Placeholder: in production, pass real tRPC client + refreshSession
      setStatus("synced");
    } catch {
      setStatus("synced");
    }
  }, [db]);

  const schedulerRef = useRef<ReturnType<typeof createSyncScheduler> | null>(null);

  useEffect(() => {
    const scheduler = createSyncScheduler(performSync);
    schedulerRef.current = scheduler;
    return () => scheduler.cleanup();
  }, [performSync]);

  // Check network on mount
  useEffect(() => {
    Network.getNetworkStateAsync().then((state) => {
      const online = state.isConnected ?? false;
      isOnlineRef.current = online;
      if (!online) {
        setStatus("offline");
      } else {
        performSync();
      }
    });
  }, [performSync]);

  // Real-time network changes via NetInfo
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = state.isConnected ?? false;
      isOnlineRef.current = online;
      if (!online) {
        setStatus("offline");
      } else {
        // Back online — trigger sync
        schedulerRef.current?.triggerNow();
      }
    });
    return unsubscribe;
  }, []);

  // Sync on app foreground
  useEffect(() => {
    const sub = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active" && isOnlineRef.current) {
        schedulerRef.current?.triggerNow();
      }
    });
    return () => sub.remove();
  }, []);

  const notifyWrite = useCallback(() => {
    schedulerRef.current?.notifyWrite();
  }, []);

  const triggerSync = useCallback(() => {
    schedulerRef.current?.triggerNow();
  }, []);

  return (
    <SyncContext.Provider value={{ status, notifyWrite, triggerSync }}>
      {children}
    </SyncContext.Provider>
  );
}
