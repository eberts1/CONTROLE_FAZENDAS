'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { adminNavLinks, isNavLinkActive, navLinks } from './nav-links';
import { useFarmContext } from '@/hooks/use-farm-context';
import { Role } from '@controle-fazendas/shared';

type MobileNavProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();
  const { user } = useFarmContext();
  const isAdmin = user?.role === Role.ADMIN;
  const links = isAdmin ? [...navLinks, ...adminNavLinks] : navLinks;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[280px] max-w-[85vw] border-r p-0"
      >
        <SheetHeader className="border-b px-6 py-4 text-left">
          <SheetTitle className="text-lg font-bold text-primary">Controle Fazendas</SheetTitle>
        </SheetHeader>
        <nav className="flex flex-col gap-1 p-4">
          {links.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => onOpenChange(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-accent',
                isNavLinkActive(pathname, href)
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
