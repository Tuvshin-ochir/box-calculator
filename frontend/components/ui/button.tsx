import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: Parameters<typeof clsx>) {
  return twMerge(clsx(inputs));
}

export const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all duration-150 hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e66f51] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0 disabled:hover:shadow-none",
  {
    variants: {
      variant: {
        default: "bg-[#18211f] text-[#fffdf7] hover:bg-[#2d8068]",
        secondary: "bg-[#ebe7da] text-[#18211f] hover:bg-[#ded8cb]",
        outline:
          "border border-[#d9d5c9] bg-[#fffdf7] text-[#3d4541] hover:border-[#e66f51] hover:bg-[#fff0eb]",
        destructive: "bg-[#fff0eb] text-[#b04d3c] hover:bg-[#f6c0ad]",
        ghost: "text-[#b04d3c] hover:bg-[#fff0eb]",
      },
      size: {
        default: "min-h-10 px-3 py-2",
        sm: "min-h-9 px-2.5 text-xs",
        lg: "min-h-12 px-5 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, cn };
