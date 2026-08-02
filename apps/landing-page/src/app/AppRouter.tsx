import { BrowserRouter, useRoutes } from "react-router";
import { BASE_URL } from "../lib/urls";
import { routes } from "../routes";

/**
 * GitHub Pages has no SPA rewrite, so both `index.html` and `today/index.html`
 * stay real static entries — a cold hit on either must return a genuine 200,
 * not a 404-then-redirect flash in front of a push notification or a PWA
 * launch. Both load this same router; `basename` strips the deployment prefix
 * (`/Pray-Times/`) so the routes in routes.tsx can match plain paths.
 */
function RouteTree() {
  return useRoutes(routes);
}

export function AppRouter() {
  return (
    <BrowserRouter basename={BASE_URL}>
      <RouteTree />
    </BrowserRouter>
  );
}
