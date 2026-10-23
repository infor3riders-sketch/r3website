import * as React from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-md border border-line bg-black/40 px-3 py-2.5 text-base text-white placeholder:text-muted/70 " +
  "focus-visible:border-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 " +
  "aria-[invalid=true]:border-red-400 disabled:opacity-60";

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn(control, className)} {...props} />,
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, rows = 4, ...props }, ref) => (
    <textarea ref={ref} rows={rows} className={cn(control, className)} {...props} />
  ),
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn(control, className)} {...props} />,
);
Select.displayName = "Select";

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Label + control + error wrapper. Pass aria-describedby={`${htmlFor}-msg`} on the control when error/hint is shown. */
export function Field({ label, htmlFor, error, hint, required, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-white">
        {label}
        {required ? <span className="text-gold"> *</span> : null}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-msg`} role="alert" className="text-sm text-red-300">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-msg`} className="text-sm text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
