import { useState } from "react";
import { 
  GitBranch, GitCommit, Terminal, RotateCw, Trash2, Columns, 
  ExternalLink, Timer
} from "lucide-react";
import { timeAgo, timeRemaining } from "../../lib/utils.js";
import type { PullRequest, Deployment } from "../../types/index.js";
import { redeployPullRequest, destroyPreviewEnvironment, expireDeployment } from "../../services/api.js";
import { Button } from "../ui/button.js";
import { StatusBadge } from "../ui/badge.js";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);


interface PullRequestCardProps {
  pullRequest: PullRequest;
  onOpenLogs: (pullRequest: PullRequest, deployment: Deployment) => void;
  onOpenComparison: (pullRequest: PullRequest, deployment: Deployment) => void;
  onRefresh: () => void;
}

export function PullRequestCard({
  pullRequest,
  onOpenLogs,
  onOpenComparison,
  onRefresh,
}: PullRequestCardProps) {
  const [isActionLoading, setIsActionLoading] = useState(false);

  const latestDeployment = pullRequest.deployments?.[0];
  const status = latestDeployment?.status || "CLOSED";
  const rawPreviewUrl = latestDeployment?.previewUrl;
  const previewUrl = rawPreviewUrl && window.location.hostname !== "localhost" && rawPreviewUrl.includes("localhost")
    ? rawPreviewUrl.replace("localhost", "172.198.162.244")
    : rawPreviewUrl;

  const repoName = pullRequest.repository?.fullName?.split('/')[1] || "repository";
  const repoFullName = pullRequest.repository?.fullName || "branchverse/repository";

  const handleRedeploy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsActionLoading(true);
      await redeployPullRequest(pullRequest.id);
      onRefresh();
    } catch (err) {
      console.error("Redeploy error:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleDestroy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!latestDeployment) return;
    try {
      setIsActionLoading(true);
      await destroyPreviewEnvironment(latestDeployment.id);
      onRefresh();
    } catch (err) {
      console.error("Destroy error:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExpire = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!latestDeployment) return;
    try {
      setIsActionLoading(true);
      await expireDeployment(latestDeployment.id);
      onRefresh();
    } catch (err) {
      console.error("Expire error:", err);
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="bg-[#000] border border-[#333] hover:border-[#666] transition-all rounded-xl p-6 flex flex-col gap-6 cursor-pointer group shadow-sm hover:shadow-md hover:shadow-black">
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          {/* Vercel-like project icon */}
          <div className="h-10 w-10 bg-slate-900 border border-slate-700 rounded-full flex items-center justify-center shrink-0">
             <GitBranch className="text-slate-300 h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <h3 className="text-lg font-bold font-heading text-slate-100 group-hover:text-white transition-colors flex items-center gap-2">
              {repoName}
            </h3>
            {previewUrl ? (
              <a href={previewUrl.startsWith('http') ? previewUrl : `https://${previewUrl}`} target="_blank" rel="noreferrer" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors truncate max-w-[400px]" onClick={e => e.stopPropagation()}>
                {previewUrl.replace(/^https?:\/\//, '')}
              </a>
            ) : (
              <span className="text-sm text-slate-500">No preview URL</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Actions only appear on hover, status icon is always there */}
           <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-0">
             {latestDeployment && (
               <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-[#333]" onClick={(e) => { e.stopPropagation(); onOpenLogs(pullRequest, latestDeployment); }} title="Logs">
                 <Terminal className="h-5 w-5" />
               </Button>
             )}
             {status === "LIVE" && latestDeployment && (
               <Button variant="ghost" size="icon" className="h-10 w-10 text-slate-400 hover:text-white hover:bg-[#333]" onClick={(e) => { e.stopPropagation(); onOpenComparison(pullRequest, latestDeployment); }} title="Compare">
                 <Columns className="h-5 w-5" />
               </Button>
             )}
             {status === "LIVE" && previewUrl && (
               <a href={previewUrl.startsWith('http') ? previewUrl : `https://${previewUrl}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="inline-flex items-center justify-center h-10 w-10 rounded-md text-slate-400 hover:text-white hover:bg-[#333] transition-colors" title="Visit">
                 <ExternalLink className="h-5 w-5" />
               </a>
             )}
             <Button variant="ghost" size="icon" onClick={handleRedeploy} disabled={isActionLoading} className="h-10 w-10 text-slate-400 hover:text-white hover:bg-[#333]" title="Redeploy">
               <RotateCw className={`h-5 w-5 ${isActionLoading ? 'animate-spin' : ''}`} />
             </Button>
             {status === "LIVE" && (
               <Button variant="ghost" size="icon" onClick={handleDestroy} disabled={isActionLoading} className="h-10 w-10 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50" title="Destroy">
                 <Trash2 className="h-5 w-5" />
               </Button>
             )}
             {status === "LIVE" && (
               <Button variant="ghost" size="icon" onClick={handleExpire} disabled={isActionLoading} className="h-10 w-10 text-amber-400 hover:text-amber-300 hover:bg-amber-950/50" title="Test Expiry">
                 <Timer className="h-5 w-5" />
               </Button>
             )}
           </div>
           
           <StatusBadge status={status as any} />
        </div>
      </div>
      
      <div className="flex flex-col gap-1.5">
         <div className="flex items-center gap-2">
            <GitCommit className="h-5 w-5 text-slate-300 shrink-0" />
            <span className="text-base font-medium font-heading text-slate-200 truncate">{pullRequest.title}</span>
         </div>
         <div className="flex items-center gap-2 text-sm text-slate-500 mt-1 pl-1">
            <GithubIcon className="h-4 w-4 shrink-0 text-slate-400" />
            <span className="truncate">{repoFullName}</span>
            <span className="shrink-0">•</span>
            <span className="shrink-0">{timeAgo(pullRequest.updatedAt)}</span>
            <span className="shrink-0">•</span>
            <span className="shrink-0 font-mono text-xs font-semibold text-slate-400">PR #{pullRequest.number}</span>
            {latestDeployment?.expiresAt && status === "LIVE" && (
              <>
                <span className="shrink-0">•</span>
                <span className="shrink-0 text-amber-400/80 text-xs">
                  Expires {timeRemaining(latestDeployment.expiresAt)}
                </span>
              </>
            )}
         </div>
      </div>
    </div>
  );
}
