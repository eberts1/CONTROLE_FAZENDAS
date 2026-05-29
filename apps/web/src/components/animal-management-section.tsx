'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AnimalAbczProfileDto,
  AnimalDto,
  AnimalManagementCategory,
  AnimalManagementEventType,
  AnimalManagementRecordDto,
  AnimalOwnershipDto,
  AnimalSex,
  CreateAnimalManagementRecordInput,
  calculateExpenseAllocations,
  createAnimalManagementRecordSchema,
  defaultExpenseTypeForCategory,
  eventTypeRequiresRelatedAnimal,
  getEventTypesForCategory,
} from '@controle-fazendas/shared';
import { useMemo, useState } from 'react';
import { AbczReproductivePanel } from '@/components/abcz-reproductive-panel';
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
  animalManagementCategoryLabels,
  animalManagementEventTypeLabels,
  animalSexLabels,
  formatCurrency,
  formatDateOnly,
  formatPercent,
  gestationResultLabels,
} from '@/lib/utils';
import { Plus, Trash2 } from 'lucide-react';

const CATEGORIES = [
  AnimalManagementCategory.SAUDE,
  AnimalManagementCategory.REPRODUTIVO,
  AnimalManagementCategory.NUTRICAO,
  AnimalManagementCategory.MANEJO_GERAL,
] as const;

function defaultCategoryForAnimal(animal: AnimalDto): AnimalManagementCategory {
  return animal.sex === AnimalSex.FEMEA
    ? AnimalManagementCategory.REPRODUTIVO
    : AnimalManagementCategory.SAUDE;
}

function animalLabel(a: Pick<AnimalDto, 'tag' | 'name'>) {
  return a.name ? `${a.tag} — ${a.name}` : a.tag;
}

interface AnimalManagementSectionProps {
  farmId: string;
  animalId: string;
  animal: AnimalDto;
  animals: AnimalDto[];
  ownership: AnimalOwnershipDto[];
  profile?: AnimalAbczProfileDto | null;
}

