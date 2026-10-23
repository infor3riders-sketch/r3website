/**
 * Fallback content for admin-editable `site_settings` keys (public rows). Everything here is a
 * clearly-marked placeholder; the organization replaces it from the portal (Admin > Site content).
 */
export const PLACEHOLDER_NOTE = "Placeholder content: to be replaced by the organization.";

export const DEFAULT_SETTINGS = {
  about_story:
    "R3 Riders started as a group of friends who share a love of the open road and a belief that riding can do real good. Replace this placeholder with the club's founding story.",
  code_of_conduct: [
    "Ride safe: wear proper protective gear and obey traffic laws.",
    "Respect every rider, partner and community we meet.",
    "No riding under the influence of alcohol or drugs.",
    "Represent the club with honesty and integrity at all times.",
    "Follow the road captain and ride-leader instructions during group rides.",
  ] as string[],
  officers: [] as { name: string; role: string }[],
  // From the SEC Certificate of Incorporation issued 21 October 2026. Registered address is not on the
  // certificate (the printed address is the SEC office), so it stays a placeholder for the club to supply.
  registration: {
    legal_name: "R3 Riders Organization Incorporated",
    sec_registration_no: "2026100273107-46",
    date_registered: "21 October 2026",
    corporation_type: "Non-stock corporation",
    registered_with: "Securities and Exchange Commission, Iloilo City",
    registered_address: "[registered address]",
  },
  partners: [] as { name: string }[],
  chapters: [] as { name: string; area: string }[],
  // Declared member counts per area (admin-editable). Example figures from the club; confirm before launch.
  membership_stats: [
    { area: "Iloilo City", members: 20 },
    { area: "Cabatuan", members: 30 },
    { area: "Sta. Barbara", members: 15 },
  ] as { area: string; members: number }[],
  contact: {
    email: "hello@r3riders.org",
    phone: "+63 900 000 0000",
    address: "[CITY, PROVINCE], Philippines",
    map_embed_url: "",
    socials: [
      { label: "Facebook", href: "https://facebook.com/" },
      { label: "Instagram", href: "https://instagram.com/" },
    ] as { label: string; href: string }[],
  },
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
