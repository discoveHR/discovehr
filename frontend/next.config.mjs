/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // /frappe/* is proxied by app/frappe/[...path]/route.ts (dynamic WSL IP on each request).

  compress: true,

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 3600,
  },

  // Suppress noisy hydration warnings in dev caused by browser extensions.
  logging: {
    fetches: { fullUrl: false },
  },

  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/favicon.ico",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400" }],
      },
    ];
  },
};

export default nextConfig;
