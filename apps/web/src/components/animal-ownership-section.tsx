'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AnimalOwnershipDto,
  CreatePartnerInput,
  PartnerDto,
  ReplaceAnimalOwnershipInput,
  createPartnerSchema,
} from '@controle-fazendas/shared';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PartnerCombobox } from '@/components/partner-combobox';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/use-toast';
import { formatPercent } from '@/lib/utils';
import { Crown, Plus, Trash2 } from 'lucide-react';

interface ShareDraft {
  partnerId: string;
  ownershipPercent: number;
  isPrimary: boolean;
}

interface AnimalOwnershipSectionProps {
  farmId: string;
  animalId: string;
  initialOwnership?: AnimalOwnershipDto[];
}

export function AnimalOwnershipSection({
  farmId,
  animalId,
  initialOwnership = [],
}: AnimalOwnershipSectionProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [shares, setShares] = useState<ShareDraft[]>([]);
  const [showNewPartner, setShowNewPartner] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');

  const { data: partners = [] } = useQuery({
    queryKey: ['partners', farmId],
    queryFn: async () => {
      const { data } = await api.get<PartnerDto[]>(`/farms/${farmId}/partners`);
      return data;
    },
    enabled: !!farmId,
  });

  const { data: ownership = initialOwnership, isLoading } = useQuery({
    queryKey: ['animal-ownership', farmId, animalId],
    queryFn: async () => {
      const { data } = await api.get<AnimalOwnershipDto[]>(
        `/farms/${farmId}/animals/${animalId}/ownership`,
      );
      return data;
    },
    enabled: !!farmId && !!animalId,
    initialData: initialOwnership.length > 0 ? initialOwnership : undefined,
  });

  useEffect(() => {
    if (ownership.length > 0 && initialOwnership.length === 0) {
      queryClient.invalidateQueries({ queryKey: ['animal', farmId, animalId] });
    }
  }, [ownership, initialOwnership.length, farmId, animalId, queryClient]);

  useEffect(() => {
    setShares(
      ownership.map((o) => ({
        partnerId: o.partnerId,
        ownershipPercent: o.ownershipPercent,
        isPrimary: o.isPrimary,
      })),
    );
  }, [ownership]);

  const partnerForm = useForm<CreatePartnerInput>({
    resolver: zodResolver(createPartnerSchema),
  });

  const totalPercent = useMemo(
    () => Math.round(shares.reduce((sum, s) => sum + s.ownershipPercent, 0) * 100) / 100,
    [shares],
  );

  const isValidTotal = Math.abs(totalPercent - 100) < 0.01;
  const hasPrimary = shares.filter((s) => s.isPrimary).length === 1;

  const saveMutation = useMutation({
    mutationFn: async (input: ReplaceAnimalOwnershipInput) => {
      const { data } = await api.put<AnimalOwnershipDto[]>(
        `/farms/${farmId}/animals/${animalId}/ownership`,
        input,
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['animal-ownership', farmId, animalId], data);
      queryClient.invalidateQueries({ queryKey: ['animal', farmId, animalId] });
      toast({ title: 'Proprietários atualizados' });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro ao salvar',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Tente novamente.',
        variant: 'destructive',
      });
    },
  });

  const createPartnerMutation = useMutation({
    mutationFn: async (input: CreatePartnerInput) => {
      const { data } = await api.post<PartnerDto>(`/farms/${farmId}/partners`, input);
      return data;
    },
    onSuccess: (partner) => {
      queryClient.invalidateQueries({ queryKey: ['partners', farmId] });
      setSelectedPartnerId(partner.id);
      setShowNewPartner(false);
      partnerForm.reset();
      toast({ title: 'Parceiro criado' });
    },
  });

  const partnerName = (partnerId: string) =>
    partners.find((p) => p.id === partnerId)?.name ??
    ownership.find((o) => o.partnerId === partnerId)?.partner?.name ??
    '—';

  const handleAddShare = () => {
    if (!selectedPartnerId) return;
    if (shares.some((s) => s.partnerId === selectedPartnerId)) {
      toast({ title: 'Parceiro já incluído', variant: 'destructive' });
      return;
    }
    setShares((prev) => [
      ...prev,
      {
        partnerId: selectedPartnerId,
        ownershipPercent: prev.length === 0 ? 100 : 0,
        isPrimary: prev.length === 0,
      },
    ]);
    setSelectedPartnerId('');
  };

  const handleSave = () => {
    saveMutation.mutate({ shares });
  };

  if (isLoading && shares.length === 0) {
    return <p className="text-sm text-muted-foreground">Carregando proprietários...</p>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between md:py-6">
        <div>
          <CardTitle className="text-lg">Proprietários e sócios</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Defina as cotas de propriedade para rateio de vendas e despesas.
          </p>
        </div>
        <div className="text-sm">
          Total:{' '}
          <span className={isValidTotal ? 'font-medium text-green-700' : 'font-medium text-destructive'}>
            {formatPercent(totalPercent)}%
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {shares.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum proprietário definido.</p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-3 py-2 text-left">Sócio / Vendedor</th>
                  <th className="px-3 py-2 text-right">% Propriedade</th>
                  <th className="px-3 py-2 text-center">Titular</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {shares.map((share) => (
                  <tr key={share.partnerId} className="border-t">
                    <td className="px-3 py-2">{partnerName(share.partnerId)}</td>
                    <td className="px-3 py-2 text-right">
                      <Input
                        type="number"
                        min={0.01}
                        max={100}
                        step={0.01}
                        className="ml-auto w-24 text-right"
                        value={share.ownershipPercent}
                        onChange={(e) => {
                          const value = Number.parseFloat(e.target.value) || 0;
                          setShares((prev) =>
                            prev.map((s) =>
                              s.partnerId === share.partnerId
                                ? { ...s, ownershipPercent: value }
                                : s,
                            ),
                          );
                        }}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button
                        type="button"
                        size="sm"
                        variant={share.isPrimary ? 'default' : 'outline'}
                        onClick={() =>
                          setShares((prev) =>
                            prev.map((s) => ({
                              ...s,
                              isPrimary: s.partnerId === share.partnerId,
                            })),
                          )
                        }
                      >
                        <Crown className="h-4 w-4" />
                      </Button>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setShares((prev) => prev.filter((s) => s.partnerId !== share.partnerId))
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="rounded-md border p-4 space-y-3">
          <p className="text-sm font-medium">Adicionar sócio</p>
          <PartnerCombobox
            partners={partners}
            value={selectedPartnerId}
            onChange={setSelectedPartnerId}
            excludeIds={shares.map((s) => s.partnerId)}
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={handleAddShare} disabled={!selectedPartnerId}>
              <Plus className="mr-2 h-4 w-4" />
              Adicionar
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowNewPartner(!showNewPartner)}>
              {showNewPartner ? 'Cancelar novo parceiro' : 'Novo parceiro'}
            </Button>
          </div>

          {showNewPartner && (
            <form
              className="grid gap-3 md:grid-cols-2"
              onSubmit={partnerForm.handleSubmit((data) => createPartnerMutation.mutate(data))}
            >
              <div className="space-y-1">
                <Label htmlFor="partner-name">Nome</Label>
                <Input id="partner-name" {...partnerForm.register('name')} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="partner-document">CPF/CNPJ</Label>
                <Input id="partner-document" {...partnerForm.register('document')} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={createPartnerMutation.isPending}>
                  Criar parceiro
                </Button>
              </div>
            </form>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={!isValidTotal || !hasPrimary || saveMutation.isPending || shares.length === 0}
        >
          {saveMutation.isPending ? 'Salvando...' : 'Salvar cotas'}
        </Button>
      </CardContent>
    </Card>
  );
}
