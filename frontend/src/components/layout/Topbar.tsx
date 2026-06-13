import { useLocation } from 'react-router-dom';
import { Search, Bell, Command } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';

const PAGE_TITLES: Record<string, { title: string; desc: string }> = {
  '/':          { title: 'Dashboard',      desc: 'Your productivity overview'            },
  '/planner':   { title: 'Daily Planner',  desc: 'Manage tasks by scope & priority'      },
  '/dsa':       { title: 'DSA Tracker',    desc: 'Solve problems, track revisions'       },
  '/notes':     { title: 'Notes',          desc: 'Capture & organize your knowledge'     },
  '/learning':  { title: 'Learning Hub',   desc: 'Track what you\'re studying'           },
  '/resources': { title: 'Resource Vault', desc: 'Bookmarks, PDFs & references'          },
  '/placement': { title: 'Placement Prep', desc: 'CS fundamentals & interview prep'      },
  '/jobs':      { title: 'Job Tracker',    desc: 'Track applications & follow-ups'       },
  '/books':     { title: 'Book Library',   desc: 'Read, annotate & track your books'     },
  '/github':    { title: 'GitHub Activity',desc: 'Commits, streaks & project log'        },
  '/analytics': { title: 'Analytics',      desc: 'Insights into your productivity'       },
  '/graph':     { title: 'Knowledge Graph',desc: 'Visualize connections in your notes'   },
  '/settings':  { title: 'Settings',       desc: 'Profile, preferences & integrations'   },
};

export function Topbar() {
  const { pathname }           = useLocation();
  const { openCommandPalette } = useUIStore();
  const { user }               = useAuthStore();
  const page = PAGE_TITLES[pathname] ?? { title: 'DevOS', desc: '' };

  return (
    <header className="h-14 border-b border-border flex items-center justify-between px-5 bg-background shrink-0">
      {/* Left: page title */}
      <div className="flex flex-col">
        <h1 className="text-sm font-semibold text-foreground leading-tight">{page.title}</h1>
        {page.desc && (
          <span className="text-[10px] text-muted-foreground hidden sm:block">{page.desc}</span>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        {/* Command palette trigger */}
        <button
          onClick={openCommandPalette}
          id="command-palette-trigger"
          className={cn(
            'flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs',
            'border border-border bg-secondary text-muted-foreground',
            'hover:border-primary/40 hover:text-foreground hover:bg-accent'
          )}
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-mono bg-background rounded border border-border text-muted-foreground">
            <Command className="w-2.5 h-2.5" />K
          </kbd>
        </button>

        {/* Notification bell */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-secondary"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </Button>

        {/* User avatar (small) */}
        <div
          className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center cursor-pointer"
          title={user?.profile?.name || user?.email}
        >
          <span className="text-[10px] font-bold text-primary uppercase">
            {(user?.profile?.name || user?.email || 'U').charAt(0)}
          </span>
        </div>
      </div>
    </header>
  );
}
