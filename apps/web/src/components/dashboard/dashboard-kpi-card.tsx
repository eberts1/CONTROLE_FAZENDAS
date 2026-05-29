'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface DashboardKpiCardProps {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  valueClassName?: string;
  loading?: boolean;
  title?: string;
}

export function DashboardKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  valueClassName,
  loading,
  title,
}: DashboardKpiCardProps) {
  return (
    <Card title={title}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        ) : (
          <>
            <div className={cn('text-2xl font-bold tabular-nums', valueClassName)}>{value}</div>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
