import { Layers, Radio, Activity, GitMerge } from "lucide-react";
import type { PullRequest } from "../../types/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card.js";
import { Badge } from "../ui/badge.js";

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
      badge: "Tracked",
      variant: "default" as const,
    },
    {
      title: "Live Previews",
      value: livePreviews,
      icon: Radio,
      badge: "Operational",
      variant: "default" as const,
    },
    {
      title: "In-Flight Builds",
      value: inFlightBuilds,
      icon: Activity,
      badge: inFlightBuilds > 0 ? "Building" : "Idle",
      variant: "default" as const,
    },
    {
      title: "Merged Universes",
      value: mergedPRs,
      icon: GitMerge,
      badge: "Completed",
      variant: "default" as const,
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card key={stat.title} className="bg-[#000] border-[#333] hover:border-[#666] transition-colors shadow-sm hover:shadow-md hover:shadow-black">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
              <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider font-sans">
                {stat.title}
              </CardTitle>
              <div className="rounded-lg bg-slate-900/80 p-1.5 border border-[#333]">
                <Icon className="h-4 w-4 text-slate-300" />
              </div>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <div className="flex items-baseline justify-between mt-1">
                <div className="text-3xl font-bold text-slate-100">{stat.value}</div>
                <Badge variant={stat.variant} className="text-xs px-3 py-1 rounded-full font-semibold">
                  {stat.badge}
                </Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
