'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Map, Tractor, ClipboardList, Building2, Beef, Dna, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/fazendas', label: 'Fazendas', icon: Building2 },
  { href: '/dashboard/areas', label: 'Áreas', icon: Map },
  { href: '/dashboard/processos', label: 'Processos', icon: Tractor },
  { href: '/dashboard/registros', label: 'Registros', icon: ClipboardList },
  { href: '/dashboard/animais', label: 'Animais', icon: Beef },
  { href: '/dashboard/parentesco', label: 'Parentesco', icon: GitBranch },
  { href: '/dashboard/material-genetico', label: 'Material Genético', icon: Dna },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-card md:flex md:flex-col">
      <div className="flex h-16 items-center border-b px-6">
        <span className="text-lg font-bold text-primary">Controle Fazendas</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-4">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-accent',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
