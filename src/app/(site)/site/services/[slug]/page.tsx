import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarDays, MapPin } from "lucide-react";
import { PageHero, Section } from "@/components/site/page-hero";
import { VolunteerForm } from "@/components/site/public-forms";
import { formatDateTime } from "@/lib/format";
import { publicMediaUrl } from "@/lib/supabase/public";
import { getEventsForProgram, getProgram } from "@/server/queries/public";

export const revalidate = 300;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const program = await getProgram((await params).slug);
  if (!program) return {};
  return { title: program.title, description: program.summary ?? undefined };
}

export default async function ProgramPage({ params }: Props) {
  const { slug } = await params;
  const program = await getProgram(slug);
  if (!program) notFound();
  const events = await getEventsForProgram(program.id);
  const photos = program.photo_paths.map(publicMediaUrl).filter((u): u is string => Boolean(u));

  return (
    <>
      <PageHero eyebrow="Program" title={program.title} subtitle={program.summary ?? undefined} />

      <Section id="about-program" title="About this program">
        <div className="space-y-4 whitespace-pre-line text-lg leading-relaxed text-white/90">{program.description}</div>
        {photos.length > 0 ? (
          <ul className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((src) => (
              <li key={src} className="relative aspect-[4/3] overflow-hidden rounded-lg border border-line">
                <Image src={src} alt="" fill sizes="(min-width: 768px) 33vw, 50vw" className="object-cover" />
              </li>
            ))}
          </ul>
        ) : null}
      </Section>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 md:grid-cols-2">
        {program.schedule ? (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h3 className="text-xl font-semibold uppercase text-gold">Schedule</h3>
            <p className="mt-2 text-white/90">{program.schedule}</p>
          </div>
        ) : null}
        {program.how_to_join ? (
          <div className="rounded-lg border border-line bg-panel p-5">
            <h3 className="text-xl font-semibold uppercase text-gold">How to join</h3>
            <p className="mt-2 text-white/90">{program.how_to_join}</p>
          </div>
        ) : null}
      </div>

      {events.length > 0 ? (
        <Section id="program-events" title="Upcoming events">
          <ul className="space-y-3">
            {events.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 rounded-lg border border-line bg-panel p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/services/events/${e.slug}`} className="text-lg font-semibold hover:text-gold">
                    {e.title}
                  </Link>
                  <p className="flex items-center gap-2 text-sm text-muted">
                    <CalendarDays aria-hidden className="h-4 w-4" /> {formatDateTime(e.starts_at)}
                    {e.meeting_point ? (
                      <>
                        <MapPin aria-hidden className="ml-2 h-4 w-4" /> {e.meeting_point}
                      </>
                    ) : null}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {program.volunteer_enabled ? (
        <Section id="volunteer" title="Volunteer sign-up">
          <div className="gold-hairline max-w-2xl rounded-lg border bg-panel p-6 shadow-card">
            <p className="mb-4 text-muted">Want to help with {program.title}? Leave your details and an officer will reach out.</p>
            <VolunteerForm programId={program.id} programTitle={program.title} />
          </div>
        </Section>
      ) : null}
    </>
  );
}
