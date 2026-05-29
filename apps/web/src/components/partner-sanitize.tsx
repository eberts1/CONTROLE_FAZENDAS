'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  PartnerDuplicateGroupDto,
  PartnerMergeResultDto,
  mergePartnersSchema,
} from '@controle-fazendas/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { Trash2 } from 'lucide-react';

interface PartnerSanitizeProps {
  farmId: string;
}

const REASON_LABELS: Record<PartnerDuplicateGroupDto['reason'], string> = {
  same_document: 'Mesmo CPF/CNPJ',
  same_name: 'Mesmo nome',
  similar_name: 'Nome similar',
};

export function PartnerSanitize({ farmId }: PartnerSanitizeProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [groups, setGroups] = useState<PartnerDuplicateGroupDto[]>([]);
  const [keepByGroup, setKeepByGroup] = useState<Record<string, string>>({});

  const scanMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get<PartnerDuplicateGroupDto[]>(
        `/farms/${farmId}/partners/duplicates`,
      );
      return data;
    },
    onSuccess: (data) => {
      setGroups(data);
      const defaults: Record<string, string> = {};
      for (const group of data) {
        defaults[group.groupId] = group.suggestedKeepId;
      }
      setKeepByGroup(defaults);
      toast({
        title: 'Análise concluída',
        description:
          data.length === 0
            ? 'Nenhuma duplicata encontrada.'
            : `${data.length} grupo(s) de duplicata(s) encontrado(s).`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível analisar duplicatas.',
        variant: 'destructive',
      });
    },
  });

  const mergeMutation = useMutation({
    mutationFn: async ({
      groupId,
      keepPartnerId,
      mergePartnerIds,
    }: {
      groupId: string;
      keepPartnerId: string;
      mergePartnerIds: string[];
    }) => {
      const payload = mergePartnersSchema.parse({ keepPartnerId, mergePartnerIds });
      const { data } = await api.post<PartnerMergeResultDto>(
        `/farms/${farmId}/partners/merge`,
        payload,
      );
      return { groupId, data };
    },
    onSuccess: ({ groupId, data }) => {
      queryClient.invalidateQueries({ queryKey: ['partners', farmId] });
      setGroups((current) => current.filter((g) => g.groupId !== groupId));
      toast({
        title: 'Parceiros unificados',
        description: `${data.mergedPartnerIds.length} registro(s) unificado(s).`,
      });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro ao unificar',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (partnerId: string) => {
      await api.delete(`/farms/${farmId}/partners/${partnerId}`);
      return partnerId;
    },
    onSuccess: (partnerId) => {
      queryClient.invalidateQueries({ queryKey: ['partners', farmId] });
      setGroups((current) =>
        current
          .map((group) => ({
            ...group,
            partners: group.partners.filter((p) => p.id !== partnerId),
          }))
          .filter((group) => group.partners.length > 1),
      );
      toast({ title: 'Parceiro removido' });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro ao remover',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Higienizar duplicatas</CardTitle>
        <Button
          type="button"
          variant="outline"
          onClick={() => scanMutation.mutate()}
          disabled={scanMutation.isPending}
        >
          {scanMutation.isPending ? 'Analisando…' : 'Analisar duplicatas'}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Detecta parceiros repetidos por CPF/CNPJ, nome ou similaridade. Unifique para consolidar
          vendas e cotas, ou exclua registros sem vínculos.
        </p>

        {groups.length === 0 && !scanMutation.isPending && (
          <p className="text-sm text-muted-foreground">
            Clique em &quot;Analisar duplicatas&quot; para buscar registros repetidos.
          </p>
        )}

        {groups.map((group) => {
          const keepId = keepByGroup[group.groupId] ?? group.suggestedKeepId;
          const mergeIds = group.partners
            .map((p) => p.id)
            .filter((id) => id !== keepId);

          return (
            <div key={group.groupId} className="space-y-3 rounded-md border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{REASON_LABELS[group.reason]}</p>
                  <p className="text-xs text-muted-foreground">
                    {group.confidence === 'high' ? 'Alta confiança' : 'Revisão recomendada'}
                    {group.reviewRequired ? ' · confira manualmente' : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={mergeIds.length === 0 || mergeMutation.isPending}
                  onClick={() =>
                    mergeMutation.mutate({
                      groupId: group.groupId,
                      keepPartnerId: keepId,
                      mergePartnerIds: mergeIds,
                    })
                  }
                >
                  Unificar grupo
                </Button>
              </div>

              <div className="space-y-2">
                {group.partners.map((partner) => (
                  <label
                    key={partner.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3 hover:bg-muted/30"
                  >
                    <input
                      type="radio"
                      name={`keep-${group.groupId}`}
                      checked={keepId === partner.id}
                      onChange={() =>
                        setKeepByGroup((current) => ({
                          ...current,
                          [group.groupId]: partner.id,
                        }))
                      }
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{partner.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {partner.document ?? 'Sem documento'}
                        {partner.email ? ` · ${partner.email}` : ''}
                        {partner.phone ? ` · ${partner.phone}` : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {partner.linkCounts.total} vínculo(s): {partner.linkCounts.ownerships}{' '}
                        cotas, {partner.linkCounts.salesAsBuyer} vendas,{' '}
                        {partner.linkCounts.installmentPlans} parcelamentos
                      </p>
                    </div>
                    {partner.linkCounts.total === 0 && partner.id !== keepId && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          deleteMutation.mutate(partner.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </label>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
