import type { MetadataRoute } from "next";

const BASE_URL = "https://qyou.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const publicRoutes = ["", "/login", "/register", "/forgot-password", "/verify-email"];
  const now = new Date();
  return publicRoutes.map((route) => ({
    url: `${BASE_URL}${route}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: route === "" ? 1 : 0.7,
  }));
}
