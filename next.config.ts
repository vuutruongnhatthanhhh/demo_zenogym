import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["handlebars", "sharp"],
  // Fonts are loaded via a raw fs path (Font.register) rather than an
  // import, so Vercel's build tracing can miss them unless told explicitly —
  // without this, PDFs would silently fall back to a font with no
  // Vietnamese diacritics in production. pdfkit (the engine @react-pdf/
  // renderer runs on) has the same problem with its own standard fonts,
  // which it `require`s dynamically by filename — untraceable statically,
  // and missing them throws MODULE_NOT_FOUND at runtime on Vercel.
  outputFileTracingIncludes: {
    "/api/**/*": ["./src/lib/pdf/fonts/**/*", "./node_modules/pdfkit/js/standard-fonts/**/*"],
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
