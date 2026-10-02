import { Layers, Radio, Activity, GitMerge } from "lucide-react";
import type { PullRequest } from "../../types/index.js";

interface StatCardsProps {
  pullRequests: PullRequest[];
}

export function StatCards({ pullRequests }: StatCardsProps) {
  const totalPRs = pullRequests.length;
  
  const livePreviews = pullRequests.filter((pr) =>
    pr.deployments.some((d) => d.status === "LIVE")
  ).length;

  const inFlightBuilds = pullRequests.filter((pr) =>
    pr.deployments.some((d) => d.status === "BUILDING" || d.status === "DEPLOYING")
  ).length;

  const mergedPRs = pullRequests.filter(
    (pr) => pr.state === "MERGED" || pr.deployments.some((d) => d.status === "MERGED")
  ).length;

  const stats = [
    {
      title: "Total Pull Requests",
      value: totalPRs,
      icon: Layers,
      accent: "text-slate-200",
      border: "border-slate-800/80",
      badge: "Tracked",
      badgeColor: "bg-slate-800 text-slate-300",
    },
    {
      title: "Live Previews",
      value: livePreviews,
      icon: Radio,
      accent: "text-cyan-400",
      border: "border-cyan-500/30",
      badge: "Operational",
      badgeColor: "bg-cyan-950 text-cyan-400 border border-cyan-500/30",
    },
    {
      title: "In-Flight Builds",
      value: inFlightBuilds,
      icon: Activity,
      accent: "text-amber-400",
      border: "border-amber-500/30",
      badge: inFlightBuilds > 0 ? "Building" : "Idle",
      badgeColor: inFlightBuilds > 0 ? "bg-amber-950 text-amber-400 border border-amber-500/30 animate-pulse" : "bg-slate-800 text-slate-400",
    },
    {
      title: "Merged Universes",
      value: mergedPRs,
      icon: GitMerge,
      accent: "text-purple-400",
      border: "border-purple-500/30",
      badge: "Completed",
      badgeColor: "bg-purple-950 text-purple-400 border border-purple-500/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.title}
            className={`glass-panel rounded-xl p-5 transition-all duration-200 hover:border-slate-700/80 ${stat.border}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                {stat.title}
              </span>
              <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800">
                <Icon className={`h-4 w-4 ${stat.accent}`} />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-heading text-3xl font-extrabold text-slate-100">
                {stat.value}
              </span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${stat.badgeColor}`}>
                {stat.badge}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
