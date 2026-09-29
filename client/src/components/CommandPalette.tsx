import { useState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Command } from 'cmdk';
import * as D from '@radix-ui/react-dialog';
import { ArrowRight, Camera, FileText, FolderKanban, LayoutDashboard, Search, Settings } from 'lucide-react';
import { q } from '@/api/queries';
import { useUiStore } from '@/store/ui';
import { Kbd } from '@/components/ui/Misc';

const itemCls =
  'flex h-10 cursor-pointer items-center gap-3 rounded-md px-3 text-meta text-ink-2 aria-selected:bg-surface-hover aria-selected:text-ink [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-ink-3';
const groupCls =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:text-label [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase';

export function CommandPalette() {
  const open = useUiStore((s) => s.isCommandOpen);
  const setOpen = useUiStore((s) => s.setCommandOpen);
  const navigate = useNavigate();
  const match = useMatch('/projects/:projectId/*');
  const [search, setSearch] = useState('');
  const { data: projects } = useQuery({ ...q.projects({ limit: 50 }), enabled: open });
  const currentProjectId = match?.params.projectId || projects?.items[0]?._id;

  const go = (to: string) => {
    setOpen(false);
    setSearch('');
    navigate(to);
  };

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-scrim" />
        <D.Content
          aria-describedby={undefined}
          className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-line bg-surface shadow-lg focus:outline-none data-[state=open]:animate-[dialog-in_var(--dur-base)_var(--ease-out)]"
        >
          <D.Title className="sr-only">Command palette</D.Title>
          <Command label="Command palette" loop>
            <div className="flex items-center gap-2 border-b border-line px-4">
              <Search className="size-4 text-ink-3" aria-hidden />
              <Command.Input
                value={search}
                onValueChange={setSearch}
                placeholder="Search evidence, jump to a project or page…"
                className="h-12 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-3"
              />
              <Kbd>Esc</Kbd>
            </div>
            <Command.List className="scrollbar-thin max-h-[min(60vh,420px)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-meta text-ink-3">No matches. Try a project name.</Command.Empty>
              {search.trim() && currentProjectId && (
                <Command.Group heading="Evidence" className={groupCls}>
                  <Command.Item
                    value={`search-evidence ${search}`}
                    onSelect={() => go(`/projects/${currentProjectId}/evidence?q=${encodeURIComponent(search.trim())}`)}
                    className={itemCls}
                  >
                    <Camera aria-hidden />
                    <span className="flex-1 truncate">
                      Search evidence for “<b className="text-ink">{search.trim()}</b>”
                    </span>
                    <ArrowRight aria-hidden />
                  </Command.Item>
                </Command.Group>
              )}
              <Command.Group heading="Pages" className={groupCls}>
                <Command.Item onSelect={() => go('/dashboard')} className={itemCls}>
                  <LayoutDashboard aria-hidden /> Dashboard
                </Command.Item>
                <Command.Item onSelect={() => go('/projects')} className={itemCls}>
                  <FolderKanban aria-hidden /> All projects
                </Command.Item>
                {currentProjectId && (
                  <Command.Item onSelect={() => go(`/projects/${currentProjectId}/reports`)} className={itemCls}>
                    <FileText aria-hidden /> Reports for current project
                  </Command.Item>
                )}
                <Command.Item onSelect={() => go('/settings')} className={itemCls}>
                  <Settings aria-hidden /> Settings
                </Command.Item>
              </Command.Group>
              {!!projects?.items.length && (
                <Command.Group heading="Projects" className={groupCls}>
                  {projects.items.map((p) => (
                    <Command.Item key={p._id} value={`project ${p.name} ${p.organization}`} onSelect={() => go(`/projects/${p._id}`)} className={itemCls}>
                      <FolderKanban aria-hidden />
                      <span className="flex-1 truncate">{p.name}</span>
                      <span className="truncate text-label text-ink-3">{p.organization}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
