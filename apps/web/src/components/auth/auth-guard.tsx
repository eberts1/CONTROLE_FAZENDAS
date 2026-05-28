'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { getApiUrl, setAccessToken } from '@/lib/api-client';

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function init() {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        router.replace('/login');
        return;
      }

      try {
        const { data } = await axios.post(
          `${getApiUrl()}/auth/refresh`,
          { refreshToken },
          { timeout: 10_000 },
        );
        setAccessToken(data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        setReady(true);
      } catch {
        localStorage.removeItem('refreshToken');
        setAccessToken(null);
        router.replace('/login');
      }
    }

    init();
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return <>{children}</>;
}
