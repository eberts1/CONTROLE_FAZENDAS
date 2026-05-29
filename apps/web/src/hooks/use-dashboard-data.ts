'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  FarmAnimalsSummaryDto,
  FarmEventsExecutiveSummaryDto,
  FarmFinanceByAreaSummaryDto,
  FarmFinanceSummaryDto,
  FarmFinanceTrendsDto,
  GeneticStockSummaryDto,
  InstallmentsSummaryDto,
} from '@controle-fazendas/shared';
import { api } from '@/lib/api-client';

const STALE_MS = 60_000;

function monthRange(month: string) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(y, m - 1, 1);
  const end = new Date(y, m, 0, 23, 59, 59);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function monthInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function useDashboardData(farmId: string | null, month: string) {
  const fromTo = useMemo(() => monthRange(month), [month]);

  const animals = useQuery({
    queryKey: ['dashboard-animals-summary', farmId],
    queryFn: async () => {
      const { data } = await api.get<FarmAnimalsSummaryDto>(`/farms/${farmId}/animals/summary`);
      return data;
    },
    enabled: !!farmId,
    staleTime: STALE_MS,
  });

  const genetic = useQuery({
    queryKey: ['dashboard-genetic-summary', farmId],
    queryFn: async () => {
      const { data } = await api.get<GeneticStockSummaryDto>(`/farms/${farmId}/genetic-lots/summary`);
      return data;
    },
    enabled: !!farmId,
    staleTime: STALE_MS,
  });

  const events = useQuery({
    queryKey: ['dashboard-events-executive', farmId],
    queryFn: async () => {
      const { data } = await api.get<FarmEventsExecutiveSummaryDto>(
        `/farms/${farmId}/events/executive-summary`,
      );
      return data;
    },
    enabled: !!farmId,
    staleTime: STALE_MS,
  });

  const financeSummary = useQuery({
    queryKey: ['dashboard-finance-summary', farmId, month],
    queryFn: async () => {
      const { data } = await api.get<FarmFinanceSummaryDto>(`/farms/${farmId}/finances/summary`, {
        params: { from: fromTo.from, to: fromTo.to },
      });
      return data;
    },
    enabled: !!farmId,
    staleTime: STALE_MS,
  });

  const financeByArea = useQuery({
    queryKey: ['dashboard-finance-by-area', farmId, month],
    queryFn: async () => {
      const { data } = await api.get<FarmFinanceByAreaSummaryDto>(
        `/farms/${farmId}/finances/summary-by-area`,
        { params: { from: fromTo.from, to: fromTo.to } },
      );
      return data;
    },
    enabled: !!farmId,
    staleTime: STALE_MS,
  });

  const financeTrends = useQuery({
    queryKey: ['dashboard-finance-trends', farmId],
    queryFn: async () => {
      const { data } = await api.get<FarmFinanceTrendsDto>(`/farms/${farmId}/finances/trends`, {
        params: { months: 6 },
      });
      return data;
    },
    enabled: !!farmId,
    staleTime: STALE_MS,
  });

  const installments = useQuery({
    queryKey: ['dashboard-installments-summary', farmId],
    queryFn: async () => {
      const { data } = await api.get<InstallmentsSummaryDto>(
        `/farms/${farmId}/installments/summary`,
      );
      return data;
    },
    enabled: !!farmId,
    staleTime: STALE_MS,
  });

  return {
    animals,
    genetic,
    events,
    financeSummary,
    financeByArea,
    financeTrends,
    installments,
  };
}
