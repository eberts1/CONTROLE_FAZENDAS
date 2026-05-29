'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AnimalExpenseDto,
  AnimalFinanceSummaryDto,
  AnimalOwnershipDto,
  AnimalSaleDto,
  AnimalSaleType,
  AnimalExpenseType,
  PaymentCondition,
  calculateExpenseAllocations,
  calculateSaleAllocations,
  calculateSaleTotalFromFormula,
  createAnimalExpenseSchema,
  createAnimalSaleSchema,
  CreateAnimalExpenseInput,
  CreateAnimalSaleInput,
  FarmEventDto,
  PartnerDto,
  SaleAllocationOverrideInput,
  resolveAssetScope,
} from '@controle-fazendas/shared';
import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CurrencyInput } from '@/components/currency-input';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import {
  animalExpenseTypeLabels,
  animalSaleTypeLabels,
  saleAssetScopeLabels,
  formatCurrency,
  formatDateOnly,
  formatPercent,
  paymentConditionLabels,
} from '@/lib/utils';
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';

interface AnimalFinanceSectionProps {
  farmId: string;
  animalId: string;
  ownership: AnimalOwnershipDto[];
}

function partnerName(ownership: AnimalOwnershipDto[], partnerId: string) {
  return (
    ownership.find((o) => o.partnerId === partnerId)?.partner?.name ??
    ownership.find((o) => o.partnerId === partnerId)?.partnerId ??
    '—'
  );
}

