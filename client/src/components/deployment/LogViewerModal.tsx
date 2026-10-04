import { useState, useEffect, useRef } from "react";
import { Terminal, X, Copy, Check, Search, Download } from "lucide-react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
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
  const [autoScroll] = useState(true);
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
      return <span className="text-[#ff5f56] font-semibold">{line}</span>;
    }
    if (line.includes("successfully") || line.includes("LIVE") || line.includes("started")) {
      return <span className="text-[#27c93f] font-medium">{line}</span>;
    }
    if (line.includes("Building") || line.includes("Cloning") || line.includes("Step")) {
      return <span className="text-[#57c7ff]">{line}</span>;
    }
    if (line.includes("warn") || line.includes("WARN")) {
      return <span className="text-[#ffbd2e]">{line}</span>;
    }
    return <span className="text-[#d4d4d4]">{line}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex h-[85vh] w-full max-w-5xl flex-col rounded-xl border border-slate-800 bg-black shadow-2xl overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-slate-800/80 bg-slate-950 px-6 py-8">
          <div className="flex items-start gap-4">
            <div className="rounded-lg bg-slate-800 p-2.5 border border-slate-700 mt-1 shrink-0">
              <Terminal className="h-6 w-6 text-slate-300" />
            </div>
            <div className="flex flex-col w-full gap-4">
              {/* Top Row: Title + Action Buttons */}
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <h3 className="font-heading text-2xl font-bold text-slate-100">
                    Execution Logs
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      PR #{pullRequest.number}
                    </span>
                    <span className="text-slate-600">•</span>
                    <span className="font-mono text-xs text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                      {selectedDeployment.commitSha.slice(0, 7)}
                    </span>
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
                    className="text-slate-400 hover:text-slate-100 cursor-pointer ml-1"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Bottom Row: Deployment ID + Version Dropdown */}
              <div className="flex items-center justify-between w-full mt-1">
                <p className="text-sm text-slate-400 flex items-center gap-2">
                  <span className="font-medium">Deployment ID:</span>
                  <span className="font-mono text-slate-300">{selectedDeployment.id}</span>
                </p>
                
                {pullRequest.deployments && pullRequest.deployments.length > 1 && (
                  <div className="flex items-center gap-2 mr-9">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Version:</span>
                    <select
                      value={selectedDeploymentId}
                      onChange={(e) => setSelectedDeploymentId(e.target.value)}
                      className="rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300 focus:border-cyan-500 focus:outline-none"
                    >
                      {pullRequest.deployments.map((d, index) => (
                        <option key={d.id} value={d.id}>
                          {index === 0 ? "Latest " : `Version ${pullRequest.deployments.length - index} `} 
                          ({d.commitSha.slice(0, 7)}) - {d.status}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/60 bg-[#070a10] px-6 py-2.5">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("build")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "build"
                  ? "bg-white text-black border border-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Build Pipeline Logs
            </button>
            <button
              onClick={() => setActiveTab("container")}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "container"
                  ? "bg-white text-black border border-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Container Runtime Output
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
              <Input
                type="text"
                placeholder="Filter logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64 border-slate-800 bg-slate-900/80 pl-8 pr-2 text-sm text-slate-200 placeholder:text-slate-500 focus:border-cyan-500/50"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 font-mono text-sm leading-relaxed bg-black">
          {loading ? (
            <div className="flex h-full items-center justify-center text-slate-500">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-slate-400 animate-pulse" />
                <span>Streaming logs from daemon...</span>
              </div>
            </div>
          ) : filteredLines.length === 0 ? (
            <div className="text-slate-500 italic">No log entries matched your filter.</div>
          ) : (
            <div className="space-y-0.5">
              {filteredLines.map((line, idx) => (
                <div key={idx} className="flex items-start gap-4 px-2 py-0.5 group">
                  <span className="select-none text-slate-700 w-8 text-right shrink-0 group-hover:text-slate-500 transition-colors">
                    {idx + 1}
                  </span>
                  <div className="break-all whitespace-pre-wrap flex-1 text-slate-300">
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
