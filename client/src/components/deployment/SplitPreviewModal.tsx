import { useState, useRef } from "react";
import {
  Columns,
  ExternalLink,
  RefreshCw,
  X,
  Monitor,
  Tablet,
  Smartphone,
  Globe,
  Sparkles
} from "lucide-react";
import { Button } from "../ui/button.js";
import type { PullRequest, Deployment } from "../../types/index.js";
import { deployBaseline, fetchBaselineStatus } from "../../services/api.js";
import { useEffect } from "react";

interface SplitPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  pullRequest: PullRequest;
  deployment: Deployment;
}

export function SplitPreviewModal({
  isOpen,
  onClose,
  pullRequest,
  deployment,
}: SplitPreviewModalProps) {
  const [deviceMode, setDeviceMode] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [baselineUrl, setBaselineUrl] = useState<string>(
    pullRequest.repository?.productionUrl || pullRequest.repository?.baselineUrl || ""
  );
  const [baselineStatus, setBaselineStatus] = useState<string | null>(
    pullRequest.repository?.baselineStatus || null
  );
  const [isDeployingBaseline, setIsDeployingBaseline] = useState(false);
  const [refreshKey, setRefreshKey] = useState<number>(0);

  const previewFrameRef = useRef<HTMLIFrameElement>(null);
  const baselineFrameRef = useRef<HTMLIFrameElement>(null);

  const previewUrl = deployment.previewUrl || `http://localhost:${deployment.hostPort || 3000}`;

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>;

    if (baselineStatus === "BUILDING" || baselineStatus === "DEPLOYING") {
      intervalId = setInterval(async () => {
        try {
          const status = await fetchBaselineStatus(pullRequest.repository.id);
          setBaselineStatus(status.status);
          if (status.status === "LIVE" && status.url) {
            setBaselineUrl(status.url);
          }
        } catch (e) {
          console.error("Failed to fetch baseline status", e);
        }
      }, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [baselineStatus, pullRequest.repository.id]);

  const handleDeployBaseline = async () => {
    try {
      setIsDeployingBaseline(true);
      await deployBaseline(pullRequest.repository.id);
      setBaselineStatus("BUILDING");
    } catch (e) {
      console.error("Failed to deploy baseline", e);
    } finally {
      setIsDeployingBaseline(false);
    }
  };

  if (!isOpen) return null;

  const getViewportWidth = () => {
    switch (deviceMode) {
      case "mobile":
        return "max-w-[390px]";
      case "tablet":
        return "max-w-[768px]";
      case "desktop":
      default:
        return "w-full";
    }
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex h-[92vh] w-full max-w-[96vw] flex-col rounded-2xl border border-slate-800 bg-[#090d16] shadow-2xl overflow-hidden">

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/90 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2 border border-cyan-500/20">
              <Columns className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading text-lg font-bold text-slate-100">
                  Multiverse Comparison Portal
                </h3>
                <span className="rounded-full bg-cyan-500/10 px-2 py-0.5 text-xs font-semibold text-cyan-400 border border-cyan-500/20">
                  PR #{pullRequest.number}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Synchronized preview environment vs baseline comparison
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-slate-800 bg-slate-950 p-1">
              <button
                onClick={() => setDeviceMode("desktop")}
                className={`rounded p-1.5 transition-colors cursor-pointer ${deviceMode === "desktop" ? "bg-slate-800 text-cyan-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Desktop (100%)"
              >
                <Monitor className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeviceMode("tablet")}
                className={`rounded p-1.5 transition-colors cursor-pointer ${deviceMode === "tablet" ? "bg-slate-800 text-cyan-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Tablet (768px)"
              >
                <Tablet className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeviceMode("mobile")}
                className={`rounded p-1.5 transition-colors cursor-pointer ${deviceMode === "mobile" ? "bg-slate-800 text-cyan-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                title="Mobile (390px)"
              >
                <Smartphone className="h-4 w-4" />
              </button>
            </div>



            <Button
              variant="outline"
              size="iconSm"
              onClick={handleRefresh}
              className="border-slate-800 text-slate-300 cursor-pointer"
              title="Refresh Iframes"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="iconSm"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-100 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border-b border-slate-800/60 bg-[#070a10]">
          <div className="flex items-center justify-between gap-2 rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-3 py-1.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <span className="text-xs font-semibold text-cyan-300 shrink-0">
                PR Universe:
              </span>
              <span className="font-mono text-xs text-slate-300 truncate">
                {previewUrl}
              </span>
            </div>
            <a
              href={previewUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/40 cursor-pointer"
              title="Open Preview in New Tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5">
            <Globe className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="text-xs font-semibold text-slate-300 shrink-0">
              Baseline Target:
            </span>
            <input
              type="text"
              value={baselineUrl}
              onChange={(e) => setBaselineUrl(e.target.value)}
              className="flex-1 bg-transparent text-xs text-slate-200 font-mono outline-none border-b border-transparent focus:border-cyan-500/50"
              placeholder="https://main-branch-app.com"
            />
            <a
              href={baselineUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded p-1 text-slate-400 hover:text-cyan-400 hover:bg-cyan-950/40 cursor-pointer"
              title="Open Baseline in New Tab"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-800 bg-[#04060a] overflow-hidden">
          <div className="flex flex-col items-center justify-start h-full p-2 overflow-auto bg-slate-950/40">
            <div className={`w-full ${getViewportWidth()} transition-all duration-300 flex-1 flex flex-col`}>
              <div className="rounded-t-md bg-slate-900 border border-b-0 border-slate-800 px-3 py-1 text-[11px] font-mono text-cyan-400 flex items-center justify-between">
                <span>Branch: {pullRequest.branch}</span>
                <Sparkles className="h-3 w-3 text-cyan-400" />
              </div>
              <iframe
                key={`preview-${refreshKey}`}
                ref={previewFrameRef}
                src={previewUrl}
                title="PR Preview Environment"
                className="w-full flex-1 rounded-b-md border border-slate-800 bg-white shadow-xl"
              />
            </div>
          </div>

          <div className="flex flex-col items-center justify-start h-full p-2 overflow-auto bg-slate-950/40">
            <div className={`w-full ${getViewportWidth()} transition-all duration-300 flex-1 flex flex-col`}>
              <div className="rounded-t-md bg-slate-900 border border-b-0 border-slate-800 px-3 py-1 text-[11px] font-mono text-cyan-400 flex items-center justify-between">
                <span>Baseline (Production / Main)</span>
                <Globe className="h-3 w-3 text-cyan-400" />
              </div>
              {baselineUrl ? (
                <iframe
                  key={`baseline-${refreshKey}`}
                  ref={baselineFrameRef}
                  src={baselineUrl}
                  title="Baseline Environment"
                  className="w-full flex-1 rounded-b-md border border-slate-800 bg-white shadow-xl"
                />
              ) : (
                <div className="w-full flex-1 flex flex-col items-center justify-center rounded-b-md border border-slate-800 bg-slate-950/50 shadow-xl p-6 text-center">
                  <Globe className="h-12 w-12 text-slate-700 mb-4" />
                  <h4 className="text-sm font-semibold text-slate-300 mb-2">No Baseline Deployed</h4>
                  <p className="text-xs text-slate-500 max-w-[250px] mb-6">
                    Deploy the main branch to compare this PR against your baseline.
                  </p>

                  {(baselineStatus === "BUILDING" || baselineStatus === "DEPLOYING") ? (
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="h-5 w-5 text-cyan-400 animate-spin" />
                      <span className="text-xs text-cyan-400 animate-pulse">
                        {baselineStatus === "BUILDING" ? "Building Image..." : "Deploying Container..."}
                      </span>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={handleDeployBaseline}
                      disabled={isDeployingBaseline}
                      className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-950/40"
                    >
                      {isDeployingBaseline ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Deploying...
                        </>
                      ) : (
                        "Deploy Main Branch"
                      )}
                    </Button>
                  )}
                  {baselineStatus === "FAILED" && (
                    <span className="text-xs text-red-400 mt-4">Baseline deployment failed.</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