export function AnimalFinanceSection({ farmId, animalId, ownership }: AnimalFinanceSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  const shares = useMemo(
    () =>
      ownership.map((o) => ({
        partnerId: o.partnerId,
        ownershipPercent: o.ownershipPercent,
        isPrimary: o.isPrimary,
      })),
    [ownership],
  );

  const { data: sales = [] } = useQuery({
    queryKey: ['animal-sales', farmId, animalId],
    queryFn: async () => {
      const { data } = await api.get<AnimalSaleDto[]>(
        `/farms/${farmId}/animals/${animalId}/sales`,
      );
      return data;
    },
    enabled: !!farmId && !!animalId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['animal-expenses', farmId, animalId],
    queryFn: async () => {
      const { data } = await api.get<AnimalExpenseDto[]>(
        `/farms/${farmId}/animals/${animalId}/expenses`,
      );
      return data;
    },
    enabled: !!farmId && !!animalId,
  });

  const { data: summary } = useQuery({
    queryKey: ['animal-finance-summary', farmId, animalId],
    queryFn: async () => {
      const { data } = await api.get<AnimalFinanceSummaryDto>(
        `/farms/${farmId}/animals/${animalId}/finance-summary`,
      );
      return data;
    },
    enabled: !!farmId && !!animalId,
  });

  const deleteSaleMutation = useMutation({
    mutationFn: async (saleId: string) => {
      await api.delete(`/farms/${farmId}/animals/${animalId}/sales/${saleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal-sales', farmId, animalId] });
      queryClient.invalidateQueries({ queryKey: ['animal-finance-summary', farmId, animalId] });
      toast({ title: 'Venda removida' });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId: string) => {
      await api.delete(`/farms/${farmId}/animals/${animalId}/expenses/${expenseId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animal-expenses', farmId, animalId] });
      queryClient.invalidateQueries({ queryKey: ['animal-finance-summary', farmId, animalId] });
      toast({ title: 'Despesa removida' });
    },
  });

  if (ownership.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-sm text-muted-foreground">
            Defina os proprietários na aba Sócios antes de registrar vendas e despesas.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {summary && (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg">Resumo financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid gap-4 sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Receitas (total)</dt>
                <dd className="text-lg font-semibold">{formatCurrency(summary.totalSales)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Despesas (total)</dt>
                <dd className="text-lg font-semibold">{formatCurrency(summary.totalExpenses)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Saldo</dt>
                <dd className="text-lg font-semibold">{formatCurrency(summary.balance)}</dd>
              </div>
            </dl>
            {summary.byPartner.length > 0 && (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left">Sócio</th>
                      <th className="px-3 py-2 text-right">Receitas líquidas</th>
                      <th className="px-3 py-2 text-right">Despesas</th>
                      <th className="px-3 py-2 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.byPartner.map((row) => (
                      <tr key={row.partnerId} className="border-t">
                        <td className="px-3 py-2">{row.partnerName}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.salesNet)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(row.expenses)}</td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatCurrency(row.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="sales">
        <TabsList>
          <TabsTrigger value="sales">Vendas</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowSaleForm(!showSaleForm)}>
              <Plus className="mr-2 h-4 w-4" />
              {showSaleForm ? 'Cancelar' : 'Nova venda'}
            </Button>
          </div>

          {showSaleForm && (
            <SaleForm
              farmId={farmId}
              animalId={animalId}
              shares={shares}
              ownership={ownership}
              onSuccess={() => {
                setShowSaleForm(false);
                queryClient.invalidateQueries({ queryKey: ['animal-sales', farmId, animalId] });
                queryClient.invalidateQueries({
                  queryKey: ['animal-finance-summary', farmId, animalId],
                });
              }}
            />
          )}

          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma venda registrada.</p>
          ) : (
            sales.map((sale) => (
              <Card key={sale.id}>
                <CardHeader className="flex flex-row items-start justify-between py-4">
                  <div>
                    <CardTitle className="text-base">{sale.description}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {animalSaleTypeLabels[sale.type]} · {formatDateOnly(sale.transactionDate)} ·{' '}
                      {formatCurrency(sale.totalAmount)}
                      {sale.quotaPercent != null && ` · ${formatPercent(sale.quotaPercent)}% cota`}
                      {sale.event?.name && ` · ${sale.event.name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedSaleId(expandedSaleId === sale.id ? null : sale.id)
                      }
                    >
                      {expandedSaleId === sale.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSaleMutation.mutate(sale.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                {expandedSaleId === sale.id && (
                  <CardContent>
                    <AllocationTable
                      rows={sale.allocations.map((a) => ({
                        partnerName: a.partner?.name ?? partnerName(ownership, a.partnerId),
                        ownershipPercent: a.ownershipPercent,
                        grossAmount: a.grossAmount,
                        discountPercent: a.discountPercent,
                        discountPercent2: a.discountPercent2,
                        discountAmount: a.discountAmount,
                        netAmount: a.netAmount,
                        entryAmount: a.entryAmount,
                      }))}
                    />
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowExpenseForm(!showExpenseForm)}>
              <Plus className="mr-2 h-4 w-4" />
              {showExpenseForm ? 'Cancelar' : 'Nova despesa'}
            </Button>
          </div>

          {showExpenseForm && (
            <ExpenseForm
              farmId={farmId}
              animalId={animalId}
              shares={shares}
              ownership={ownership}
              onSuccess={() => {
                setShowExpenseForm(false);
                queryClient.invalidateQueries({ queryKey: ['animal-expenses', farmId, animalId] });
                queryClient.invalidateQueries({
                  queryKey: ['animal-finance-summary', farmId, animalId],
                });
              }}
            />
          )}

          {expenses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma despesa registrada.</p>
          ) : (
            expenses.map((expense) => (
              <Card key={expense.id}>
                <CardHeader className="flex flex-row items-start justify-between py-4">
                  <div>
                    <CardTitle className="text-base">{expense.description}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {animalExpenseTypeLabels[expense.type]} ·{' '}
                      {formatDateOnly(expense.expenseDate)} · {formatCurrency(expense.totalAmount)}
                      {!expense.splitAmongPartners && ' · 100% titular'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setExpandedExpenseId(
                          expandedExpenseId === expense.id ? null : expense.id,
                        )
                      }
                    >
                      {expandedExpenseId === expense.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteExpenseMutation.mutate(expense.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                {expandedExpenseId === expense.id && (
                  <CardContent>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left">Sócio</th>
                            <th className="px-3 py-2 text-right">%</th>
                            <th className="px-3 py-2 text-right">Valor</th>
                          </tr>
                        </thead>
                        <tbody>
                          {expense.allocations.map((a) => (
                            <tr key={a.id} className="border-t">
                              <td className="px-3 py-2">
                                {a.partner?.name ?? partnerName(ownership, a.partnerId)}
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatPercent(a.ownershipPercent)}%
                              </td>
                              <td className="px-3 py-2 text-right">
                                {formatCurrency(a.allocatedAmount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AllocationTable({
  rows,
}: {
  rows: Array<{
    partnerName: string;
    ownershipPercent: number;
    grossAmount: number;
    discountPercent: number | null;
    discountPercent2: number | null;
    discountAmount: number;
    netAmount: number;
    entryAmount: number | null;
  }>;
}) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-3 py-2 text-left">Sócio</th>
            <th className="px-3 py-2 text-right">% Venda</th>
            <th className="px-3 py-2 text-right">Valor Venda</th>
            <th className="px-3 py-2 text-right">%D / %DP</th>
            <th className="px-3 py-2 text-right">Desconto</th>
            <th className="px-3 py-2 text-right">Valor Líquido</th>
            <th className="px-3 py-2 text-right">Entrada</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-t">
              <td className="px-3 py-2">{row.partnerName}</td>
              <td className="px-3 py-2 text-right">{formatPercent(row.ownershipPercent)}%</td>
              <td className="px-3 py-2 text-right">{formatCurrency(row.grossAmount)}</td>
              <td className="px-3 py-2 text-right">
                {row.discountPercent != null ? formatPercent(row.discountPercent) : '0,00'} /{' '}
                {row.discountPercent2 != null ? formatPercent(row.discountPercent2) : '0,00'}
              </td>
              <td className="px-3 py-2 text-right">{formatCurrency(row.discountAmount)}</td>
              <td className="px-3 py-2 text-right font-medium">{formatCurrency(row.netAmount)}</td>
              <td className="px-3 py-2 text-right">
                {formatCurrency(row.entryAmount ?? row.netAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SaleForm({
  farmId,
  animalId,
  shares,
  ownership,
  onSuccess,
}: {
  farmId: string;
  animalId: string;
  shares: Array<{ partnerId: string; ownershipPercent: number; isPrimary: boolean }>;
  ownership: AnimalOwnershipDto[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [type, setType] = useState<AnimalSaleType>(AnimalSaleType.ASPIRACAO);
  const [eventId, setEventId] = useState('');
  const [quotaPercent, setQuotaPercent] = useState<number | ''>(100);
  const [buyerPartnerId, setBuyerPartnerId] = useState('');
  const [applyOwnershipTransfer, setApplyOwnershipTransfer] = useState(true);
  const [description, setDescription] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [quantity, setQuantity] = useState<number | ''>(1);
  const [unitValue, setUnitValue] = useState<number | ''>('');
  const [captures, setCaptures] = useState<number | ''>('');
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

  const { data: events = [] } = useQuery({
    queryKey: ['farm-events', farmId],
    queryFn: async () => {
      const { data } = await api.get<FarmEventDto[]>(`/farms/${farmId}/events`);
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

  const activeEvents = events.filter((e) => e.status !== 'CANCELADO');

  const computedTotal = useMemo(() => {
    const fromFormula = calculateSaleTotalFromFormula(
      quantity === '' ? undefined : quantity,
      unitValue === '' ? undefined : unitValue,
      captures === '' ? undefined : captures,
    );
    if (fromFormula != null) return fromFormula;
    return totalAmount === '' ? 0 : totalAmount;
  }, [quantity, unitValue, captures, totalAmount]);

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
    mutationFn: async (input: CreateAnimalSaleInput) => {
      const { data } = await api.post<AnimalSaleDto>(
        `/farms/${farmId}/animals/${animalId}/sales`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Venda registrada' });
      queryClient.invalidateQueries({ queryKey: ['animal', farmId, animalId] });
      queryClient.invalidateQueries({ queryKey: ['animal-ownership', farmId, animalId] });
      queryClient.invalidateQueries({ queryKey: ['animals', farmId] });
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
    const payload = {
      type,
      description,
      totalAmount: computedTotal,
      transactionDate,
      eventId: eventId || undefined,
      quotaPercent:
        type === AnimalSaleType.VENDA_ANIMAL && quotaPercent !== '' ? quotaPercent : undefined,
      applyOwnershipTransfer:
        type === AnimalSaleType.VENDA_ANIMAL ? applyOwnershipTransfer : undefined,
      buyerPartnerId:
        type === AnimalSaleType.VENDA_ANIMAL && applyOwnershipTransfer && buyerPartnerId
          ? buyerPartnerId
          : undefined,
      commissionPercent: commissionPercent === '' ? undefined : commissionPercent,
      paymentCondition: paymentCondition || undefined,
      unitValue: unitValue === '' ? undefined : unitValue,
      quantity: quantity === '' ? undefined : quantity,
      captures: captures === '' ? undefined : captures,
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
    createMutation.mutate(parsed.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Registrar venda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo</Label>
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
            <p className="text-xs text-muted-foreground">{saleAssetScopeLabels[assetScope]}</p>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          {(type === AnimalSaleType.VENDA_ANIMAL || assetScope === 'COTA_ANIMAL') && (
            <>
              <div className="space-y-2 md:col-span-2">
                <Label>Evento {type === AnimalSaleType.VENDA_ANIMAL ? '(obrigatório)' : ''}</Label>
                <Select value={eventId || undefined} onValueChange={setEventId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o evento" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEvents.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>% do animal</Label>
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
              <div className="space-y-2 flex items-end">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={applyOwnershipTransfer}
                    onChange={(e) => setApplyOwnershipTransfer(e.target.checked)}
                  />
                  Transferir cotas
                </label>
              </div>
              {applyOwnershipTransfer && (
                <div className="space-y-2">
                  <Label>Comprador</Label>
                  <Select value={buyerPartnerId || undefined} onValueChange={setBuyerPartnerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Parceiro comprador" />
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
            <Label>Animais (qtd)</Label>
            <Input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor lance (R$)</Label>
            <CurrencyInput value={unitValue} onChange={setUnitValue} />
          </div>
          <div className="space-y-2">
            <Label>Captações</Label>
            <Input
              type="number"
              min={1}
              value={captures}
              onChange={(e) => setCaptures(e.target.value ? Number(e.target.value) : '')}
            />
          </div>
          <div className="space-y-2">
            <Label>Valor total (R$)</Label>
            <CurrencyInput value={totalAmount} onChange={setTotalAmount} />
            <p className="text-xs text-muted-foreground">
              Calculado: {formatCurrency(computedTotal)} (qtd × lance × captações, se informados)
            </p>
          </div>
          <div className="space-y-2">
            <Label>Comissão (%)</Label>
            <Input
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={commissionPercent}
              onChange={(e) =>
                setCommissionPercent(e.target.value ? Number.parseFloat(e.target.value) : '')
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Condição de pagamento</Label>
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
          <div className="space-y-2">
            <p className="text-sm font-medium">Preview do rateio</p>
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Sócio</th>
                    <th className="px-3 py-2 text-right">% Venda</th>
                    <th className="px-3 py-2 text-right">Valor Venda</th>
                    <th className="px-3 py-2 text-right">%D</th>
                    <th className="px-3 py-2 text-right">%DP</th>
                    <th className="px-3 py-2 text-right">Desconto</th>
                    <th className="px-3 py-2 text-right">Líquido</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row) => (
                    <tr key={row.partnerId} className="border-t">
                      <td className="px-3 py-2">{partnerName(ownership, row.partnerId)}</td>
                      <td className="px-3 py-2 text-right">{formatPercent(row.ownershipPercent)}%</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.grossAmount)}</td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          className="ml-auto w-20 text-right"
                          value={
                            overrides.find((o) => o.partnerId === row.partnerId)?.discountPercent ??
                            ''
                          }
                          onChange={(e) => {
                            const value = e.target.value ? Number.parseFloat(e.target.value) : undefined;
                            setOverrides((prev) => {
                              const next = prev.filter((o) => o.partnerId !== row.partnerId);
                              return [...next, { partnerId: row.partnerId, discountPercent: value, discountPercent2: prev.find((p) => p.partnerId === row.partnerId)?.discountPercent2 }];
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step={0.01}
                          className="ml-auto w-20 text-right"
                          value={
                            overrides.find((o) => o.partnerId === row.partnerId)?.discountPercent2 ??
                            ''
                          }
                          onChange={(e) => {
                            const value = e.target.value ? Number.parseFloat(e.target.value) : undefined;
                            setOverrides((prev) => {
                              const existing = prev.find((o) => o.partnerId === row.partnerId);
                              const next = prev.filter((o) => o.partnerId !== row.partnerId);
                              return [
                                ...next,
                                {
                                  partnerId: row.partnerId,
                                  discountPercent: existing?.discountPercent,
                                  discountPercent2: value,
                                },
                              ];
                            });
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.discountAmount)}</td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatCurrency(row.netAmount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <Button onClick={handleSubmit} disabled={createMutation.isPending || computedTotal <= 0}>
          {createMutation.isPending ? 'Salvando...' : 'Registrar venda'}
        </Button>
      </CardContent>
    </Card>
  );
}

function ExpenseForm({
  farmId,
  animalId,
  shares,
  ownership,
  onSuccess,
}: {
  farmId: string;
  animalId: string;
  shares: Array<{ partnerId: string; ownershipPercent: number; isPrimary: boolean }>;
  ownership: AnimalOwnershipDto[];
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [type, setType] = useState<AnimalExpenseType>(AnimalExpenseType.VETERINARIO);
  const [description, setDescription] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalAmount, setTotalAmount] = useState<number | ''>('');
  const [splitAmongPartners, setSplitAmongPartners] = useState(true);
  const [notes, setNotes] = useState('');

  const preview = useMemo(() => {
    if (totalAmount === '' || totalAmount <= 0) return [];
    try {
      return calculateExpenseAllocations(totalAmount, shares, splitAmongPartners);
    } catch {
      return [];
    }
  }, [totalAmount, shares, splitAmongPartners]);

  const createMutation = useMutation({
    mutationFn: async (input: CreateAnimalExpenseInput) => {
      const { data } = await api.post<AnimalExpenseDto>(
        `/farms/${farmId}/animals/${animalId}/expenses`,
        input,
      );
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Despesa registrada' });
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
    const payload = {
      type,
      description,
      totalAmount: totalAmount === '' ? 0 : totalAmount,
      expenseDate,
      splitAmongPartners,
      notes: notes || undefined,
    };
    const parsed = createAnimalExpenseSchema.safeParse(payload);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Registrar despesa</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as AnimalExpenseType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(animalExpenseTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input type="date" value={expenseDate} onChange={(e) => setExpenseDate(e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Valor total (R$)</Label>
            <CurrencyInput value={totalAmount} onChange={setTotalAmount} />
          </div>
          <div className="space-y-2 flex items-end">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={splitAmongPartners}
                onChange={(e) => setSplitAmongPartners(e.target.checked)}
              />
              Ratear entre sócios
            </label>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        {preview.length > 0 && (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Sócio</th>
                  <th className="px-3 py-2 text-right">%</th>
                  <th className="px-3 py-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.partnerId} className="border-t">
                    <td className="px-3 py-2">{partnerName(ownership, row.partnerId)}</td>
                    <td className="px-3 py-2 text-right">{formatPercent(row.ownershipPercent)}%</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(row.allocatedAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          disabled={createMutation.isPending || totalAmount === '' || totalAmount <= 0}
        >
          {createMutation.isPending ? 'Salvando...' : 'Registrar despesa'}
        </Button>
      </CardContent>
    </Card>
  );
}
