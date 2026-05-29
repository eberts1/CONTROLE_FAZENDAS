'use client';

import Link from 'next/link';
import { Beef, Dna, HeartPulse, Baby } from 'lucide-react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { FarmAnimalsSummaryDto, GeneticStockSummaryDto } from '@controle-fazendas/shared';
import { DashboardSection } from '../dashboard-section';
import { DashboardKpiCard } from '../dashboard-kpi-card';
import { HerdCompositionChart } from '../charts/herd-composition-chart';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateOnly } from '@/lib/utils';

interface AnimalsDashboardSectionProps {
  animals: UseQueryResult<FarmAnimalsSummaryDto>;
  genetic: UseQueryResult<GeneticStockSummaryDto>;
}

export function AnimalsDashboardSection({ animals, genetic }: AnimalsDashboardSectionProps) {
  const data = animals.data;
  const loading = animals.isLoading;
  const repro = data?.reproductive;

  return (
    <DashboardSection
      id="animais"
      title="Animais e rebanho"
      description="Indicadores do plantel, reprodução e material genético."
      detailHref="/dashboard/animais"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardKpiCard
          label="Ativos"
          value={data?.herd.active ?? 0}
          hint={`${data?.herd.total ?? 0} cadastrados no total`}
          icon={Beef}
          loading={loading}
        />
        <DashboardKpiCard
          label="Inseminações (mês)"
          value={repro?.inseminationsThisMonth ?? 0}
          hint={`${repro?.inseminationsLast90Days ?? 0} nos últimos 90 dias`}
          icon={HeartPulse}
          loading={loading}
          title={data?.methodology}
        />
        <DashboardKpiCard
          label="Prenhes estimadas"
          value={repro?.estimatedPregnant ?? 0}
          hint={`${repro?.expectedBirthsNext90Days ?? 0} partos previstos em 90 dias`}
          icon={Baby}
          loading={loading}
          title={data?.methodology}
        />
        <DashboardKpiCard
          label="Perfil ABCZ"
          value={data?.abcz.withProfile ?? 0}
          hint={`${data?.abcz.withoutProfile ?? 0} sem sincronização`}
          icon={Dna}
          loading={loading}
        />
      </div>

      {data && (
        <HerdCompositionChart bySex={data.herd.bySex} byStatus={data.herd.byStatus} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Material genético</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3 text-sm">
            {genetic.isLoading ? (
              <p className="text-muted-foreground col-span-2">Carregando...</p>
            ) : (
              <>
                <div>
                  <p className="text-muted-foreground">Doses totais</p>
                  <p className="text-xl font-bold tabular-nums">{genetic.data?.totalDoses ?? 0}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Sêmen / embrião</p>
                  <p className="text-xl font-bold tabular-nums">
                    {genetic.data?.semenDoses ?? 0} / {genetic.data?.embryoDoses ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Estoque baixo</p>
                  <p className="text-lg font-semibold text-amber-600">
                    {genetic.data?.lowStockLots ?? 0} lotes
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Vencendo em breve</p>
                  <p className="text-lg font-semibold text-amber-600">
                    {genetic.data?.expiringSoonLots ?? 0} lotes
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Próximos partos previstos</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : !repro?.upcomingBirths.length ? (
              <p className="text-sm text-muted-foreground">Nenhum parto previsto nos próximos 90 dias.</p>
            ) : (
              <ul className="space-y-2">
                {repro.upcomingBirths.map((item) => (
                  <li key={item.animalId} className="flex justify-between gap-2 text-sm">
                    <Link
                      href={`/dashboard/animais/${item.animalId}`}
                      className="font-medium hover:underline"
                    >
                      {item.tag}
                      {item.name ? ` — ${item.name}` : ''}
                    </Link>
                    <span className="text-muted-foreground shrink-0">
                      {formatDateOnly(item.expectedDate)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {data?.methodology && (
              <p className="mt-3 text-xs text-muted-foreground">{data.methodology}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {data && data.herd.topBreeds.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Principais raças (ativos)</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-2">
              {data.herd.topBreeds.map((row) => (
                <li
                  key={row.breed}
                  className="rounded-md bg-muted px-2 py-1 text-sm"
                >
                  {row.breed}: <span className="font-medium tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </DashboardSection>
  );
}
