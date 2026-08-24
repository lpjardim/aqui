import type { MetadataRoute } from "next";

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  const paths = [
    "/",
    "/blog/como-conseguir-mais-clientes-na-sua-zona",
    "/termos",
    "/privacidade",
    "/cookies",
  ];

  return paths.map((path) => ({
    url: `${appUrl}${path}`,
    lastModified,
    changeFrequency: path === "/" ? "weekly" : path.startsWith("/blog") ? "monthly" : "yearly",
    priority: path === "/" ? 1 : path.startsWith("/blog") ? 0.6 : 0.3,
  }));
}
