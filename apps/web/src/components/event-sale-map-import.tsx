'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  AnimalDto,
  PartnerDto,
  SaleMapImportLotPreview,
  SaleMapImportPreviewDto,
  SaleMapImportResultDto,
  SaleMapSyncInstallmentsResultDto,
  importSaleMapSchema,
  rankAnimalMatches,
} from '@controle-fazendas/shared';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api, getAccessToken, getApiUrl } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { formatCurrency, formatDateOnly } from '@/lib/utils';

interface EventSaleMapImportProps {
  farmId: string;
  eventId: string;
  onSuccess: () => void;
}

const IMPORT_BATCH_SIZE = 10;

const SALE_MAP_SOURCE_LABELS: Record<'PROGRAMA_LEILOES' | 'BULA_REMATES', string> = {
  PROGRAMA_LEILOES: 'Programa Leilões',
  BULA_REMATES: 'Bula Remates',
};

function toDateInputValue(iso: string | null | undefined): string {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function mapLotForImport(lot: SaleMapImportLotPreview) {
  return {
    tempId: lot.tempId,
    selected: true,
    canal: lot.canal,
    description: lot.description,
    registration: lot.registration,
    animalId: lot.animalId,
    createAnimal: lot.createAnimal,
    buyerName: lot.buyerName,
    buyerPartnerId: lot.buyerPartnerId,
    createBuyer: lot.createBuyer,
    bidValue: lot.bidValue ?? undefined,
    captures: lot.captures,
    quantity: lot.quantity,
    totalAmount: lot.totalAmount ?? undefined,
    netAmount: lot.netAmount ?? undefined,
    discountAmount: lot.discountAmount ?? undefined,
    entryAmount: lot.entryAmount ?? undefined,
    isCashPayment: lot.isCashPayment,
    installments: lot.installments,
  };
}

export function EventSaleMapImport({ farmId, eventId, onSuccess }: EventSaleMapImportProps) {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('5421');
  const [preview, setPreview] = useState<SaleMapImportPreviewDto | null>(null);
  const [lots, setLots] = useState<SaleMapImportLotPreview[]>([]);
  const [expandedLotId, setExpandedLotId] = useState<string | null>(null);
  const [importProgress, setImportProgress] = useState<string | null>(null);

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

  const selectedCount = useMemo(() => lots.filter((lot) => lot.selected).length, [lots]);

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error('Selecione um PDF');
      const formData = new FormData();
      formData.append('file', file);
      if (password.trim()) formData.append('password', password.trim());

      const token = getAccessToken();
      const response = await fetch(
        `${getApiUrl()}/farms/${farmId}/events/${eventId}/import/preview`,
        {
          method: 'POST',
          body: formData,
          credentials: 'include',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(
          Array.isArray(payload.message) ? payload.message.join('. ') : payload.message,
        );
      }

      return (await response.json()) as SaleMapImportPreviewDto;
    },
    onSuccess: (data) => {
      setPreview(data);
      setLots(data.lots);
      toast({
        title: 'PDF lido',
        description: `${data.lots.length} lote(s) encontrado(s). Revise antes de importar.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao ler PDF',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (selectedLots: SaleMapImportLotPreview[]) => {
      const transactionDate = preview?.document.eventDate ?? undefined;
      const aggregated: SaleMapImportResultDto = {
        imported: 0,
        skipped: 0,
        salesCreated: [],
        partnersCreated: [],
        animalsCreated: [],
        warnings: [],
      };

      for (let index = 0; index < selectedLots.length; index += IMPORT_BATCH_SIZE) {
        const chunk = selectedLots.slice(index, index + IMPORT_BATCH_SIZE);
        setImportProgress(
          `Importando ${Math.min(index + chunk.length, selectedLots.length)} de ${selectedLots.length}…`,
        );

        const payload = importSaleMapSchema.parse({
          transactionDate,
          lots: chunk.map(mapLotForImport),
        });

        const { data } = await api.post<SaleMapImportResultDto>(
          `/farms/${farmId}/events/${eventId}/import`,
          payload,
        );

        aggregated.imported += data.imported;
        aggregated.skipped += data.skipped;
        aggregated.salesCreated.push(...data.salesCreated);
        aggregated.partnersCreated.push(...data.partnersCreated);
        aggregated.animalsCreated.push(...data.animalsCreated);
        aggregated.warnings.push(...data.warnings);
      }

      return aggregated;
    },
    onSuccess: (result) => {
      setImportProgress(null);
      const parts = [`${result.imported} venda(s) importada(s).`];
      if (result.animalsCreated.length > 0) {
        parts.push(`${result.animalsCreated.length} animal(is) criado(s) em Animais.`);
      }
      toast({
        title: 'Importação concluída',
        description: parts.join(' '),
      });
      if (result.warnings.length > 0) {
        toast({
          title: 'Avisos da importação',
          description: result.warnings.slice(0, 3).join(' · '),
        });
      }
      onSuccess();
    },
    onError: (error) => {
      setImportProgress(null);
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro na importação',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const syncMutation = useMutation({
    mutationFn: async (selectedLots: SaleMapImportLotPreview[]) => {
      const transactionDate = preview?.document.eventDate ?? undefined;
      const aggregated: SaleMapSyncInstallmentsResultDto = {
        synced: 0,
        skipped: 0,
        alreadyHasPlan: 0,
        warnings: [],
      };

      for (let index = 0; index < selectedLots.length; index += IMPORT_BATCH_SIZE) {
        const chunk = selectedLots.slice(index, index + IMPORT_BATCH_SIZE);
        setImportProgress(
          `Sincronizando parcelas ${Math.min(index + chunk.length, selectedLots.length)} de ${selectedLots.length}…`,
        );

        const payload = importSaleMapSchema.parse({
          transactionDate,
          lots: chunk.map(mapLotForImport),
        });

        const { data } = await api.post<SaleMapSyncInstallmentsResultDto>(
          `/farms/${farmId}/events/${eventId}/import/sync-installments`,
          payload,
        );

        aggregated.synced += data.synced;
        aggregated.skipped += data.skipped;
        aggregated.alreadyHasPlan += data.alreadyHasPlan;
        aggregated.warnings.push(...data.warnings);
      }

      return aggregated;
    },
    onSuccess: (result) => {
      setImportProgress(null);
      toast({
        title: 'Parcelas sincronizadas',
        description: `${result.synced} plano(s) criado(s)${result.alreadyHasPlan ? ` · ${result.alreadyHasPlan} já existente(s)` : ''}.`,
      });
      if (result.warnings.length > 0) {
        toast({
          title: 'Avisos da sincronização',
          description: result.warnings.slice(0, 3).join(' · '),
        });
      }
      onSuccess();
    },
    onError: (error) => {
      setImportProgress(null);
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro ao sincronizar parcelas',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const updateLot = (tempId: string, patch: Partial<SaleMapImportLotPreview>) => {
    setLots((current) =>
      current.map((lot) => (lot.tempId === tempId ? { ...lot, ...patch } : lot)),
    );
  };

  const updateInstallment = (
    tempId: string,
    sequence: number,
    patch: Partial<SaleMapImportLotPreview['installments'][number]>,
  ) => {
    setLots((current) =>
      current.map((lot) =>
        lot.tempId === tempId
          ? {
              ...lot,
              installments: lot.installments.map((row) =>
                row.sequence === sequence ? { ...row, ...patch } : row,
              ),
            }
          : lot,
      ),
    );
  };

  const handleImport = () => {
    const selectedLots = lots.filter((lot) => lot.selected);
    if (selectedLots.length === 0) {
      toast({ title: 'Selecione ao menos um lote', variant: 'destructive' });
      return;
    }

    const invalid = selectedLots.find((lot) => !lot.animalId && !lot.createAnimal);
    if (invalid) {
      toast({
        title: 'Animal obrigatório',
        description: `Vincule o animal do lote ${invalid.canal} ou deixe a opção de criar automaticamente.`,
        variant: 'destructive',
      });
      return;
    }

    importMutation.mutate(selectedLots);
  };

  const handleSyncInstallments = () => {
    const selectedLots = lots.filter((lot) => lot.selected && !lot.isCashPayment);
    if (selectedLots.length === 0) {
      toast({
        title: 'Selecione lotes parcelados',
        description: 'Marque ao menos um lote parcelado para sincronizar as parcelas.',
        variant: 'destructive',
      });
      return;
    }
    syncMutation.mutate(selectedLots);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Importar mapa de venda (PDF)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-[1fr_auto_auto]">
          <div className="space-y-2">
            <Label htmlFor="sale-map-file">Arquivo PDF</Label>
            <Input
              id="sale-map-file"
              type="file"
              accept="application/pdf,.pdf"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sale-map-password">Senha do PDF</Label>
            <Input
              id="sale-map-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Opcional"
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              onClick={() => previewMutation.mutate()}
              disabled={!file || previewMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              Ler PDF
            </Button>
          </div>
        </div>

        {preview && (
          <div className="space-y-4">
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-950 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100">
              Se o animal já estiver em <strong>Animais</strong>, o PDF vincula automaticamente pelo
              registro (GSC, GSCA, LCF). Se não existir, um cadastro mínimo é criado em Animais —
              depois você pode editar os dados ou consultar na ABCZ.
            </div>

            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium">{preview.document.eventName ?? 'Mapa de venda'}</p>
              <p className="text-muted-foreground">
                {preview.document.lotCount} lote(s)
                {preview.document.sourceFormat
                  ? ` · ${SALE_MAP_SOURCE_LABELS[preview.document.sourceFormat]}`
                  : ''}
                {preview.document.eventDate
                  ? ` · ${formatDateOnly(preview.document.eventDate)}`
                  : ''}
                {preview.document.location ? ` · ${preview.document.location}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {selectedCount} de {lots.length} lote(s) selecionado(s)
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setLots((current) => current.map((lot) => ({ ...lot, selected: true })))}
                >
                  Selecionar todos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setLots((current) =>
                      current.map((lot) => ({
                        ...lot,
                        installments: lot.installments.map((row) => ({
                          ...row,
                          markAsPaid: true,
                          paidAt: row.paidAt ?? row.dueDate,
                        })),
                      })),
                    )
                  }
                >
                  Marcar parcelas como pagas
                </Button>
              </div>
            </div>

            <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
              {lots.map((lot) => (
                <div key={lot.tempId} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-start gap-3">
                    <input
                      type="checkbox"
                      checked={lot.selected}
                      onChange={(event) =>
                        updateLot(lot.tempId, { selected: event.target.checked })
                      }
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">
                            Lote {lot.canal}
                            {lot.registration ? ` · ${lot.registration}` : ''}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {lot.description ?? 'Sem descrição'}
                            {lot.isCashPayment ? ' · À vista' : ' · Parcelado'}
                          </p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-medium">{formatCurrency(lot.netAmount ?? 0)}</p>
                          {lot.bidValue != null && (
                            <p className="text-muted-foreground">
                              Lance {formatCurrency(lot.bidValue)} × {lot.captures}
                            </p>
                          )}
                        </div>
                      </div>

                      {lot.warnings.length > 0 && (
                        <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
                          {lot.warnings.join(' · ')}
                        </div>
                      )}

                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>
                            Animal
                            {lot.registration ? (
                              <span className="ml-1 font-normal text-muted-foreground">
                                (PDF: {lot.registration})
                              </span>
                            ) : null}
                          </Label>
                          <Select
                            value={lot.animalId ?? (lot.createAnimal ? '__create__' : undefined)}
                            onValueChange={(value) => {
                              if (value === '__create__') {
                                updateLot(lot.tempId, {
                                  animalId: null,
                                  animalTag: lot.suggestedAnimalTag,
                                  animalName: null,
                                  createAnimal: true,
                                });
                                return;
                              }
                              const animal = animals.find((item) => item.id === value);
                              updateLot(lot.tempId, {
                                animalId: value,
                                animalTag: animal?.tag ?? null,
                                animalName: animal?.name ?? null,
                                createAnimal: false,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue
                                placeholder={
                                  lot.suggestedAnimalTag
                                    ? `Criar: ${lot.suggestedAnimalTag}`
                                    : 'Selecione o animal'
                                }
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {(lot.createAnimal || !lot.animalId) && lot.suggestedAnimalTag && (
                                <SelectItem value="__create__">
                                  Criar: {lot.suggestedAnimalTag}
                                </SelectItem>
                              )}
                              {[...animals]
                                .sort((a, b) => {
                                  const ranked = rankAnimalMatches(
                                    lot.registration,
                                    animals,
                                    lot.description,
                                  );
                                  const scoreA = ranked.find((c) => c.id === a.id)?.score ?? 0;
                                  const scoreB = ranked.find((c) => c.id === b.id)?.score ?? 0;
                                  return scoreB - scoreA;
                                })
                                .map((animal) => {
                                  const score = rankAnimalMatches(
                                    lot.registration,
                                    [animal],
                                    lot.description,
                                  )[0]?.score;
                                  return (
                                    <SelectItem key={animal.id} value={animal.id}>
                                      {animal.tag}
                                      {animal.name ? ` — ${animal.name}` : ''}
                                      {score && score >= 50 ? ' ★' : ''}
                                    </SelectItem>
                                  );
                                })}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {lot.createAnimal && !lot.animalId
                              ? `Será criado em Animais como "${lot.suggestedAnimalTag ?? 'lote'}" — complete os dados depois ou consulte na ABCZ.`
                              : 'Animal já cadastrado ou selecionado manualmente (★ = melhor correspondência).'}
                          </p>
                        </div>

                        <div className="space-y-2">
                          <Label>Comprador</Label>
                          <Select
                            value={lot.buyerPartnerId ?? '__create__'}
                            onValueChange={(value) => {
                              if (value === '__create__') {
                                updateLot(lot.tempId, {
                                  buyerPartnerId: null,
                                  createBuyer: true,
                                });
                                return;
                              }
                              const partner = partners.find((item) => item.id === value);
                              updateLot(lot.tempId, {
                                buyerPartnerId: value,
                                buyerName: partner?.name ?? lot.buyerName,
                                createBuyer: false,
                              });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o comprador" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__create__">
                                Criar: {lot.buyerName ?? 'Novo comprador'}
                              </SelectItem>
                              {partners.map((partner) => (
                                <SelectItem key={partner.id} value={partner.id}>
                                  {partner.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Valor líquido</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={lot.netAmount ?? ''}
                            onChange={(event) =>
                              updateLot(lot.tempId, {
                                netAmount: event.target.value
                                  ? Number.parseFloat(event.target.value)
                                  : null,
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Nome do comprador (PDF)</Label>
                          <Input
                            value={lot.buyerName ?? ''}
                            onChange={(event) =>
                              updateLot(lot.tempId, { buyerName: event.target.value })
                            }
                          />
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedLotId((current) =>
                            current === lot.tempId ? null : lot.tempId,
                          )
                        }
                      >
                        {expandedLotId === lot.tempId ? 'Ocultar parcelas' : 'Editar parcelas'}
                        {` (${lot.installments.length})`}
                      </Button>

                      {expandedLotId === lot.tempId && (
                        <div className="overflow-x-auto rounded-md border">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b bg-muted/40 text-left">
                                <th className="px-3 py-2">Paga</th>
                                <th className="px-3 py-2">Parcela</th>
                                <th className="px-3 py-2">Vencimento</th>
                                <th className="px-3 py-2">Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {lot.installments.map((row, rowIndex) => (
                                <tr key={`${row.sequence}-${rowIndex}`} className="border-b last:border-0">
                                  <td className="px-3 py-2">
                                    <input
                                      type="checkbox"
                                      checked={row.markAsPaid}
                                      onChange={(event) =>
                                        updateInstallment(lot.tempId, row.sequence, {
                                          markAsPaid: event.target.checked,
                                          paidAt: event.target.checked ? row.dueDate : null,
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">{row.label}</td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="date"
                                      value={toDateInputValue(row.dueDate)}
                                      onChange={(event) =>
                                        updateInstallment(lot.tempId, row.sequence, {
                                          dueDate: new Date(
                                            `${event.target.value}T12:00:00`,
                                          ).toISOString(),
                                        })
                                      }
                                    />
                                  </td>
                                  <td className="px-3 py-2">
                                    <Input
                                      type="number"
                                      step="0.01"
                                      value={row.amount}
                                      onChange={(event) =>
                                        updateInstallment(lot.tempId, row.sequence, {
                                          amount: Number.parseFloat(event.target.value) || 0,
                                        })
                                      }
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center sm:justify-end">
              {importProgress && (
                <p className="text-sm text-muted-foreground">{importProgress}</p>
              )}
              <Button
                type="button"
                variant="outline"
                onClick={handleSyncInstallments}
                disabled={selectedCount === 0 || syncMutation.isPending || importMutation.isPending}
              >
                {syncMutation.isPending ? 'Sincronizando…' : 'Sincronizar parcelas'}
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={selectedCount === 0 || importMutation.isPending || syncMutation.isPending}
              >
                {importMutation.isPending ? 'Importando…' : `Importar ${selectedCount} lote(s)`}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
