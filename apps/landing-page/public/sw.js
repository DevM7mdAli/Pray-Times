self.addEventListener("push", (event) => {
  let payload = {
    title: "Prayer time",
    body: "It is time for prayer.",
    tag: "prayer-alert",
    url: "/Pray-Times/today/",
    locale: "en",
  };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    // The safe fallback still shows a useful notification.
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/Pray-Times/icon.png",
      badge: "/Pray-Times/icon.png",
      tag: payload.tag,
      renotify: true,
      data: { url: payload.url },
      dir: payload.locale === "ar" ? "rtl" : "ltr",
      lang: payload.locale,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url ?? "/Pray-Times/today/", self.location.origin)
    .href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (clients) => {
      const existing = clients.find((client) =>
        client.url.startsWith(`${self.location.origin}/Pray-Times/`)
      );
      if (existing) {
        await existing.navigate(target);
        return existing.focus();
      }
      return self.clients.openWindow(target);
    })
  );
});
