/* global URL, Response, Request */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/" || url.pathname === "/Pray-Times") {
      url.pathname = "/Pray-Times/";
      return Response.redirect(url, 302);
    }
    if (url.pathname.startsWith("/Pray-Times/")) {
      url.pathname = url.pathname.slice("/Pray-Times".length) || "/";
      return env.ASSETS.fetch(new Request(url, request));
    }
    return env.ASSETS.fetch(request);
  },
};
