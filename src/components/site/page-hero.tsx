import { cn } from "@/lib/utils";

/** Compact header used by inner public pages (the Home hero is separate). */
export function PageHero({
  eyebrow,
  title,
  subtitle,
  className,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <section className={cn("panel-textured border-b gold-hairline", className)}>
      <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6">
        {eyebrow ? <p className="font-display text-sm uppercase tracking-[0.3em] text-gold">{eyebrow}</p> : null}
        <h1 className="mt-2 text-4xl font-bold uppercase tracking-wide text-white sm:text-5xl">{title}</h1>
        {subtitle ? <p className="mx-auto mt-4 max-w-2xl text-lg text-muted">{subtitle}</p> : null}
      </div>
    </section>
  );
}

export function Section({
  id,
  title,
  children,
  className,
}: {
  id?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section aria-labelledby={id ? `${id}-h` : undefined} id={id} className={cn("mx-auto max-w-5xl px-4 py-10 sm:px-6", className)}>
      {title ? (
        <h2 id={id ? `${id}-h` : undefined} className="mb-5 text-3xl font-semibold uppercase tracking-wide text-white">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}
