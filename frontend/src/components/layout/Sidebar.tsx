import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, CalendarCheck, Code2, FileText, GraduationCap,
  BookMarked, Target, Briefcase, Library, BarChart2,
  Network, Settings, ChevronLeft, ChevronRight, LogOut, User
} from 'lucide-react';
import { Github } from '../ui/BrandIcons';
import { cn } from '../../lib/utils';
import { useUIStore } from '../../stores/uiStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../lib/api';
import { toast } from 'sonner';

const NAV = [
  { label: 'Dashboard',       path: '/',           Icon: LayoutDashboard },
  { label: 'Planner',         path: '/planner',    Icon: CalendarCheck },
  { label: 'DSA Tracker',     path: '/dsa',        Icon: Code2 },
  { label: 'Notes',           path: '/notes',      Icon: FileText },
  { label: 'Learning Hub',    path: '/learning',   Icon: GraduationCap },
  { label: 'Resources',       path: '/resources',  Icon: BookMarked },
  { label: 'Placement Prep',  path: '/placement',  Icon: Target },
  { label: 'Job Tracker',     path: '/jobs',       Icon: Briefcase },
  { label: 'Books',           path: '/books',      Icon: Library },
  { label: 'GitHub',          path: '/github',     Icon: Github },
  { label: 'Analytics',       path: '/analytics',  Icon: BarChart2 },
  { label: 'Knowledge Graph', path: '/graph',      Icon: Network },
  { label: 'Settings',        path: '/settings',   Icon: Settings },
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await api.post('/auth/logout'); } catch (_) {}
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  return (
    <aside
      className={cn(
        'flex flex-col h-screen border-r border-border transition-all duration-200 shrink-0',
        'bg-card',           // solid card color — no transparency
        sidebarCollapsed ? 'w-14' : 'w-56'
      )}
    >
      {/* ── Brand / Logo ─────────────────────────────────────────── */}
      <div className={cn(
        'flex items-center h-14 px-3 border-b border-border gap-2.5 overflow-hidden shrink-0',
        sidebarCollapsed && 'justify-center'
      )}>
        <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0 overflow-hidden">
          {user?.profile?.logoUrl ? (
            <img src={user.profile.logoUrl} alt="Logo" className="w-full h-full object-contain p-0.5" />
          ) : (
            <span className="text-primary-foreground font-bold text-sm leading-none">D</span>
          )}
        </div>
        {!sidebarCollapsed && (
          <div className="overflow-hidden">
            <span className="font-bold text-sm text-foreground tracking-tight block">DevOS</span>
            <span className="text-[10px] text-muted-foreground">Personal Workspace</span>
          </div>
        )}
      </div>

      {/* ── Nav Links ────────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {NAV.map(({ label, path, Icon }) => (
          <NavLink
            key={path}
            to={path}
            end={path === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors group',
                isActive
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                sidebarCollapsed && 'justify-center px-2'
              )
            }
            title={sidebarCollapsed ? label : undefined}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {!sidebarCollapsed && <span className="truncate text-[13px]">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <div className="border-t border-border p-2 space-y-1 shrink-0">
        {/* User info */}
        <button
          onClick={() => navigate('/settings')}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-2 rounded-md transition-colors text-left',
            'hover:bg-secondary',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? (user?.profile?.name || user?.email) : undefined}
        >
          <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
            <User className="w-3.5 h-3.5 text-primary" />
          </div>
          {!sidebarCollapsed && (
            <div className="overflow-hidden flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.profile?.name || 'User'}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-muted-foreground',
            'hover:text-destructive hover:bg-destructive/10 transition-colors text-[13px]',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!sidebarCollapsed && <span>Logout</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={toggleSidebar}
          className={cn(
            'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-muted-foreground',
            'hover:bg-secondary hover:text-foreground transition-colors text-[13px]',
            sidebarCollapsed && 'justify-center'
          )}
          title={sidebarCollapsed ? 'Expand' : 'Collapse'}
        >
          {sidebarCollapsed
            ? <ChevronRight className="w-4 h-4 shrink-0" />
            : <><ChevronLeft className="w-4 h-4 shrink-0" /><span>Collapse</span></>
          }
        </button>
      </div>
    </aside>
  );
}
