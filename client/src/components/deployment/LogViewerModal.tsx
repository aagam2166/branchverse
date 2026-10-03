import { useState, useEffect, useRef } from "react";
import { Terminal, X, Copy, Check, Search, Download, ArrowDown } from "lucide-react";
import { Button } from "../ui/button.js";
import { fetchDeploymentLogs } from "../../services/api.js";
import type { PullRequest, Deployment } from "../../types/index.js";

interface LogViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  pullRequest: PullRequest;
  deployment: Deployment;
}

export function LogViewerModal({
  isOpen,
  onClose,
  pullRequest,
  deployment,
}: LogViewerModalProps) {
  const [activeTab, setActiveTab] = useState<"build" | "container">("build");
  const [buildLogs, setBuildLogs] = useState<string>("");
  const [containerLogs, setContainerLogs] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const [selectedDeploymentId, setSelectedDeploymentId] = useState<string>("");

  useEffect(() => {
    if (isOpen && deployment) {
      setSelectedDeploymentId(deployment.id);
    }
  }, [isOpen, deployment]);

  const selectedDeployment = pullRequest.deployments?.find(d => d.id === selectedDeploymentId) || deployment;

  useEffect(() => {
    if (!isOpen || !selectedDeploymentId) return;

    let isMounted = true;
    setLoading(true);

    fetchDeploymentLogs(pullRequest.id, selectedDeploymentId)
      .then((data) => {
        if (!isMounted) return;
        setBuildLogs(data.buildLogs || "No build logs recorded.");
        setContainerLogs(data.containerLogs || "Container logs not available or container is inactive.");
      })
      .catch((err) => {
        if (!isMounted) return;
        setBuildLogs(`Failed to fetch logs: ${err.message}`);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, pullRequest.id, selectedDeploymentId]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [buildLogs, containerLogs, activeTab, autoScroll]);

  if (!isOpen) return null;

  const currentLogs = activeTab === "build" ? buildLogs : containerLogs;
  const filteredLines = currentLogs.split("\n").filter((line) =>
    searchQuery ? line.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(currentLogs);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([currentLogs], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `branchverse-logs-${selectedDeployment.id.slice(0, 8)}-${activeTab}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatLogLine = (line: string) => {
    if (line.includes("FAILED") || line.includes("error") || line.includes("Error")) {
      return <span className="text-rose-400 font-semibold">{line}</span>;
    }
    if (line.includes("successfully") || line.includes("LIVE") || line.includes("started")) {
      return <span className="text-cyan-400 font-medium">{line}</span>;
    }
    if (line.includes("Building") || line.includes("Cloning") || line.includes("Step")) {
      return <span className="text-sky-300">{line}</span>;
    }
    if (line.includes("warn") || line.includes("WARN")) {
      return <span className="text-amber-300">{line}</span>;
    }
    return <span className="text-slate-300">{line}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-800 bg-[#090d16] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2 border border-cyan-500/20">
              <Terminal className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-slate-100">
                  Execution Logs
                </h3>
                <span className="font-mono text-xs text-slate-400">
                  #{pullRequest.number} ({selectedDeployment.commitSha.slice(0, 7)})
                </span>
                
                {pullRequest.deployments && pullRequest.deployments.length > 1 && (
                  <select
                    value={selectedDeploymentId}
                    onChange={(e) => setSelectedDeploymentId(e.target.value)}
                    className="ml-4 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                  >
                    {pullRequest.deployments.map((d, index) => (
                      <option key={d.id} value={d.id}>
                        {index === 0 ? "Latest " : `Version ${pullRequest.deployments.length - index} `} 
                        ({d.commitSha.slice(0, 7)}) - {d.status}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Deployment ID: <span className="font-mono text-slate-300">{selectedDeployment.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5 text-xs border-slate-800 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-400" />
                  <span>Copy</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="gap-1.5 text-xs border-slate-800 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span>Export</span>
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 bg-[#070a10] px-6 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("build")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "build"
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Build Pipeline Logs
            </button>
            <button
              onClick={() => setActiveTab("container")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                activeTab === "container"
                  ? "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Container Runtime Output
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 w-44 rounded-md border border-slate-800 bg-slate-900/80 pl-8 pr-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
            <button
              onClick={() => setAutoScroll(!autoScroll)}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium transition-colors cursor-pointer ${
                autoScroll ? "bg-slate-800 text-cyan-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <ArrowDown className="h-3 w-3" />
              <span>Auto-scroll</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 font-mono-code text-xs leading-relaxed bg-[#05070c]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-cyan-400 animate-spin" />
                <span>Streaming logs from daemon...</span>
              </div>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="text-slate-500 italic">No log entries matched your filter.</div>
          ) : (
            <div className="space-y-1">
              {filteredLines.map((line, idx) => (
                <div key={idx} className="flex items-start gap-3 hover:bg-slate-900/40 px-2 py-0.5 rounded">
                  <span className="select-none text-slate-600 w-8 text-right shrink-0">
                    {idx + 1}
                  </span>
                  <div className="break-all whitespace-pre-wrap flex-1">
                    {formatLogLine(line)}
                  </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
