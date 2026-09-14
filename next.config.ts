import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["handlebars", "sharp"],
  // Fonts are loaded via a raw fs path (Font.register) rather than an
  // import, so Vercel's build tracing can miss them unless told explicitly —
  // without this, PDFs would silently fall back to a font with no
  // Vietnamese diacritics in production.
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/lib/pdf/fonts/**/*"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
