'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AbczAnimalCandidate,
  AbczLookupResult,
  AbczProfilePreviewDto,
  AnimalDto,
  UpdateAnimalInput,
} from '@controle-fazendas/shared';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { animalSexLabels } from '@/lib/utils';
import { AbczProfileContent } from '@/components/abcz-profile-content';
import { canQueryAnimalOnAbcz, resolveAnimalAbczQuery } from '@/lib/resolve-animal-abcz-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type QueueStatus =
  | 'pending'
  | 'loading'
  | 'ready'
  | 'multiple'
  | 'saving'
  | 'saved'
  | 'error'
  | 'skipped';

interface BulkQueueItem {
  animalId: string;
  tag: string;
  name: string | null;
  hasAbczProfile: boolean;
  serie: string;
  rgn: string;
  status: QueueStatus;
  error?: string;
  lookup: AbczLookupResult | null;
  selected: AbczAnimalCandidate | null;
  profile: AbczProfilePreviewDto | null;
}

interface AnimalAbczBulkDrawerProps {
  farmId: string;
  animals: AnimalDto[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

function buildQueue(animals: AnimalDto[]): BulkQueueItem[] {
  return animals.map((animal) => {
    const query = resolveAnimalAbczQuery(animal);
    if (!query) {
      return {
        animalId: animal.id,
        tag: animal.tag,
        name: animal.name,
        hasAbczProfile: animal.hasAbczProfile,
        serie: '',
        rgn: '',
        status: 'error' as const,
        error: 'Sem série/RGN (preencha ABCZ ou use brinco tipo LCF 1088)',
        lookup: null,
        selected: null,
        profile: null,
      };
    }
    return {
      animalId: animal.id,
      tag: animal.tag,
      name: animal.name,
      hasAbczProfile: animal.hasAbczProfile,
      serie: query.serie,
      rgn: query.rgn,
      status: 'pending' as const,
      lookup: null,
      selected: null,
      profile: null,
    };
  });
}

function statusIcon(status: QueueStatus) {
  switch (status) {
    case 'loading':
    case 'saving':
      return <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />;
    case 'saved':
      return <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />;
    case 'error':
      return <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />;
    case 'skipped':
      return <SkipForward className="h-4 w-4 shrink-0 text-muted-foreground" />;
    case 'ready':
    case 'multiple':
      return <Circle className="h-4 w-4 shrink-0 fill-primary text-primary" />;
    default:
      return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
}

function isBlank(value: string | null | undefined): boolean {
  return !value?.trim();
}

export function AnimalAbczBulkDrawer({
  farmId,
  animals,
  open,
  onOpenChange,
  onComplete,
}: AnimalAbczBulkDrawerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [queue, setQueue] = useState<BulkQueueItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [autoAdvance, setAutoAdvance] = useState(true);
  const processingRef = useRef(false);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const animalsById = useMemo(
    () => new Map(animals.map((a) => [a.id, a])),
    [animals],
  );

  useEffect(() => {
    if (open && animals.length > 0) {
      const initial = buildQueue(animals);
      setQueue(initial);
      const firstPending = initial.findIndex((q) => q.status === 'pending');
      setCurrentIndex(firstPending >= 0 ? firstPending : 0);
      setPaused(false);
      processingRef.current = false;
    }
  }, [open, animals]);

  const current = queue[currentIndex] ?? null;
  const doneCount = queue.filter((q) => q.status === 'saved' || q.status === 'skipped').length;
  const savedCount = queue.filter((q) => q.status === 'saved').length;

  const updateItem = useCallback((animalId: string, patch: Partial<BulkQueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.animalId === animalId ? { ...item, ...patch } : item)),
    );
  }, []);

