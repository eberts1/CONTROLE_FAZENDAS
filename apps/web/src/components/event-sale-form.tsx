'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import {
  AnimalDto,
  AnimalSaleDto,
  AnimalSaleType,
  CreateAnimalSaleInput,
  FarmEventDto,
  PartnerDto,
  PaymentCondition,
  SaleAllocationOverrideInput,
  calculateSaleAllocations,
  createAnimalSaleSchema,
  resolveAssetScope,
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
import { CurrencyInput } from '@/components/currency-input';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import {
  animalSaleTypeLabels,
  formatCurrency,
  paymentConditionLabels,
  saleAssetScopeLabels,
} from '@/lib/utils';

interface EventSaleFormProps {
  farmId: string;
  eventId: string;
  onSuccess: () => void;
}

export function EventSaleForm({ farmId, eventId, onSuccess }: EventSaleFormProps) {
  const { toast } = useToast();
  const [animalId, setAnimalId] = useState('');
  const [type, setType] = useState<AnimalSaleType>(AnimalSaleType.VENDA_ANIMAL);
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [quotaPercent, setQuotaPercent] = useState<number | ''>(100);
  const [buyerPartnerId, setBuyerPartnerId] = useState('');
  const [applyOwnershipTransfer, setApplyOwnershipTransfer] = useState(true);
  const [commissionPercent, setCommissionPercent] = useState<number | ''>('');
  const [paymentCondition, setPaymentCondition] = useState<PaymentCondition | ''>(
    PaymentCondition.A_VISTA,
  );
  const [notes, setNotes] = useState('');
  const [overrides, setOverrides] = useState<SaleAllocationOverrideInput[]>([]);

  const assetScope = useMemo(
    () => resolveAssetScope(type, quotaPercent === '' ? undefined : quotaPercent),
    [type, quotaPercent],
  );
  const needsQuota = assetScope === 'COTA_ANIMAL' || type === AnimalSaleType.VENDA_ANIMAL;

  const { data: animals = [] } = useQuery({
    queryKey: ['animals', farmId],
    queryFn: async () => {
      const { data } = await api.get<AnimalDto[]>(`/farms/${farmId}/animals`);
      return data;
    },
    enabled: !!farmId,
  });

  const { data: partners = [] } = useQuery({
    queryKey: ['partners', farmId],
    queryFn: async () => {
      const { data } = await api.get<PartnerDto[]>(`/farms/${farmId}/partners`);
      return data;
    },
    enabled: !!farmId,
  });

  const { data: ownership = [] } = useQuery({
    queryKey: ['animal-ownership', farmId, animalId],
    queryFn: async () => {
      const { data } = await api.get(`/farms/${farmId}/animals/${animalId}/ownership`);
      return data as Array<{ partnerId: string; ownershipPercent: number; isPrimary: boolean }>;
    },
    enabled: !!farmId && !!animalId,
  });

  const shares = useMemo(
    () =>
      ownership.map((o) => ({
        partnerId: o.partnerId,
        ownershipPercent: o.ownershipPercent,
        isPrimary: o.isPrimary,
      })),
    [ownership],
  );

  const computedTotal = totalAmount === '' ? 0 : totalAmount;

  useEffect(() => {
    if (computedTotal > 0 && overrides.length === 0 && shares.length > 0) {
      setOverrides(shares.map((s) => ({ partnerId: s.partnerId })));
    }
  }, [computedTotal, shares, overrides.length]);

  const preview = useMemo(() => {
    if (computedTotal <= 0 || shares.length === 0) return [];
    try {
      return calculateSaleAllocations(computedTotal, shares, overrides);
    } catch {
      return [];
    }
  }, [computedTotal, shares, overrides]);

  const createMutation = useMutation({
    mutationFn: async (input: CreateAnimalSaleInput & { animalId: string }) => {
      const { animalId: aid, ...sale } = input;
      const { data } = await api.post<AnimalSaleDto>(
        `/farms/${farmId}/events/${eventId}/sales`,
        { animalId: aid, ...sale },
      );
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Venda registrada no evento' });
      onSuccess();
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

  const handleSubmit = () => {
    if (!animalId) {
      toast({ title: 'Selecione o animal', variant: 'destructive' });
      return;
    }
    const payload = {
      type,
      description,
      totalAmount: computedTotal,
      transactionDate,
      eventId,
      quotaPercent:
        needsQuota && quotaPercent !== '' ? quotaPercent : type === AnimalSaleType.VENDA_ANIMAL ? 100 : undefined,
      applyOwnershipTransfer:
        type === AnimalSaleType.VENDA_ANIMAL ? applyOwnershipTransfer : false,
      buyerPartnerId: applyOwnershipTransfer && buyerPartnerId ? buyerPartnerId : undefined,
      commissionPercent: commissionPercent === '' ? undefined : commissionPercent,
      paymentCondition: paymentCondition || undefined,
      notes: notes || undefined,
      allocationOverrides: overrides,
    };
    const parsed = createAnimalSaleSchema.safeParse(payload);
    if (!parsed.success) {
      toast({
        title: 'Dados inválidos',
        description: parsed.error.errors[0]?.message,
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate({ ...parsed.data, animalId });
  };

  const activeAnimals = animals.filter((a) => a.status === 'ATIVO');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Vincular venda ao evento</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Animal</Label>
            <Select value={animalId || undefined} onValueChange={setAnimalId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o animal" />
              </SelectTrigger>
              <SelectContent>
                {activeAnimals.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.tag}
                    {a.name ? ` — ${a.name}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo de receita</Label>
            <Select value={type} onValueChange={(v) => setType(v as AnimalSaleType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(animalSaleTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Escopo</Label>
            <p className="rounded-md border px-3 py-2 text-sm">{saleAssetScopeLabels[assetScope]}</p>
          </div>
          {needsQuota && (
            <div className="space-y-2">
              <Label>% do animal vendido</Label>
              <Input
                type="number"
                min={0.01}
                max={100}
                value={quotaPercent}
                onChange={(e) =>
                  setQuotaPercent(e.target.value ? Number.parseFloat(e.target.value) : '')
                }
              />
            </div>
          )}
          {type === AnimalSaleType.VENDA_ANIMAL && (
            <>
              <div className="space-y-2 flex items-end gap-2">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applyOwnershipTransfer}
                    onChange={(e) => setApplyOwnershipTransfer(e.target.checked)}
                  />
                  Transferir cotas ao comprador
                </label>
              </div>
              {applyOwnershipTransfer && (
                <div className="space-y-2">
                  <Label>Comprador (parceiro)</Label>
                  <Select value={buyerPartnerId || undefined} onValueChange={setBuyerPartnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o comprador" />
                    </SelectTrigger>
                    <SelectContent>
                      {partners.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </>
          )}
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={transactionDate}
              onChange={(e) => setTransactionDate(e.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valor total (R$)</Label>
            <CurrencyInput value={totalAmount} onChange={setTotalAmount} />
          </div>
          <div className="space-y-2">
            <Label>Comissão (%)</Label>
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
          <div className="space-y-2">
            <Label>Pagamento</Label>
            <Select
              value={paymentCondition || undefined}
              onValueChange={(v) => setPaymentCondition(v as PaymentCondition)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(paymentConditionLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        {preview.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Rateio previsto:{' '}
            {preview
              .map((p) => `${partners.find((x) => x.id === p.partnerId)?.name ?? p.partnerId}: ${formatCurrency(p.netAmount)}`)
              .join(' · ')}
          </p>
        )}
        <Button onClick={handleSubmit} disabled={createMutation.isPending}>
          Registrar venda
        </Button>
      </CardContent>
    </Card>
  );
}
