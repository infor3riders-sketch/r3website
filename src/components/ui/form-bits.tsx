"use client";

import Link from "next/link";
import Script from "next/script";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Notice } from "@/components/ui/states";

export interface FormStateLike {
  ok?: boolean;
  error?: string;
  message?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
}

/** Hidden trap field: real users never see or fill it; bots usually do. Name must match HONEYPOT_FIELD. */
export function Honeypot() {
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
      <label>
        Leave this field empty
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** Cloudflare Turnstile widget; renders nothing unless NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. */
export function TurnstileWidget() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  if (!siteKey) return null;
  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
      <div className="cf-turnstile" data-sitekey={siteKey} data-theme="dark" />
    </>
  );
}

/** Data Privacy Act consent checkbox with a link to the privacy policy. */
export function ConsentField({ error, id = "consent" }: { error?: string; id?: string }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="flex items-start gap-3 text-sm text-white/90">
        <input
          id={id}
          name="consent"
          type="checkbox"
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-msg` : undefined}
          className="mt-1 h-5 w-5 shrink-0 accent-[#f2a81d]"
        />
        <span>
          I agree to the collection and use of my personal information as described in the{" "}
          <Link href="/legal/privacy" target="_blank" className="text-gold underline underline-offset-2">
            Privacy Policy
          </Link>
          , in line with the Data Privacy Act of 2012.
        </span>
      </label>
      {error ? (
        <p id={`${id}-msg`} role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function SubmitButton({ children, pendingText = "Sending…", ...props }: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}

export function FormFeedback({ state }: { state: FormStateLike }) {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.ok && state.message) return <Notice tone="success">{state.message}</Notice>;
  return null;
}
