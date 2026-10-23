import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function PortalNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-bold text-gold">404</p>
      <h1 className="mt-2 text-2xl font-semibold uppercase">Page not found</h1>
      <Link href="/" className={buttonVariants({ className: "mt-6" })}>
        Back to Dashboard
      </Link>
    </div>
  );
}
