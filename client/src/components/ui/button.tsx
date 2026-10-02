import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#07090e] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98] cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 shadow-md shadow-cyan-950/40 hover:shadow-cyan-500/20",
        glow:
          "bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500 text-slate-950 font-semibold shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 hover:brightness-110",
        secondary:
          "bg-slate-800/80 text-slate-100 hover:bg-slate-700/80 border border-slate-700/60",
        destructive:
          "bg-rose-500/15 text-rose-300 border border-rose-500/30 hover:bg-rose-500/25 hover:border-rose-500/50",
        outline:
          "border border-slate-700/80 bg-slate-900/40 hover:bg-slate-800/60 hover:border-slate-600 text-slate-200",
        ghost:
          "hover:bg-slate-800/60 text-slate-300 hover:text-slate-100",
        cyan:
          "bg-cyan-500 text-slate-950 font-semibold hover:bg-cyan-400 shadow-md shadow-cyan-950/40 hover:shadow-cyan-500/20",
        blue:
          "bg-blue-600 text-slate-100 font-semibold hover:bg-blue-500 shadow-md shadow-blue-950/40",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-9 w-9",
        iconSm: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
