'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  CreateEmployeeInput,
  CreateLedgerEntryInput,
  CreatePayrollRunInput,
  CreateRecurringTemplateInput,
  EmployeeDto,
  FarmEventDto,
  FarmEventStatus,
  FarmFinanceSummaryDto,
  FarmLedgerEntryDto,
  FinanceSection,
  LedgerCategory,
  LedgerEntryType,
  LedgerScope,
  LedgerSource,
  PayrollRunDto,
  RecurringLedgerTemplateDto,
  categoriesBySection,
  createEmployeeSchema,
  createLedgerEntrySchema,
  createPayrollRunSchema,
  createRecurringTemplateSchema,
  financeSectionDescriptions,
  financeSectionLabels,
  generateRecurringSchema,
  ledgerCategoryLabels,
  ledgerEntryTypeLabels,
} from '@controle-fazendas/shared';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency, formatDateOnly } from '@/lib/utils';

const SECTIONS = Object.values(FinanceSection);

const RECEITA_CATEGORIES = new Set<LedgerCategory>([
  LedgerCategory.VENDA_ANIMAL,
  LedgerCategory.VENDA_GENETICO,
  LedgerCategory.OUTRA_RECEITA,
]);

function categoriesForEntry(section: FinanceSection, type: LedgerEntryType): LedgerCategory[] {
  const all = categoriesBySection[section];
  if (section !== FinanceSection.PECUARIA_EVENTOS) return all;
  return type === LedgerEntryType.RECEITA
    ? all.filter((c) => RECEITA_CATEGORIES.has(c))
    : all.filter((c) => !RECEITA_CATEGORIES.has(c));
}

const payrollStatusLabels: Record<string, string> = {
  RASCUNHO: 'Rascunho',
  FECHADO: 'Fechado',
  PAGO: 'Pago',
};

