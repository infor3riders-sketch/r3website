"use client";

import { Button } from "@/components/ui/button";

/** Portal-wide error boundary. The message is generic on purpose: details stay in server logs. */
export default function PortalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold uppercase">Something went wrong</h1>
      <p className="text-sm text-muted">The page could not be loaded. Please try again, and let an officer know if it keeps happening.</p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
