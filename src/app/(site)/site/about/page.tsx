import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Flag, HeartHandshake, Scale, Users, type LucideIcon } from "lucide-react";
import { ABOUT } from "@/lib/about-content";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = {
  title: "About Us",
  description: `${ABOUT.orgName}: ${ABOUT.motto}. Our vision, mission, goals and core values.`,
};

const VALUE_ICONS: Record<string, LucideIcon> = {
  Compassion: HeartHandshake,
  Integrity: Scale,
  Solidarity: Users,
};

function Heading({ icon: Icon, children, id }: { icon: LucideIcon; children: React.ReactNode; id: string }) {
  return (
    <div className="flex items-center gap-3">
      <Icon aria-hidden className="h-8 w-8 text-gold" strokeWidth={1.5} />
      <h2 id={id} className="text-3xl font-semibold uppercase tracking-wide text-white">
        {children}
      </h2>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      <section className="panel-textured border-b gold-hairline">
        <div className="mx-auto flex max-w-4xl flex-col items-center px-4 py-16 text-center sm:px-6">
          <Logo className="w-36" />
          <p className="mt-6 font-display text-sm uppercase tracking-[0.3em] text-gold">About Us</p>
          <h1 className="mt-2 text-4xl font-bold uppercase tracking-wide text-white sm:text-5xl">{ABOUT.orgName}</h1>
          <p className="mt-4 font-serif text-xl italic text-white/90 sm:text-2xl">{ABOUT.motto}</p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-14 px-4 py-14 sm:px-6">
        <section aria-labelledby="vision-h" className="space-y-4">
          <Heading icon={Eye} id="vision-h">
            Vision
          </Heading>
          <p className="border-l-4 border-gold pl-5 text-lg leading-relaxed text-white/90">{ABOUT.vision}</p>
        </section>

        <section aria-labelledby="mission-h" className="space-y-4">
          <Heading icon={Flag} id="mission-h">
            Mission
          </Heading>
          <p className="text-lg text-white/90">{ABOUT.missionLead}</p>
          <ol className="grid gap-4 md:grid-cols-3">
            {ABOUT.mission.map((m, i) => (
              <li key={m} className="rounded-lg border border-line bg-panel p-5 shadow-card">
                <span className="font-display text-3xl font-bold text-gold">{String(i + 1).padStart(2, "0")}</span>
                <p className="mt-2 text-white/90">{m}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="goals-h" className="space-y-4">
          <Heading icon={Flag} id="goals-h">
            Goals
          </Heading>
          <ul className="space-y-3">
            {ABOUT.goals.map((g) => (
              <li key={g} className="flex gap-3 rounded-lg border border-line bg-panel/70 p-4 text-white/90">
                <span aria-hidden className="mt-2 h-2 w-2 shrink-0 rounded-full bg-gold" />
                {g}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="values-h" className="space-y-4">
          <Heading icon={HeartHandshake} id="values-h">
            Core Values
          </Heading>
          <ul className="grid gap-5 md:grid-cols-3">
            {ABOUT.values.map((v) => {
              const Icon = VALUE_ICONS[v.name] ?? HeartHandshake;
              return (
                <li key={v.name} className="gold-hairline rounded-lg border border-b-4 border-b-gold bg-panel p-6 text-center shadow-card">
                  <Icon aria-hidden className="mx-auto h-12 w-12 text-gold" strokeWidth={1.5} />
                  <h3 className="mt-3 text-2xl font-semibold uppercase tracking-wide text-white">{v.name}</h3>
                  <p className="mt-2 text-sm text-muted">{v.text}</p>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="flex flex-col items-center gap-4 text-center">
          <p className="font-serif text-2xl italic text-white">Ride. Reach. Respond.</p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/membership" className={buttonVariants({ variant: "gold", size: "lg" })}>
              Join Us
            </Link>
            <Link href="/donations" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Donate Now
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
