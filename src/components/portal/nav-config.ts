import {
  Bell, Bike, Coins, FolderCog, CalendarCog, CalendarDays, Handshake, FileText, HandHeart, HeartHandshake, LayoutDashboard, ClipboardList,
  Receipt, Settings, ShoppingBag, UserCircle, Users, Wallet, type LucideIcon,
} from "lucide-react";

export type PortalRole = "member" | "officer" | "admin";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Minimum role needed to see the item. UI hiding is cosmetic; routes enforce access themselves. */
  min: PortalRole;
}

const RANK: Record<PortalRole, number> = { member: 0, officer: 1, admin: 2 };

export const PORTAL_NAV: PortalNavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, min: "member" },
  { href: "/announcements", label: "Announcements", icon: Bell, min: "member" },
  { href: "/events", label: "Events & Rides", icon: CalendarDays, min: "member" },
  { href: "/programs", label: "Volunteer", icon: HeartHandshake, min: "member" },
  { href: "/directory", label: "Directory", icon: Users, min: "member" },
  { href: "/dues", label: "Dues", icon: Wallet, min: "member" },
  { href: "/documents", label: "Documents", icon: FileText, min: "member" },
  { href: "/profile", label: "My Profile", icon: UserCircle, min: "member" },
  { href: "/profile/motorcycles", label: "My Motorcycles", icon: Bike, min: "member" },
  { href: "/applications", label: "Applications", icon: ClipboardList, min: "officer" },
  { href: "/manage/events", label: "Manage Events", icon: CalendarCog, min: "officer" },
  { href: "/manage/programs", label: "Manage Programs", icon: Handshake, min: "officer" },
  { href: "/manage/shop", label: "Shop", icon: ShoppingBag, min: "officer" },
  { href: "/manage/donations", label: "Donations", icon: HandHeart, min: "officer" },
  { href: "/manage/payments", label: "Payments to verify", icon: Receipt, min: "officer" },
  { href: "/manage/dues", label: "Manage Dues", icon: Coins, min: "officer" },
  { href: "/manage/documents", label: "Manage Documents", icon: FolderCog, min: "officer" },
  { href: "/admin", label: "Admin", icon: Settings, min: "admin" },
];

export function portalNavFor(role: PortalRole): PortalNavItem[] {
  return PORTAL_NAV.filter((i) => RANK[role] >= RANK[i.min]);
}
