import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/queue", "/settings/", "/operator/", "/onboarding/", "/api/"],
      },
    ],
    sitemap: "https://qyou.com/sitemap.xml",
  };
}
