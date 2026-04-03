import { heroui } from "@heroui/theme";
import { siteConfig } from "./config/site";
export default heroui({
  themes: {
    light: {
      colors: {
        background: "#ffffff", // or DEFAULT
        foreground: "#11181C", // or 50 to 900 DEFAULT
        content1: "#f6f6f6",
        content2: "#f7f7f7",
        content3: "#8b8b8b",
        primary: {
          //... 50 to 900
          foreground: "#FFFFFF",
          DEFAULT: siteConfig.colors.primary,
        },
        // ... rest of the colors
      },
    },
    dark: {
      colors: {
        background: "#000000", // or DEFAULT
        foreground: "#ECEDEE", // or 50 to 900 DEFAULT
        content1: "#1e1e1e",
        content2: "#0A0A0C",
        content3: "#8b8b8b",
        primary: {
          //... 50 to 900
          foreground: "#FFFFFF",
          DEFAULT: "#5398FF",
        },
      },
      // ... rest of the colors
    },
    mytheme: {
      // custom theme
      extend: "dark",
      colors: {
        primary: {
          DEFAULT: "#BEF264",
          foreground: "#000000",
        },
        focus: "#BEF264",
      },
    },
  },
});
