'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AbczAnimalCandidate,
  AbczLookupResult,
  AbczProfilePreviewDto,
  CreateAnimalInput,
} from '@controle-fazendas/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { animalSexLabels } from '@/lib/utils';
import { UseFormSetValue } from 'react-hook-form';
import { AbczProfileContent } from '@/components/abcz-profile-content';

interface AbczLookupPanelProps {
  setValue: UseFormSetValue<CreateAnimalInput>;
  onProfileChange?: (profile: AbczProfilePreviewDto | null) => void;
}

export function AbczLookupPanel({ setValue, onProfileChange }: AbczLookupPanelProps) {
  const { toast } = useToast();
  const [serie, setSerie] = useState('');
  const [rgn, setRgn] = useState('');
  const [lookup, setLookup] = useState<AbczLookupResult | null>(null);
  const [selected, setSelected] = useState<AbczAnimalCandidate | null>(null);

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get<AbczLookupResult>('/abcz/lookup', {
        params: {
          mode: 'serie',
          serie: serie.trim().toUpperCase(),
          rgn: rgn.trim(),
        },
        timeout: 120_000,
      });
      return data;
    },
    onSuccess: (data) => {
      setLookup(data);
      setSelected(data.candidates.length === 1 ? data.candidates[0] : null);
      if (!data.found) {
        toast({
          title: 'Não encontrado',
          description: 'Nenhum animal encontrado na base pública da ABCZ.',
          variant: 'destructive',
        });
      }
    },
    onError: () => {
      toast({
        title: 'Erro na consulta',
        description: 'Não foi possível consultar a ABCZ. Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const shouldFetchPreview = Boolean(
    lookup &&
      selected?.allowsDetail &&
      selected.abczAnimalId &&
      (lookup.multiple || !lookup.profile),
  );

  const previewQuery = useQuery({
    queryKey: ['abcz-preview', selected?.abczAnimalId, selected?.serie, selected?.rgn],
    queryFn: async () => {
      const { data } = await api.get<AbczProfilePreviewDto | null>('/abcz/preview', {
        params: {
          abczAnimalId: selected!.abczAnimalId,
          serie: selected!.serie,
          rgn: selected!.rgn,
          rgd: selected!.rgd,
          breedCode: selected!.breedCode,
          categoryCode: selected!.categoryCode,
          sex: selected!.sex,
          ownerId: selected!.ownerId,
          allowsDetail: selected!.allowsDetail,
        },
        timeout: 120_000,
      });
      return data;
    },
    enabled: shouldFetchPreview,
  });

  const activeProfile = useMemo<AbczProfilePreviewDto | null>(() => {
    if (!lookup || !selected) return null;
    if (!lookup.multiple && lookup.profile) return lookup.profile;
    if (previewQuery.data) return previewQuery.data;
    return null;
  }, [lookup, previewQuery.data, selected]);

  const isLoadingProfile =
    lookupMutation.isPending || (shouldFetchPreview && previewQuery.isFetching);

  useEffect(() => {
    onProfileChange?.(activeProfile);
  }, [activeProfile, onProfileChange]);

  const applyCandidate = (candidate: AbczAnimalCandidate) => {
    setValue('tag', candidate.registration);
    setValue('name', candidate.name);
    setValue('breed', candidate.breed);
    setValue('sex', candidate.sex);
    if (candidate.birthDate) setValue('birthDate', candidate.birthDate);
    setValue('abczAnimalId', candidate.abczAnimalId);
    setValue('abczSerie', candidate.serie);
    setValue('abczRgn', candidate.rgn);
    setValue('abczRgd', candidate.rgd);
    setValue('abczBreedCode', candidate.breedCode);
    setValue('abczCategoryCode', candidate.categoryCode);
    setValue('abczOwnerId', candidate.ownerId);
    setValue('abczSourceUrl', lookup?.sourceUrl ?? 'https://zebu.org.br/ConsultaIndividual');

    const situation = activeProfile?.header.situation ?? lookup?.detail?.situation;
    const extra = [
      candidate.nickname ? `Apelido ABCZ: ${candidate.nickname}` : null,
      candidate.registration ? `Registro: ${candidate.registration}` : null,
      situation ? `Situação ABCZ: ${situation}` : null,
    ]
      .filter(Boolean)
      .join(' | ');

    if (extra) setValue('notes', extra);

    onProfileChange?.(activeProfile);

    toast({
      title: 'Dados aplicados',
      description: `Brinco preenchido com ${candidate.registration}. Ajuste se necessário antes de salvar.`,
    });
  };

  return (
    <Card className="border-dashed border-primary/40 bg-muted/20 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Consultar na ABCZ (Zebu)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Informe série e RGN para buscar genealogia e avaliação. Ao salvar o animal, esses dados
          serão gravados no banco da aplicação (não é consulta ao vivo na tela de detalhes).
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="abcz-serie">Série</Label>
            <Input
              id="abcz-serie"
              placeholder="GSCA"
              value={serie}
              onChange={(e) => setSerie(e.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abcz-rgn">RGN</Label>
            <Input
              id="abcz-rgn"
              placeholder="1000"
              value={rgn}
              onChange={(e) => setRgn(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              disabled={!serie.trim() || !rgn.trim() || lookupMutation.isPending}
              onClick={() => lookupMutation.mutate()}
            >
              {lookupMutation.isPending ? 'Buscando...' : 'Buscar na ABCZ'}
            </Button>
          </div>
        </div>

        {lookup?.found && (
          <div className="space-y-3 rounded-lg border bg-background p-4">
            {lookup.multiple ? (
              <p className="text-sm text-muted-foreground">
                Vários animais encontrados — selecione um:
              </p>
            ) : (
              <p className="text-sm font-medium text-primary">Animal encontrado na ABCZ</p>
            )}

            <div className="space-y-2">
              {lookup.candidates.map((candidate) => (
                <button
                  key={candidate.abczAnimalId}
                  type="button"
                  onClick={() => setSelected(candidate)}
                  className={`w-full rounded-md border p-3 text-left text-sm transition-colors ${
                    selected?.abczAnimalId === candidate.abczAnimalId
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <p className="font-medium">{candidate.name}</p>
                  <p className="text-muted-foreground">
                    {candidate.registration} · {candidate.breed} ·{' '}
                    {animalSexLabels[candidate.sex]}
                    {candidate.birthDate ? ` · ${candidate.birthDate}` : ''}
                  </p>
                </button>
              ))}
            </div>

            {selected && (
              <div className="space-y-3 border-t pt-3">
                {isLoadingProfile && (
                  <p className="text-sm text-muted-foreground">
                    Carregando genealogia e demais informações da ABCZ...
                  </p>
                )}

                {activeProfile && !isLoadingProfile && (
                  <AbczProfileContent profile={activeProfile} />
                )}

                {previewQuery.isError && (
                  <p className="text-sm text-destructive">
                    Não foi possível carregar genealogia e avaliação deste animal.
                  </p>
                )}

                {!isLoadingProfile &&
                  selected?.allowsDetail &&
                  activeProfile &&
                  activeProfile.genealogy.length === 0 && (
                    <p className="text-sm text-amber-600">
                      Cabeçalho carregado, mas a ABCZ não retornou genealogia para este registro.
                    </p>
                  )}
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={
                  !selected ||
                  isLoadingProfile ||
                  (selected.allowsDetail && !activeProfile)
                }
                onClick={() => selected && applyCandidate(selected)}
              >
                Aplicar ao formulário
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.open(lookup.sourceUrl, '_blank', 'noopener')}
              >
                Ver no site ABCZ
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
