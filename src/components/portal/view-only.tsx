import { Notice } from "@/components/ui/states";
import { VIEW_ONLY_MESSAGE } from "@/lib/member-permissions";

/**
 * Shows existing values but blocks changes: every control is disabled and buttons are hidden.
 * Cosmetic only; the server actions and RLS (public.member_may) enforce the permission.
 */
export function ViewOnly({ locked, children }: { locked: boolean; children: React.ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <fieldset disabled aria-label="View only" className="min-w-0 [&_button]:hidden [&_input[type=file]]:hidden">
      {children}
    </fieldset>
  );
}

export function ViewOnlyNotice({ children }: { children?: React.ReactNode }) {
  return <Notice tone="info">{children ?? VIEW_ONLY_MESSAGE}</Notice>;
}
