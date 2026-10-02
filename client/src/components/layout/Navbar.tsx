import { GitPullRequest, RefreshCw, FolderGit2 } from "lucide-react";
import { Button } from "../ui/button.js";

interface NavbarProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenConnectModal: () => void;
}

export function Navbar({ onRefresh, isRefreshing, onOpenConnectModal }: NavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#07090e]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <GitPullRequest className="h-5 w-5 text-cyan-400" />
          </div>
          <span className="font-heading text-xl font-bold tracking-tight text-slate-100">
            BranchVerse
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="border-slate-800 hover:border-slate-700 text-slate-300 gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <Button
            variant="glow"
            size="sm"
            onClick={onOpenConnectModal}
            className="gap-1.5 text-xs cursor-pointer"
          >
            <FolderGit2 className="h-4 w-4" />
            <span>Connect Repository</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
