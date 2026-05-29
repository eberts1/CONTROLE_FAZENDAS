'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFarmContext } from '@/hooks/use-farm-context';
import { monthInputValue, useDashboardData } from '@/hooks/use-dashboard-data';
import { AnimalsDashboardSection } from '@/components/dashboard/sections/animals-dashboard-section';
import { EventsDashboardSection } from '@/components/dashboard/sections/events-dashboard-section';
import { FinanceDashboardSection } from '@/components/dashboard/sections/finance-dashboard-section';

export default function DashboardPage() {
  const { activeFarmId, farms } = useFarmContext();
  const activeFarm = farms.find((f) => f.id === activeFarmId);
  const [month, setMonth] = useState(monthInputValue());
  const queries = useDashboardData(activeFarmId, month);

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione ou cadastre uma fazenda para começar.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            {activeFarm?.name}
            {activeFarm?.location ? ` — ${activeFarm.location}` : ''}
          </p>
          <nav className="mt-2 flex flex-wrap gap-3 text-sm">
            <a href="#animais" className="text-primary hover:underline">
              Animais
            </a>
            <a href="#eventos" className="text-primary hover:underline">
              Eventos
            </a>
            <a href="#financeiro" className="text-primary hover:underline">
              Financeiro
            </a>
          </nav>
        </div>
        <div className="w-full max-w-[200px]">
          <Label htmlFor="dashboard-month">Mês (financeiro)</Label>
          <Input
            id="dashboard-month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="mt-1"
          />
        </div>
      </div>

      <AnimalsDashboardSection animals={queries.animals} genetic={queries.genetic} />
      <EventsDashboardSection events={queries.events} />
      <FinanceDashboardSection
        summary={queries.financeSummary}
        byArea={queries.financeByArea}
        trends={queries.financeTrends}
        installments={queries.installments}
      />
    </div>
  );
}
