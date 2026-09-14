import { config } from "dotenv-mono";

config();

const makiAppUrl = (
  process.env.NEXT_PUBLIC_MAKI_APP_URL ??
  process.env.MAKI_CLIENT_URL ??
  "http://localhost:5173"
).replace(/\/+$/, "");

// Origin that serves the API, and therefore the origin the session cookie is
// scoped to. The bundled image proxies `/api` on the app origin, so the app URL
// is the correct default there; local `next dev` talks to the API's own port
// (mirroring apps/web/.env.development), and a separately hosted site must set
// NEXT_PUBLIC_MAKI_API_URL to the API origin.
const makiApiUrl = (
  process.env.NEXT_PUBLIC_MAKI_API_URL ??
  process.env.MAKI_API_URL ??
  (process.env.NODE_ENV === "production" ? makiAppUrl : "http://localhost:1337")
).replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_MAKI_API_URL: makiApiUrl,
    NEXT_PUBLIC_MAKI_APP_URL: makiAppUrl,
  },
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