  const fetchPreview = async (
    candidate: AbczAnimalCandidate,
  ): Promise<AbczProfilePreviewDto | null> => {
    const { data } = await api.get<AbczProfilePreviewDto | null>('/abcz/preview', {
      params: {
        abczAnimalId: candidate.abczAnimalId,
        serie: candidate.serie,
        rgn: candidate.rgn,
        rgd: candidate.rgd,
        breedCode: candidate.breedCode,
        categoryCode: candidate.categoryCode,
        sex: candidate.sex,
        ownerId: candidate.ownerId,
        allowsDetail: candidate.allowsDetail,
      },
      timeout: 120_000,
    });
    return data;
  };

  const runLookup = useCallback(
    async (index: number) => {
      const item = queueRef.current[index];
      if (!item || item.status === 'error' || processingRef.current) return;

      processingRef.current = true;
      updateItem(item.animalId, { status: 'loading', error: undefined });
      setCurrentIndex(index);

      try {
        const { data: lookup } = await api.get<AbczLookupResult>('/abcz/lookup', {
          params: { mode: 'serie', serie: item.serie, rgn: item.rgn },
          timeout: 120_000,
        });

        if (!lookup.found) {
          updateItem(item.animalId, {
            status: 'error',
            error: 'Não encontrado na ABCZ',
            lookup,
            selected: null,
            profile: null,
          });
          return;
        }

        const selected =
          lookup.candidates.length === 1 ? lookup.candidates[0] : null;
        let profile: AbczProfilePreviewDto | null = null;

        if (selected) {
          if (!lookup.multiple && lookup.profile) {
            profile = lookup.profile;
          } else if (selected.allowsDetail) {
            profile = await fetchPreview(selected);
          }
        }

        updateItem(item.animalId, {
          status: lookup.multiple ? 'multiple' : 'ready',
          lookup,
          selected,
          profile,
        });
      } catch {
        updateItem(item.animalId, {
          status: 'error',
          error: 'Falha na consulta ABCZ',
          lookup: null,
          selected: null,
          profile: null,
        });
      } finally {
        processingRef.current = false;
      }
    },
    [updateItem],
  );

  const findNextPendingIndex = useCallback((from: number) => {
    for (let i = from; i < queueRef.current.length; i++) {
      const item = queueRef.current[i];
      if (item.status === 'pending') return i;
    }
    return -1;
  }, []);

  useEffect(() => {
    if (!open || paused || queueRef.current.length === 0) return;
    const q = queueRef.current;
    const hasLoading = q.some((item) => item.status === 'loading' || item.status === 'saving');
    if (hasLoading || processingRef.current) return;

    const currentItem = q[currentIndex];
    if (
      currentItem &&
      (currentItem.status === 'ready' ||
        currentItem.status === 'multiple' ||
        currentItem.status === 'saved' ||
        currentItem.status === 'error' ||
        currentItem.status === 'skipped')
    ) {
      return;
    }

    const next = findNextPendingIndex(currentIndex);
    if (next >= 0) {
      void runLookup(next);
    }
  }, [open, paused, queue, currentIndex, findNextPendingIndex, runLookup]);

  const selectCandidate = async (candidate: AbczAnimalCandidate) => {
    if (!current) return;
    updateItem(current.animalId, { selected: candidate, status: 'loading' });
    let profile: AbczProfilePreviewDto | null = null;
    if (candidate.allowsDetail) {
      try {
        profile = await fetchPreview(candidate);
      } catch {
        updateItem(current.animalId, {
          status: 'ready',
          selected: candidate,
          profile: null,
          error: 'Não foi possível carregar genealogia',
        });
        return;
      }
    }
    updateItem(current.animalId, {
      status: 'ready',
      selected: candidate,
      profile,
      error: undefined,
    });
  };

