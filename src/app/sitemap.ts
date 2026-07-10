import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:4000";

  return [
    { url: siteUrl, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${siteUrl}/privacy`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.3 },
  ];
}
