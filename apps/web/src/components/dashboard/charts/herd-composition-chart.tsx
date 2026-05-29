'use client';

import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { animalSexLabels, animalStatusLabels } from '@/lib/utils';
import { CHART_COLORS } from './chart-theme';

interface HerdCompositionChartProps {
  bySex: Array<{ sex: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
}

export function HerdCompositionChart({ bySex, byStatus }: HerdCompositionChartProps) {
  const sexData = bySex.map((row) => ({
    name: animalSexLabels[row.sex] ?? row.sex,
    value: row.count,
  }));
  const statusData = byStatus.map((row) => ({
    name: animalStatusLabels[row.status] ?? row.status,
    count: row.count,
  }));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Ativos por sexo</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[240px]">
          {sexData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={sexData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {sexData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS.pie[i % CHART_COLORS.pie.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {sexData.map((row) => (
                  <li key={row.name}>
                    {row.name}: {row.value}
                  </li>
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Rebanho por status</CardTitle>
        </CardHeader>
        <CardContent className="min-h-[240px]">
          {statusData.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem dados.</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={statusData} layout="vertical" margin={{ left: 8, right: 8 }}>
                  <XAxis type="number" allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={72} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill={CHART_COLORS.balance} radius={[0, 4, 4, 0]} />
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
    </div>
  );
}
