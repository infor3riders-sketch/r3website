import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Button variants from the mockup: gold (primary), blue (secondary), outline (dark with light border).
 * `buttonVariants` is exported so links can share the look: <Link className={buttonVariants({ variant: "gold" })} />
 */
export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-display font-semibold uppercase tracking-wider",
    "shadow-btn transition-[background,transform,box-shadow] duration-150 active:translate-y-px",
    "disabled:pointer-events-none disabled:opacity-50",
  ],
  {
    variants: {
      variant: {
        gold: "border border-gold-hover/70 bg-gradient-to-b from-gold-hover to-gold text-black hover:from-[#ffc65c] hover:to-gold-hover",
        blue: "border border-royal-edge/60 bg-gradient-to-b from-royal-hover to-royal text-white hover:from-[#3a70e8] hover:to-royal-hover",
        outline: "border border-white/70 bg-black text-white hover:border-gold hover:text-gold",
        ghost: "border border-transparent bg-transparent text-white shadow-none hover:bg-white/10",
        danger: "border border-red-400/60 bg-gradient-to-b from-red-600 to-red-700 text-white hover:from-red-500 hover:to-red-600",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-6 text-sm",
        lg: "h-12 px-8 text-base",
      },
      block: { true: "w-full", false: "" },
    },
    defaultVariants: { variant: "gold", size: "md", block: false },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, type = "button", ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
  ),
);
Button.displayName = "Button";
