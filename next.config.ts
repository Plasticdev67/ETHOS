import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Type checking runs separately via `tsc --noEmit` before `next build`.
    // next build's built-in type checker layers Next.js route handler types
    // on top of Prisma's deeply-generic model types, causing false-positive
    // "excessive stack depth" errors on large schemas. Standalone tsc does
    // not have this issue — it resolves the same types successfully.
    // See: https://github.com/prisma/prisma/issues/14832
    ignoreBuildErrors: true,
  },
  compress: true,
  serverExternalPackages: ["pdfkit"],
  experimental: {
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },
};

export default nextConfig;
