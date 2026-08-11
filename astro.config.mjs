import { defineConfig } from "astro/config";

const site = process.env.SITE_URL ?? "https://executivebranch.unc.edu";
const base = process.env.BASE_PATH;

export default defineConfig({
  site,
  ...(base ? { base } : {}),
  output: "static",
});
