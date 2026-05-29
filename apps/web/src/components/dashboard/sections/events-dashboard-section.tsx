'use client';

import Link from 'next/link';
import type { UseQueryResult } from '@tanstack/react-query';
import type { FarmEventsExecutiveSummaryDto } from '@controle-fazendas/shared';
import { Calendar, CircleDollarSign, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { DashboardSection } from '../dashboard-section';
import { DashboardKpiCard } from '../dashboard-kpi-card';
import { EventsPipelineChart } from '../charts/events-pipeline-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { farmEventStatusLabels, formatCurrency, formatDateOnly } from '@/lib/utils';

interface EventsDashboardSectionProps {
  events: UseQueryResult<FarmEventsExecutiveSummaryDto>;
}

export function EventsDashboardSection({ events }: EventsDashboardSectionProps) {
  const data = events.data;
  const loading = events.isLoading;
  const totals = data?.totals;

  return (
    <DashboardSection
      id="eventos"
      title="Eventos"
      description="Visão executiva de leilões e vendas — receita, custos e recebimentos."
      detailHref="/dashboard/eventos"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <DashboardKpiCard
          label="Eventos ativos"
          value={totals?.activeCount ?? 0}
          hint={`${totals?.eventCount ?? 0} no total`}
          icon={Calendar}
          loading={loading}
        />
        <DashboardKpiCard
          label="Receita vendida"
          value={formatCurrency(totals?.totalSales ?? 0)}
          icon={TrendingUp}
          valueClassName="text-green-600"
          loading={loading}
        />
        <DashboardKpiCard
          label="Despesas"
          value={formatCurrency(totals?.totalExpenses ?? 0)}
          icon={Receipt}
          valueClassName="text-red-600"
          loading={loading}
        />
        <DashboardKpiCard
          label="Recebido"
          value={formatCurrency(totals?.totalReceived ?? 0)}
          hint={
            totals && totals.totalSales > 0
              ? `${totals.collectionRate}% do vendido`
              : undefined
          }
          icon={Wallet}
          valueClassName="text-emerald-600"
          loading={loading}
        />
        <DashboardKpiCard
          label="A receber"
          value={formatCurrency(totals?.openReceivable ?? 0)}
          icon={CircleDollarSign}
          loading={loading}
        />
        <DashboardKpiCard
          label="Lucro agregado"
          value={formatCurrency(totals?.balance ?? 0)}
          valueClassName={
            (totals?.balance ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }
          loading={loading}
        />
      </div>

      <EventsPipelineChart summary={data} loading={loading} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Próximos eventos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !data?.upcoming.length ? (
              <p className="text-sm text-muted-foreground">Nenhum evento planejado nos próximos 60 dias.</p>
            ) : (
              <ul className="space-y-3">
                {data.upcoming.map((event) => (
                  <li key={event.id} className="rounded-lg border p-3">
                    <Link
                      href={`/dashboard/eventos/${event.id}`}
                      className="font-medium hover:underline"
                    >
                      {event.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {farmEventStatusLabels[event.status]}
                      {event.startDate && ` · ${formatDateOnly(event.startDate)}`}
                      {' · '}
                      {formatCurrency(event.totalSales)} vendido
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluídos recentemente</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !data?.recentCompleted.length ? (
              <p className="text-sm text-muted-foreground">Nenhum evento concluído.</p>
            ) : (
              <ul className="space-y-3">
                {data.recentCompleted.map((event) => (
                  <li key={event.id} className="rounded-lg border p-3">
                    <Link
                      href={`/dashboard/eventos/${event.id}`}
                      className="font-medium hover:underline"
                    >
                      {event.name}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      {event.endDate ? formatDateOnly(event.endDate) : '—'}
                      {' · '}
                      receita {formatCurrency(event.totalSales)} · lucro{' '}
                      {formatCurrency(event.balance)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardSection>
  );
}
