'use client';

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FarmEventsExecutiveSummaryDto } from '@controle-fazendas/shared';
import { farmEventStatusLabels, formatCurrency } from '@/lib/utils';
import { CHART_COLORS } from './chart-theme';

interface EventsPipelineChartProps {
  summary?: FarmEventsExecutiveSummaryDto;
  loading?: boolean;
}

export function EventsPipelineChart({ summary, loading }: EventsPipelineChartProps) {
  const statusData =
    summary?.byStatus
      .filter((row) => row.count > 0)
      .map((row) => ({
        name: farmEventStatusLabels[row.status] ?? row.status,
        count: row.count,
      })) ?? [];

  const topData =
    summary?.topByRevenue.map((row) => ({
      name: row.name.length > 24 ? `${row.name.slice(0, 22)}…` : row.name,
      receita: row.totalSales,
    })) ?? [];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Eventos por status</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[240px]">
          {loading ? (
            <div className="h-[220px] animate-pulse rounded bg-muted" />
          ) : statusData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento cadastrado.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" name="Eventos" radius={[4, 4, 0, 0]}>
                    {statusData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS.pie[i % CHART_COLORS.pie.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {statusData.map((row) => (
                  <li key={row.name}>
                    {row.name}: {row.count}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Top eventos por receita</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[240px]">
          {loading ? (
            <div className="h-[220px] animate-pulse rounded bg-muted" />
          ) : topData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem vendas em eventos.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={topData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis
                    type="number"
                    tickFormatter={(v) => formatCurrency(v)}
                    tick={{ fontSize: 10 }}
                  />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                  <Bar dataKey="receita" fill={CHART_COLORS.revenue} name="Receita" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {summary?.topByRevenue.map((row) => (
                  <li key={row.id}>
                    {row.name}: {formatCurrency(row.totalSales)} (lucro {formatCurrency(row.balance)})
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
