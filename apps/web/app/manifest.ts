import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: "Handpicked plays for the global crowd",
    start_url: "/",
    display: "standalone",
    background_color: "#0d1117",
    theme_color: "#00e676",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
