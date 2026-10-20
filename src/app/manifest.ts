import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pipilika Bakery",
    short_name: "Pipilika",
    start_url: "/",
    display: "standalone",
    background_color: "#fdf7f1",
    theme_color: "#b3161f",
    icons: [{ src: "/brand/logo.png", sizes: "256x256", type: "image/png" }],
  };
}