export function AnimalManagementSection({
  farmId,
  animalId,
  animal,
  animals,
  ownership,
  profile,
}: AnimalManagementSectionProps) {
  const [activeCategory, setActiveCategory] = useState<AnimalManagementCategory>(() =>
    defaultCategoryForAnimal(animal),
  );
  const [showForm, setShowForm] = useState(false);

  const shares = useMemo(
    () =>
      ownership.map((o) => ({
        partnerId: o.partnerId,
        ownershipPercent: o.ownershipPercent,
        isPrimary: o.isPrimary,
      })),
    [ownership],
  );

  const relatedAnimals = useMemo(
    () => animals.filter((a) => a.id !== animalId),
    [animals, animalId],
  );

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['animal-management-records', farmId, animalId, activeCategory],
    queryFn: async () => {
      const { data } = await api.get<AnimalManagementRecordDto[]>(
        `/farms/${farmId}/animals/${animalId}/management-records`,
        { params: { category: activeCategory } },
      );
      return data;
    },
    enabled: !!farmId && !!animalId,
  });

  const showAbczRepro =
    activeCategory === AnimalManagementCategory.REPRODUTIVO &&
    animal.hasAbczProfile &&
    profile;

  return (
    <div className="space-y-6">
      <Tabs
        defaultValue={activeCategory}
        value={activeCategory}
        onValueChange={(v) => {
          setActiveCategory(v as AnimalManagementCategory);
          setShowForm(false);
        }}
      >
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
          {CATEGORIES.map((cat) => (
            <TabsTrigger key={cat} value={cat}>
              {animalManagementCategoryLabels[cat]}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat} value={cat} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                Histórico de {animalManagementCategoryLabels[cat].toLowerCase()} deste animal
              </p>
              <Button
                size="sm"
                variant={showForm ? 'outline' : 'default'}
                onClick={() => setShowForm((v) => !v)}
              >
                <Plus className="mr-2 h-4 w-4" />
                {showForm ? 'Fechar formulário' : 'Novo registro'}
              </Button>
            </div>

            {showForm && activeCategory === cat && (
              <ManagementRecordForm
                farmId={farmId}
                animalId={animalId}
                category={cat}
                relatedAnimals={relatedAnimals}
                shares={shares}
                ownership={ownership}
                onSuccess={() => setShowForm(false)}
                onCancel={() => setShowForm(false)}
              />
            )}

            {cat === AnimalManagementCategory.REPRODUTIVO && showAbczRepro && profile && (
              <AbczReproductivePanel profile={profile} />
            )}

            <ManagementRecordsList
              farmId={farmId}
              animalId={animalId}
              category={cat}
              records={activeCategory === cat ? records : []}
              isLoading={activeCategory === cat && isLoading}
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ManagementRecordsList({
  farmId,
  animalId,
  category,
  records,
  isLoading,
}: {
  farmId: string;
  animalId: string;
  category: AnimalManagementCategory;
  records: AnimalManagementRecordDto[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(
        `/farms/${farmId}/animals/${animalId}/management-records/${id}`,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['animal-management-records', farmId, animalId],
      });
      toast({ title: 'Registro removido' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o registro.',
        variant: 'destructive',
      });
    },
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Carregando registros...</p>;
  }

  if (records.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Nenhum registro em {animalManagementCategoryLabels[category].toLowerCase()}.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {records.map((record) => (
        <li key={record.id} className="rounded-lg border p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <p className="font-medium">
                {animalManagementEventTypeLabels[record.eventType] ?? record.eventType}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDateOnly(record.performedAt)}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (confirm('Remover este registro de manejo? A despesa vinculada permanece no financeiro.')) {
                  deleteMutation.mutate(record.id);
                }
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          {record.notes && (
            <p className="mt-2 text-sm whitespace-pre-wrap">{record.notes}</p>
          )}
          {record.relatedAnimal && (
            <p className="mt-1 text-sm text-muted-foreground">
              Animal relacionado: {animalLabel(record.relatedAnimal)} (
              {animalSexLabels[record.relatedAnimal.sex]})
            </p>
          )}
          {record.metadata?.weightKg != null && (
            <p className="mt-1 text-sm">Peso: {record.metadata.weightKg} kg</p>
          )}
          {record.metadata?.gestationResult && (
            <p className="mt-1 text-sm">
              Resultado: {gestationResultLabels[record.metadata.gestationResult]}
            </p>
          )}
          {(record.metadata?.productName || record.metadata?.dose) && (
            <p className="mt-1 text-sm">
              {[record.metadata.productName, record.metadata.dose].filter(Boolean).join(' · ')}
            </p>
          )}
          {record.expense && (
            <p className="mt-2 text-sm">
              Custo: {formatCurrency(record.expense.totalAmount)} —{' '}
              {animalExpenseTypeLabels[record.expense.type]}
              {record.expense.description ? ` (${record.expense.description})` : ''}
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

function ManagementRecordForm({
  farmId,
  animalId,
  category,
  relatedAnimals,
  shares,
  ownership,
  onSuccess,
  onCancel,
}: {
  farmId: string;
  animalId: string;
  category: AnimalManagementCategory;
  relatedAnimals: AnimalDto[];
  shares: Array<{ partnerId: string; ownershipPercent: number; isPrimary: boolean }>;
  ownership: AnimalOwnershipDto[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const eventTypes = getEventTypesForCategory(category);
  const [eventType, setEventType] = useState<AnimalManagementEventType>(eventTypes[0]);
  const [performedAt, setPerformedAt] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [relatedAnimalId, setRelatedAnimalId] = useState<string>('');
  const [weightKg, setWeightKg] = useState<number | ''>('');
  const [gestationResult, setGestationResult] = useState<
    'POSITIVO' | 'NEGATIVO' | 'INDETERMINADO' | ''
  >('');
  const [productName, setProductName] = useState('');
  const [dose, setDose] = useState('');
  const [registerCost, setRegisterCost] = useState(false);
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseAmount, setExpenseAmount] = useState<number | ''>('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [splitAmongPartners, setSplitAmongPartners] = useState(true);

  const showRelatedAnimal = eventTypeRequiresRelatedAnimal(eventType);
  const showWeight = eventType === AnimalManagementEventType.PESAGEM;
  const showGestation =
    eventType === AnimalManagementEventType.DIAGNOSTICO_GESTACAO;
  const showProduct =
    category === AnimalManagementCategory.SAUDE ||
    category === AnimalManagementCategory.NUTRICAO;

  const expensePreview = useMemo(() => {
    if (!registerCost || expenseAmount === '' || expenseAmount <= 0) return [];
    try {
      return calculateExpenseAllocations(expenseAmount, shares, splitAmongPartners);
    } catch {
      return [];
    }
  }, [registerCost, expenseAmount, shares, splitAmongPartners]);

  const createMutation = useMutation({
    mutationFn: async (input: CreateAnimalManagementRecordInput) => {
      const { data } = await api.post<AnimalManagementRecordDto>(
        `/farms/${farmId}/animals/${animalId}/management-records`,
        input,
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['animal-management-records', farmId, animalId],
      });
      if (data.expenseId) {
        queryClient.invalidateQueries({ queryKey: ['animal-expenses', farmId, animalId] });
        queryClient.invalidateQueries({
          queryKey: ['animal-finance-summary', farmId, animalId],
        });
      }
      toast({ title: 'Registro de manejo salvo' });
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
    const metadata: CreateAnimalManagementRecordInput['metadata'] = {};
    if (showWeight && weightKg !== '') metadata.weightKg = weightKg;
    if (showGestation && gestationResult) metadata.gestationResult = gestationResult;
    if (showProduct) {
      if (productName) metadata.productName = productName;
      if (dose) metadata.dose = dose;
    }

    const payload: CreateAnimalManagementRecordInput = {
      category,
      eventType,
      performedAt,
      notes: notes || undefined,
      relatedAnimalId: showRelatedAnimal && relatedAnimalId ? relatedAnimalId : undefined,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    if (registerCost) {
      payload.expense = {
        type: defaultExpenseTypeForCategory(category),
        description: expenseDescription || animalManagementEventTypeLabels[eventType],
        totalAmount: expenseAmount === '' ? 0 : expenseAmount,
        expenseDate,
        splitAmongPartners,
      };
    }

    const parsed = createAnimalManagementRecordSchema.safeParse(payload);
    if (!parsed.success) {
      toast({
        title: 'Dados inválidos',
        description: parsed.error.errors.map((e) => e.message).join('. '),
        variant: 'destructive',
      });
      return;
    }
    createMutation.mutate(parsed.data);
  };

  return (
    <Card>
      <CardHeader className="py-4 md:py-6">
        <CardTitle className="text-lg">Novo registro — {animalManagementCategoryLabels[category]}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Tipo de evento</Label>
            <Select
              value={eventType}
              onValueChange={(v) => setEventType(v as AnimalManagementEventType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {eventTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {animalManagementEventTypeLabels[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data</Label>
            <Input
              type="date"
              value={performedAt}
              onChange={(e) => setPerformedAt(e.target.value)}
            />
          </div>
          {showRelatedAnimal && (
            <div className="space-y-2 md:col-span-2">
              <Label>Animal relacionado</Label>
              <Select
                value={relatedAnimalId || undefined}
                onValueChange={setRelatedAnimalId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o touro / parceiro" />
                </SelectTrigger>
                <SelectContent>
                  {relatedAnimals.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {animalLabel(a)} ({animalSexLabels[a.sex]})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showWeight && (
            <div className="space-y-2">
              <Label>Peso (kg)</Label>
              <Input
                type="number"
                min={0}
                step={0.1}
                value={weightKg}
                onChange={(e) =>
                  setWeightKg(e.target.value ? Number.parseFloat(e.target.value) : '')
                }
              />
            </div>
          )}
          {showGestation && (
            <div className="space-y-2">
              <Label>Resultado</Label>
              <Select
                value={gestationResult || undefined}
                onValueChange={(v) =>
                  setGestationResult(v as 'POSITIVO' | 'NEGATIVO' | 'INDETERMINADO')
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(gestationResultLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {showProduct && (
            <>
              <div className="space-y-2">
                <Label>Produto / tratamento</Label>
                <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Dose / observação técnica</Label>
                <Input value={dose} onChange={(e) => setDose(e.target.value)} />
              </div>
            </>
          )}
          <div className="space-y-2 md:col-span-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>

        <div className="rounded-md border p-4 space-y-4">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={registerCost}
              onChange={(e) => setRegisterCost(e.target.checked)}
              className="rounded border-input"
            />
            Registrar custo financeiro neste lançamento
          </label>
          {registerCost && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-muted-foreground text-xs">
                  Tipo sugerido: {animalExpenseTypeLabels[defaultExpenseTypeForCategory(category)]}
                </Label>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Descrição da despesa</Label>
                <Input
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder={animalManagementEventTypeLabels[eventType]}
                />
              </div>
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <CurrencyInput value={expenseAmount} onChange={setExpenseAmount} />
              </div>
              <div className="space-y-2">
                <Label>Data da despesa</Label>
                <Input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 md:col-span-2">
                <input
                  type="checkbox"
                  id="split-partners"
                  checked={splitAmongPartners}
                  onChange={(e) => setSplitAmongPartners(e.target.checked)}
                  className="rounded border-input"
                />
                <Label htmlFor="split-partners" className="font-normal cursor-pointer">
                  Ratear entre sócios conforme cotas
                </Label>
              </div>
              {expensePreview.length > 0 && (
                <div className="md:col-span-2 overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Sócio</th>
                        <th className="px-3 py-2 text-right">%</th>
                        <th className="px-3 py-2 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expensePreview.map((row) => (
                        <tr key={row.partnerId} className="border-t">
                          <td className="px-3 py-2">
                            {ownership.find((o) => o.partnerId === row.partnerId)?.partner
                              ?.name ?? row.partnerId}
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatPercent(row.ownershipPercent)}%
                          </td>
                          <td className="px-3 py-2 text-right">
                            {formatCurrency(row.allocatedAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={handleSubmit} disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Salvando...' : 'Salvar registro'}
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
