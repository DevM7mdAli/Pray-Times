/**
 * Every path the app builds hangs off Vite's configured base, so the GitHub
 * Pages prefix is declared once in vite.config.ts and never repeated as a
 * literal. Anything under `public/` is addressed through here too.
 */
export const BASE_URL = import.meta.env.BASE_URL;

export const HOME_PATH = BASE_URL;
export const TODAY_PATH = `${BASE_URL}today/`;

export const ICON_URL = `${BASE_URL}icon.png`;
export const PUSH_CONFIG_URL = `${BASE_URL}push-config.json`;
export const SERVICE_WORKER_URL = `${BASE_URL}sw.js`;
/** The service worker controls the whole deployment, not just one page. */
export const SERVICE_WORKER_SCOPE = BASE_URL;

export const REPOSITORY_URL = "https://github.com/DevM7mdAli/Pray-Times";
export const EXTENSION_URL = `${REPOSITORY_URL}/releases/latest`;
