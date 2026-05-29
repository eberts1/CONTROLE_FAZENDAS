'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FarmFinanceTrendsDto } from '@controle-fazendas/shared';
import { formatCurrency } from '@/lib/utils';
import { CHART_COLORS, formatMonthLabel } from './chart-theme';

interface FinanceTrendChartProps {
  trends?: FarmFinanceTrendsDto;
  loading?: boolean;
}

export function FinanceTrendChart({ trends, loading }: FinanceTrendChartProps) {
  const data =
    trends?.points.map((p) => ({
      month: formatMonthLabel(p.month),
      receita: p.totalRevenue,
      despesa: p.totalExpense,
      saldo: p.balance,
    })) ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Receita vs despesa (últimos meses)</CardTitle>
      </CardHeader>
      <CardContent className="min-h-[260px]">
        {loading ? (
          <div className="h-[240px] animate-pulse rounded bg-muted" />
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem lançamentos no período.</p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCurrency(v)} width={72} />
                <Tooltip formatter={(value) => formatCurrency(Number(value) || 0)} />
                <Legend />
                <Bar dataKey="receita" fill={CHART_COLORS.revenue} name="Receita" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesa" fill={CHART_COLORS.expense} name="Despesa" radius={[4, 4, 0, 0]} />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  stroke={CHART_COLORS.balance}
                  strokeWidth={2}
                  name="Saldo"
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {data.map((row) => (
                <li key={row.month}>
                  {row.month}: receita {formatCurrency(row.receita)}, despesa{' '}
                  {formatCurrency(row.despesa)}, saldo {formatCurrency(row.saldo)}
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
