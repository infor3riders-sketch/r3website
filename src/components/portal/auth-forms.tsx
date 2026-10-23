"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Notice } from "@/components/ui/states";
import {
  requestPasswordReset,
  sendMagicLink,
  setPassword,
  signInWithPassword,
  type AuthState,
} from "@/server/auth-actions";

const initial: AuthState = {};

function Feedback({ state }: { state: AuthState }) {
  if (state.error) return <Notice tone="error">{state.error}</Notice>;
  if (state.message) return <Notice tone="success">{state.message}</Notice>;
  return null;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, initial);
  const [mlState, mlAction, mlPending] = useActionState(sendMagicLink, initial);
  const state = mode === "password" ? pwState : mlState;

  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold uppercase">Sign in</h1>
        <p className="text-sm text-muted">Members, officers and admins only. Accounts are created by invitation.</p>
      </div>

      {notice ? <Notice tone="warn">{notice}</Notice> : null}

      <div role="tablist" aria-label="Sign-in method" className="grid grid-cols-2 rounded-md border border-line p-1 text-sm">
        {(["password", "magic"] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-10 rounded font-medium ${mode === m ? "bg-gold text-black" : "text-white/80 hover:text-white"}`}
          >
            {m === "password" ? "Password" : "Email link"}
          </button>
        ))}
      </div>

      <form action={mode === "password" ? pwAction : mlAction} className="space-y-4" noValidate>
        <input type="hidden" name="next" value={next ?? "/"} />
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} required>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            aria-invalid={Boolean(state.fieldErrors?.email)}
            aria-describedby={state.fieldErrors?.email ? "email-msg" : undefined}
          />
        </Field>
        {mode === "password" ? (
          <Field label="Password" htmlFor="password" error={state.fieldErrors?.password} required>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={Boolean(state.fieldErrors?.password)}
              aria-describedby={state.fieldErrors?.password ? "password-msg" : undefined}
            />
          </Field>
        ) : null}
        <Feedback state={state} />
        <Button type="submit" block size="lg" disabled={pwPending || mlPending}>
          {mode === "password" ? (pwPending ? "Signing in…" : "Sign in") : mlPending ? "Sending…" : "Email me a link"}
        </Button>
      </form>

      <p className="text-center text-sm">
        <Link href="/forgot-password" className="text-gold underline-offset-4 hover:underline">
          Forgot your password?
        </Link>
      </p>
    </div>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold uppercase">Reset password</h1>
        <p className="text-sm text-muted">Enter your email and we will send a reset link.</p>
      </div>
      <form action={action} className="space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} required>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required aria-invalid={Boolean(state.fieldErrors?.email)} />
        </Field>
        <Feedback state={state} />
        <Button type="submit" block size="lg" disabled={pending}>
          {pending ? "Sending…" : "Send reset link"}
        </Button>
      </form>
      <p className="text-center text-sm">
        <Link href="/login" className="text-gold underline-offset-4 hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}

export function SetPasswordForm({ title, intro, cta }: { title: string; intro: string; cta: string }) {
  const [state, action, pending] = useActionState(setPassword, initial);
  return (
    <div className="space-y-5">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold uppercase">{title}</h1>
        <p className="text-sm text-muted">{intro}</p>
      </div>
      <form action={action} className="space-y-4" noValidate>
        <Field label="New password" htmlFor="password" error={state.fieldErrors?.password} hint="At least 10 characters, with letters and a number." required>
          <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(state.fieldErrors?.password)} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm" error={state.fieldErrors?.confirm} required>
          <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required aria-invalid={Boolean(state.fieldErrors?.confirm)} />
        </Field>
        <Feedback state={state} />
        <Button type="submit" block size="lg" disabled={pending}>
          {pending ? "Saving…" : cta}
        </Button>
      </form>
    </div>
  );
}
