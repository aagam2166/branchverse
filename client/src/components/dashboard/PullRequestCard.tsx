import { useState } from "react";
import { 
  GitBranch, 
  GitCommit, 
  User, 
  ExternalLink, 
  Terminal, 
  RotateCw, 
  Trash2, 
  Columns, 
  Clock,
  AlertCircle,
  History,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "../ui/button.js";
import { StatusBadge } from "../ui/badge.js";
import { shortenSha, timeAgo, formatDate } from "../../lib/utils.js";
import type { PullRequest, Deployment } from "../../types/index.js";
import { redeployPullRequest, destroyPreviewEnvironment } from "../../services/api.js";

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
  const [showHistory, setShowHistory] = useState(false);

  const latestDeployment = pullRequest.deployments?.[0];
  const status = latestDeployment?.status || "CLOSED";
  const previewUrl = latestDeployment?.previewUrl;
  const historyDeployments = pullRequest.deployments?.slice(1) || [];

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

  return (
    <div className="glass-panel glass-panel-hover rounded-xl p-6 relative overflow-hidden group">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-semibold text-cyan-400">
              #{pullRequest.number}
            </span>
            <span className="text-xs text-slate-500">•</span>
            <span className="text-xs font-medium text-slate-400">
              {pullRequest.repository?.fullName || "branchverse/repository"}
            </span>
            <StatusBadge status={status} />
          </div>

          <h3 className="font-heading text-lg font-bold text-slate-100 group-hover:text-cyan-300 transition-colors">
            {pullRequest.title}
          </h3>

          <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
            <div className="flex items-center gap-1.5 rounded-md bg-slate-900/80 px-2.5 py-1 border border-slate-800">
              <GitBranch className="h-3.5 w-3.5 text-cyan-400" />
              <span className="font-mono text-[11px] text-cyan-300 truncate max-w-[140px]">
                {pullRequest.branch}
              </span>
            </div>

            <div className="flex items-center gap-1.5 rounded-md bg-slate-900/80 px-2.5 py-1 border border-slate-800">
              <GitCommit className="h-3.5 w-3.5 text-slate-400" />
              <span className="font-mono text-[11px] text-slate-300">
                {shortenSha(pullRequest.latestCommitSha)}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <User className="h-3.5 w-3.5 text-slate-500" />
              <span>{pullRequest.author}</span>
            </div>

            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3.5 w-3.5" />
              <span>{timeAgo(pullRequest.updatedAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 sm:self-start">
          {latestDeployment && (
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onOpenLogs(pullRequest, latestDeployment);
              }}
              className="gap-1.5 text-xs border-slate-800 hover:border-slate-700 text-slate-300 cursor-pointer"
            >
              <Terminal className="h-3.5 w-3.5 text-cyan-400" />
              <span>Logs</span>
            </Button>
          )}

          {status === "LIVE" && previewUrl && latestDeployment && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenComparison(pullRequest, latestDeployment);
                }}
                className="gap-1.5 text-xs border-slate-800 hover:border-slate-700 text-cyan-300 cursor-pointer"
              >
                <Columns className="h-3.5 w-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Compare</span>
              </Button>

              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-slate-950 shadow-md shadow-cyan-950/40 hover:bg-cyan-400 transition-all hover:scale-[1.02] cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Visit Preview</span>
              </a>
            </>
          )}

          <Button
            variant="outline"
            size="iconSm"
            onClick={handleRedeploy}
            disabled={isActionLoading}
            className="border-slate-800 text-slate-400 hover:text-slate-200 cursor-pointer"
            title="Redeploy Preview"
          >
            <RotateCw className={`h-3.5 w-3.5 ${isActionLoading ? "animate-spin text-cyan-400" : ""}`} />
          </Button>

          {status === "LIVE" && latestDeployment && (
            <Button
              variant="destructive"
              size="iconSm"
              onClick={handleDestroy}
              disabled={isActionLoading}
              className="cursor-pointer"
              title="Tear Down Preview"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}

          {historyDeployments.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className="gap-1 text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <History className="h-3.5 w-3.5" />
              <span>{historyDeployments.length}</span>
              {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          )}
        </div>
      </div>

      {latestDeployment?.errorMessage && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-rose-950/30 border border-rose-500/30 p-2.5 text-xs text-rose-300">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <span className="truncate">{latestDeployment.errorMessage}</span>
        </div>
      )}

      {status === "LIVE" && latestDeployment?.hostPort && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span>Container port binding:</span>
            <span className="font-mono text-cyan-300 font-medium">:{latestDeployment.hostPort}</span>
          </div>
          <div className="font-mono text-[11px] text-slate-500 truncate max-w-[200px]">
            {latestDeployment.containerId?.slice(0, 12)}
          </div>
        </div>
      )}

      {showHistory && historyDeployments.length > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-2 bg-slate-950/50 p-3 rounded-lg animate-in fade-in duration-150">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <History className="h-3 w-3 text-cyan-400" />
            <span>Previous Deployments History</span>
          </div>
          <div className="divide-y divide-slate-800/60">
            {historyDeployments.map((dep) => (
              <div key={dep.id} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <StatusBadge status={dep.status} />
                  <span className="font-mono text-slate-400">{shortenSha(dep.commitSha)}</span>
                  <span className="text-slate-500 text-[11px]">• {formatDate(dep.createdAt)}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenLogs(pullRequest, dep)}
                  className="h-6 px-2 text-[11px] border-slate-800 gap-1 text-slate-300"
                >
                  <Terminal className="h-3 w-3 text-cyan-400" />
                  <span>Logs</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
