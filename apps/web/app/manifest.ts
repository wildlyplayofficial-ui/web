import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "WildlyPlay",
    short_name: "WildlyPlay",
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
