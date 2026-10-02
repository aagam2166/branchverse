import { GitPullRequest, FolderGit2, Terminal } from "lucide-react";
import { Button } from "../ui/button.js";

interface EmptyStateProps {
  onOpenConnectModal: () => void;
  hasFilter: boolean;
}

export function EmptyState({ onOpenConnectModal, hasFilter }: EmptyStateProps) {
  const webhookUrl = `${window.location.origin}/api/webhooks/github`;

  if (hasFilter) {
    return (
      <div className="glass-panel rounded-2xl p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-400">
          <GitPullRequest className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-heading text-lg font-bold text-slate-200">
          No matching environments found
        </h3>
        <p className="mt-1 text-sm text-slate-400 max-w-sm mx-auto">
          Try adjusting your search query or filter tags to inspect other branches.
        </p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl p-12 text-center border-dashed border-slate-800">
      <div className="mx-auto relative flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 shadow-xl shadow-cyan-950/50">
        <GitPullRequest className="h-8 w-8 text-cyan-400" />
      </div>

      <h3 className="mt-5 font-heading text-xl font-bold text-slate-100">
        No Active Preview Environments
      </h3>
      <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
        Connect your GitHub repository to automatically create isolated Docker preview environments when Pull Requests are opened.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button
          variant="glow"
          onClick={onOpenConnectModal}
          className="gap-2 cursor-pointer"
        >
          <FolderGit2 className="h-4 w-4" />
          <span>Connect Repository</span>
        </Button>
      </div>

      <div className="mt-8 mx-auto max-w-md rounded-xl bg-slate-950/80 p-4 border border-slate-800/80 text-left font-mono text-xs text-slate-400">
        <div className="flex items-center gap-2 text-slate-500 mb-2 border-b border-slate-800 pb-2">
          <Terminal className="h-3.5 w-3.5 text-cyan-400" />
          <span>Webhook Setup Guide</span>
        </div>
        <p className="text-slate-300">Payload URL: <span className="text-cyan-400">{webhookUrl}</span></p>
        <p className="text-slate-300">Content type: <span className="text-cyan-300">application/json</span></p>
        <p className="text-slate-300">Events: <span className="text-amber-300">Pull requests</span></p>
      </div>
    </div>
  );
}
