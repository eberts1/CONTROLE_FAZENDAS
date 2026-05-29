'use client';

import Link from 'next/link';
import type { UseQueryResult } from '@tanstack/react-query';
import type {
  FarmFinanceByAreaSummaryDto,
  FarmFinanceSummaryDto,
  FarmFinanceTrendsDto,
  InstallmentsSummaryDto,
} from '@controle-fazendas/shared';
import { ArrowDownCircle, ArrowUpCircle, Scale, AlertTriangle } from 'lucide-react';
import { DashboardSection } from '../dashboard-section';
import { DashboardKpiCard } from '../dashboard-kpi-card';
import { FinanceTrendChart } from '../charts/finance-trend-chart';
import { FinanceSectionChart } from '../charts/finance-section-chart';
import { FinanceAreaChart } from '../charts/finance-area-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

interface FinanceDashboardSectionProps {
  summary: UseQueryResult<FarmFinanceSummaryDto>;
  byArea: UseQueryResult<FarmFinanceByAreaSummaryDto>;
  trends: UseQueryResult<FarmFinanceTrendsDto>;
  installments: UseQueryResult<InstallmentsSummaryDto>;
}

export function FinanceDashboardSection({
  summary,
  byArea,
  trends,
  installments,
}: FinanceDashboardSectionProps) {
  const fin = summary.data;
  const inst = installments.data;

  return (
    <DashboardSection
      id="financeiro"
      title="Financeiro"
      description="Receitas, despesas e fluxo do mês — por seção, área e tendência."
      detailHref="/dashboard/financeiro"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <DashboardKpiCard
          label="Receita (mês)"
          value={formatCurrency(fin?.totalRevenue ?? 0)}
          icon={ArrowUpCircle}
          valueClassName="text-green-600"
          loading={summary.isLoading}
        />
        <DashboardKpiCard
          label="Despesa (mês)"
          value={formatCurrency(fin?.totalExpense ?? 0)}
          icon={ArrowDownCircle}
          valueClassName="text-red-600"
          loading={summary.isLoading}
        />
        <DashboardKpiCard
          label="Saldo (mês)"
          value={formatCurrency(fin?.balance ?? 0)}
          icon={Scale}
          valueClassName={(fin?.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}
          loading={summary.isLoading}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FinanceSectionChart summary={fin} loading={summary.isLoading} />
        <FinanceAreaChart data={byArea.data} loading={byArea.isLoading} />
      </div>

      <FinanceTrendChart trends={trends.data} loading={trends.isLoading} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Parcelas a receber</CardTitle>
          <Link href="/dashboard/parcelas" className="text-xs text-primary hover:underline">
            Ver parcelas
          </Link>
        </CardHeader>
        <CardContent>
          {installments.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-muted-foreground">Em aberto</p>
                <p className="text-lg font-bold tabular-nums">
                  {inst?.openCount ?? 0}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    ({formatCurrency(inst?.openAmount ?? 0)})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Vencidas
                </p>
                <p className="text-lg font-bold tabular-nums text-red-600">
                  {inst?.overdueCount ?? 0}
                  <span className="ml-1 text-sm font-normal">
                    ({formatCurrency(inst?.overdueAmount ?? 0)})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencem no mês</p>
                <p className="text-lg font-bold tabular-nums">
                  {inst?.dueThisMonthCount ?? 0}
                  <span className="ml-1 text-sm font-normal text-muted-foreground">
                    ({formatCurrency(inst?.dueThisMonthAmount ?? 0)})
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagas</p>
                <p className="text-lg font-bold tabular-nums text-emerald-600">
                  {inst?.paidCount ?? 0}
                  <span className="ml-1 text-sm font-normal">
                    ({formatCurrency(inst?.paidAmount ?? 0)})
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardSection>
  );
}
