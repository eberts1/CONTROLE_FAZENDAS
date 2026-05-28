'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createFarmSchema, CreateFarmInput, FarmDto } from '@controle-fazendas/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';

export default function FazendasPage() {
  const { farms, setSession, user } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: farmList = farms, isLoading } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const { data } = await api.get<FarmDto[]>('/farms');
      return data;
    },
    initialData: farms,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFarmInput>({
    resolver: zodResolver(createFarmSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateFarmInput) => {
      const { data } = await api.post<FarmDto>('/farms', input);
      return data;
    },
    onSuccess: async (newFarm) => {
      const updated = [...farmList, newFarm];
      if (user) setSession(user, updated);
      await queryClient.invalidateQueries({ queryKey: ['farms'] });
      reset();
      setShowForm(false);
      toast({ title: 'Fazenda criada', description: `${newFarm.name} cadastrada com sucesso.` });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível criar a fazenda.', variant: 'destructive' });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fazendas</h1>
          <p className="text-muted-foreground">Gerencie as fazendas cadastradas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nova fazenda'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar fazenda</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((data) => createMutation.mutate(data))}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" {...register('name')} />
                {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Localização</Label>
                <Input id="location" {...register('location')} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Carregando...</p>
      ) : farmList.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-muted-foreground">Nenhuma fazenda cadastrada.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {farmList.map((farm) => (
            <Card key={farm.id}>
              <CardHeader>
                <CardTitle>{farm.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {farm.location || 'Localização não informada'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
