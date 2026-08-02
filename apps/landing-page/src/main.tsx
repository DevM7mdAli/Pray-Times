import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import "./index.css";
import "./i18n";
import { AppRouter } from "./app/AppRouter";
import { queryClient } from "./app/queryClient";

const root = document.getElementById("root");
if (!root) throw new Error("Missing application root");

// Both index.html and today/index.html load this same entry, so the two
// pages share one router, one Query client, and one JS chunk — see
// AppRouter's comment for why both HTML files still exist as static entries.
createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AppRouter />
    </QueryClientProvider>
  </StrictMode>
);
