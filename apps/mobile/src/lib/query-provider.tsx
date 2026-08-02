import { useEffect, type ReactNode } from "react";
import { AppState, type AppStateStatus } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { focusManager, onlineManager, QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { ProviderError, VerificationError } from "@pray-times/core";
import { appStorage } from "@/lib/storage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 48 * 60 * 60_000,
      retry: (failureCount, error) => {
        if (error instanceof VerificationError) return false;
        if (error instanceof ProviderError) return error.retryable && failureCount < 1;
        return failureCount < 1;
      },
    },
  },
});

const persister = createAsyncStoragePersister({
  storage: appStorage,
  key: "pray-times:mobile-query-cache:v1",
  throttleTime: 1_000,
});

function onAppStateChange(status: AppStateStatus) {
  focusManager.setFocused(status === "active");
}

export function AppQueryProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener("change", onAppStateChange);
    const netInfoSubscription = NetInfo.addEventListener((state) => {
      onlineManager.setOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => {
      appStateSubscription.remove();
      netInfoSubscription();
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 48 * 60 * 60_000,
        dehydrateOptions: {
          shouldDehydrateQuery: (query) =>
            query.state.status === "success" && query.queryKey[0] === "prayer-day",
        },
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
}
