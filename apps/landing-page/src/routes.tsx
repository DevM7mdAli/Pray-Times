import type { RouteObject } from "react-router";
import { RootLayout } from "./app/RootLayout";
import { LandingPage } from "./pages/landing/LandingPage";
import { TodayPage } from "./pages/today/TodayPage";

/**
 * Paths relative to the router's basename — for <Link to>, not <a href>.
 * TODAY_ROUTE keeps the trailing slash so it matches the canonical URL used
 * everywhere outside this router: the sitemap, OG tags, the manifest's
 * start_url, and the push notification's click target.
 */
export const HOME_ROUTE = "/";
export const TODAY_ROUTE = "/today/";

/**
 * The one place a page is registered. Both routes are eagerly imported rather
 * than lazy — the two static HTML entries (index.html, today/index.html) both
 * load this same module, so Vite emits one shared chunk and there is no route
 * left to defer without adding a round trip to whichever page loaded first.
 */
export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: HOME_ROUTE, element: <LandingPage /> },
      { path: TODAY_ROUTE, element: <TodayPage /> },
    ],
  },
];
