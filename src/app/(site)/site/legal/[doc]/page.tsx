import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHero, Section } from "@/components/site/page-hero";
import { Notice } from "@/components/ui/states";
import { LEGAL_DOCS, LEGAL_DRAFT_NOTICE, getLegalDoc } from "@/lib/legal-content";

type Props = { params: Promise<{ doc: string }> };

export function generateStaticParams() {
  return LEGAL_DOCS.map((d) => ({ doc: d.slug }));
}
export const dynamicParams = false;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = getLegalDoc((await params).doc);
  return doc ? { title: doc.title, description: doc.summary } : {};
}

export default async function LegalPage({ params }: Props) {
  const doc = getLegalDoc((await params).doc);
  if (!doc) notFound();
  return (
    <>
      <PageHero eyebrow="Legal" title={doc.title} subtitle={doc.summary} />
      <Section id="legal" className="max-w-3xl space-y-8">
        <Notice tone="warn">{LEGAL_DRAFT_NOTICE}</Notice>
        {doc.sections.map((s) => (
          <section key={s.heading} className="space-y-3">
            <h2 className="text-2xl font-semibold uppercase tracking-wide text-white">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="leading-relaxed text-white/85">
                {p}
              </p>
            ))}
          </section>
        ))}
      </Section>
    </>
  );
}
