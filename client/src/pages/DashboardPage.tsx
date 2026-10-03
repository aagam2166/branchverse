import { useState, useEffect, useCallback } from "react";
import { fetchPullRequests, fetchCurrentUser, getGitHubLoginUrl, type User } from "../services/api.js";
import type { PullRequest, Deployment } from "../types/index.js";
import { Navbar } from "../components/layout/Navbar.js";
import { StatCards } from "../components/dashboard/StatCards.js";
import { FilterBar } from "../components/dashboard/FilterBar.js";
import { PullRequestCard } from "../components/dashboard/PullRequestCard.js";
import { EmptyState } from "../components/dashboard/EmptyState.js";
import { LogViewerModal } from "../components/deployment/LogViewerModal.js";
import { SplitPreviewModal } from "../components/deployment/SplitPreviewModal.js";
import { ConnectRepoModal } from "../components/dashboard/ConnectRepoModal.js";
import { GitFork } from "lucide-react";

export function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isConnectOpen, setIsConnectOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [selectedLogs, setSelectedLogs] = useState<{
    pullRequest: PullRequest;
    deployment: Deployment;
  } | null>(null);

  const [selectedComparison, setSelectedComparison] = useState<{
    pullRequest: PullRequest;
    deployment: Deployment;
  } | null>(null);

  // Check for OAuth token in URL and load user
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenFromUrl = params.get("token");
    if (tokenFromUrl) {
      localStorage.setItem("branchverse_token", tokenFromUrl);
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    fetchCurrentUser().then((u) => {
      setUser(u);
      setAuthLoading(false);
    });
  }, []);

  const loadPullRequests = useCallback(async (isSilent = false) => {
    if (!isSilent) setIsRefreshing(true);
    try {
      const data = await fetchPullRequests();
      setPullRequests(data);
    } catch (err) {
      console.error("Failed to load pull requests:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPullRequests();
    const interval = setInterval(() => {
      loadPullRequests(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadPullRequests, user]);

  const filteredPRs = pullRequests.filter((pr) => {
    const latestStatus = pr.deployments?.[0]?.status || "CLOSED";

    const matchesSearch =
      pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
      pr.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(pr.number).includes(searchQuery);

    if (!matchesSearch) return false;

    if (statusFilter === "ALL") return true;
    if (statusFilter === "LIVE") return latestStatus === "LIVE";
    if (statusFilter === "BUILDING")
      return latestStatus === "BUILDING" || latestStatus === "DEPLOYING";
    if (statusFilter === "BUILD_FAILED") return latestStatus === "BUILD_FAILED";
    if (statusFilter === "CLOSED")
      return latestStatus === "CLOSED" || latestStatus === "MERGED" || pr.state !== "OPEN";

    return true;
  });

  const handleLogout = () => {
    localStorage.removeItem("branchverse_token");
    setUser(null);
    setPullRequests([]);
    window.history.replaceState({}, document.title, window.location.pathname);
    window.location.href = window.location.origin + window.location.pathname;
  };

  const handleGitHubLogin = async () => {
    try {
      const url = await getGitHubLoginUrl();
      window.location.href = url;
    } catch (err: any) {
      alert("Failed to start GitHub login: " + (err.response?.data?.error || err.message));
    }
  };

  // Loading auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#07090e] bg-radial-grid text-slate-100 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Not logged in — show rich login screen with multi-user / account-switching options
  if (!user) {
    return (
      <div className="min-h-screen bg-[#07090e] bg-radial-grid text-slate-100 flex flex-col items-center justify-center px-4 py-12">
        <div className="text-center space-y-6 max-w-lg w-full">
          <div className="flex justify-center">
            <div className="h-20 w-20 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10">
              <GitFork className="h-10 w-10 text-cyan-400" />
            </div>
          </div>
          <div>
            <h1 className="font-heading text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-2">
              BranchVerse
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed max-w-md mx-auto">
              Ephemeral Pull Request Previews powered by Docker & GitHub Webhooks.
            </p>
          </div>

          <div className="bg-[#0b0f19]/90 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-5 text-left">
            <button
              onClick={handleGitHubLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 cursor-pointer"
            >
              <GitFork className="h-5 w-5" />
              <span>Sign in with GitHub</span>
            </button>

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Testing with multiple accounts?</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>

            <div className="rounded-xl bg-slate-900/70 border border-slate-800/80 p-4 space-y-2.5 text-xs text-slate-300">
              <p className="font-medium text-slate-200">
                💡 <strong>Why GitHub signs in automatically:</strong>
              </p>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                GitHub OAuth connects to whichever account is currently active in this browser. To sign in with a different account (e.g. Jainam vs Aagam):
              </p>
              <div className="space-y-2 pt-1">
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <p className="text-slate-300 text-[11px]">
                    <strong>Incognito Window (Fastest):</strong> Open this page in an Incognito / Private window. GitHub will show the email/password login prompt.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">•</span>
                  <p className="text-slate-300 text-[11px]">
                    <strong>Switch GitHub Session:</strong>{" "}
                    <a
                      href="https://github.com/logout"
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:underline font-semibold"
                    >
                      Sign out of github.com
                    </a>{" "}
                    first, then click &quot;Sign in with GitHub&quot; above.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <footer className="mt-12 text-center text-xs text-slate-600">
          BranchVerse • Every PR, its own universe
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07090e] bg-radial-grid text-slate-100 flex flex-col">
      <Navbar
        onRefresh={() => loadPullRequests()}
        isRefreshing={isRefreshing}
        onOpenConnectModal={() => setIsConnectOpen(true)}
        user={user}
        onLogout={handleLogout}
        onLogin={handleGitHubLogin}
      />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        <div className="space-y-2">
          <h1 className="font-heading text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-100">
            Preview Universes
          </h1>
          <p className="text-slate-400 max-w-2xl text-sm sm:text-base">
            Every GitHub Pull Request spun into a containerized universe with its own port, isolated workspace, and live preview URL.
          </p>
        </div>

        <StatCards pullRequests={pullRequests} />

        <div className="space-y-4">
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            totalFiltered={filteredPRs.length}
          />

          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="glass-panel h-36 rounded-xl animate-pulse bg-slate-900/40 border-slate-800/50"
                />
              ))}
            </div>
          ) : filteredPRs.length === 0 ? (
            <EmptyState
              onOpenConnectModal={() => setIsConnectOpen(true)}
              hasFilter={Boolean(searchQuery || statusFilter !== "ALL")}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredPRs.map((pr) => (
                <PullRequestCard
                  key={pr.id}
                  pullRequest={pr}
                  onOpenLogs={(pr, deployment) => setSelectedLogs({ pullRequest: pr, deployment })}
                  onOpenComparison={(pr, deployment) => setSelectedComparison({ pullRequest: pr, deployment })}
                  onRefresh={() => loadPullRequests()}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-slate-800/60 bg-[#07090e]/60 py-6 text-center text-xs text-slate-500">
        <p>BranchVerse • Ephemeral Pull Request Previews Powered by Docker & GitHub Webhooks</p>
      </footer>

      {selectedLogs && (
        <LogViewerModal
          isOpen={Boolean(selectedLogs)}
          onClose={() => setSelectedLogs(null)}
          pullRequest={selectedLogs.pullRequest}
          deployment={selectedLogs.deployment}
        />
      )}

      {selectedComparison && (
        <SplitPreviewModal
          isOpen={Boolean(selectedComparison)}
          onClose={() => setSelectedComparison(null)}
          pullRequest={selectedComparison.pullRequest}
          deployment={selectedComparison.deployment}
        />
      )}

      <ConnectRepoModal
        isOpen={isConnectOpen}
        onClose={() => setIsConnectOpen(false)}
        onRepoUpdated={() => loadPullRequests()}
      />
    </div>
  );
}
