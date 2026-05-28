'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AnimalDto,
  createGeneticLotSchema,
  CreateGeneticLotInput,
  createStockMovementSchema,
  CreateStockMovementInput,
  GeneticLotDto,
  GeneticMaterialType,
  GeneticStockSummaryDto,
  StockMovementDto,
  StockMovementType,
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
import {
  formatDateOnly,
  geneticMaterialTypeLabels,
  stockMovementTypeLabels,
} from '@/lib/utils';
import { useMemo, useState } from 'react';

function storageLabel(lot: GeneticLotDto) {
  const parts = [lot.storageTank, lot.storageCanister, lot.storagePosition].filter(Boolean);
  return parts.length ? parts.join(' / ') : '—';
}

export default function MaterialGeneticoPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [materialFilter, setMaterialFilter] = useState<string>('all');
  const [animalFilter, setAnimalFilter] = useState<string>('all');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [activeLotId, setActiveLotId] = useState<string | null>(null);

  const lotsQueryKey = ['genetic-lots', activeFarmId, materialFilter, animalFilter, lowStockOnly];

  const { data: summary } = useQuery({
    queryKey: ['genetic-lots-summary', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<GeneticStockSummaryDto>(
        `/farms/${activeFarmId}/genetic-lots/summary`,
      );
      return data;
    },
    enabled: !!activeFarmId,
  });

  const { data: animals = [] } = useQuery({
    queryKey: ['animals', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<AnimalDto[]>(`/farms/${activeFarmId}/animals`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  const { data: lots = [], isLoading } = useQuery({
    queryKey: lotsQueryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      if (materialFilter !== 'all') params.set('materialType', materialFilter);
      if (animalFilter !== 'all') params.set('sourceAnimalId', animalFilter);
      if (lowStockOnly) params.set('lowStock', 'true');
      const qs = params.toString();
      const { data } = await api.get<GeneticLotDto[]>(
        `/farms/${activeFarmId}/genetic-lots${qs ? `?${qs}` : ''}`,
      );
      return data;
    },
    enabled: !!activeFarmId,
  });

  const activeLot = useMemo(
    () => lots.find((l) => l.id === activeLotId) ?? null,
    [lots, activeLotId],
  );

  const { data: movements = [] } = useQuery({
    queryKey: ['stock-movements', activeFarmId, activeLotId],
    queryFn: async () => {
      const { data } = await api.get<StockMovementDto[]>(
        `/farms/${activeFarmId}/genetic-lots/${activeLotId}/movements`,
      );
      return data;
    },
    enabled: !!activeFarmId && !!activeLotId,
  });

  const lotForm = useForm<CreateGeneticLotInput>({
    resolver: zodResolver(createGeneticLotSchema),
    defaultValues: { materialType: GeneticMaterialType.SEMEN, initialDoses: 1 },
  });

  const movementForm = useForm<CreateStockMovementInput>({
    resolver: zodResolver(createStockMovementSchema),
    defaultValues: {
      type: StockMovementType.SAIDA,
      referenceDate: new Date().toISOString().slice(0, 10),
    },
  });

  const invalidateLots = () => {
    queryClient.invalidateQueries({ queryKey: ['genetic-lots', activeFarmId] });
    queryClient.invalidateQueries({ queryKey: ['genetic-lots-summary', activeFarmId] });
    if (activeLotId) {
      queryClient.invalidateQueries({ queryKey: ['stock-movements', activeFarmId, activeLotId] });
    }
  };

  const createLotMutation = useMutation({
    mutationFn: async (input: CreateGeneticLotInput) => {
      const { data } = await api.post<GeneticLotDto>(
        `/farms/${activeFarmId}/genetic-lots`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      invalidateLots();
      lotForm.reset({ materialType: GeneticMaterialType.SEMEN, initialDoses: 1 });
      setShowForm(false);
      toast({ title: 'Lote cadastrado', description: 'Estoque inicial registrado com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível cadastrar o lote.', variant: 'destructive' });
    },
  });

  const deleteLotMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/farms/${activeFarmId}/genetic-lots/${id}`);
    },
    onSuccess: (_, id) => {
      if (activeLotId === id) setActiveLotId(null);
      invalidateLots();
      toast({ title: 'Lote removido' });
    },
  });

  const movementMutation = useMutation({
    mutationFn: async (input: CreateStockMovementInput) => {
      const { data } = await api.post(
        `/farms/${activeFarmId}/genetic-lots/${activeLotId}/movements`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      invalidateLots();
      movementForm.reset({
        type: StockMovementType.SAIDA,
        referenceDate: new Date().toISOString().slice(0, 10),
      });
      toast({ title: 'Movimentação registrada' });
    },
    onError: (err: { response?: { data?: { message?: string | string[] } } }) => {
      const msg = err.response?.data?.message;
      const description = Array.isArray(msg) ? msg.join(', ') : msg ?? 'Não foi possível registrar a movimentação.';
      toast({ title: 'Erro', description, variant: 'destructive' });
    },
  });

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione uma fazenda para gerenciar material genético.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Material Genético</h1>
          <p className="text-muted-foreground">Controle de estoque de sêmen e embriões vinculado aos animais doadores</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>{showForm ? 'Cancelar' : 'Novo lote'}</Button>
      </div>

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total em estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalDoses}</p>
              <p className="text-xs text-muted-foreground">doses</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Sêmen / Embriões</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {summary.semenDoses} / {summary.embryoDoses}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Estoque baixo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.lowStockLots}</p>
              <p className="text-xs text-muted-foreground">lotes (&lt; 5 doses)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vencimento próximo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.expiringSoonLots}</p>
              <p className="text-xs text-muted-foreground">próximos 30 dias</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={materialFilter} onValueChange={setMaterialFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(geneticMaterialTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Animal doador</Label>
            <Select value={animalFilter} onValueChange={setAnimalFilter}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {animals.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.tag} {a.name ? `— ${a.name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border"
            />
            Somente estoque baixo
          </label>
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar lote</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={lotForm.handleSubmit((data) => createLotMutation.mutate(data))}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2 md:col-span-2">
                <Label>Animal doador</Label>
                <Select
                  value={lotForm.watch('sourceAnimalId') ?? ''}
                  onValueChange={(v) => lotForm.setValue('sourceAnimalId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o animal" />
                  </SelectTrigger>
                  <SelectContent>
                    {animals.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.tag} {a.name ? `— ${a.name}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {lotForm.formState.errors.sourceAnimalId && (
                  <p className="text-sm text-destructive">
                    {lotForm.formState.errors.sourceAnimalId.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={lotForm.watch('materialType')}
                  onValueChange={(v) => lotForm.setValue('materialType', v as GeneticMaterialType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(geneticMaterialTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="lotCode">Código do lote</Label>
                <Input id="lotCode" {...lotForm.register('lotCode')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="initialDoses">Doses iniciais</Label>
                <Input
                  id="initialDoses"
                  type="number"
                  min={1}
                  {...lotForm.register('initialDoses', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="collectedAt">Data de coleta</Label>
                <Input id="collectedAt" type="date" {...lotForm.register('collectedAt')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageTank">Tanque</Label>
                <Input id="storageTank" {...lotForm.register('storageTank')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storageCanister">Caneca / botijão</Label>
                <Input id="storageCanister" {...lotForm.register('storageCanister')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storagePosition">Posição</Label>
                <Input id="storagePosition" {...lotForm.register('storagePosition')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="laboratory">Laboratório</Label>
                <Input id="laboratory" {...lotForm.register('laboratory')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="expiresAt">Validade</Label>
                <Input id="expiresAt" type="date" {...lotForm.register('expiresAt')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" {...lotForm.register('notes')} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={createLotMutation.isPending || animals.length === 0}>
                  {createLotMutation.isPending ? 'Salvando...' : 'Salvar lote'}
                </Button>
                {animals.length === 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">Cadastre animais antes de criar lotes.</p>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : lots.length === 0 ? (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
              <p className="text-muted-foreground">Nenhum lote cadastrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Lote</th>
                    <th className="px-4 py-3 text-left font-medium">Doador</th>
                    <th className="px-4 py-3 text-left font-medium">Tipo</th>
                    <th className="px-4 py-3 text-left font-medium">Saldo</th>
                    <th className="px-4 py-3 text-left font-medium">Armazenamento</th>
                    <th className="px-4 py-3 text-left font-medium">Validade</th>
                    <th className="px-4 py-3 text-right font-medium">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {lots.map((lot) => (
                    <tr
                      key={lot.id}
                      className={`border-b last:border-0 ${activeLotId === lot.id ? 'bg-muted/30' : ''}`}
                    >
                      <td className="px-4 py-3 font-medium">{lot.lotCode}</td>
                      <td className="px-4 py-3">
                        {lot.sourceAnimal
                          ? `${lot.sourceAnimal.tag}${lot.sourceAnimal.name ? ` (${lot.sourceAnimal.name})` : ''}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">{geneticMaterialTypeLabels[lot.materialType]}</td>
                      <td className="px-4 py-3 font-semibold">{lot.currentDoses}</td>
                      <td className="px-4 py-3 text-muted-foreground">{storageLabel(lot)}</td>
                      <td className="px-4 py-3">
                        {lot.expiresAt ? formatDateOnly(lot.expiresAt) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <Button variant="outline" size="sm" onClick={() => setActiveLotId(lot.id)}>
                          Movimentar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive"
                          onClick={() => deleteLotMutation.mutate(lot.id)}
                        >
                          Excluir
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          {activeLot ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Movimentações — {activeLot.lotCode}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Saldo atual: <strong>{activeLot.currentDoses}</strong> doses
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={movementForm.handleSubmit((data) => movementMutation.mutate(data))}
                  className="space-y-3"
                >
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select
                      value={movementForm.watch('type')}
                      onValueChange={(v) => movementForm.setValue('type', v as StockMovementType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(stockMovementTypeLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">
                      {movementForm.watch('type') === StockMovementType.AJUSTE
                        ? 'Novo saldo (doses)'
                        : 'Quantidade (doses)'}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min={1}
                      {...movementForm.register('quantity', { valueAsNumber: true })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="referenceDate">Data</Label>
                    <Input id="referenceDate" type="date" {...movementForm.register('referenceDate')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Motivo</Label>
                    <Input id="reason" {...movementForm.register('reason')} />
                  </div>
                  <Button type="submit" size="sm" disabled={movementMutation.isPending}>
                    Registrar
                  </Button>
                </form>

                <div className="border-t pt-4">
                  <p className="mb-2 text-sm font-medium">Histórico</p>
                  {movements.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Sem movimentações.</p>
                  ) : (
                    <ul className="max-h-64 space-y-2 overflow-y-auto text-sm">
                      {movements.map((m) => (
                        <li key={m.id} className="rounded-md border px-3 py-2">
                          <div className="flex justify-between font-medium">
                            <span>{stockMovementTypeLabels[m.type]}</span>
                            <span>{m.quantity} dose(s)</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {formatDateOnly(m.referenceDate)}
                            {m.reason ? ` — ${m.reason}` : ''}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex h-48 items-center justify-center p-6">
                <p className="text-center text-sm text-muted-foreground">
                  Selecione um lote e clique em Movimentar para registrar entradas, saídas ou ajustes.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
