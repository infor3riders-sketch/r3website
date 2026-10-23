import { Logo } from "@/components/ui/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo className="w-28" priority />
        <p className="font-display text-sm uppercase tracking-[0.3em] text-gold">Member Portal</p>
      </div>
      <div className="rounded-lg border border-line bg-panel p-6 shadow-card">{children}</div>
    </main>
  );
}
