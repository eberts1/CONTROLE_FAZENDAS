'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AnimalAbczProfileDto,
  AnimalDto,
  UpdateAnimalInput,
  updateAnimalSchema,
} from '@controle-fazendas/shared';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, Database, Pencil, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { AnimalDetailSections } from '@/components/animal-detail-sections';
import { PageHeader } from '@/components/layout/page-header';
import { suggestParentsFromAbczProfile } from '@/lib/suggest-abcz-parents';

function birthDateToInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function animalToFormValues(animal: AnimalDto): UpdateAnimalInput {
  return {
    tag: animal.tag,
    name: animal.name ?? undefined,
    breed: animal.breed ?? undefined,
    sex: animal.sex,
    birthDate: birthDateToInput(animal.birthDate),
    status: animal.status,
    notes: animal.notes ?? undefined,
    sireId: animal.sireId,
    damId: animal.damId,
  };
}

export default function AnimalDetailPage() {
  const params = useParams();
  const animalId = params.id as string;
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);

  const {
    data: animal,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['animal', activeFarmId, animalId],
    queryFn: async () => {
      const { data } = await api.get<AnimalDto>(`/farms/${activeFarmId}/animals/${animalId}`);
      return data;
    },
    enabled: !!activeFarmId && !!animalId,
  });

  const { data: allAnimals = [] } = useQuery({
    queryKey: ['animals', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<AnimalDto[]>(`/farms/${activeFarmId}/animals`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['animal-abcz-profile', activeFarmId, animalId],
    queryFn: async () => {
      const { data } = await api.get<AnimalAbczProfileDto>(
        `/farms/${activeFarmId}/animals/${animalId}/abcz-profile`,
      );
      return data;
    },
    enabled: !!activeFarmId && !!animalId && !!animal?.hasAbczProfile,
    retry: false,
  });

  const form = useForm<UpdateAnimalInput>({
    resolver: zodResolver(updateAnimalSchema),
  });

  useEffect(() => {
    if (animal) {
      form.reset(animalToFormValues(animal));
    }
  }, [animal, form]);

  const updateMutation = useMutation({
    mutationFn: async (input: UpdateAnimalInput) => {
      const { data } = await api.patch<AnimalDto>(
        `/farms/${activeFarmId}/animals/${animalId}`,
        input,
      );
      return data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['animal', activeFarmId, animalId], updated);
      queryClient.invalidateQueries({ queryKey: ['animals', activeFarmId] });
      form.reset(animalToFormValues(updated));
      setEditing(false);
      toast({ title: 'Animal atualizado', description: 'Os dados foram salvos com sucesso.' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    },
  });

  const handleCancelEdit = () => {
    if (animal) form.reset(animalToFormValues(animal));
    setEditing(false);
  };

  const canSyncAbczToDb = Boolean(
    animal &&
      !animal.hasAbczProfile &&
      animal.abczAnimalId &&
      animal.abczOwnerId &&
      animal.abczBreedCode != null &&
      animal.abczCategoryCode != null &&
      animal.abczSerie &&
      animal.abczRgn,
  );

  const syncAbczMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<AnimalDto>(
        `/farms/${activeFarmId}/animals/${animalId}/sync-abcz`,
        {},
        { timeout: 120_000 },
      );
      return data;
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(['animal', activeFarmId, animalId], updated);
      let freshProfile: AnimalAbczProfileDto | null = null;
      try {
        const { data } = await api.get<AnimalAbczProfileDto>(
          `/farms/${activeFarmId}/animals/${animalId}/abcz-profile`,
        );
        freshProfile = data;
        queryClient.setQueryData(['animal-abcz-profile', activeFarmId, animalId], data);
      } catch {
        freshProfile = null;
      }
      if (freshProfile) {
        const suggested = suggestParentsFromAbczProfile(allAnimals, freshProfile, animalId);
        if (suggested.sireId || suggested.damId) {
          const patch: UpdateAnimalInput = {};
          if (suggested.sireId && !updated.sireId) patch.sireId = suggested.sireId;
          if (suggested.damId && !updated.damId) patch.damId = suggested.damId;
          if (patch.sireId || patch.damId) {
            const { data: patched } = await api.patch<AnimalDto>(
              `/farms/${activeFarmId}/animals/${animalId}`,
              patch,
            );
            queryClient.setQueryData(['animal', activeFarmId, animalId], patched);
            queryClient.invalidateQueries({ queryKey: ['animals', activeFarmId] });
            toast({
              title: 'Perfil salvo no banco',
              description: 'Genealogia gravada e vínculos de pai/mãe sugeridos pela ABCZ foram aplicados.',
            });
            return;
          }
        }
      }
      toast({
        title: 'Perfil salvo no banco',
        description: 'Genealogia e avaliação foram gravadas e passam a ser lidas localmente.',
      });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      const description = Array.isArray(message)
        ? message.join('. ')
        : typeof message === 'string'
          ? message
          : 'Não foi possível buscar na ABCZ e gravar no banco. Tente novamente.';
      toast({
        title: 'Erro ao salvar perfil',
        description,
        variant: 'destructive',
      });
    },
  });

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione uma fazenda para visualizar o animal.</p>
      </div>
    );
  }

  if (isLoading) {
    return <p className="text-muted-foreground">Carregando animal...</p>;
  }

  if (isError || !animal) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/animais">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
        <p className="text-destructive">Animal não encontrado.</p>
      </div>
    );
  }

  const title = animal.name ? `${animal.tag} — ${animal.name}` : animal.tag;
  const missingProfileSnapshot = canSyncAbczToDb;

  return (
    <div className="space-y-6">
      <PageHeader
        backLink={
          <Button variant="ghost" size="sm" className="-ml-2" asChild>
            <Link href="/dashboard/animais">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para animais
            </Link>
          </Button>
        }
        title={title}
        description="Genealogia e avaliação são lidas do banco da aplicação (não consulta ABCZ ao abrir)"
        actions={
          <>
            {canSyncAbczToDb && !editing && (
              <Button
                variant="secondary"
                className="w-full sm:w-auto"
                disabled={syncAbczMutation.isPending}
                onClick={() => syncAbczMutation.mutate()}
              >
                <Database className="mr-2 h-4 w-4 shrink-0" />
                <span className="sm:hidden">
                  {syncAbczMutation.isPending ? 'Salvando...' : 'Buscar ABCZ'}
                </span>
                <span className="hidden sm:inline">
                  {syncAbczMutation.isPending
                    ? 'Buscando na ABCZ e salvando...'
                    : 'Buscar na ABCZ e salvar no banco'}
                </span>
              </Button>
            )}
            {editing ? (
              <>
                <Button variant="outline" className="w-full sm:w-auto" onClick={handleCancelEdit}>
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  disabled={updateMutation.isPending}
                  onClick={form.handleSubmit((data) => updateMutation.mutate(data))}
                >
                  {updateMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
                </Button>
              </>
            ) : (
              <Button className="w-full sm:w-auto" onClick={() => setEditing(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar dados
              </Button>
            )}
          </>
        }
      />

      <AnimalDetailSections
        animal={animal}
        animals={allAnimals}
        profile={profile}
        profileLoading={profileLoading && animal.hasAbczProfile}
        missingProfileSnapshot={missingProfileSnapshot}
        editing={editing}
        form={form}
        farmId={activeFarmId}
      />
    </div>
  );
}
