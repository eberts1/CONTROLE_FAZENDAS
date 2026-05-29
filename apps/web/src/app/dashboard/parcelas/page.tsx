'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ArrowUpDown, Search, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  InstallmentsSummaryDto,
  PayInstallmentInput,
  SaleInstallmentListItemDto,
  payInstallmentSchema,
} from '@controle-fazendas/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { PageHeader } from '@/components/layout/page-header';
import { formatCurrency, formatDateOnly, cn } from '@/lib/utils';

type StatusFilter = 'ALL' | 'ABERTA' | 'VENCIDA' | 'PAGA';
type PeriodPreset = 'ALL' | 'THIS_MONTH' | 'NEXT_MONTH' | 'NEXT_3_MONTHS' | 'CUSTOM';
type SortColumn = 'dueDate' | 'buyer' | 'event' | 'label' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

type PayModalState =
  | { mode: 'single'; row: SaleInstallmentListItemDto }
  | { mode: 'bulk'; rows: SaleInstallmentListItemDto[] }
  | null;

const statusFilterLabels: Record<StatusFilter, string> = {
  ALL: 'Todas',
  ABERTA: 'Em aberto',
  VENCIDA: 'Vencidas',
  PAGA: 'Pagas',
};

const periodPresetLabels: Record<PeriodPreset, string> = {
  ALL: 'Todos',
  THIS_MONTH: 'Este mês',
  NEXT_MONTH: 'Próximo mês',
  NEXT_3_MONTHS: 'Próximos 3 meses',
  CUSTOM: 'Personalizado',
};

function getPeriodRange(
  preset: PeriodPreset,
  customFrom: string,
  customTo: string,
): { from?: string; to?: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'ALL':
      return {};
    case 'THIS_MONTH': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case 'NEXT_MONTH': {
      const start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case 'NEXT_3_MONTHS': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      const end = new Date(today.getFullYear(), today.getMonth() + 4, 0, 23, 59, 59, 999);
      return { from: start.toISOString(), to: end.toISOString() };
    }
    case 'CUSTOM':
      return {
        ...(customFrom ? { from: new Date(`${customFrom}T00:00:00`).toISOString() } : {}),
        ...(customTo ? { to: new Date(`${customTo}T23:59:59`).toISOString() } : {}),
      };
  }
}

function statusBadgeClass(status: SaleInstallmentListItemDto['effectiveStatus']) {
  switch (status) {
    case 'PAGA':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200';
    case 'VENCIDA':
      return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200';
    case 'CANCELADA':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200';
  }
}

const effectiveStatusLabels: Record<SaleInstallmentListItemDto['effectiveStatus'], string> = {
  ABERTA: 'Em aberto',
  VENCIDA: 'Vencida',
  PAGA: 'Paga',
  CANCELADA: 'Cancelada',
};

const statusSortOrder: Record<SaleInstallmentListItemDto['effectiveStatus'], number> = {
  VENCIDA: 0,
  ABERTA: 1,
  PAGA: 2,
  CANCELADA: 3,
};

function isPayable(row: SaleInstallmentListItemDto) {
  return row.effectiveStatus === 'ABERTA' || row.effectiveStatus === 'VENCIDA';
}

function compareInstallments(
  a: SaleInstallmentListItemDto,
  b: SaleInstallmentListItemDto,
  column: SortColumn,
  direction: SortDirection,
) {
  let result = 0;

  switch (column) {
    case 'dueDate':
      result = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      break;
    case 'buyer':
      result = a.buyer.name.localeCompare(b.buyer.name, 'pt-BR');
      break;
    case 'event': {
      const aEvent = `${a.sale.eventName ?? ''} ${a.sale.animalTag ?? ''}`;
      const bEvent = `${b.sale.eventName ?? ''} ${b.sale.animalTag ?? ''}`;
      result = aEvent.localeCompare(bEvent, 'pt-BR');
      break;
    }
    case 'label':
      result = a.sequence - b.sequence || a.label.localeCompare(b.label, 'pt-BR');
      break;
    case 'amount':
      result = a.amount - b.amount;
      break;
    case 'status':
      result =
        statusSortOrder[a.effectiveStatus] - statusSortOrder[b.effectiveStatus] ||
        a.effectiveStatus.localeCompare(b.effectiveStatus, 'pt-BR');
      break;
  }

  return direction === 'asc' ? result : -result;
}

