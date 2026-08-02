import { Outlet } from "react-router";

/**
 * Every page carries its own document title and meta through
 * `useDocumentLocale` — see LandingPage and TodayPage — because each has its
 * own title, description, and OG copy. This layout exists only as the route
 * tree's single mount point for <Outlet>.
 */
export function RootLayout() {
  return <Outlet />;
}
