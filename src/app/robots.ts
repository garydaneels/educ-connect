import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/cgu", "/politique-confidentialite", "/institutions/"],
        disallow: ["/admin/", "/api/", "/student/", "/institution/"],
      },
    ],
    sitemap: "https://educonnect.be/sitemap.xml",
  };
}