function SortableHeader({
  label,
  column,
  sortColumn,
  sortDirection,
  onSort,
  className,
}: {
  label: string;
  column: SortColumn;
  sortColumn: SortColumn;
  sortDirection: SortDirection;
  onSort: (column: SortColumn) => void;
  className?: string;
}) {
  const isActive = sortColumn === column;
  const Icon = !isActive ? ArrowUpDown : sortDirection === 'desc' ? ArrowDown : ArrowUp;

  return (
    <th className={cn('px-4 py-3 font-medium', className)}>
      <button
        type="button"
        onClick={() => onSort(column)}
        className={cn(
          'inline-flex items-center gap-1 transition-colors hover:text-foreground',
          isActive ? 'text-foreground' : 'text-muted-foreground',
        )}
      >
        {label}
        <Icon className={cn('h-3.5 w-3.5', !isActive && 'opacity-50')} />
      </button>
    </th>
  );
}

export default function ParcelasPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('ALL');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  const [payModal, setPayModal] = useState<PayModalState>(null);
  const [paidAt, setPaidAt] = useState(new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [sortColumn, setSortColumn] = useState<SortColumn>('dueDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const selectAllRef = useRef<HTMLInputElement>(null);

  const periodRange = useMemo(
    () => getPeriodRange(periodPreset, customFrom, customTo),
    [periodPreset, customFrom, customTo],
  );

  const filterParams = useMemo(
    () => ({
      ...(statusFilter !== 'ALL' ? { status: statusFilter } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(periodRange.from ? { from: periodRange.from } : {}),
      ...(periodRange.to ? { to: periodRange.to } : {}),
    }),
    [statusFilter, debouncedSearch, periodRange],
  );

  const filterQueryKey = [
    activeFarmId,
    statusFilter,
    debouncedSearch,
    periodPreset,
    customFrom,
    customTo,
  ] as const;

  const hasActiveFilters =
    statusFilter !== 'ALL' ||
    debouncedSearch.length > 0 ||
    periodPreset !== 'ALL' ||
    customFrom.length > 0 ||
    customTo.length > 0;

  const { data: summary } = useQuery({
    queryKey: ['installments-summary', ...filterQueryKey],
    queryFn: async () => {
      const { data } = await api.get<InstallmentsSummaryDto>(
        `/farms/${activeFarmId}/installments/summary`,
        { params: filterParams },
      );
      return data;
    },
    enabled: !!activeFarmId,
  });

  const { data: installments = [], isLoading } = useQuery({
    queryKey: ['installments', ...filterQueryKey],
    queryFn: async () => {
      const { data } = await api.get<SaleInstallmentListItemDto[]>(
        `/farms/${activeFarmId}/installments`,
        { params: filterParams },
      );
      return data;
    },
    enabled: !!activeFarmId,
  });

  const sortedInstallments = useMemo(
    () =>
      [...installments].sort((a, b) => compareInstallments(a, b, sortColumn, sortDirection)),
    [installments, sortColumn, sortDirection],
  );

  const payableInstallments = useMemo(
    () => sortedInstallments.filter(isPayable),
    [sortedInstallments],
  );

  const selectedRows = useMemo(
    () => payableInstallments.filter((row) => selectedIds.has(row.id)),
    [payableInstallments, selectedIds],
  );

  const selectedTotal = useMemo(
    () => selectedRows.reduce((sum, row) => sum + row.amount, 0),
    [selectedRows],
  );

  const allPayableSelected =
    payableInstallments.length > 0 &&
    payableInstallments.every((row) => selectedIds.has(row.id));

  useEffect(() => {
    setSelectedIds((prev) => {
      const validIds = new Set(payableInstallments.map((row) => row.id));
      const next = new Set([...prev].filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [payableInstallments]);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate =
        selectedIds.size > 0 && !allPayableSelected;
    }
  }, [selectedIds.size, allPayableSelected]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortColumn(column);
    setSortDirection('desc');
  };

  const toggleRowSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allPayableSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(payableInstallments.map((row) => row.id)));
  };

  const clearFilters = () => {
    setStatusFilter('ALL');
    setSearchQuery('');
    setDebouncedSearch('');
    setPeriodPreset('ALL');
    setCustomFrom('');
    setCustomTo('');
  };

  const invalidateInstallments = () => {
    queryClient.invalidateQueries({ queryKey: ['installments'] });
    queryClient.invalidateQueries({ queryKey: ['installments-summary'] });
    queryClient.invalidateQueries({ queryKey: ['finance-ledger', activeFarmId] });
    queryClient.invalidateQueries({ queryKey: ['finance-summary', activeFarmId] });
  };

  const payMutation = useMutation({
    mutationFn: async ({
      rows,
      input,
    }: {
      rows: SaleInstallmentListItemDto[];
      input: PayInstallmentInput;
    }) => {
      const results = await Promise.allSettled(
        rows.map(async (row) => {
          const { data } = await api.patch<SaleInstallmentListItemDto>(
            `/farms/${activeFarmId}/installments/${row.id}/pay`,
            input,
          );
          return data;
        }),
      );

      const succeeded = results.filter((result) => result.status === 'fulfilled').length;
      const failed = results.length - succeeded;
      return { succeeded, failed, total: results.length };
    },
    onSuccess: ({ succeeded, failed, total }) => {
      if (failed === 0) {
        toast({
          title: total === 1 ? 'Parcela baixada com sucesso' : `${succeeded} parcelas baixadas com sucesso`,
        });
      } else if (succeeded === 0) {
        toast({
          title: 'Erro ao baixar parcelas',
          description: 'Nenhuma parcela foi baixada. Tente novamente.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Baixa parcial concluída',
          description: `${succeeded} baixada(s), ${failed} com erro.`,
          variant: 'destructive',
        });
      }

      setPayModal(null);
      setPaymentNotes('');
      setSelectedIds(new Set());
      invalidateInstallments();
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro ao baixar parcela',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const handlePay = () => {
    if (!payModal) return;
    const rows = payModal.mode === 'single' ? [payModal.row] : payModal.rows;
    const parsed = payInstallmentSchema.safeParse({
      paidAt: new Date(`${paidAt}T12:00:00`).toISOString(),
      paymentNotes: paymentNotes || undefined,
    });
    if (!parsed.success) {
      toast({ title: 'Data inválida', variant: 'destructive' });
      return;
    }
    payMutation.mutate({ rows, input: parsed.data });
  };

  const openSinglePay = (row: SaleInstallmentListItemDto) => {
    setPayModal({ mode: 'single', row });
    setPaidAt(new Date().toISOString().slice(0, 10));
    setPaymentNotes('');
  };

  const openBulkPay = () => {
    if (selectedRows.length === 0) return;
    setPayModal({ mode: 'bulk', rows: selectedRows });
    setPaidAt(new Date().toISOString().slice(0, 10));
    setPaymentNotes('');
  };

  if (!activeFarmId) {
    return <p className="text-muted-foreground">Selecione uma fazenda.</p>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parcelas"
        description="Controle de recebíveis de leilões — baixe parcelas e acompanhe vencidos."
      />

      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Em aberto</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.openAmount)}</p>
              <p className="text-xs text-muted-foreground">{summary.openCount} parcela(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vencidas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.overdueAmount)}</p>
              <p className="text-xs text-muted-foreground">{summary.overdueCount} parcela(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vence este mês</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.dueThisMonthAmount)}</p>
              <p className="text-xs text-muted-foreground">{summary.dueThisMonthCount} parcela(s)</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Recebido</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-emerald-600">{formatCurrency(summary.paidAmount)}</p>
              <p className="text-xs text-muted-foreground">{summary.paidCount} parcela(s)</p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Limpar filtros
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por leilão ou comprador…"
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="Limpar busca"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Status</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(statusFilterLabels) as StatusFilter[]).map((key) => (
                  <Button
                    key={key}
                    variant={statusFilter === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setStatusFilter(key)}
                  >
                    {statusFilterLabels[key]}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Período de vencimento</Label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(periodPresetLabels) as PeriodPreset[])
                  .filter((key) => key !== 'CUSTOM')
                  .map((key) => (
                    <Button
                      key={key}
                      variant={periodPreset === key ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => {
                        setPeriodPreset(key);
                        setCustomFrom('');
                        setCustomTo('');
                      }}
                    >
                      {periodPresetLabels[key]}
                    </Button>
                  ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3 border-t pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground">Intervalo personalizado</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={customFrom}
                  onChange={(e) => {
                    setCustomFrom(e.target.value);
                    setPeriodPreset('CUSTOM');
                  }}
                  className="w-[150px]"
                  aria-label="Vencimento de"
                />
                <span className="text-sm text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={customTo}
                  onChange={(e) => {
                    setCustomTo(e.target.value);
                    setPeriodPreset('CUSTOM');
                  }}
                  className="w-[150px]"
                  aria-label="Vencimento até"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        {selectedRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
            <p className="text-sm">
              <span className="font-medium">{selectedRows.length} parcela(s) selecionada(s)</span>
              <span className="text-muted-foreground"> · Total {formatCurrency(selectedTotal)}</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                Limpar seleção
              </Button>
              <Button size="sm" onClick={openBulkPay}>
                Baixar selecionadas
              </Button>
            </div>
          </div>
        )}
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Carregando parcelas…</p>
          ) : installments.length === 0 ? (
            <p className="p-6 text-muted-foreground">
              {hasActiveFilters
                ? 'Nenhuma parcela encontrada com os filtros selecionados.'
                : 'Nenhuma parcela encontrada. Importe um mapa de venda ou cadastre um plano na venda do evento.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40 text-left">
                    <th className="w-10 px-4 py-3">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        checked={allPayableSelected}
                        onChange={toggleSelectAll}
                        disabled={payableInstallments.length === 0}
                        className="rounded border"
                        aria-label="Selecionar todas as parcelas baixáveis"
                      />
                    </th>
                    <SortableHeader
                      label="Vencimento"
                      column="dueDate"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Comprador"
                      column="buyer"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Evento / Animal"
                      column="event"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Parcela"
                      column="label"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Valor"
                      column="amount"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <SortableHeader
                      label="Status"
                      column="status"
                      sortColumn={sortColumn}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {sortedInstallments.map((row) => {
                    const payable = isPayable(row);
                    const selected = selectedIds.has(row.id);

                    return (
                      <tr
                        key={row.id}
                        className={cn(
                          'border-b last:border-0',
                          selected && 'bg-primary/5',
                        )}
                      >
                        <td className="px-4 py-3">
                          {payable ? (
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => toggleRowSelection(row.id)}
                              className="rounded border"
                              aria-label={`Selecionar parcela ${row.label} de ${row.buyer.name}`}
                            />
                          ) : null}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatDateOnly(row.dueDate)}
                        </td>
                        <td className="px-4 py-3">{row.buyer.name}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium">{row.sale.eventName ?? '—'}</div>
                          <div className="text-xs text-muted-foreground">
                            {row.sale.animalTag ?? '—'}
                            {row.sale.animalName ? ` · ${row.sale.animalName}` : ''}
                            {row.plan.auctionLotNumber != null
                              ? ` · Lote ${row.plan.auctionLotNumber}`
                              : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3">{row.label}</td>
                        <td className="px-4 py-3 font-medium">{formatCurrency(row.amount)}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(row.effectiveStatus)}`}
                          >
                            {effectiveStatusLabels[row.effectiveStatus]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {payable ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openSinglePay(row)}
                            >
                              Baixar
                            </Button>
                          ) : row.paidAt ? (
                            <span className="text-xs text-muted-foreground">
                              Pago em {formatDateOnly(row.paidAt)}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {payModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {payModal.mode === 'single'
                  ? 'Baixar parcela'
                  : `Baixar ${payModal.rows.length} parcelas`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {payModal.mode === 'single' ? (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">{payModal.row.buyer.name}</p>
                  <p className="text-muted-foreground">
                    {payModal.row.label} · {formatCurrency(payModal.row.amount)} · venc.{' '}
                    {formatDateOnly(payModal.row.dueDate)}
                  </p>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium">
                    {payModal.rows.length} parcela(s) · {formatCurrency(
                      payModal.rows.reduce((sum, row) => sum + row.amount, 0),
                    )}
                  </p>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-muted-foreground">
                    {payModal.rows.map((row) => (
                      <li key={row.id}>
                        {row.buyer.name} · {row.label} · {formatCurrency(row.amount)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="space-y-2">
                <Label>Data do pagamento</Label>
                <Input type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Observações</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Opcional"
                  rows={2}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setPayModal(null)}>
                  Cancelar
                </Button>
                <Button onClick={handlePay} disabled={payMutation.isPending}>
                  {payMutation.isPending ? 'Baixando…' : 'Confirmar baixa'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
