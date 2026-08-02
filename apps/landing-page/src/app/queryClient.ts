import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // The provider is the authority on a prayer time, and a failed request is
      // answered with a saved verified copy rather than a silent second attempt.
      // Retrying would only delay that fallback appearing.
      retry: false,
      // Prayer times are refetched when the local date rolls over, not whenever
      // the tab regains focus — see useNow, which keeps the countdown current
      // without touching the network.
      refetchOnWindowFocus: false,
    },
  },
});
