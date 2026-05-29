'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from './theme-toggle';
import { MobileNav } from './mobile-nav';
import { useFarmContext } from '@/hooks/use-farm-context';
import { logout } from '@/lib/auth';

export function Header() {
  const router = useRouter();
  const { user, farms, activeFarmId, setActiveFarmId } = useFarmContext();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <>
      <header className="flex h-16 min-w-0 items-center justify-between gap-2 border-b bg-card px-4 md:px-6">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {farms.length > 0 && (
            <Select value={activeFarmId ?? undefined} onValueChange={setActiveFarmId}>
              <SelectTrigger className="min-w-0 flex-1 sm:w-[220px] sm:flex-none">
                <SelectValue placeholder="Selecione a fazenda" />
              </SelectTrigger>
              <SelectContent>
                {farms.map((farm) => (
                  <SelectItem key={farm.id} value={farm.id}>
                    {farm.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 md:gap-3">
          {user && <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>}
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}
