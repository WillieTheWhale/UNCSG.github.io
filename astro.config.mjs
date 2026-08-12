import { defineConfig } from "astro/config";

const site = process.env.SITE_URL ?? "https://executivebranch.unc.edu";
const base = process.env.BASE_PATH;
const apiTarget = process.env.DEV_API_URL ?? "http://localhost:8787";

const updatesDevRewrites = {
  name: "updates-dev-rewrites",
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      if (!request.url) return next();
      const url = new URL(request.url, "http://localhost");
      const publicMatch = url.pathname.match(/^\/updates\/([^/]+)\/?$/);
      const previewMatch = url.pathname.match(/^\/preview-updates\/([^/]+)\/?$/);
      if (publicMatch && publicMatch[1] !== "article") {
        request.url = `/updates/article/?slug=${encodeURIComponent(publicMatch[1])}`;
      } else if (previewMatch && previewMatch[1] !== "article") {
        request.url = `/preview-updates/article/?slug=${encodeURIComponent(previewMatch[1])}`;
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
    plugins: [updatesDevRewrites],
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
