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

  const loadPullRequests = useCallback(async () => {
    try {
      const data = await fetchPullRequests();
      setPullRequests(data);
    } catch (err) {
      console.error("Failed to load pull requests:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    loadPullRequests();
    const interval = setInterval(() => {
      loadPullRequests();
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

          <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-8 shadow-2xl space-y-6 text-center max-w-[400px] w-full mx-auto">
            <h2 className="text-xl font-medium text-white">Log in to BranchVerse</h2>
            <p className="text-sm text-[#888]">Continue with GitHub to build preview universes for your pull requests.</p>
            <button
              onClick={handleGitHubLogin}
              className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-md bg-white hover:bg-neutral-200 text-black font-semibold text-sm transition-colors cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span>Continue with GitHub</span>
            </button>
          </div>
        </div>
        <footer className="mt-12 text-center text-xs text-[#666]">
          BranchVerse • Every PR, its own universe
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans">
      <Navbar

        onOpenConnectModal={() => setIsConnectOpen(true)}
        user={user}
        onLogout={handleLogout}
        onLogin={handleGitHubLogin}
      />

      <div className="flex flex-1 justify-center w-full bg-[#0a0a0a]">
        
        <main className="w-full max-w-5xl px-4 py-8 sm:px-6 space-y-8">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold font-heading tracking-tight text-white">
              Projects
            </h1>
            <p className="text-[#888] max-w-2xl text-base">
              Manage your connected repositories and preview deployments.
            </p>
          </div>

          <StatCards pullRequests={pullRequests} />

          <div className="space-y-4">
            <FilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
            />

            {loading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-36 rounded-md animate-pulse bg-[#111] border border-[#222]"
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
      </div>

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
        user={user}
      />
    </div>
  );
}
