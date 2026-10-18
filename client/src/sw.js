/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { createHandlerBoundToURL } from "workbox-precaching";

// No runtime caching of API, Firebase, tokens, or personal images.
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);
registerRoute(
  new NavigationRoute(createHandlerBoundToURL("/index.html"), {
    denylist: [/^\/api(?:\/|$)/, /^\/__/],
  }),
);
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});
self.addEventListener("push", (event) => {
  let data = {
    title: "ExpensePlus",
    message: "You have a new budget notification.",
    url: "/budgets",
  };
  try {
    data = { ...data, ...event.data.json() };
  } catch {}
  const url =
    typeof data.url === "string" &&
    data.url.startsWith("/") &&
    !data.url.startsWith("//")
      ? data.url
      : "/budgets";
  event.waitUntil(
    self.registration.showNotification(data.title || "ExpensePlus", {
      body: data.message || "Budget update available.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: "expenseplus-budget",
      data: { url },
    }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = new URL(
    event.notification.data?.url || "/budgets",
    self.location.origin,
  ).href;
  event.waitUntil(
    (async () => {
      const clientsList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const matching = clientsList.find(
        (c) => new URL(c.url).origin === self.location.origin,
      );
      if (matching) {
        await matching.focus();
        await matching.navigate(destination);
      } else await self.clients.openWindow(destination);
    })(),
  );
});
