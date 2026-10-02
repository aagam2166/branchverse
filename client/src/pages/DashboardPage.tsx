import { useState, useEffect, useCallback } from "react";
import { fetchPullRequests } from "../services/api.js";
import type { PullRequest, Deployment } from "../types/index.js";
import { Navbar } from "../components/layout/Navbar.js";
import { StatCards } from "../components/dashboard/StatCards.js";
import { FilterBar } from "../components/dashboard/FilterBar.js";
import { PullRequestCard } from "../components/dashboard/PullRequestCard.js";
import { EmptyState } from "../components/dashboard/EmptyState.js";
import { LogViewerModal } from "../components/deployment/LogViewerModal.js";
import { SplitPreviewModal } from "../components/deployment/SplitPreviewModal.js";
import { ConnectRepoModal } from "../components/dashboard/ConnectRepoModal.js";

export function DashboardPage() {
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
    loadPullRequests();
    const interval = setInterval(() => {
      loadPullRequests(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadPullRequests]);

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

  return (
    <div className="min-h-screen bg-[#07090e] bg-radial-grid text-slate-100 flex flex-col">
      <Navbar
        onRefresh={() => loadPullRequests()}
        isRefreshing={isRefreshing}
        onOpenConnectModal={() => setIsConnectOpen(true)}
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
