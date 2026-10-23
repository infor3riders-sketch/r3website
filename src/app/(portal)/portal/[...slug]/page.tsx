import { notFound } from "next/navigation";

/** Branded 404 inside the portal layout for unknown portal URLs (see the site counterpart). */
export default function CatchAll() {
  notFound();
}
