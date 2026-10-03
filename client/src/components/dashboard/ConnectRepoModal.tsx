import { useState, useEffect } from "react";
import { X, ExternalLink, Search, ChevronLeft } from "lucide-react";
import { Button } from "../ui/button.js";
import { Input } from "../ui/input.js";

import { 
  fetchRepositories, 
  connectRepository, 
  inspectRepository,
  fetchUserGitHubRepos,
  type UserGitHubRepo,
  type User
} from "../../services/api.js";
import type { Repository } from "../../types/index.js";

const GithubIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface ConnectRepoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepoUpdated: () => void;
  user?: User | null;
}

export function ConnectRepoModal({ isOpen, onClose, onRepoUpdated, user }: ConnectRepoModalProps) {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [userGitHubRepos, setUserGitHubRepos] = useState<UserGitHubRepo[]>([]);
  
  const [step, setStep] = useState<"list" | "configure">("list");
  
  const [fullName, setFullName] = useState("");
  const [appDirectory, setAppDirectory] = useState("");
  const [installCommand, setInstallCommand] = useState("");
  const [buildCommand, setBuildCommand] = useState("");
  const [productionUrl, setProductionUrl] = useState("");
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [inspecting, setInspecting] = useState(false);
  const [detectedStack, setDetectedStack] = useState<{ type: string | null; path: string } | null>(null);

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
      setUserGitHubRepos([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRepos();
      loadUserGitHubRepos();
      setStep("list");
      setError(null);
      setDetectedStack(null);
    }
  }, [isOpen]);

  const handleInspect = async (repoName: string, dir: string) => {
    try {
      setInspecting(true);
      const res = await inspectRepository(repoName, dir || undefined);
      setDetectedStack(res);
    } catch (err: any) {
      setDetectedStack({ type: null, path: dir || "root" });
    } finally {
      setInspecting(false);
    }
  };

  const handleImportClick = (repoFullName: string) => {
    setFullName(repoFullName);
    setAppDirectory("");
    setInstallCommand("");
    setBuildCommand("");
    setProductionUrl("");
    setStep("configure");
    handleInspect(repoFullName, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName) return;

    try {
      setLoading(true);
      setError(null);
      await connectRepository(
        fullName,
        appDirectory.trim() || undefined,
        buildCommand.trim() || undefined,
        installCommand.trim() || undefined,
        productionUrl.trim() || undefined
      );
      
      await loadRepos();
      onRepoUpdated();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to connect repository");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredRepos = userGitHubRepos.filter(repo => 
    repo.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex w-full max-w-[800px] flex-col rounded-xl border border-[#333] bg-[#000] shadow-2xl overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#333] px-6 py-4 shrink-0">
          <div className="flex items-center gap-3">
            {step === "configure" && (
              <Button variant="ghost" size="icon" onClick={() => setStep("list")} className="mr-2 h-8 w-8 hover:bg-[#222]">
                <ChevronLeft className="h-4 w-4" />
              </Button>
            )}
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">
              {step === "list" ? "Let's build something new" : "Configure Project"}
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-[#222]"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === "list" ? (
            <div className="space-y-6 max-w-3xl mx-auto">
              <div>
                <h3 className="text-lg font-semibold text-white mb-4 tracking-tight">Import Git Repository</h3>
                <div className="border border-[#333] rounded-lg overflow-hidden bg-[#0a0a0a]">
                  <div className="flex flex-col sm:flex-row items-center gap-3 p-3 border-b border-[#333] bg-[#050505]">
                    <div className="flex items-center gap-2 px-3 py-2 bg-[#111] border border-[#333] rounded-md shrink-0 w-full sm:w-auto">
                      <GithubIcon className="h-4 w-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-200">
                        {user ? user.username : "GitHub"}
                      </span>
                    </div>
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <Input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 bg-[#111] border-[#333] text-sm text-white"
                      />
                    </div>
                  </div>
                  
                  <div className="divide-y divide-[#222] max-h-[60vh] overflow-y-auto">
                    {filteredRepos.length > 0 ? (
                      filteredRepos.map((repo) => {
                        const isConnected = repositories.some(r => r.fullName === repo.fullName);
                        return (
                          <div key={repo.id} className="flex items-center justify-between p-4 hover:bg-[#111] transition-colors">
                            <div className="flex items-center gap-3">
                              <GithubIcon className="h-6 w-6 text-slate-300" />
                              <div className="flex flex-col">
                                <span className="font-semibold text-slate-200 text-sm">{repo.name}</span>
                                <span className="text-xs text-slate-500">
                                  {repo.private ? "Private" : "Public"}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant={isConnected ? "outline" : "default"}
                              size="sm"
                              disabled={isConnected}
                              onClick={() => handleImportClick(repo.fullName)}
                              className={isConnected ? "border-[#333] text-slate-400" : "bg-white text-black hover:bg-neutral-200"}
                            >
                              {isConnected ? "Imported" : "Import"}
                            </Button>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-8 text-center text-slate-500 text-sm">
                        No repositories found.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="flex items-center gap-4 border border-[#333] p-4 rounded-lg bg-[#0a0a0a]">
                  <GithubIcon className="h-8 w-8 text-white" />
                  <div>
                    <h3 className="text-lg font-bold text-white">{fullName}</h3>
                    <a href={`https://github.com/${fullName}`} target="_blank" rel="noreferrer" className="text-sm text-slate-400 hover:text-white flex items-center gap-1">
                      {fullName} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>

                <div className="border border-[#333] rounded-lg p-6 space-y-5 bg-[#0a0a0a]">
                  <h4 className="font-semibold text-white">Configure Build Settings</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Framework Preset
                    </label>
                    <div className="rounded-md border border-[#333] p-3 text-sm text-slate-400 bg-[#111]">
                      {inspecting ? "Detecting framework..." : detectedStack?.type || "Other (configure manually)"}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Root Directory
                    </label>
                    <Input
                      type="text"
                      placeholder="./"
                      value={appDirectory}
                      onChange={(e) => setAppDirectory(e.target.value)}
                      className="bg-[#111] border-[#333] font-mono text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Build Command
                    </label>
                    <Input
                      type="text"
                      placeholder="`npm run build` or `npm run vercel-build`"
                      value={buildCommand}
                      onChange={(e) => setBuildCommand(e.target.value)}
                      className="bg-[#111] border-[#333] font-mono text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Install Command
                    </label>
                    <Input
                      type="text"
                      placeholder="`npm install`, `yarn install` etc."
                      value={installCommand}
                      onChange={(e) => setInstallCommand(e.target.value)}
                      className="bg-[#111] border-[#333] font-mono text-sm text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Production URL
                    </label>
                    <Input
                      type="text"
                      placeholder="For comparing visual changes"
                      value={productionUrl}
                      onChange={(e) => setProductionUrl(e.target.value)}
                      className="bg-[#111] border-[#333] font-mono text-sm text-white"
                    />
                  </div>

                  {error && (
                    <div className="p-3 rounded-md bg-red-950/50 border border-red-900/50 text-red-400 text-sm">
                      {error}
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-white text-black hover:bg-neutral-200 py-6 text-base font-semibold mt-4"
                  >
                    {loading ? "Deploying..." : "Deploy"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
