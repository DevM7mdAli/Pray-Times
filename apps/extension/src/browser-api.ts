/**
 * Firefox ships a callback-based `chrome` alias alongside the promise-based
 * `browser` namespace, so `browser` has to win wherever both exist. Awaiting
 * the callback-based alias resolves to `undefined` instead of the real result,
 * which is why every call site goes through this module.
 */
// `typeof` rather than a property lookup, because Chrome and Edge never define
// `browser` at all.
const resolved = typeof browser !== "undefined" ? browser : chrome;

if (!resolved) throw new Error("This browser does not expose the WebExtension APIs");

export const browserApi: WebExtensionApi = resolved;

/** The browser this bundle was built for. */
export const extensionTarget = __EXTENSION_TARGET__;

/** Chrome and Edge accept notification fields that Firefox and Safari reject. */
export const supportsRichNotifications = __EXTENSION_TARGET__ === "chrome";

/**
 * Safari has no notifications API. Checked at runtime rather than against the
 * build target, so the feature turns itself on if Safari ever ships it.
 */
export const supportsNotifications = Boolean(browserApi.notifications);

/**
 * The toolbar badge is the one ambient channel every engine supports, which
 * makes it the only background signal Safari users can get.
 */
export const supportsBadge = typeof browserApi.action?.setBadgeText === "function";

/**
 * An engine that does not know the `notifications` permission rejects rather
 * than answering false, so both permission calls are failure-tolerant.
 */
export async function hasNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  try {
    return await browserApi.permissions.contains({ permissions: ["notifications"] });
  } catch {
    return false;
  }
}

/** Must stay reachable synchronously from a user gesture to satisfy Firefox. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!supportsNotifications) return false;
  try {
    return await browserApi.permissions.request({ permissions: ["notifications"] });
  } catch {
    return false;
  }
}
