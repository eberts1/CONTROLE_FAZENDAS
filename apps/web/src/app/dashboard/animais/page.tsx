'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AbczProfilePreviewDto,
  AnimalDto,
  AnimalSex,
  AnimalStatus,
  createAnimalSchema,
  CreateAnimalInput,
} from '@controle-fazendas/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { animalSexLabels, animalStatusLabels, formatDateOnly } from '@/lib/utils';
import { AbczLookupPanel } from '@/components/abcz-lookup-panel';
import { AnimalAbczDrawer } from '@/components/animal-abcz-drawer';
import { AnimalParentSelects } from '@/components/animal-parent-selects';
import { useState, useCallback } from 'react';
import Link from 'next/link';

const emptyAnimalForm = (): CreateAnimalInput => ({
  tag: '',
  name: '',
  breed: '',
  birthDate: '',
  notes: '',
  sex: AnimalSex.MACHO,
  status: AnimalStatus.ATIVO,
  abczAnimalId: undefined,
  abczSerie: undefined,
  abczRgn: undefined,
  abczRgd: undefined,
  abczBreedCode: undefined,
  abczCategoryCode: undefined,
  abczSourceUrl: undefined,
  abczOwnerId: undefined,
});

export default function AnimaisPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [drawerAnimal, setDrawerAnimal] = useState<AnimalDto | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [abczProfileSnapshot, setAbczProfileSnapshot] = useState<AbczProfilePreviewDto | null>(
    null,
  );
  const [formKey, setFormKey] = useState(0);

  const { data: animals = [], isLoading } = useQuery({
    queryKey: ['animals', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<AnimalDto[]>(`/farms/${activeFarmId}/animals`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateAnimalInput>({
    resolver: zodResolver(createAnimalSchema),
    defaultValues: emptyAnimalForm(),
  });

  const resetCreateForm = useCallback(() => {
    reset(emptyAnimalForm());
    setAbczProfileSnapshot(null);
    setFormKey((key) => key + 1);
  }, [reset]);

  const hasAbczPending = Boolean(watch('abczAnimalId') && watch('abczOwnerId'));

  const createMutation = useMutation({
    mutationFn: async (input: CreateAnimalInput) => {
      const { data } = await api.post<AnimalDto>(`/farms/${activeFarmId}/animals`, input, {
        timeout: input.abczAnimalId ? 120_000 : 30_000,
      });
      return data;
    },
    onSuccess: (created, variables) => {
      queryClient.invalidateQueries({ queryKey: ['animals', activeFarmId] });
      resetCreateForm();
      const hadAbczSnapshot = Boolean(variables.abczProfileSnapshot);
      if (created.hasAbczProfile) {
        toast({
          title: 'Animal cadastrado',
          description:
            'Registro salvo com genealogia e avaliação. Consulte o próximo animal na ABCZ abaixo.',
        });
        setDrawerAnimal(created);
        setDrawerOpen(true);
      } else if (hadAbczSnapshot || variables.abczAnimalId) {
        toast({
          title: 'Animal cadastrado',
          description:
            'Dados básicos salvos, mas a genealogia ABCZ não foi gravada. Abra o animal e use "Buscar na ABCZ e salvar no banco".',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Animal cadastrado',
          description: 'Animal registrado. Preencha o próximo abaixo.',
        });
      }
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      const description = Array.isArray(message)
        ? message.join('. ')
        : typeof message === 'string'
          ? message
          : 'Não foi possível cadastrar o animal.';
      toast({
        title: 'Erro ao cadastrar',
        description,
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/farms/${activeFarmId}/animals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['animals', activeFarmId] });
      toast({ title: 'Animal removido' });
    },
  });

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione uma fazenda para gerenciar animais.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Animais</h1>
          <p className="text-muted-foreground">Cadastro central do rebanho — hub para manejo, vendas e material genético</p>
        </div>
        <Button
          onClick={() => {
            if (showForm) {
              resetCreateForm();
              setShowForm(false);
            } else {
              resetCreateForm();
              setShowForm(true);
            }
          }}
        >
          {showForm ? 'Cancelar' : 'Novo animal'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar animal</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((data) => {
                if (createMutation.isPending) return;
                const tag = data.tag.trim();
                const duplicate = animals.some(
                  (animal) => animal.tag.trim().toLowerCase() === tag.toLowerCase(),
                );
                if (duplicate) {
                  toast({
                    title: 'Brinco já cadastrado',
                    description: `Já existe um animal com a identificação "${tag}" nesta fazenda. Use outro brinco ou edite o animal existente.`,
                    variant: 'destructive',
                  });
                  return;
                }
                createMutation.mutate({
                  ...data,
                  tag,
                  ...(abczProfileSnapshot ? { abczProfileSnapshot } : {}),
                });
              })}
              className="grid gap-4 md:grid-cols-2"
            >
              <AbczLookupPanel
                key={formKey}
                setValue={setValue}
                onProfileChange={setAbczProfileSnapshot}
              />
              {abczProfileSnapshot && abczProfileSnapshot.genealogy.length > 0 && (
                <p className="text-sm text-primary md:col-span-2">
                  Genealogia e avaliação da consulta serão salvas no banco ao cadastrar este animal.
                </p>
              )}
              <div className="space-y-2">
                <Label htmlFor="tag">Identificação (brinco)</Label>
                <Input id="tag" {...register('tag')} />
                {errors.tag && <p className="text-sm text-destructive">{errors.tag.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome / apelido</Label>
                <Input id="name" {...register('name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Input id="breed" {...register('breed')} />
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select value={watch('sex')} onValueChange={(v) => setValue('sex', v as AnimalSex)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(animalSexLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de nascimento</Label>
                <Input id="birthDate" type="date" {...register('birthDate')} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch('status') ?? AnimalStatus.ATIVO}
                  onValueChange={(v) => setValue('status', v as AnimalStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(animalStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" {...register('notes')} />
              </div>
              <AnimalParentSelects
                animals={animals}
                sireId={watch('sireId')}
                damId={watch('damId')}
                onSireChange={(v) => setValue('sireId', v)}
                onDamChange={(v) => setValue('damId', v)}
              />
              <div className="md:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending
                    ? hasAbczPending
                      ? 'Salvando e sincronizando ABCZ...'
                      : 'Salvando...'
                    : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : animals.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-muted-foreground">Nenhum animal cadastrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Identificação</th>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Raça</th>
                <th className="px-4 py-3 text-left font-medium">ABCZ</th>
                <th className="px-4 py-3 text-left font-medium">Sexo</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Nascimento</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {animals.map((animal) => (
                <tr key={animal.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{animal.tag}</td>
                  <td className="px-4 py-3">{animal.name ?? '—'}</td>
                  <td className="px-4 py-3">{animal.breed ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {animal.abczSerie && animal.abczRgn
                      ? `${animal.abczSerie} ${animal.abczRgn}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{animalSexLabels[animal.sex]}</td>
                  <td className="px-4 py-3">{animalStatusLabels[animal.status]}</td>
                  <td className="px-4 py-3">
                    {animal.birthDate ? formatDateOnly(animal.birthDate) : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/animais/${animal.id}`}>Ver dados</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive"
                        onClick={() => deleteMutation.mutate(animal.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AnimalAbczDrawer
        farmId={activeFarmId}
        animal={drawerAnimal}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
      />
    </div>
  );
}
