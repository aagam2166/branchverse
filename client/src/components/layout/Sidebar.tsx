import { FolderGit2, Activity, Settings, GitPullRequest, LayoutDashboard, Search } from "lucide-react";
import { cn } from "../../lib/utils.js";

interface SidebarProps {}

export function Sidebar(_props: SidebarProps) {
  return (
    <aside className="w-64 border-r border-[#222] bg-[#0a0a0a] flex-shrink-0 hidden md:flex flex-col h-[calc(100vh-65px)] sticky top-[65px]">
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#888]" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-[#111] border border-[#333] rounded-md pl-9 pr-4 py-2 text-sm text-white placeholder-[#888] focus:outline-none focus:border-[#555] focus:ring-1 focus:ring-[#555] transition-all"
          />
        </div>
      </div>
      
      <nav className="flex-1 px-3 space-y-1">
        <p className="px-3 text-xs font-semibold text-[#888] mb-2 mt-4 uppercase tracking-wider">Overview</p>
        <NavItem icon={<LayoutDashboard size={16} />} label="Projects" active />
        <NavItem icon={<Activity size={16} />} label="Deployments" />
        <NavItem icon={<GitPullRequest size={16} />} label="Pull Requests" />
        
        <p className="px-3 text-xs font-semibold text-[#888] mb-2 mt-6 uppercase tracking-wider">Settings</p>
        <NavItem icon={<FolderGit2 size={16} />} label="Connections" />
        <NavItem icon={<Settings size={16} />} label="General" />
      </nav>
      
      <div className="p-4 border-t border-[#222]">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-bold text-white">
            B
          </div>
          <div>
            <p className="text-sm font-medium text-white">Aagam's Workspace</p>
            <p className="text-xs text-[#888]">Pro Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ icon, label, active }: { icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
        active 
          ? "bg-[#222] text-white font-medium" 
          : "text-[#a1a1aa] hover:bg-[#111] hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
