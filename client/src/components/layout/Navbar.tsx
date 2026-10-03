import { useState, useRef, useEffect } from "react";
import { GitPullRequest, LogOut, Plus } from "lucide-react";
import type { User } from "../../services/api.js";

interface NavbarProps {

  onOpenConnectModal: () => void;
  user: User | null;
  onLogout: () => void;
  onLogin: () => void;
}

export function Navbar({ onOpenConnectModal, user, onLogout, onLogin }: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSwitchAccount = () => {
    onLogout();
    window.open("https://github.com/logout", "_blank");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#222] bg-[#0a0a0a] text-white">
      <div className="flex h-[64px] items-center justify-between px-4 sm:px-6 w-full">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-black">
              <GitPullRequest className="h-5 w-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">
              BranchVerse
            </span>
          </div>
          
          <div className="hidden md:flex items-center gap-2 ml-1">
            <span className="text-xl font-light text-[#444] mb-0.5">/</span>
            <div className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-white/5 transition-colors cursor-pointer group">
              {user ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-[#a1a1aa] group-hover:text-white transition-colors">
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                  <span className="text-base text-[#a1a1aa] font-medium group-hover:text-white transition-colors">
                    {user.username}
                  </span>
                </>
              ) : (
                <span className="text-base text-[#a1a1aa] font-medium group-hover:text-white transition-colors">
                  Workspace
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={onOpenConnectModal}
                className="hidden sm:flex h-8 items-center gap-1.5 rounded-md bg-white text-black px-3 py-1 text-sm font-medium hover:bg-neutral-200 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </button>

              <div className="relative ml-2" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 rounded-full border border-[#333] p-0.5 hover:border-[#666] transition-all cursor-pointer bg-[#111]"
                >
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.username}
                      className="h-7 w-7 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-[#222] text-[#fff] flex items-center justify-center font-bold text-xs">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                </button>

                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-md border border-[#333] bg-[#0a0a0a] p-1 shadow-xl animate-in fade-in duration-150 z-50">
                    <div className="px-3 py-2 border-b border-[#222] mb-1">
                      <p className="text-sm font-medium text-white truncate">@{user.username}</p>
                      {user.email && (
                        <p className="text-xs text-[#888] truncate">{user.email}</p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#a1a1aa] hover:text-white hover:bg-[#222] rounded transition-colors text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleSwitchAccount();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#a1a1aa] hover:text-white hover:bg-[#222] rounded transition-colors text-left"
                    >
                      <GitPullRequest className="h-4 w-4" />
                      <span>Switch Account</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={onLogin}
              className="h-8 flex items-center gap-1.5 rounded-md bg-white text-black px-4 text-sm font-medium hover:bg-neutral-200 transition-colors cursor-pointer"
            >
              <span>Login</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
