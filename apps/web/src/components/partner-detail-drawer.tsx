'use client';

import { useQuery } from '@tanstack/react-query';
import { PartnerDetailDto, PartnerDto, ledgerCategoryLabels } from '@controle-fazendas/shared';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api-client';
import { animalSaleTypeLabels, cn, formatCurrency, formatDateOnly } from '@/lib/utils';

interface PartnerDetailDrawerProps {
  farmId: string;
  partner: PartnerDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const installmentStatusLabels: Record<string, string> = {
  ABERTA: 'Em aberto',
  VENCIDA: 'Vencida',
  PAGA: 'Paga',
  CANCELADA: 'Cancelada',
};

function statusBadgeClass(status: string) {
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

export function PartnerDetailDrawer({
  farmId,
  partner,
  open,
  onOpenChange,
}: PartnerDetailDrawerProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['partner-detail', farmId, partner?.id],
    queryFn: async () => {
      const { data } = await api.get<PartnerDetailDto>(
        `/farms/${farmId}/partners/${partner!.id}/detail`,
      );
      return data;
    },
    enabled: open && !!partner?.id && !!farmId,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>{partner?.name ?? 'Parceiro'}</SheetTitle>
          <SheetDescription>
            {[partner?.document, partner?.email, partner?.phone].filter(Boolean).join(' · ') ||
              'Sem contato cadastrado'}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-6 py-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Carregando informações...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">
              Não foi possível carregar as informações do parceiro.
            </p>
          )}

          {data && (
            <Tabs defaultValue="compras">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="compras">
                  Compras ({data.purchases.length})
                </TabsTrigger>
                <TabsTrigger value="parcelas">
                  Parcelas ({data.installments.length})
                </TabsTrigger>
                <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
              </TabsList>

              <TabsContent value="compras" className="mt-4 space-y-3">
                {data.purchases.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma compra de animal vinculada a este parceiro.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {data.purchases.map((purchase) => (
                      <li key={purchase.id} className="px-3 py-3 text-sm">
                        <p className="font-medium">{purchase.description}</p>
                        <p className="mt-1 text-muted-foreground">
                          {animalSaleTypeLabels[purchase.type] ?? purchase.type}
                          {' · '}
                          {formatDateOnly(purchase.transactionDate)}
                          {' · '}
                          {formatCurrency(purchase.totalAmount)}
                        </p>
                        {(purchase.animalTag || purchase.eventName) && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {[
                              purchase.animalTag
                                ? `${purchase.animalTag}${purchase.animalName ? ` (${purchase.animalName})` : ''}`
                                : null,
                              purchase.eventName,
                              purchase.applyOwnershipTransfer && purchase.quotaPercent != null
                                ? `Transferência de ${purchase.quotaPercent}%`
                                : null,
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="parcelas" className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Em aberto</p>
                    <p className="font-semibold">
                      {data.installmentsSummary.openCount} ·{' '}
                      {formatCurrency(data.installmentsSummary.openAmount)}
                    </p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Vencidas</p>
                    <p className="font-semibold text-destructive">
                      {data.installmentsSummary.overdueCount} ·{' '}
                      {formatCurrency(data.installmentsSummary.overdueAmount)}
                    </p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Pagas</p>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {data.installmentsSummary.paidCount} ·{' '}
                      {formatCurrency(data.installmentsSummary.paidAmount)}
                    </p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Vence este mês</p>
                    <p className="font-semibold">
                      {data.installmentsSummary.dueThisMonthCount} ·{' '}
                      {formatCurrency(data.installmentsSummary.dueThisMonthAmount)}
                    </p>
                  </div>
                </div>

                {data.installments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhuma parcela vinculada a este parceiro.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {data.installments.map((item) => (
                      <li key={item.id} className="px-3 py-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{item.label}</p>
                            <p className="mt-1 text-muted-foreground">
                              Vencimento {formatDateOnly(item.dueDate)}
                              {' · '}
                              {formatCurrency(item.amount)}
                            </p>
                            {(item.sale.animalTag || item.sale.eventName) && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {[item.sale.animalTag, item.sale.eventName]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </p>
                            )}
                          </div>
                          <span
                            className={cn(
                              'shrink-0 rounded px-2 py-0.5 text-xs font-medium',
                              statusBadgeClass(item.effectiveStatus),
                            )}
                          >
                            {installmentStatusLabels[item.effectiveStatus] ??
                              item.effectiveStatus}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>

              <TabsContent value="financeiro" className="mt-4 space-y-4">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Receitas</p>
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(data.financialSummary.totalRevenue)}
                    </p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <p className="font-semibold text-destructive">
                      {formatCurrency(data.financialSummary.totalExpense)}
                    </p>
                  </div>
                  <div className="rounded-md border px-3 py-2">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className="font-semibold">
                      {formatCurrency(data.financialSummary.balance)}
                    </p>
                  </div>
                </div>

                {data.ledgerEntries.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum lançamento financeiro vinculado a este parceiro.
                  </p>
                ) : (
                  <ul className="divide-y rounded-md border">
                    {data.ledgerEntries.map((entry) => (
                      <li key={entry.id} className="px-3 py-3 text-sm">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">{entry.description}</p>
                            <p className="mt-1 text-muted-foreground">
                              {formatDateOnly(entry.entryDate)}
                              {' · '}
                              {ledgerCategoryLabels[entry.category] ?? entry.category}
                              {entry.event?.name ? ` · ${entry.event.name}` : ''}
                            </p>
                          </div>
                          <span
                            className={cn(
                              'shrink-0 font-semibold',
                              entry.type === 'RECEITA'
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : 'text-destructive',
                            )}
                          >
                            {entry.type === 'RECEITA' ? '+' : '-'}
                            {formatCurrency(entry.amount)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
