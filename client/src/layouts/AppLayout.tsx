import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useMatch, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useShallow } from 'zustand/react/shallow';
import * as D from '@radix-ui/react-dialog';
import {
  BarChart3,
  Camera,
  ChevronsUpDown,
  CalendarRange,
  FileText,
  FolderKanban,
  GitCompareArrows,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  MapPinned,
  Menu as MenuIcon,
  Monitor,
  Moon,
  Search,
  Settings,
  SlidersHorizontal,
  Sun,
  X,
} from 'lucide-react';
import { q } from '@/api/queries';
import { ROLE_LABEL, useAuthStore } from '@/store/auth';
import { resolveTheme, useUiStore, type ThemePreference } from '@/store/ui';
import { cn, initials } from '@/lib/utils';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Kbd, Menu, MenuItem, MenuSeparator, Tooltip } from '@/components/ui/Misc';
import { CommandPalette } from '@/components/CommandPalette';

const PROJECT_NAV = [
  { to: '', label: 'Overview', icon: BarChart3, end: true },
  { to: 'evidence', label: 'Evidence Explorer', icon: Camera },
  { to: 'timeline', label: 'Timeline', icon: CalendarRange },
  { to: 'locations', label: 'Locations', icon: MapPinned },
  { to: 'compare', label: 'Before / After', icon: GitCompareArrows },
  { to: 'insights', label: 'AI Insights', icon: Lightbulb },
  { to: 'reports', label: 'Reports', icon: FileText },
  { to: 'settings', label: 'Project settings', icon: SlidersHorizontal },
];

const navItemCls = ({ isActive }: { isActive: boolean }) =>
  cn(
    'touch-target flex h-9 items-center gap-2.5 rounded-md px-3 text-meta font-medium text-ink-2 transition-colors duration-[var(--dur-fast)] hover:bg-surface-hover hover:text-ink [&_svg]:size-4 [&_svg]:shrink-0',
    isActive && 'bg-accent-soft font-semibold text-accent hover:bg-accent-soft hover:text-accent',
  );

