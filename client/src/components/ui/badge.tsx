import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils.js";
import type { DeploymentStatus } from "../../types/index.js";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default: "bg-[#fff] text-[#000] hover:bg-[#e5e5e5] border-transparent",
        LIVE: "bg-[#002b18] text-[#00e676] border-transparent shadow-[0_0_8px_rgba(0,230,118,0.2)]",
        BUILDING: "bg-[#451a03] text-[#f59e0b] border-transparent shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse",
        DEPLOYING: "bg-[#451a03] text-[#f59e0b] border-transparent shadow-[0_0_8px_rgba(245,158,11,0.2)] animate-pulse",
        BUILD_FAILED: "bg-[#4c0519] text-[#ff5555] border-transparent shadow-[0_0_8px_rgba(255,85,85,0.2)]",
        CLOSED: "bg-[#111] text-[#888] border border-[#333]",
        MERGED: "bg-[#3b0764] text-[#a855f7] border-transparent shadow-[0_0_8px_rgba(168,85,247,0.2)]",
        EXPIRED: "bg-[#111] text-[#888] border border-[#333]",
        SUPERSEDED: "bg-[#111] text-[#888] border border-[#333]",
        branch: "bg-[#111] text-[#fff] border border-[#333] hover:bg-[#222] font-mono text-[11px]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
  VariantProps<typeof badgeVariants> { }

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export function StatusBadge({ status }: { status: DeploymentStatus }) {
  const getStatusDot = (status: DeploymentStatus) => {
    switch (status) {
      case "LIVE":
        return <span className="h-1.5 w-1.5 rounded-full bg-[#00e676] inline-block shadow-[0_0_6px_rgba(0,230,118,0.6)]" />;
      case "BUILDING":
      case "DEPLOYING":
        return <span className="h-1.5 w-1.5 rounded-full bg-[#f59e0b] inline-block shadow-[0_0_6px_rgba(245,158,11,0.6)]" />;
      case "BUILD_FAILED":
        return <span className="h-1.5 w-1.5 rounded-full bg-[#ff3333] inline-block shadow-[0_0_6px_rgba(255,51,51,0.6)]" />;
      case "MERGED":
        return <span className="h-1.5 w-1.5 rounded-full bg-[#a855f7] inline-block shadow-[0_0_6px_rgba(168,85,247,0.6)]" />;
      case "CLOSED":
      case "EXPIRED":
      case "SUPERSEDED":
      default:
        return <span className="h-1.5 w-1.5 rounded-full bg-[#888] inline-block" />;
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
