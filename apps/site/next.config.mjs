import { config } from "dotenv-mono";

config();

const makiAppUrl = (
  process.env.NEXT_PUBLIC_MAKI_APP_URL ??
  process.env.MAKI_CLIENT_URL ??
  "http://localhost:5173"
).replace(/\/+$/, "");

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_MAKI_APP_URL: makiAppUrl,
  },
  output: "export",
  images: {
    unoptimized: true,
  },
  reactStrictMode: true,
};

export default nextConfig;
