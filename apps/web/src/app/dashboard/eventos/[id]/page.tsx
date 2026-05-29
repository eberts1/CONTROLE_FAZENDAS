'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import {
  FarmEventDto,
  FarmEventSaleListItemDto,
  FarmEventStatus,
  FarmEventSummaryDto,
  FarmEventType,
} from '@controle-fazendas/shared';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { PageHeader } from '@/components/layout/page-header';
import { EventSaleForm } from '@/components/event-sale-form';
import { EventSaleMapImport } from '@/components/event-sale-map-import';
import {
  animalSaleTypeLabels,
  animalStatusLabels,
  farmEventStatusLabels,
  farmEventTypeLabels,
  formatCurrency,
  formatDateOnly,
  formatPercent,
  saleAssetScopeLabels,
} from '@/lib/utils';

export default function EventoDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { activeFarmId } = useFarmContext();
  const queryClient = useQueryClient();
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showImport, setShowImport] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ['farm-event', activeFarmId, eventId],
    queryFn: async () => {
      const { data } = await api.get<FarmEventDto>(`/farms/${activeFarmId}/events/${eventId}`);
      return data;
    },
    enabled: !!activeFarmId && !!eventId,
  });

  const { data: summary } = useQuery({
    queryKey: ['farm-event-summary', activeFarmId, eventId],
    queryFn: async () => {
      const { data } = await api.get<FarmEventSummaryDto>(
        `/farms/${activeFarmId}/events/${eventId}/summary`,
      );
      return data;
    },
    enabled: !!activeFarmId && !!eventId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['farm-event-sales', activeFarmId, eventId],
    queryFn: async () => {
      const { data } = await api.get<FarmEventSaleListItemDto[]>(
        `/farms/${activeFarmId}/events/${eventId}/sales`,
      );
      return data;
    },
    enabled: !!activeFarmId && !!eventId,
  });

  const statusMutation = useMutation({
    mutationFn: async (status: FarmEventStatus) => {
      const { data } = await api.patch<FarmEventDto>(
        `/farms/${activeFarmId}/events/${eventId}`,
        { status },
      );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-event', activeFarmId, eventId] });
      queryClient.invalidateQueries({ queryKey: ['farm-events', activeFarmId] });
    },
  });

  if (!activeFarmId) {
    return <p className="text-muted-foreground">Selecione uma fazenda.</p>;
  }

  if (isLoading || !event) {
    return <p className="text-muted-foreground">Carregando evento…</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.name}
        description={`${farmEventTypeLabels[event.type]} · ${farmEventStatusLabels[event.status]}`}
        backLink={
          <Link
            href="/dashboard/eventos"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar aos eventos
          </Link>
        }
        actions={
          event.status !== FarmEventStatus.CONCLUIDO ? (
            <Button
              variant="outline"
              onClick={() => statusMutation.mutate(FarmEventStatus.CONCLUIDO)}
            >
              Marcar concluído
            </Button>
          ) : null
        }
      />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Receitas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalSales)}</p>
              <p className="text-xs text-muted-foreground">{summary.salesCount} venda(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Despesas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalExpenses)}</p>
              <p className="text-xs text-muted-foreground">{summary.expensesCount} lançamento(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.balance)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {(event.location || event.organizer || event.startDate) && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            {event.location && <p>Local: {event.location}</p>}
            {event.organizer && <p>Organizador: {event.organizer}</p>}
            {event.startDate && (
              <p>
                Período: {formatDateOnly(event.startDate)}
                {event.endDate && ` — ${formatDateOnly(event.endDate)}`}
              </p>
            )}
            {event.commissionPercent != null && (
              <p>Comissão padrão: {formatPercent(event.commissionPercent)}%</p>
            )}
            {event.notes && <p className="mt-2">{event.notes}</p>}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => setShowImport(!showImport)}>
          {showImport ? 'Fechar importação' : 'Importar mapa PDF'}
        </Button>
        <Button onClick={() => setShowSaleForm(!showSaleForm)}>
          {showSaleForm ? 'Cancelar' : 'Adicionar venda'}
        </Button>
      </div>

      {showImport && (
        <EventSaleMapImport
          farmId={activeFarmId}
          eventId={eventId}
          onSuccess={() => {
            setShowImport(false);
            queryClient.invalidateQueries({ queryKey: ['farm-event-sales', activeFarmId, eventId] });
            queryClient.invalidateQueries({
              queryKey: ['farm-event-summary', activeFarmId, eventId],
            });
            queryClient.invalidateQueries({ queryKey: ['installments', activeFarmId] });
            queryClient.invalidateQueries({ queryKey: ['installments-summary', activeFarmId] });
            queryClient.invalidateQueries({ queryKey: ['animals', activeFarmId] });
            queryClient.invalidateQueries({ queryKey: ['partners', activeFarmId] });
          }}
        />
      )}

      {showSaleForm && (
        <EventSaleForm
          farmId={activeFarmId}
          eventId={eventId}
          onSuccess={() => {
            setShowSaleForm(false);
            queryClient.invalidateQueries({ queryKey: ['farm-event-sales', activeFarmId, eventId] });
            queryClient.invalidateQueries({
              queryKey: ['farm-event-summary', activeFarmId, eventId],
            });
            queryClient.invalidateQueries({ queryKey: ['animals', activeFarmId] });
          }}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Vendas do evento</h2>
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma venda vinculada.</p>
        ) : (
          sales.map((sale) => (
            <Card key={sale.id}>
              <CardHeader className="py-4">
                <CardTitle className="text-base">{sale.description}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {sale.animal ? (
                    <Link
                      href={`/dashboard/animais/${sale.animal.id}`}
                      className="text-primary hover:underline"
                    >
                      {sale.animal.tag}
                      {sale.animal.name ? ` — ${sale.animal.name}` : ''}
                    </Link>
                  ) : (
                    'Animal'
                  )}{' '}
                  · {animalSaleTypeLabels[sale.type]} · {formatCurrency(sale.totalAmount)} ·{' '}
                  {formatDateOnly(sale.transactionDate)}
                  {sale.assetScope && ` · ${saleAssetScopeLabels[sale.assetScope]}`}
                  {sale.quotaPercent != null && ` · ${formatPercent(sale.quotaPercent)}%`}
                  {sale.animal?.status && ` · ${animalStatusLabels[sale.animal.status]}`}
                </p>
              </CardHeader>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
