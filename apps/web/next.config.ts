import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow Supabase storage and common avatar providers
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },          // Supabase Storage buckets
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google OAuth avatars
      { protocol: "https", hostname: "avatars.githubusercontent.com" }, // GitHub avatars
    ],
  },

  // Security and performance headers
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },                        // Prevent clickjacking
          { key: "X-Content-Type-Options", value: "nosniff" },               // Prevent MIME-sniffing
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self)" },
          { key: "X-DNS-Prefetch-Control", value: "on" },                    // Speed up external lookups
        ],
      },
    ];
  },
};

export default nextConfig;
