import type { Metadata, Viewport } from "next";
import { display, sans } from "@/lib/fonts";
import { portalUrl } from "@/lib/env";
import "./portal.css";

export const metadata: Metadata = {
  metadataBase: new URL(portalUrl("/")),
  title: { default: "Member Portal | R3 Riders", template: "%s | R3 Riders Portal" },
  // Private product: keep it out of search engines.
  robots: { index: false, follow: false },
  icons: { icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/brand/icon.png", type: "image/png", sizes: "512x512" }], apple: "/brand/apple-icon.png" },
};

export const viewport: Viewport = { themeColor: "#121214" };

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="theme-portal min-h-dvh">{children}</body>
    </html>
  );
}
