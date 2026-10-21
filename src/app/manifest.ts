import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pipilika Bakery",
    short_name: "Pipilika",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf7f1",
    theme_color: "#b3161f",
    id: "/",
    scope: "/",
    description: "Order cakes, pastries and custom celebration cakes from Pipilika Bakery.",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
