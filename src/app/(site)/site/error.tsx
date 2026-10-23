"use client";

import { Button } from "@/components/ui/button";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-xl flex-col items-center justify-center px-4 py-20 text-center">
      <h1 className="text-3xl font-semibold uppercase">Something went wrong</h1>
      <p className="mt-3 text-muted">An unexpected error occurred. Please try again.</p>
      <Button className="mt-6" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
