import { Search, Filter } from "lucide-react";
import { Input } from "../ui/input.js";

interface FilterBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
}: FilterBarProps) {
  const filters = [
    { label: "All", value: "ALL" },
    { label: "Live Previews", value: "LIVE" },
    { label: "Building", value: "BUILDING" },
    { label: "Failed", value: "BUILD_FAILED" },
    { label: "Closed / Merged", value: "CLOSED" },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type="text"
          placeholder="Search by PR title, branch, author, or #number..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 bg-slate-900/70 border-slate-800 text-sm focus-visible:ring-cyan-500/50"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 mr-1 text-sm text-slate-400">
          <Filter className="h-4 w-4 text-slate-500" />
          <span>Status:</span>
        </div>
        {filters.map((filter) => {
          const isActive = statusFilter === filter.value;
          return (
            <button
              key={filter.value}
              onClick={() => onStatusFilterChange(filter.value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-white text-black border border-white shadow-sm"
                  : "bg-slate-900/60 text-slate-400 border border-slate-800 hover:bg-slate-800/60 hover:text-slate-200"
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
