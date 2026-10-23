import { Inter, Oswald } from "next/font/google";

export const display = Oswald({
  subsets: ["latin"],
  variable: "--font-oswald",
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const sans = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
