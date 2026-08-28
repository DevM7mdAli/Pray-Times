/* global URL, Request */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    // Old GitHub Pages path still works if this worker is reused elsewhere.
    if (url.pathname === "/Pray-Times" || url.pathname.startsWith("/Pray-Times/")) {
      url.pathname = url.pathname.slice("/Pray-Times".length) || "/";
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};
