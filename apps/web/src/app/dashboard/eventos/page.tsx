'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import {
  createFarmEventSchema,
  CreateFarmEventInput,
  FarmEventListItemDto,
  FarmEventStatus,
  FarmEventType,
} from '@controle-fazendas/shared';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import {
  farmEventStatusLabels,
  farmEventTypeLabels,
  formatCurrency,
  formatDateOnly,
  cn,
} from '@/lib/utils';

function EventCard({ event }: { event: FarmEventListItemDto }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden transition-colors hover:bg-accent/30">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <Link href={`/dashboard/eventos/${event.id}`} className="hover:underline">
              <CardTitle className="text-base">{event.name}</CardTitle>
            </Link>
            <p className="text-sm text-muted-foreground">
              {farmEventTypeLabels[event.type]} · {farmEventStatusLabels[event.status]}
              {event.startDate && ` · ${formatDateOnly(event.startDate)}`}
              {event.location && ` · ${event.location}`}
            </p>
          </div>
          <Link
            href={`/dashboard/eventos/${event.id}`}
            className="text-sm text-primary hover:underline"
          >
            Abrir evento
          </Link>
        </div>

        {event.auctionLotNumbers.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-muted-foreground">Lotes:</span>
            {event.auctionLotNumbers.map((lot) => (
              <span
                key={lot}
                className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums"
              >
                {lot}
              </span>
            ))}
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-3 pb-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Total vendido" value={String(event.salesCount)} hint="animais/lotes" />
          <Metric label="Receita" value={formatCurrency(event.totalSales)} valueClass="text-green-600" />
          <Metric label="Despesas" value={formatCurrency(event.totalExpenses)} valueClass="text-red-600" />
          <Metric label="Recebido" value={formatCurrency(event.totalReceived)} valueClass="text-emerald-600" />
        </div>

        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-muted/50"
        >
          <span className="font-medium">Recebimentos e lucro</span>
          <ChevronDown
            className={cn('h-4 w-4 shrink-0 text-muted-foreground transition-transform', expanded && 'rotate-180')}
          />
        </button>

        {expanded && (
          <div className="space-y-3 rounded-lg border bg-muted/30 p-3 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <Row label="Receita total" value={formatCurrency(event.totalSales)} />
              <Row label="Despesas" value={formatCurrency(event.totalExpenses)} />
              <Row
                label="Lucro (receita − despesas)"
                value={formatCurrency(event.balance)}
                valueClass={event.balance >= 0 ? 'text-green-600' : 'text-red-600'}
              />
              <Row label="Recebido" value={formatCurrency(event.totalReceived)} valueClass="text-emerald-600" />
              <Row label="A receber" value={formatCurrency(event.openReceivable)} />
              <Row label="Vendas registradas" value={String(event.salesCount)} />
            </div>
            {event.auctionLotNumbers.length > 0 && (
              <p className="text-muted-foreground">
                Lotes do leilão: {event.auctionLotNumbers.join(', ')}
              </p>
            )}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/eventos/${event.id}`}>Ver vendas e despesas</Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
  valueClass,
}: {
  label: string;
  value: string;
  hint?: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border bg-background px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-sm font-semibold tabular-nums', valueClass)}>{value}</p>
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Row({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn('font-medium tabular-nums', valueClass)}>{value}</span>
    </div>
  );
}

export default function EventosPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<FarmEventType>(FarmEventType.LEILAO);
  const [status, setStatus] = useState<FarmEventStatus>(FarmEventStatus.PLANEJADO);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [organizer, setOrganizer] = useState('');
  const [commissionPercent, setCommissionPercent] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['farm-events', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<FarmEventListItemDto[]>(`/farms/${activeFarmId}/events`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFarmEventInput) => {
      const { data } = await api.post<FarmEventListItemDto>(`/farms/${activeFarmId}/events`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['farm-events', activeFarmId] });
      setShowForm(false);
      setName('');
      setLocation('');
      setStartDate('');
      setEndDate('');
      setOrganizer('');
      setCommissionPercent('');
      setNotes('');
      toast({ title: 'Evento criado' });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleCreate = () => {
    const payload = {
      type,
      status,
      name,
      location: location || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      organizer: organizer || undefined,
      commissionPercent: commissionPercent === '' ? undefined : commissionPercent,
      notes: notes || undefined,
    };
    const parsed = createFarmEventSchema.safeParse(payload);
    if (!parsed.success) {
      toast({
        title: 'Dados inválidos',
        description: parsed.error.errors[0]?.message,
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(parsed.data);
  };

  if (!activeFarmId) {
    return <p className="text-muted-foreground">Selecione uma fazenda.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos"
        description="Leilões, vendas externas e vendas na fazenda"
        actions={
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : 'Novo evento'}
          </Button>
        }
      />

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Novo evento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as FarmEventType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(farmEventTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as FarmEventStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(farmEventStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Nome</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Local</Label>
              <Input value={location} onChange={(e) => setLocation(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Organizador</Label>
              <Input value={organizer} onChange={(e) => setOrganizer(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Fim</Label>
              <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Comissão padrão (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={commissionPercent}
                onChange={(e) =>
                  setCommissionPercent(e.target.value ? Number.parseFloat(e.target.value) : '')
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Observações</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                Salvar evento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground">Nenhum evento cadastrado.</p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
