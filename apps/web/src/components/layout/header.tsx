'use client';

import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ThemeToggle } from './theme-toggle';
import { useFarmContext } from '@/hooks/use-farm-context';
import { logout } from '@/lib/auth';

export function Header() {
  const router = useRouter();
  const { user, farms, activeFarmId, setActiveFarmId } = useFarmContext();

  async function handleLogout() {
    await logout();
    router.push('/login');
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex items-center gap-4">
        {farms.length > 0 && (
          <Select value={activeFarmId ?? undefined} onValueChange={setActiveFarmId}>
            <SelectTrigger className="w-[220px]">
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
      <div className="flex items-center gap-3">
        {user && <span className="hidden text-sm text-muted-foreground sm:inline">{user.name}</span>}
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Sair">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
}
