import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <p className="font-display text-7xl font-bold text-gold">404</p>
      <h1 className="mt-2 text-3xl font-semibold uppercase">Page not found</h1>
      <p className="mt-3 text-muted">The road you were looking for does not exist. Let&apos;s get you back on route.</p>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>
        Back to Home
      </Link>
    </div>
  );
}
