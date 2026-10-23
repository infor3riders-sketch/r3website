/**
 * About Us copy supplied by the organization (verbatim). Kept as data so it can later move
 * to admin-editable content in the database without touching the page layout.
 */
export const ABOUT = {
  orgName: "R3 Riders Organization, Inc.",
  motto: "Ride with a Cause, Serving with Purpose",
  vision:
    "To be a recognized riders’ organization in the region that champions sustainable charity programs, strengthens community partnerships, and inspires purposeful service through responsible riding.",
  missionLead: "R3 Riders Organization, Inc. exists to Ride, Reach, and Respond by:",
  mission: [
    "Promoting responsible riding as a platform for advocacy and service.",
    "Extending sustainable assistance to communities in need.",
    "Responding with compassion and integrity to social, educational, and humanitarian causes.",
  ],
  goals: [
    "To institutionalize sustainable charity programs that uplift marginalized communities.",
    "To foster camaraderie, discipline, and social responsibility among riders.",
    "To establish partnerships with public and private institutions for community development.",
  ],
  values: [
    { name: "Compassion", text: "We serve with empathy, kindness, and genuine concern for others." },
    { name: "Integrity", text: "We uphold honesty, accountability, and ethical practices in all endeavors." },
    { name: "Solidarity", text: "We unite riders and communities in pursuit of shared goals and collective impact." },
  ],
} as const;
