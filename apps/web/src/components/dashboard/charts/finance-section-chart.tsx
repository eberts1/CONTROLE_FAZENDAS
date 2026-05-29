'use client';

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { financeSectionLabels } from '@controle-fazendas/shared';
import type { FarmFinanceSummaryDto } from '@controle-fazendas/shared';
import { formatCurrency } from '@/lib/utils';
import { CHART_COLORS } from './chart-theme';

interface FinanceSectionChartProps {
  summary?: FarmFinanceSummaryDto;
  loading?: boolean;
}

export function FinanceSectionChart({ summary, loading }: FinanceSectionChartProps) {
  const data =
    summary?.bySection.map((row) => ({
      name: financeSectionLabels[row.section] ?? row.section,
      receita: row.revenue,
      despesa: row.expense,
    })) ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Por seção contábil (mês)</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[260px]">
        {loading ? (
          <div className="h-[240px] animate-pulse rounded bg-muted" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem lançamentos neste mês.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={Math.max(240, data.length * 36)}>
              <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 10 }}
                />
                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                <Bar dataKey="receita" fill={CHART_COLORS.revenue} name="Receita" stackId="a" />
                <Bar dataKey="despesa" fill={CHART_COLORS.expense} name="Despesa" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {summary?.bySection.map((row) => (
                <li key={row.section}>
                  {financeSectionLabels[row.section]}: saldo {formatCurrency(row.balance)}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
