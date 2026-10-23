/**
 * Organization constants. Contact details are placeholders until the club confirms them;
 * once Phase 3 lands, editable values move to the `site_settings` table.
 */
export const ORG = {
  // Legal name exactly as on the SEC Certificate of Incorporation (Company Reg. No. 2026100273107-46).
  name: "R3 Riders Organization Incorporated",
  shortName: "R3 Riders",
  tagline: "Ride. Connect. Support.",
  mission: "Empowering Communities Through Brotherhood & Service.",
  closing: "Together, We Ride for a Better Tomorrow",
  email: "hello@r3riders.org",
  phone: "+63 900 000 0000",
  address: "[CITY, PROVINCE], Philippines",
  socials: [
    { label: "Facebook", href: "https://facebook.com/" },
    { label: "Instagram", href: "https://instagram.com/" },
    { label: "YouTube", href: "https://youtube.com/" },
  ],
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About Us" },
  { href: "/membership", label: "Membership" },
  { href: "/services", label: "Services" },
  { href: "/shop", label: "Shop" },
  { href: "/donations", label: "Donations" },
  { href: "/contact", label: "Contact Us" },
] as const;
