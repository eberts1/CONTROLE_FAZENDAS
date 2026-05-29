import {
  LayoutDashboard,
  Map,
  Tractor,
  ClipboardList,
  Building2,
  Beef,
  Dna,
  GitBranch,
  Users,
  CalendarDays,
  Wallet,
  Receipt,
  UserCog,
  type LucideIcon,
} from 'lucide-react';

export type NavLink = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/fazendas', label: 'Fazendas', icon: Building2 },
  { href: '/dashboard/areas', label: 'Áreas', icon: Map },
  { href: '/dashboard/processos', label: 'Processos', icon: Tractor },
  { href: '/dashboard/registros', label: 'Registros', icon: ClipboardList },
  { href: '/dashboard/animais', label: 'Animais', icon: Beef },
  { href: '/dashboard/parceiros', label: 'Parceiros', icon: Users },
  { href: '/dashboard/eventos', label: 'Eventos', icon: CalendarDays },
  { href: '/dashboard/parcelas', label: 'Parcelas', icon: Receipt },
  { href: '/dashboard/financeiro', label: 'Financeiro', icon: Wallet },
  { href: '/dashboard/parentesco', label: 'Parentesco', icon: GitBranch },
  { href: '/dashboard/material-genetico', label: 'Material Genético', icon: Dna },
];

export const adminNavLinks: NavLink[] = [
  { href: '/dashboard/usuarios', label: 'Usuários', icon: UserCog },
];

export function isNavLinkActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}