function monthInputValue() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function FinanceiroPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(monthInputValue());
  const [activeSection, setActiveSection] = useState<FinanceSection>(FinanceSection.COTIDIANO);
  const [showLedgerForm, setShowLedgerForm] = useState(false);

  const fromTo = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);
    return { from: start.toISOString(), to: end.toISOString() };
  }, [month]);

  const { data: summary } = useQuery({
    queryKey: ['finance-summary', activeFarmId, month],
    queryFn: async () => {
      const { data } = await api.get<FarmFinanceSummaryDto>(
        `/farms/${activeFarmId}/finances/summary`,
        { params: { from: fromTo.from, to: fromTo.to } },
      );
      return data;
    },
    enabled: !!activeFarmId,
  });

  const { data: ledger = [], isLoading } = useQuery({
    queryKey: ['finance-ledger', activeFarmId, activeSection, month],
    queryFn: async () => {
      const { data } = await api.get<FarmLedgerEntryDto[]>(
        `/farms/${activeFarmId}/finances/ledger`,
        { params: { section: activeSection, from: fromTo.from, to: fromTo.to } },
      );
      return data;
    },
    enabled: !!activeFarmId,
  });

  const invalidateFinance = () => {
    queryClient.invalidateQueries({ queryKey: ['finance-summary', activeFarmId] });
    queryClient.invalidateQueries({ queryKey: ['finance-ledger', activeFarmId] });
    queryClient.invalidateQueries({ queryKey: ['finance-recurring', activeFarmId] });
    queryClient.invalidateQueries({ queryKey: ['finance-employees', activeFarmId] });
    queryClient.invalidateQueries({ queryKey: ['finance-payroll', activeFarmId] });
    queryClient.invalidateQueries({ queryKey: ['farm-event-summary', activeFarmId] });
    queryClient.invalidateQueries({ queryKey: ['farm-event-expenses', activeFarmId] });
  };

  if (!activeFarmId) {
    return <p className="text-muted-foreground">Selecione uma fazenda.</p>;
  }

  const sectionSummary = summary?.bySection.find((s) => s.section === activeSection);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Lançamentos, contas fixas, operação, folha e pecuária em um só lugar"
      />

      <div className="flex flex-wrap items-end gap-4">
        <div className="space-y-2">
          <Label>Competência</Label>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </div>
        {summary && (
          <div className="flex flex-wrap gap-4 text-sm">
            <span>
              Receitas: <strong className="text-green-600">{formatCurrency(summary.totalRevenue)}</strong>
            </span>
            <span>
              Despesas: <strong className="text-red-600">{formatCurrency(summary.totalExpense)}</strong>
            </span>
            <span>
              Saldo: <strong>{formatCurrency(summary.balance)}</strong>
            </span>
          </div>
        )}
      </div>

      <Tabs
        defaultValue={FinanceSection.COTIDIANO}
        value={activeSection}
        onValueChange={(v) => setActiveSection(v as FinanceSection)}
      >
        <TabsList className="flex h-auto flex-wrap justify-start gap-1">
          {SECTIONS.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs sm:text-sm">
              {financeSectionLabels[s]}
            </TabsTrigger>
          ))}
        </TabsList>

        {SECTIONS.map((section) => (
          <TabsContent key={section} value={section} className="space-y-4">
            <p className="text-sm text-muted-foreground">{financeSectionDescriptions[section]}</p>

            {sectionSummary && activeSection === section && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Card>
                  <CardContent className="pt-4 text-sm">
                    Receitas da seção: {formatCurrency(sectionSummary.revenue)}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-sm">
                    Despesas da seção: {formatCurrency(sectionSummary.expense)}
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 text-sm">
                    Saldo da seção: {formatCurrency(sectionSummary.balance)}
                  </CardContent>
                </Card>
              </div>
            )}

            {section === FinanceSection.FIXOS_RECORRENTES && (
              <RecurringPanel farmId={activeFarmId} month={month} onChange={invalidateFinance} />
            )}

            {section === FinanceSection.PESSOAL_FOLHA && (
              <PayrollPanel farmId={activeFarmId} onChange={invalidateFinance} />
            )}

            {section === FinanceSection.PECUARIA_EVENTOS && (
              <Card>
                <CardContent className="pt-4 text-sm text-muted-foreground">
                  Vendas e despesas na ficha do animal ou no evento entram aqui automaticamente. Para custos
                  do evento sem animal vinculado (transporte, comissão, estrutura etc.), use{' '}
                  <strong>Novo lançamento</strong> e selecione o evento — assim o total de despesas do evento
                  fica consolidado.
                </CardContent>
              </Card>
            )}

            {section !== FinanceSection.PESSOAL_FOLHA && (
              <>
                <div className="flex justify-end">
                  <Button onClick={() => setShowLedgerForm(!showLedgerForm)}>
                    {showLedgerForm ? 'Cancelar' : 'Novo lançamento'}
                  </Button>
                </div>
                {showLedgerForm && activeSection === section && (
                  <LedgerEntryForm
                    farmId={activeFarmId}
                    section={section}
                    onSuccess={() => {
                      setShowLedgerForm(false);
                      invalidateFinance();
                    }}
                  />
                )}
                <LedgerList
                  entries={activeSection === section ? ledger : []}
                  isLoading={isLoading && activeSection === section}
                  farmId={activeFarmId}
                  onDelete={invalidateFinance}
                />
              </>
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function LedgerList({
  entries,
  isLoading,
  farmId,
  onDelete,
}: {
  entries: FarmLedgerEntryDto[];
  isLoading: boolean;
  farmId: string;
  onDelete: () => void;
}) {
  const { toast } = useToast();
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/farms/${farmId}/finances/ledger/${id}`);
    },
    onSuccess: () => {
      toast({ title: 'Lançamento removido' });
      onDelete();
    },
    onError: () => toast({ title: 'Erro ao remover', variant: 'destructive' }),
  });

  if (isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  if (entries.length === 0) return <p className="text-muted-foreground">Nenhum lançamento no período.</p>;

  return (
    <div className="space-y-2">
      {entries.map((e) => (
        <Card key={e.id}>
          <CardHeader className="flex flex-row items-start justify-between py-3">
            <div>
              <CardTitle className="text-base">{e.description}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {ledgerEntryTypeLabels[e.type]} · {ledgerCategoryLabels[e.category]} ·{' '}
                {formatDateOnly(e.entryDate)}
                {e.source !== LedgerSource.MANUAL && ' · automático'}
                {e.event && (
                  <>
                    {' · '}
                    <Link
                      href={`/dashboard/eventos/${e.event.id}`}
                      className="text-primary hover:underline"
                    >
                      {e.event.name}
                    </Link>
                  </>
                )}
              </p>
            </div>
            <div className="text-right">
              <p
                className={
                  e.type === LedgerEntryType.RECEITA ? 'font-semibold text-green-600' : 'font-semibold text-red-600'
                }
              >
                {e.type === LedgerEntryType.RECEITA ? '+' : '-'}
                {formatCurrency(e.amount)}
              </p>
              {e.source === LedgerSource.MANUAL && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-1 text-destructive"
                  onClick={() => deleteMutation.mutate(e.id)}
                >
                  Excluir
                </Button>
              )}
            </div>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

function LedgerEntryForm({
  farmId,
  section,
  onSuccess,
}: {
  farmId: string;
  section: FinanceSection;
  onSuccess: () => void;
}) {
  const { toast } = useToast();
  const [type, setType] = useState<LedgerEntryType>(LedgerEntryType.DESPESA);
  const [category, setCategory] = useState(
    categoriesForEntry(section, LedgerEntryType.DESPESA)[0],
  );
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [eventId, setEventId] = useState('');

  const linkToEvent = section === FinanceSection.PECUARIA_EVENTOS;

  const { data: events = [] } = useQuery({
    queryKey: ['farm-events', farmId],
    queryFn: async () => {
      const { data } = await api.get<FarmEventDto[]>(`/farms/${farmId}/events`);
      return data;
    },
    enabled: linkToEvent,
  });

  const activeEvents = events.filter((e) => e.status !== FarmEventStatus.CANCELADO);

  const categories = categoriesForEntry(section, type);

  const mutation = useMutation({
    mutationFn: async (input: CreateLedgerEntryInput) => {
      const { data } = await api.post(`/farms/${farmId}/finances/ledger`, input);
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Lançamento salvo' });
      onSuccess();
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      toast({
        title: 'Erro',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handleTypeChange = (next: LedgerEntryType) => {
    setType(next);
    const nextCategories = categoriesForEntry(section, next);
    if (!nextCategories.includes(category)) {
      setCategory(nextCategories[0]);
    }
    if (next === LedgerEntryType.RECEITA) setEventId('');
  };

  const submit = () => {
    const payload = {
      section,
      type,
      category,
      description,
      amount: amount === '' ? 0 : amount,
      entryDate,
      notes: notes || undefined,
      ...(linkToEvent && type === LedgerEntryType.DESPESA && eventId
        ? { eventId, scope: LedgerScope.EVENTO }
        : {}),
      ...(linkToEvent && type === LedgerEntryType.RECEITA && eventId
        ? { eventId, scope: LedgerScope.EVENTO }
        : {}),
    };
    const parsed = createLedgerEntrySchema.safeParse(payload);
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.errors[0]?.message, variant: 'destructive' });
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Novo lançamento — {financeSectionLabels[section]}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={(v) => handleTypeChange(v as LedgerEntryType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ledgerEntryTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {linkToEvent && type === LedgerEntryType.DESPESA && (
          <div className="space-y-2">
            <Label>Evento</Label>
            <Select value={eventId || undefined} onValueChange={setEventId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o evento" />
              </SelectTrigger>
              <SelectContent>
                {activeEvents.length === 0 ? (
                  <SelectItem value="__none" disabled>
                    Nenhum evento cadastrado
                  </SelectItem>
                ) : (
                  activeEvents.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id}>
                      {ev.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Obrigatório para controlar despesas por evento.
            </p>
          </div>
        )}
        {linkToEvent && type === LedgerEntryType.RECEITA && activeEvents.length > 0 && (
          <div className="space-y-2">
            <Label>Evento (opcional)</Label>
            <Select
              value={eventId || '__none'}
              onValueChange={(v) => setEventId(v === '__none' ? '' : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem vínculo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Sem vínculo</SelectItem>
                {activeEvents.map((ev) => (
                  <SelectItem key={ev.id} value={ev.id}>
                    {ev.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="space-y-2">
          <Label>Categoria</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {ledgerCategoryLabels[c]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Descrição</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Valor</Label>
          <CurrencyInput value={amount} onChange={setAmount} />
        </div>
        <div className="space-y-2">
          <Label>Data</Label>
          <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label>Observações</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Button onClick={submit} disabled={mutation.isPending}>
            Salvar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function RecurringPanel({
  farmId,
  month,
  onChange,
}: {
  farmId: string;
  month: string;
  onChange: () => void;
}) {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [type, setType] = useState<LedgerEntryType>(LedgerEntryType.DESPESA);
  const [category, setCategory] = useState(categoriesBySection[FinanceSection.FIXOS_RECORRENTES][0]);
  const [dayOfMonth, setDayOfMonth] = useState(5);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));

  const { data: templates = [] } = useQuery({
    queryKey: ['finance-recurring', farmId],
    queryFn: async () => {
      const { data } = await api.get<RecurringLedgerTemplateDto[]>(
        `/farms/${farmId}/finances/recurring`,
      );
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateRecurringTemplateInput) => {
      await api.post(`/farms/${farmId}/finances/recurring`, input);
    },
    onSuccess: () => {
      toast({ title: 'Conta fixa cadastrada' });
      setShowForm(false);
      onChange();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      await api.post(`/farms/${farmId}/finances/recurring/${templateId}/generate`, {
        referenceMonth: month,
      });
    },
    onSuccess: () => {
      toast({ title: 'Lançamento gerado para o mês' });
      onChange();
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
      toast({
        title: 'Erro',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h3 className="font-semibold">Contas fixas e recorrentes</h3>
        <Button variant="outline" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nova conta fixa'}
        </Button>
      </div>
      {showForm && (
        <Card>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={(v) => setType(v as LedgerEntryType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ledgerEntryTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as typeof category)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categoriesBySection[FinanceSection.FIXOS_RECORRENTES].map((c) => (
                    <SelectItem key={c} value={c}>
                      {ledgerCategoryLabels[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor mensal</Label>
              <CurrencyInput value={amount} onChange={setAmount} />
            </div>
            <div className="space-y-2">
              <Label>Dia do vencimento</Label>
              <Input
                type="number"
                min={1}
                max={28}
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <Button
                onClick={() => {
                  const payload = {
                    type,
                    category,
                    description,
                    amount: amount === '' ? 0 : amount,
                    dayOfMonth,
                    startDate,
                  };
                  const parsed = createRecurringTemplateSchema.safeParse(payload);
                  if (!parsed.success) {
                    toast({ title: 'Dados inválidos', variant: 'destructive' });
                    return;
                  }
                  createMutation.mutate(parsed.data);
                }}
              >
                Salvar template
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {templates.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma conta fixa cadastrada.</p>
      ) : (
        templates.map((t) => (
          <Card key={t.id}>
            <CardHeader className="flex flex-row justify-between py-3">
              <div>
                <CardTitle className="text-base">{t.description}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {ledgerEntryTypeLabels[t.type]} · dia {t.dayOfMonth} ·{' '}
                  {formatCurrency(t.amount)}
                  {!t.active && ' · inativo'}
                </p>
              </div>
              <Button
                size="sm"
                disabled={!t.active || generateMutation.isPending}
                onClick={() => generateMutation.mutate(t.id)}
              >
                Gerar {month}
              </Button>
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );
}

function PayrollPanel({ farmId, onChange }: { farmId: string; onChange: () => void }) {
  const { toast } = useToast();
  const [empName, setEmpName] = useState('');
  const [empSalary, setEmpSalary] = useState<number | ''>('');
  const [payrollMonth, setPayrollMonth] = useState(monthInputValue());

  const { data: employees = [] } = useQuery({
    queryKey: ['finance-employees', farmId],
    queryFn: async () => {
      const { data } = await api.get<EmployeeDto[]>(`/farms/${farmId}/finances/employees`);
      return data;
    },
  });

  const { data: payrollRuns = [] } = useQuery({
    queryKey: ['finance-payroll', farmId],
    queryFn: async () => {
      const { data } = await api.get<PayrollRunDto[]>(`/farms/${farmId}/finances/payroll-runs`);
      return data;
    },
  });

  const createEmployee = useMutation({
    mutationFn: async (input: CreateEmployeeInput) => {
      await api.post(`/farms/${farmId}/finances/employees`, input);
    },
    onSuccess: () => {
      toast({ title: 'Funcionário cadastrado' });
      setEmpName('');
      setEmpSalary('');
      onChange();
    },
  });

  const createPayroll = useMutation({
    mutationFn: async (input: CreatePayrollRunInput) => {
      await api.post(`/farms/${farmId}/finances/payroll-runs`, input);
    },
    onSuccess: () => {
      toast({ title: 'Folha criada com salários base' });
      onChange();
    },
  });

  const closePayroll = useMutation({
    mutationFn: async (runId: string) => {
      await api.post(`/farms/${farmId}/finances/payroll-runs/${runId}/close`);
    },
    onSuccess: () => {
      toast({ title: 'Folha fechada — lançamentos no financeiro' });
      onChange();
    },
  });

  const markPaid = useMutation({
    mutationFn: async (runId: string) => {
      await api.post(`/farms/${farmId}/finances/payroll-runs/${runId}/mark-paid`);
    },
    onSuccess: () => {
      toast({ title: 'Folha marcada como paga' });
      onChange();
    },
  });

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Funcionários</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome</Label>
            <Input value={empName} onChange={(e) => setEmpName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Salário base</Label>
            <CurrencyInput value={empSalary} onChange={setEmpSalary} />
          </div>
          <Button
            onClick={() => {
              const parsed = createEmployeeSchema.safeParse({
                name: empName,
                baseSalary: empSalary === '' ? undefined : empSalary,
              });
              if (!parsed.success) {
                toast({ title: 'Dados inválidos', variant: 'destructive' });
                return;
              }
              createEmployee.mutate(parsed.data);
            }}
          >
            Adicionar funcionário
          </Button>
          <ul className="space-y-2 text-sm">
            {employees.map((e) => (
              <li key={e.id} className="flex justify-between border-b py-2">
                <span>
                  {e.name}
                  {e.role && ` — ${e.role}`}
                  {!e.active && ' (inativo)'}
                </span>
                <span>{e.baseSalary != null ? formatCurrency(e.baseSalary) : '—'}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Folha de pagamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input type="month" value={payrollMonth} onChange={(e) => setPayrollMonth(e.target.value)} />
            <Button
              onClick={() => {
                const parsed = createPayrollRunSchema.safeParse({ referenceMonth: payrollMonth });
                if (!parsed.success) {
                  toast({ title: 'Mês inválido', variant: 'destructive' });
                  return;
                }
                createPayroll.mutate(parsed.data);
              }}
            >
              Gerar folha
            </Button>
          </div>
          {payrollRuns.map((run) => (
            <Card key={run.id}>
              <CardHeader className="py-3">
                <CardTitle className="text-base">
                  {formatDateOnly(run.referenceMonth).slice(3)} — {payrollStatusLabels[run.status]}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Total: {formatCurrency(run.totalAmount)} · {run.lines.length} linha(s)
                </p>
                <div className="mt-2 flex gap-2">
                  {run.status === 'RASCUNHO' && (
                    <Button size="sm" onClick={() => closePayroll.mutate(run.id)}>
                      Fechar folha
                    </Button>
                  )}
                  {run.status === 'FECHADO' && (
                    <Button size="sm" variant="outline" onClick={() => markPaid.mutate(run.id)}>
                      Marcar paga
                    </Button>
                  )}
                </div>
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {run.lines.map((l) => (
                    <li key={l.id}>
                      {l.employee?.name ?? l.employeeId}: {formatCurrency(l.netAmount)}
                    </li>
                  ))}
                </ul>
              </CardHeader>
            </Card>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
