'use client';

import { useQuery } from '@tanstack/react-query';
import { Map, Tractor, ClipboardList, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { formatDate } from '@/lib/utils';

interface FarmStats {
  areasCount: number;
  processesCount: number;
  recordsCount: number;
  recentRecords: Array<{
    id: string;
    performedAt: string;
    notes: string | null;
    process: { name: string };
    area: { name: string };
  }>;
}

export default function DashboardPage() {
  const { activeFarmId, farms } = useFarmContext();
  const activeFarm = farms.find((f) => f.id === activeFarmId);

  const { data: stats, isLoading } = useQuery({
    queryKey: ['farm-stats', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<FarmStats>(`/farms/${activeFarmId}/stats`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione ou cadastre uma fazenda para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {activeFarm?.name}
          {activeFarm?.location ? ` — ${activeFarm.location}` : ''}
        </p>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando estatísticas...</p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Fazendas</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{farms.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Áreas</CardTitle>
                <Map className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.areasCount ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Processos</CardTitle>
                <Tractor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.processesCount ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Registros</CardTitle>
                <ClipboardList className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.recordsCount ?? 0}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Registros recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {!stats?.recentRecords?.length ? (
                <p className="text-sm text-muted-foreground">Nenhum registro ainda.</p>
              ) : (
                <div className="space-y-3">
                  {stats.recentRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col gap-1 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">
                          {record.process.name} — {record.area.name}
                        </p>
                        {record.notes && (
                          <p className="text-sm text-muted-foreground">{record.notes}</p>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(record.performedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
