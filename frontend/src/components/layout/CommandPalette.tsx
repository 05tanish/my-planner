import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Command } from 'cmdk';
import {
  LayoutDashboard, CalendarCheck, Code2, FileText, GraduationCap,
  BookMarked, Target, Briefcase, Library, BarChart2,
  Network, Settings, Search
} from 'lucide-react';
import { Github } from '../ui/BrandIcons';
import { useUIStore } from '../../stores/uiStore';

export function CommandPalette() {
  const navigate = useNavigate();
  const { commandPaletteOpen, closeCommandPalette, openCommandPalette } = useUIStore();
  const [search, setSearch] = useState('');

  // Toggle with Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        if (commandPaletteOpen) {
          closeCommandPalette();
        } else {
          openCommandPalette();
        }
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [commandPaletteOpen, closeCommandPalette, openCommandPalette]);

  if (!commandPaletteOpen) return null;

  const runCommand = (action: () => void) => {
    action();
    closeCommandPalette();
    setSearch('');
  };

  const navItems = [
    { label: 'Dashboard', path: '/', Icon: LayoutDashboard },
    { label: 'Daily Planner', path: '/planner', Icon: CalendarCheck },
    { label: 'DSA Tracker', path: '/dsa', Icon: Code2 },
    { label: 'Notes', path: '/notes', Icon: FileText },
    { label: 'Learning Hub', path: '/learning', Icon: GraduationCap },
    { label: 'Resource Vault', path: '/resources', Icon: BookMarked },
    { label: 'Placement Prep', path: '/placement', Icon: Target },
    { label: 'Job Tracker', path: '/jobs', Icon: Briefcase },
    { label: 'Book Library', path: '/books', Icon: Library },
    { label: 'GitHub Tracker', path: '/github', Icon: Github },
    { label: 'Analytics', path: '/analytics', Icon: BarChart2 },
    { label: 'Knowledge Graph', path: '/graph', Icon: Network },
    { label: 'Settings', path: '/settings', Icon: Settings },
  ];

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[15vh]"
      onClick={closeCommandPalette}
    >
      <div
        className="w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command className="flex flex-col h-full max-h-[350px]">
          <div className="flex items-center border-b border-border px-3">
            <Search className="w-4 h-4 text-muted-foreground shrink-0 mr-2" />
            <Command.Input
              autoFocus
              placeholder="Search sections or actions..."
              value={search}
              onValueChange={setSearch}
              className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
            />
          </div>

          <Command.List className="max-h-[300px] overflow-y-auto p-2 space-y-1">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            <Command.Group heading="Navigation" className="text-xs font-semibold text-muted-foreground px-2 py-1">
              {navItems.map((item) => (
                <Command.Item
                  key={item.path}
                  value={item.label}
                  onSelect={() => runCommand(() => navigate(item.path))}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-foreground hover:bg-secondary cursor-pointer transition-colors"
                >
                  <item.Icon className="w-4 h-4 text-primary shrink-0" />
                  <span>{item.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
