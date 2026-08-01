type WebExtensionStorageChanges = Record<string, { oldValue?: unknown; newValue?: unknown }>;

/**
 * Only the fields every supported engine accepts. Chrome-only extras are added
 * by the service worker behind a target check, because Firefox and Safari
 * reject notification options they do not implement.
 */
type WebExtensionNotificationOptions = {
  type: "basic";
  iconUrl: string;
  title: string;
  message: string;
  contextMessage?: string;
  eventTime?: number;
  priority?: number;
  silent?: boolean;
};

type WebExtensionApi = {
  alarms: {
    create(name: string, alarmInfo: { when?: number; periodInMinutes?: number }): Promise<void>;
    getAll(): Promise<Array<{ name: string; scheduledTime: number }>>;
    clear(name: string): Promise<boolean>;
    onAlarm: {
      addListener(callback: (alarm: { name: string; scheduledTime: number }) => void): void;
    };
  };
  /** Absent in Safari, which does not implement the notifications API. */
  notifications?: {
    create(notificationId: string, options: WebExtensionNotificationOptions): Promise<string>;
    onClicked: { addListener(callback: (notificationId: string) => void): void };
  };
  permissions: {
    contains(permissions: { permissions: string[] }): Promise<boolean>;
    request(permissions: { permissions: string[] }): Promise<boolean>;
  };
  runtime: {
    getURL(path: string): string;
    onInstalled: { addListener(callback: () => void): void };
    onStartup: { addListener(callback: () => void): void };
    onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: unknown,
          sendResponse: (response?: unknown) => void
        ) => boolean | void
      ): void;
    };
    sendMessage(message: unknown): Promise<unknown>;
  };
  storage: {
    local: {
      get(
        keys?: string | string[] | Record<string, unknown> | null
      ): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    };
    onChanged: {
      addListener(callback: (changes: WebExtensionStorageChanges, areaName: string) => void): void;
    };
  };
  tabs: {
    create(createProperties: { url: string }): Promise<unknown>;
  };
};

/**
 * Firefox and Safari expose the promise-based `browser` namespace. Chrome and
 * Edge expose only `chrome`, which is promise-based from Manifest V3 onwards.
 * Both are declared optional so that `browser-api.ts` stays the single place
 * that resolves them.
 */
declare const browser: WebExtensionApi | undefined;
declare const chrome: WebExtensionApi | undefined;

/** Replaced by esbuild with the browser the bundle was built for. */
declare const __EXTENSION_TARGET__: "chrome" | "firefox" | "safari";
