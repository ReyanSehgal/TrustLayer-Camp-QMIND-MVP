import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: `npm run build` writes ui/out, servable without Node.
  output: "export",
};

export default nextConfig;
