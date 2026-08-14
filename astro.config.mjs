import { defineConfig } from "astro/config";

const site = process.env.SITE_URL ?? "https://executivebranch.unc.edu";
const base = process.env.BASE_PATH;
const apiTarget = process.env.DEV_API_URL ?? "http://localhost:8787";

const contentDevRewrites = {
  name: "content-dev-rewrites",
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      if (!request.url) return next();
      const url = new URL(request.url, "http://localhost");
      const publicMatch = url.pathname.match(/^\/updates\/([^/]+)\/?$/);
      const previewMatch = url.pathname.match(/^\/preview-updates\/([^/]+)\/?$/);
      const eventMatch = url.pathname.match(/^\/events\/([^/]+)\/?$/);
      const previewEventMatch = url.pathname.match(/^\/preview-events\/([^/]+)\/?$/);
      if (publicMatch && publicMatch[1] !== "article") {
        request.url = `/updates/article/?slug=${encodeURIComponent(publicMatch[1])}`;
      } else if (previewMatch && previewMatch[1] !== "article") {
        request.url = `/preview-updates/article/?slug=${encodeURIComponent(previewMatch[1])}`;
      } else if (eventMatch && eventMatch[1] !== "article") {
        request.url = `/events/article/?slug=${encodeURIComponent(eventMatch[1])}`;
      } else if (previewEventMatch && previewEventMatch[1] !== "article") {
        request.url = `/preview-events/article/?slug=${encodeURIComponent(previewEventMatch[1])}`;
      }
      next();
    });
  },
};

export default defineConfig({
  site,
  ...(base ? { base } : {}),
  output: "static",
  vite: {
    build: {
      assetsInlineLimit: 0,
    },
    plugins: [contentDevRewrites],
    server: {
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: false,
          headers: {
            "x-forwarded-for": "127.0.0.1",
          },
        },
      },
    },
  },
});
