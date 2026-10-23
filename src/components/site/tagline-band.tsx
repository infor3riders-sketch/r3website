import { Star } from "lucide-react";
import { ORG } from "@/lib/org";

const PILLARS = ["Community Events", "Volunteer Programs", "Cooperative Initiatives"];

/** Footer band from the mockup: italic closing line over a gold-star bullet row. */
export function TaglineBand() {
  return (
    <section aria-label="Our promise" className="bg-black py-10 text-center">
      <p className="px-4 font-serif text-2xl italic text-white sm:text-3xl">{ORG.closing}</p>
      <ul className="mt-5 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 px-4 text-sm font-semibold uppercase tracking-wider text-white sm:text-base">
        {PILLARS.map((p, i) => (
          <li key={p} className="flex items-center gap-3">
            {i > 0 ? <Star aria-hidden className="h-3.5 w-3.5 fill-gold text-gold" /> : null}
            {p}
          </li>
        ))}
      </ul>
    </section>
  );
}
