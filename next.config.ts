import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Explícito (é o default) para garantir que /api/stripe/webhook nunca leva
  // 308 por causa de barra final — o Stripe não segue redirects em webhooks.
  trailingSlash: false,
  images: {
    qualities: [75, 95],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