  const saveMutation = useMutation({
    mutationFn: async ({
      item,
      candidate,
      profile,
      lookup,
    }: {
      item: BulkQueueItem;
      candidate: AbczAnimalCandidate;
      profile: AbczProfilePreviewDto | null;
      lookup: AbczLookupResult;
    }) => {
      const animal = animalsById.get(item.animalId);
      if (!animal) throw new Error('Animal não encontrado');

      const payload: UpdateAnimalInput = {
        tag: animal.tag,
        sex: animal.sex,
        status: animal.status,
        abczAnimalId: candidate.abczAnimalId,
        abczSerie: candidate.serie,
        abczRgn: candidate.rgn,
        abczRgd: candidate.rgd,
        abczBreedCode: candidate.breedCode,
        abczCategoryCode: candidate.categoryCode,
        abczOwnerId: candidate.ownerId,
        abczSourceUrl: lookup.sourceUrl ?? 'https://zebu.org.br/ConsultaIndividual',
      };

      if (animal.name) payload.name = animal.name;
      if (animal.notes) payload.notes = animal.notes;

      if (profile && !animal.hasAbczProfile) {
        payload.abczProfileSnapshot = profile;
      }
      if (isBlank(animal.breed) && candidate.breed) payload.breed = candidate.breed;
      if (isBlank(animal.name) && candidate.name) payload.name = candidate.name;
      if (isBlank(animal.pelagem) && profile?.header.coat) payload.pelagem = profile.header.coat;
      if (!animal.birthDate && candidate.birthDate) payload.birthDate = candidate.birthDate;
      if (!animal.tag.trim() && candidate.registration) {
        payload.tag = candidate.registration;
      }

      const { data } = await api.patch<AnimalDto>(
        `/farms/${farmId}/animals/${item.animalId}`,
        payload,
        { timeout: 120_000 },
      );
      return data;
    },
    onSuccess: (updated, { item }) => {
      updateItem(item.animalId, { status: 'saved' });
      queryClient.invalidateQueries({ queryKey: ['animals', farmId] });
      queryClient.invalidateQueries({ queryKey: ['animal', farmId, item.animalId] });

      if (autoAdvance) {
        const next = findNextPendingIndex(currentIndex + 1);
        if (next >= 0) {
          setCurrentIndex(next);
        } else {
          toast({
            title: 'Fila concluída',
            description: `Dados gravados. Último: ${updated.tag}.`,
          });
          onComplete?.();
        }
      } else {
        toast({ title: 'Salvo no banco', description: updated.tag });
      }
    },
    onError: (error, { item }) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      const description = Array.isArray(message)
        ? message.join('. ')
        : typeof message === 'string'
          ? message
          : 'Não foi possível gravar no banco.';
      updateItem(item.animalId, { status: 'ready', error: description });
      toast({ title: 'Erro ao salvar', description, variant: 'destructive' });
    },
  });

  const handleSaveAndNext = () => {
    if (!current?.selected || !current.lookup) return;
    if (
      current.selected.allowsDetail &&
      !current.profile &&
      !current.hasAbczProfile
    ) {
      toast({
        title: 'Aguarde o perfil',
        description: 'Genealogia ainda não carregou. Tente novamente em instantes.',
        variant: 'destructive',
      });
      return;
    }
    updateItem(current.animalId, { status: 'saving' });
    saveMutation.mutate({
      item: current,
      candidate: current.selected,
      profile: current.profile,
      lookup: current.lookup,
    });
  };

  const handleSkip = () => {
    if (!current) return;
    updateItem(current.animalId, { status: 'skipped' });
    const next = findNextPendingIndex(currentIndex + 1);
    if (next >= 0) setCurrentIndex(next);
    else onComplete?.();
  };

  const handleRetryLookup = () => {
    if (!current) return;
    updateItem(current.animalId, {
      status: 'pending',
      error: undefined,
      lookup: null,
      selected: null,
      profile: null,
    });
    void runLookup(currentIndex);
  };

  const activeProfile = current?.profile ?? null;
  const canSave =
    Boolean(current?.selected && current?.lookup) &&
    !saveMutation.isPending &&
    (!current?.selected?.allowsDetail ||
      Boolean(activeProfile) ||
      Boolean(current?.hasAbczProfile));

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex h-full w-full max-w-[min(96vw,72rem)] flex-col gap-0 p-0 sm:max-w-[min(96vw,72rem)]"
      >
        <SheetHeader className="shrink-0 border-b px-6 py-4">
          <SheetTitle>Consulta ABCZ em fila</SheetTitle>
          <SheetDescription>
            {doneCount} de {queue.length} processados · {savedCount} gravados no banco
            {paused ? ' · fila pausada' : ''}
          </SheetDescription>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? 'Retomar fila' : 'Pausar fila'}
            </Button>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.target.checked)}
                className="rounded border"
              />
              Avançar automaticamente após salvar
            </label>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <aside className="flex w-full shrink-0 flex-col border-b md:w-72 md:border-b-0 md:border-r">
            <p className="px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Fila de solicitação
            </p>
            <ul className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              {queue.map((item, index) => (
                <li key={item.animalId}>
                  <button
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      'mb-1 flex w-full items-start gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                      index === currentIndex ? 'bg-primary/10' : 'hover:bg-muted/60',
                    )}
                  >
                    {statusIcon(item.status)}
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{item.tag}</span>
                      {item.serie && item.rgn && (
                        <span className="text-xs text-muted-foreground">
                          {item.serie} {item.rgn}
                        </span>
                      )}
                      {item.error && (
                        <span className="block text-xs text-destructive">{item.error}</span>
                      )}
                      {item.hasAbczProfile && item.status !== 'saved' && (
                        <span className="block text-xs text-amber-600">Já tem perfil</span>
                      )}
                    </span>
                    {index === currentIndex && (
                      <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <p className="shrink-0 border-b px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Retorno ABCZ
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
              {!current && (
                <p className="text-sm text-muted-foreground">Nenhum item na fila.</p>
              )}

              {current?.status === 'loading' && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Consultando {current.serie} {current.rgn} na ABCZ...
                </p>
              )}

              {current?.status === 'error' && !current.lookup?.found && (
                <div className="space-y-3">
                  <p className="text-sm text-destructive">{current.error}</p>
                  {canQueryAnimalOnAbcz(animalsById.get(current.animalId)!) && (
                    <Button type="button" variant="outline" size="sm" onClick={handleRetryLookup}>
                      Tentar novamente
                    </Button>
                  )}
                </div>
              )}

              {current?.lookup?.found && (
                <div className="space-y-4">
                  {current.lookup.multiple ? (
                    <p className="text-sm text-muted-foreground">
                      Vários resultados — selecione o animal correto:
                    </p>
                  ) : (
                    <p className="text-sm font-medium text-primary">Animal encontrado</p>
                  )}

                  <div className="space-y-2">
                    {current.lookup.candidates.map((candidate) => (
                      <button
                        key={candidate.abczAnimalId}
                        type="button"
                        onClick={() => void selectCandidate(candidate)}
                        className={cn(
                          'w-full rounded-md border p-3 text-left text-sm transition-colors',
                          current.selected?.abczAnimalId === candidate.abczAnimalId
                            ? 'border-primary bg-primary/5'
                            : 'hover:bg-muted/50',
                        )}
                      >
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-muted-foreground">
                          {candidate.registration} · {candidate.breed} ·{' '}
                          {animalSexLabels[candidate.sex]}
                        </p>
                      </button>
                    ))}
                  </div>

                  {activeProfile && (
                    <AbczProfileContent profile={activeProfile} />
                  )}

                  {current.selected?.allowsDetail && !activeProfile && current.status !== 'loading' && (
                    <p className="text-sm text-muted-foreground">
                      Carregando genealogia e avaliação...
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex shrink-0 flex-wrap gap-2 border-t px-4 py-3">
              <Button
                type="button"
                disabled={!canSave}
                onClick={handleSaveAndNext}
              >
                {saveMutation.isPending ? 'Salvando...' : 'Salvar no banco e próximo'}
              </Button>
              <Button type="button" variant="outline" onClick={handleSkip}>
                Pular
              </Button>
              {current && current.status !== 'pending' && current.status !== 'loading' && (
                <Button type="button" variant="ghost" size="sm" onClick={handleRetryLookup}>
                  Reconsultar
                </Button>
              )}
            </div>
          </main>
        </div>
      </SheetContent>
    </Sheet>
  );
}
