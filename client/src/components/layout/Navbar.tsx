import { useState, useRef, useEffect } from "react";
import { GitPullRequest, RefreshCw, FolderGit2, LogOut, GitFork, ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "../ui/button.js";
import type { User } from "../../services/api.js";

interface NavbarProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenConnectModal: () => void;
  user: User | null;
  onLogout: () => void;
  onLogin: () => void;
}

export function Navbar({ onRefresh, isRefreshing, onOpenConnectModal, user, onLogout, onLogin }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchAccount = () => {
    // 1. Log out locally from BranchVerse
    onLogout();
    // 2. Open GitHub logout in a new tab so user can sign into another account
    window.open("https://github.com/logout", "_blank");
  };

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

          {user ? (
            <div className="relative pl-2 border-l border-slate-800" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-800/60 border border-transparent hover:border-slate-700/60 transition-all cursor-pointer"
                title="Account menu"
              >
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.username}
                    className="h-8 w-8 rounded-full border border-cyan-500/40 object-cover"
                  />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-xs">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden md:inline text-xs text-slate-300 font-semibold max-w-[120px] truncate">
                  {user.username}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-[#0d121f] p-3 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                  <div className="border-b border-slate-800/80 pb-3 mb-2 px-1">
                    <p className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">Signed in as</p>
                    <p className="text-sm font-bold text-slate-100 truncate">@{user.username}</p>
                    {user.email && (
                      <p className="text-xs text-slate-400 truncate mt-0.5">{user.email}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 text-xs font-medium text-slate-300 hover:text-rose-400 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out of BranchVerse</span>
                    </button>

                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleSwitchAccount();
                      }}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-xs font-medium text-amber-400 hover:bg-slate-800/70 rounded-lg transition-colors cursor-pointer text-left"
                      title="Log out of GitHub to sign in with a different account"
                    >
                      <div className="flex items-center gap-2.5">
                        <GitFork className="h-4 w-4" />
                        <span>Switch GitHub Account</span>
                      </div>
                      <ExternalLink className="h-3 w-3 opacity-70" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={onLogin}
              className="bg-slate-900 border-slate-700 hover:border-cyan-500/50 text-slate-200 gap-1.5 text-xs cursor-pointer"
            >
              <GitFork className="h-4 w-4 text-slate-300" />
              <span>Login with GitHub</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
