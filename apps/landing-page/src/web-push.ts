import { PRAYER_KEYS, type PrayerKey, type SupportedLocale } from "@pray-times/core";

export type WebAlertSettings = {
  cityId: string;
  locale: SupportedLocale;
  enabledPrayers: Record<PrayerKey, boolean>;
};

type PushConfig = { apiBaseUrl?: unknown };

function normalizeApiBaseUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  try {
    const url = new URL(value.trim());
    return url.protocol === "https:" || url.hostname === "localhost"
      ? url.toString().replace(/\/$/, "")
      : undefined;
  } catch {
    return undefined;
  }
}

export async function loadPushApiUrl(): Promise<string | undefined> {
  const environmentUrl = normalizeApiBaseUrl(import.meta.env.VITE_PUSH_API_URL);
  if (environmentUrl) return environmentUrl;
  try {
    const response = await fetch("/Pray-Times/push-config.json", { cache: "no-store" });
    if (!response.ok) return undefined;
    const config = (await response.json()) as PushConfig;
    return normalizeApiBaseUrl(config.apiBaseUrl);
  } catch {
    return undefined;
  }
}

export function supportsWebPush(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function applicationServerKey(value: string): ArrayBuffer {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const raw = window.atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let index = 0; index < raw.length; index += 1) bytes[index] = raw.charCodeAt(index);
  return bytes.buffer;
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/Pray-Times/sw.js", { scope: "/Pray-Times/" });
  return navigator.serviceWorker.ready;
}

async function apiRequest(apiBaseUrl: string, path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Push service request failed (${response.status})`);
  return response.json() as Promise<unknown>;
}

function subscriptionBody(subscription: PushSubscription, settings: WebAlertSettings) {
  const value = subscription.toJSON();
  if (!value.endpoint || !value.keys?.p256dh || !value.keys.auth) {
    throw new Error("The browser returned an incomplete push subscription");
  }
  const enabledPrayers = Object.fromEntries(
    PRAYER_KEYS.map((key) => [key, settings.enabledPrayers[key]])
  ) as Record<PrayerKey, boolean>;
  return {
    subscription: value,
    cityId: settings.cityId,
    locale: settings.locale,
    enabledPrayers,
  };
}

export async function currentWebPushSubscription(): Promise<PushSubscription | null> {
  if (!supportsWebPush()) return null;
  return (await registration()).pushManager.getSubscription();
}

export async function enableWebPush(apiBaseUrl: string, settings: WebAlertSettings): Promise<void> {
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new DOMException("Notification permission denied", "NotAllowedError");
  const serviceWorker = await registration();
  let subscription = await serviceWorker.pushManager.getSubscription();
  if (!subscription) {
    const response = (await apiRequest(apiBaseUrl, "/v1/public-key")) as {
      publicKey?: unknown;
    };
    if (typeof response.publicKey !== "string") throw new Error("Push public key is unavailable");
    subscription = await serviceWorker.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey(response.publicKey),
    });
  }
  await apiRequest(apiBaseUrl, "/v1/subscriptions", {
    method: "POST",
    body: JSON.stringify(subscriptionBody(subscription, settings)),
  });
}

export async function syncWebPush(
  apiBaseUrl: string,
  settings: WebAlertSettings
): Promise<boolean> {
  const subscription = await currentWebPushSubscription();
  if (!subscription) return false;
  await apiRequest(apiBaseUrl, "/v1/subscriptions", {
    method: "POST",
    body: JSON.stringify(subscriptionBody(subscription, settings)),
  });
  return true;
}

export async function disableWebPush(apiBaseUrl: string): Promise<void> {
  const subscription = await currentWebPushSubscription();
  if (!subscription) return;
  await apiRequest(apiBaseUrl, "/v1/subscriptions", {
    method: "DELETE",
    body: JSON.stringify({ endpoint: subscription.endpoint }),
  });
  await subscription.unsubscribe();
}

export async function testWebPush(apiBaseUrl: string, settings: WebAlertSettings): Promise<void> {
  const subscription = await currentWebPushSubscription();
  if (!subscription) throw new Error("Push subscription is unavailable");
  await apiRequest(apiBaseUrl, "/v1/notifications/test", {
    method: "POST",
    body: JSON.stringify(subscriptionBody(subscription, settings)),
  });
}
