type ChromeStorageChanges = Record<string, { oldValue?: unknown; newValue?: unknown }>;

declare const chrome: {
  alarms: {
    create(name: string, alarmInfo: { when?: number; periodInMinutes?: number }): Promise<void>;
    getAll(): Promise<Array<{ name: string; scheduledTime: number }>>;
    clear(name: string): Promise<boolean>;
    onAlarm: {
      addListener(callback: (alarm: { name: string; scheduledTime: number }) => void): void;
    };
  };
  notifications: {
    create(
      notificationId: string,
      options: {
        type: "basic";
        iconUrl: string;
        title: string;
        message: string;
        contextMessage?: string;
        eventTime?: number;
        priority?: number;
        silent?: boolean;
      }
    ): Promise<string>;
    onClicked: { addListener(callback: (notificationId: string) => void): void };
  };
  permissions: {
    contains(permissions: { permissions: string[] }): Promise<boolean>;
    request(permissions: { permissions: string[] }): Promise<boolean>;
  };
  runtime: {
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
      addListener(callback: (changes: ChromeStorageChanges, areaName: string) => void): void;
    };
  };
  tabs: {
    create(createProperties: { url: string }): Promise<unknown>;
  };
};
