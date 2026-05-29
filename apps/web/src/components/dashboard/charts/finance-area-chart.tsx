'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FarmFinanceByAreaSummaryDto } from '@controle-fazendas/shared';
import { formatCurrency } from '@/lib/utils';
import { CHART_COLORS } from './chart-theme';

interface FinanceAreaChartProps {
  data?: FarmFinanceByAreaSummaryDto;
  loading?: boolean;
}

export function FinanceAreaChart({ data, loading }: FinanceAreaChartProps) {
  const rows =
    data?.byArea.map((row) => ({
      name: row.areaName,
      receita: row.revenue,
      despesa: row.expense,
      saldo: row.balance,
    })) ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Por área da fazenda (mês)</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[260px]">
        {loading ? (
          <div className="h-[240px] animate-pulse rounded bg-muted" />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem lançamentos vinculados a áreas.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(240, rows.length * 40)}>
              <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                <Bar dataKey="saldo" fill={CHART_COLORS.balance} name="Saldo" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {rows.map((row) => (
                <li key={row.name}>
                  {row.name}: receita {formatCurrency(row.receita)}, despesa{' '}
                  {formatCurrency(row.despesa)}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
