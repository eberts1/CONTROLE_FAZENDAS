'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import {
  createFarmEventSchema,
  CreateFarmEventInput,
  FarmEventDto,
  FarmEventStatus,
  FarmEventType,
} from '@controle-fazendas/shared';
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
  formatDateOnly,
} from '@/lib/utils';

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
      const { data } = await api.get<FarmEventDto[]>(`/farms/${activeFarmId}/events`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFarmEventInput) => {
      const { data } = await api.post<FarmEventDto>(`/farms/${activeFarmId}/events`, input);
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
            <Link key={event.id} href={`/dashboard/eventos/${event.id}`} className="block">
              <Card className="transition-colors hover:bg-accent/50">
                <CardHeader className="py-4">
                  <CardTitle className="text-base">{event.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {farmEventTypeLabels[event.type]} · {farmEventStatusLabels[event.status]}
                    {event.startDate && ` · ${formatDateOnly(event.startDate)}`}
                    {event.location && ` · ${event.location}`}
                  </p>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
