'use client';

import * as React from 'react';
import { FarmDto, UserDto } from '@controle-fazendas/shared';

type FarmContextType = {
  user: UserDto | null;
  farms: FarmDto[];
  activeFarmId: string | null;
  setActiveFarmId: (id: string) => void;
  setSession: (user: UserDto, farms: FarmDto[]) => void;
  clearSession: () => void;
};

const FarmContext = React.createContext<FarmContextType | null>(null);

export function FarmProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<UserDto | null>(null);
  const [farms, setFarms] = React.useState<FarmDto[]>([]);
  const [activeFarmId, setActiveFarmIdState] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const storedUser = localStorage.getItem('user');
    const storedFarms = localStorage.getItem('farms');
    const storedFarmId = localStorage.getItem('activeFarmId');
    if (storedUser) setUser(JSON.parse(storedUser));
    if (storedFarms) {
      const parsed: FarmDto[] = JSON.parse(storedFarms);
      setFarms(parsed);
      if (storedFarmId && parsed.some((f) => f.id === storedFarmId)) {
        setActiveFarmIdState(storedFarmId);
      } else if (parsed.length > 0) {
        setActiveFarmIdState(parsed[0].id);
      }
    }
  }, []);

  const setActiveFarmId = React.useCallback((id: string) => {
    setActiveFarmIdState(id);
    localStorage.setItem('activeFarmId', id);
  }, []);

  const setSession = React.useCallback((u: UserDto, f: FarmDto[]) => {
    setUser(u);
    setFarms(f);
    localStorage.setItem('user', JSON.stringify(u));
    localStorage.setItem('farms', JSON.stringify(f));
    if (f.length > 0) {
      setActiveFarmId(f[0].id);
    }
  }, [setActiveFarmId]);

  const clearSession = React.useCallback(() => {
    setUser(null);
    setFarms([]);
    setActiveFarmIdState(null);
  }, []);

  return (
    <FarmContext.Provider
      value={{ user, farms, activeFarmId, setActiveFarmId, setSession, clearSession }}
    >
      {children}
    </FarmContext.Provider>
  );
}

export function useFarmContext() {
  const ctx = React.useContext(FarmContext);
  if (!ctx) throw new Error('useFarmContext must be used within FarmProvider');
  return ctx;
}
