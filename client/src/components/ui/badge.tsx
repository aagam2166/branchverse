import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";
import type { DeploymentStatus } from "../../types/index.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-slate-800 text-slate-200 border border-slate-700",
        LIVE: "bg-cyan-950/70 text-cyan-300 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]",
        BUILDING: "bg-amber-950/70 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.2)] animate-pulse",
        DEPLOYING: "bg-blue-950/70 text-blue-300 border border-blue-500/40 shadow-[0_0_12px_rgba(59,130,246,0.25)] animate-pulse",
        BUILD_FAILED: "bg-rose-950/70 text-rose-300 border border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]",
        CLOSED: "bg-slate-800/80 text-slate-400 border border-slate-700/60",
        MERGED: "bg-purple-950/70 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]",
        branch: "bg-slate-900/90 text-cyan-300 border border-cyan-500/20 font-mono text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function StatusBadge({ status }: { status: DeploymentStatus }) {
  const getStatusDot = (status: DeploymentStatus) => {
    switch (status) {
      case "LIVE":
        return <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 inline-block" />;
      case "BUILDING":
      case "DEPLOYING":
        return <span className="h-1.5 w-1.5 rounded-full bg-amber-400 inline-block" />;
      case "BUILD_FAILED":
        return <span className="h-1.5 w-1.5 rounded-full bg-rose-400 inline-block" />;
      case "MERGED":
        return <span className="h-1.5 w-1.5 rounded-full bg-purple-400 inline-block" />;
      case "CLOSED":
      default:
        return <span className="h-1.5 w-1.5 rounded-full bg-slate-500 inline-block" />;
    }
  };

  return (
    <Badge variant={status}>
      <span className="relative flex h-1.5 w-1.5">
        {getStatusDot(status)}
      </span>
      {status}
    </Badge>
  );
}
