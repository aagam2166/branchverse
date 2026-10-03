import { useState, useEffect } from "react";
import { FolderGit2, X, Plus, Trash2, Copy, Check, Terminal, ExternalLink } from "lucide-react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";
import { 
  fetchRepositories, 
  connectRepository, 
  deleteRepository, 
  inspectRepository,
  fetchUserGitHubRepos,
  type UserGitHubRepo 
} from "../../services/api.js";
import type { Repository } from "../../types/index.js";

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepoUpdated: () => void;
}

export function ConnectRepoModal({ isOpen, onClose, onRepoUpdated }: ConnectRepoModalProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [userGitHubRepos, setUserGitHubRepos] = useState<UserGitHubRepo[]>([]);
  const [fullName, setFullName] = useState("");
  const [appDirectory, setAppDirectory] = useState("");
  const [installCommand, setInstallCommand] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [productionUrl, setProductionUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [serverWebhookUrl, setServerWebhookUrl] = useState<string>("");
  
  const [inspecting, setInspecting] = useState(false);
  const [detectedStack, setDetectedStack] = useState<{ type: string | null; path: string } | null>(null);

  const webhookUrl = serverWebhookUrl || (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "https://stiffness-clamshell-unable.ngrok-free.dev/api/webhooks/github"
    : `${window.location.origin}/api/webhooks/github`);

  const loadRepos = async () => {
    try {
      const repos = await fetchRepositories();
      setRepositories(repos);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUserGitHubRepos = async () => {
    try {
      const repos = await fetchUserGitHubRepos();
      setUserGitHubRepos(repos);
    } catch (err) {
      // User might not be logged in or token expired
      setUserGitHubRepos([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRepos();
      loadUserGitHubRepos();
      setError(null);
      setWarning(null);
      setDetectedStack(null);
    }
  }, [isOpen]);

  const handleInspect = async () => {
    if (!fullName || !fullName.includes("/")) return;
    try {
      setInspecting(true);
      setError(null);
      const res = await inspectRepository(fullName.trim(), appDirectory.trim() || undefined);
      setDetectedStack(res);
    } catch (err: any) {
      setDetectedStack({ type: null, path: appDirectory || "root" });
    } finally {
      setInspecting(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = fullName
      .trim()
      .replace(/^(https?:\/\/)?(www\.)?github\.com\//i, "")
      .replace(/\.git$/i, "")
      .replace(/^\/+|\/+$/g, "");

    if (!cleanName || !cleanName.includes("/")) {
      setError("Please specify a valid repository in 'owner/repo' format (e.g. 0xJainam/IE-WEB-RECS)");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setWarning(null);
      const res = await connectRepository(
        cleanName,
        appDirectory.trim() || undefined,
        buildCommand.trim() || undefined,
        installCommand.trim() || undefined,
        productionUrl.trim() || undefined
      );
      if (res.warning) {
        setWarning(res.warning);
      }
      if (res.webhookUrl) {
        setServerWebhookUrl(res.webhookUrl);
      }
      setFullName("");
      setAppDirectory("");
      setInstallCommand("");
      setBuildCommand("");
      setProductionUrl("");
      setDetectedStack(null);
      await loadRepos();
      onRepoUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect repository");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteRepository(id);
      await loadRepos();
      onRepoUpdated();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="flex w-full max-w-xl flex-col rounded-2xl border border-slate-800 bg-[#090d16] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-cyan-500/10 p-2 border border-cyan-500/20">
              <FolderGit2 className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="font-heading text-lg font-bold text-slate-100">
                Connect GitHub Repository
              </h3>
              <p className="text-xs text-slate-400">
                Register a repository to receive automated preview deployments
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="iconSm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Repository Full Name
              </label>

              {userGitHubRepos.length > 0 && (
                <select
                  onChange={(e) => setFullName(e.target.value)}
                  value={fullName}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-mono text-cyan-300 mb-2 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Select from your GitHub Repositories --</option>
                  {userGitHubRepos.map((r) => (
                    <option key={r.id} value={r.fullName}>
                      {r.fullName} {r.private ? "🔒 (Private)" : "🌐 (Public)"}
                    </option>
                  ))}
                </select>
              )}

              <Input
                type="text"
                placeholder="e.g. octocat/hello-world"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Production URL <span className="text-slate-500 font-normal">(Optional, for Timeline Comparison)</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. https://my-main-website.com"
                value={productionUrl}
                onChange={(e) => setProductionUrl(e.target.value)}
                className="bg-slate-950 border-slate-800 font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  App Directory <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleInspect}
                  disabled={inspecting || !fullName}
                  className="h-6 px-2 text-[10px] text-cyan-400 cursor-pointer"
                >
                  {inspecting ? "Detecting..." : "Auto-detect Stack"}
                </Button>
              </div>
              <Input
                type="text"
                placeholder="Leave blank for repo root, or specify e.g. frontend"
                value={appDirectory}
                onChange={(e) => {
                    setAppDirectory(e.target.value);
                    setDetectedStack(null);
                }}
                className="bg-slate-950 border-slate-800 font-mono text-xs mb-2"
              />
              {detectedStack && (
                <div className="rounded-lg bg-slate-900/80 p-2 border border-slate-800/80 text-xs">
                  {detectedStack.type ? (
                    <span className="text-cyan-300">✓ Detected: {detectedStack.type} in /{detectedStack.path}</span>
                  ) : (
                    <span className="text-amber-400">⚠️ Unable to detect application type. Please ensure a valid app directory or configure a Dockerfile.</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Install Command <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. npm install"
                  value={installCommand}
                  onChange={(e) => setInstallCommand(e.target.value)}
                  className="bg-slate-950 border-slate-800 font-mono text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Build Command <span className="text-slate-500 font-normal">(Optional)</span>
                </label>
                <Input
                  type="text"
                  placeholder="e.g. npm run build"
                  value={buildCommand}
                  onChange={(e) => setBuildCommand(e.target.value)}
                  className="bg-slate-950 border-slate-800 font-mono text-xs"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-rose-400 font-medium">{error}</p>
            )}

            {warning && (
              <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 text-xs text-amber-300">
                ⚠️ {warning}
              </div>
            )}

            <Button
              type="submit"
              variant="glow"
              disabled={loading}
              className="w-full gap-2 text-xs"
            >
              <Plus className="h-4 w-4" />
              <span>{loading ? "Connecting..." : "Add Repository"}</span>
            </Button>
          </form>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <Terminal className="h-4 w-4 text-cyan-400" />
                <span>GitHub Webhook Settings</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyWebhook}
                className="h-7 px-2 text-[11px] border-slate-800 gap-1 text-slate-300 cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-cyan-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? "Copied" : "Copy URL"}</span>
              </Button>
            </div>

            <div className="space-y-1.5 text-xs font-mono text-slate-400 bg-slate-900/90 p-3 rounded-lg border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Payload URL:</span>
                <span className="text-cyan-300 select-all truncate max-w-[320px]">{webhookUrl}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Content type:</span>
                <span className="text-slate-200">application/json</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Events:</span>
                <span className="text-amber-300">Pull requests</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-normal">
              In your GitHub repo: <span className="text-slate-300">Settings &rarr; Webhooks &rarr; Add webhook</span>. Paste the Payload URL and select &quot;Let me select individual events &rarr; Pull requests&quot;.
            </p>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Connected Repositories ({repositories.length})
            </h4>

            {repositories.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                No repositories connected yet. Add one above to start tracking PR previews.
              </p>
            ) : (
              <div className="space-y-2">
                {repositories.map((repo) => (
                  <div
                    key={repo.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/50 p-3 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200 font-mono">
                        {repo.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Default branch: <span className="text-cyan-400 font-mono">{repo.defaultBranch}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={`https://github.com/${repo.fullName}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-800"
                        title="Open on GitHub"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      <Button
                        variant="destructive"
                        size="iconSm"
                        onClick={() => handleDelete(repo.id)}
                        className="h-7 w-7 cursor-pointer"
                        title="Disconnect Repository"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