function useThemeEffect() {
  const theme = useUiStore((s) => s.theme);
  useEffect(() => {
    const apply = () => (document.documentElement.dataset.theme = resolveTheme(theme));
    apply();
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [theme]);
}

function ProjectSwitcher({ projectId }: { projectId: string }) {
  const { data: project } = useQuery(q.project(projectId));
  const { data: list } = useQuery(q.projects({ limit: 50 }));
  const navigate = useNavigate();
  return (
    <Menu
      align="start"
      trigger={
        <button
          type="button"
          className="touch-target flex w-full items-center gap-2.5 rounded-md border border-line bg-surface px-2.5 py-2 text-left transition-colors hover:border-line-hover"
          aria-label="Switch project"
        >
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-accent-soft font-display text-xs font-bold text-accent">
            {initials(project?.name)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-meta font-semibold">{project?.name || 'Loading…'}</span>
            <span className="block truncate text-label text-ink-3">{project?.organization}</span>
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-ink-3" aria-hidden />
        </button>
      }
    >
      {(list?.items || []).map((p) => (
        <MenuItem key={p._id} onSelect={() => navigate(`/projects/${p._id}`)}>
          <span className="truncate">{p.name}</span>
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem icon={<FolderKanban />} onSelect={() => navigate('/projects')}>
        All projects
      </MenuItem>
    </Menu>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const match = useMatch('/projects/:projectId/*');
  const projectId = match?.params.projectId;
  const { data: health } = useQuery(q.health());
  const demoMode = health && (health.aiProvider === 'mock' || health.cloudinary !== 'configured');
  return (
    <div className="flex h-full min-h-dvh flex-col gap-6 px-3 pt-5 pb-3">
      <Link to="/dashboard" onClick={onNavigate} className="px-2" aria-label="ImpactLens dashboard">
        <Logo />
      </Link>
      <nav aria-label="Main" className="grid gap-0.5">
        <NavLink to="/dashboard" className={navItemCls} onClick={onNavigate}>
          <LayoutDashboard aria-hidden /> Dashboard
        </NavLink>
        <NavLink to="/projects" end className={navItemCls} onClick={onNavigate}>
          <FolderKanban aria-hidden /> Projects
        </NavLink>
      </nav>
      {projectId && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-2">
          <div className="px-3 text-label font-semibold tracking-[0.08em] text-ink-3 uppercase">Project</div>
          <ProjectSwitcher projectId={projectId} />
          <nav aria-label="Project" className="grid gap-0.5">
            {PROJECT_NAV.map(({ to, label, icon: Icon, end }) => (
              <NavLink key={label} to={`/projects/${projectId}${to ? `/${to}` : ''}`} end={end} className={navItemCls} onClick={onNavigate}>
                <Icon aria-hidden /> {label}
              </NavLink>
            ))}
          </nav>
        </div>
      )}
      <div className="mt-auto grid gap-2">
        {demoMode && (
          <Tooltip content={health.aiProvider === 'mock' ? 'AI analysis uses the deterministic mock provider; labels are for demonstration.' : 'Real AI is on. Media is stored on the API server until Cloudinary is configured (see Settings).'}>
            <div tabIndex={0} className="rounded-md border border-dashed border-warning bg-warning-soft px-3 py-2 text-label leading-snug text-warning">
              <b className="font-semibold">{health.aiProvider === 'mock' ? 'Demo mode' : 'Setup'}</b> · AI: {health.aiProvider} · Media:{' '}
              {health.cloudinary === 'configured' ? 'Cloudinary' : health.cloudinary === 'misconfigured' ? 'local (check Cloudinary)' : 'local'}
            </div>
          </Tooltip>
        )}
        <NavLink to="/settings" className={navItemCls} onClick={onNavigate}>
          <Settings aria-hidden /> Settings
        </NavLink>
        <UserMenu />
      </div>
    </div>
  );
}

function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const themes: Array<{ v: ThemePreference; label: string; icon: JSX.Element }> = [
    { v: 'light', label: 'Light theme', icon: <Sun /> },
    { v: 'dark', label: 'Dark theme', icon: <Moon /> },
    { v: 'system', label: 'Match system', icon: <Monitor /> },
  ];
  return (
    <Menu
      align="start"
      trigger={
        <button type="button" className="touch-target flex w-full items-center gap-2.5 rounded-md border-t border-line px-2 pt-3 pb-1 text-left" aria-label="Account menu">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-claimed-soft text-xs font-bold text-claimed">{initials(user?.name)}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-meta font-semibold">{user?.name}</span>
            <span className="block truncate text-label text-ink-3">{user ? ROLE_LABEL[user.role] : ''}</span>
          </span>
          <ChevronsUpDown className="size-4 text-ink-3" aria-hidden />
        </button>
      }
    >
      <div className="px-2.5 py-2 text-meta text-ink-3">{user?.email}</div>
      <MenuSeparator />
      {themes.map((t) => (
        <MenuItem key={t.v} icon={t.icon} onSelect={() => setTheme(t.v)}>
          {t.label}
          {theme === t.v && <span className="ml-auto text-label text-accent">Active</span>}
        </MenuItem>
      ))}
      <MenuSeparator />
      <MenuItem
        icon={<LogOut />}
        onSelect={async () => {
          await logout();
          navigate('/login', { replace: true });
        }}
      >
        Sign out
      </MenuItem>
    </Menu>
  );
}

export function AppLayout() {
  useThemeEffect();
  const { isNavOpen, openNav, closeNav, toggleCommand } = useUiStore(
    useShallow((s) => ({ isNavOpen: s.isNavOpen, openNav: s.openNav, closeNav: s.closeNav, toggleCommand: s.toggleCommand })),
  );
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => closeNav(), [location.pathname, closeNav]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleCommand();
      }
    };
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll);
    };
  }, [toggleCommand]);

  return (
    <div className="min-h-dvh bg-bg">
      <a href="#main" className="sr-only z-[70] rounded-md bg-accent px-3 py-2 text-inverse focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Skip to content
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] overflow-y-auto border-r border-line bg-surface lg:block scrollbar-thin">
        <SidebarContent />
      </aside>

      <D.Root open={isNavOpen} onOpenChange={(o) => (o ? openNav() : closeNav())}>
        <D.Portal>
          <D.Overlay className="fixed inset-0 z-40 bg-scrim lg:hidden" />
          <D.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-50 w-[min(85vw,var(--sidebar-w))] overflow-y-auto bg-surface shadow-lg focus:outline-none data-[state=open]:animate-[fade-in_var(--dur-base)_var(--ease-out)] lg:hidden">
            <D.Title className="sr-only">Navigation</D.Title>
            <D.Close asChild>
              <Button variant="ghost" size="icon-sm" className="absolute top-4 right-3" aria-label="Close navigation">
                <X />
              </Button>
            </D.Close>
            <SidebarContent onNavigate={closeNav} />
          </D.Content>
        </D.Portal>
      </D.Root>

      <div className="lg:pl-[var(--sidebar-w)]">
        <header
          className={cn(
            'no-print sticky top-0 z-20 flex h-[var(--topbar-h)] items-center gap-3 bg-bg/90 px-8 backdrop-blur-sm transition-[border-color] max-sm:px-4',
            scrolled ? 'border-b border-line' : 'border-b border-transparent',
          )}
        >
          <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation" onClick={openNav}>
            <MenuIcon />
          </Button>
          <button
            type="button"
            onClick={toggleCommand}
            className="touch-target flex h-9 w-full max-w-md items-center gap-2 rounded-md border border-line bg-surface px-3 text-meta text-ink-3 transition-colors hover:border-line-hover"
          >
            <Search className="size-4" aria-hidden />
            <span className="flex-1 truncate text-left">Search evidence, projects, pages…</span>
            <span className="hidden gap-1 sm:flex">
              <Kbd>Ctrl</Kbd>
              <Kbd>K</Kbd>
            </span>
          </button>
        </header>
        <main id="main" tabIndex={-1} className="mx-auto max-w-[1320px] px-8 pt-4 pb-16 focus:outline-none max-sm:px-4">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
