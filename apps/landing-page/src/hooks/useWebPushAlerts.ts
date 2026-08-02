import { useEffect, useRef, useState } from "react";
import {
  currentWebPushSubscription,
  disableWebPush,
  enableWebPush,
  loadPushApiUrl,
  supportsWebPush,
  syncWebPush,
  testWebPush,
  type WebAlertSettings,
} from "../lib/web-push";

export type AlertStatus =
  | "checking"
  | "unconfigured"
  | "unsupported"
  | "denied"
  | "disabled"
  | "enabled"
  | "sent"
  | "error";

export type WebPushAlerts = {
  status: AlertStatus;
  busy: boolean;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  sendTest: () => Promise<void>;
};

/**
 * Owns the whole alert lifecycle: what this browser supports, whether the free
 * service is connected, whether this device is subscribed, and keeping the
 * server's copy of the reader's choices in step with theirs.
 */
export function useWebPushAlerts(settings: WebAlertSettings): WebPushAlerts {
  const [apiUrl, setApiUrl] = useState<string>();
  const [status, setStatus] = useState<AlertStatus>("checking");
  const [busy, setBusy] = useState(false);

  // The first sync runs once, with whatever the settings were at mount; later
  // changes are handled by the debounced effect below rather than by re-running
  // the whole capability check.
  const latest = useRef(settings);
  latest.current = settings;

  useEffect(() => {
    let active = true;
    void loadPushApiUrl().then(async (url) => {
      if (!active) return;
      setApiUrl(url);
      if (!supportsWebPush()) return setStatus("unsupported");
      if (!url) return setStatus("unconfigured");
      if (Notification.permission === "denied") return setStatus("denied");
      try {
        const subscription = await currentWebPushSubscription();
        if (subscription) await syncWebPush(url, latest.current);
        if (active) setStatus(subscription ? "enabled" : "disabled");
      } catch {
        if (active) setStatus("error");
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!apiUrl || (status !== "enabled" && status !== "sent")) return;
    const timer = window.setTimeout(() => {
      void syncWebPush(apiUrl, settings).catch(() => setStatus("error"));
    }, 400);
    return () => window.clearTimeout(timer);
  }, [apiUrl, settings, status]);

  /** Each action reports its own outcome, so the status line always matches the last attempt. */
  const run = async (action: (url: string) => Promise<void>, done: AlertStatus) => {
    if (!apiUrl) return;
    setBusy(true);
    try {
      await action(apiUrl);
      setStatus(done);
    } catch (error) {
      setStatus(
        error instanceof DOMException && error.name === "NotAllowedError" ? "denied" : "error"
      );
    } finally {
      setBusy(false);
    }
  };

  return {
    status,
    busy,
    enable: () => run((url) => enableWebPush(url, settings), "enabled"),
    disable: () => run((url) => disableWebPush(url), "disabled"),
    sendTest: () => run((url) => testWebPush(url, settings), "sent"),
  };
}
