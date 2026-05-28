'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AreaDto,
  AreaType,
  createAreaSchema,
  CreateAreaInput,
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
import { areaTypeLabels } from '@/lib/utils';
import { useState } from 'react';

export default function AreasPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: areas = [], isLoading } = useQuery({
    queryKey: ['areas', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<AreaDto[]>(`/farms/${activeFarmId}/areas`);
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
  } = useForm<CreateAreaInput>({
    resolver: zodResolver(createAreaSchema),
    defaultValues: { type: AreaType.PASTO },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateAreaInput) => {
      const { data } = await api.post<AreaDto>(`/farms/${activeFarmId}/areas`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', activeFarmId] });
      queryClient.invalidateQueries({ queryKey: ['farm-stats', activeFarmId] });
      reset({ type: AreaType.PASTO });
      setShowForm(false);
      toast({ title: 'Área criada', description: 'Área cadastrada com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível criar a área.', variant: 'destructive' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/farms/${activeFarmId}/areas/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas', activeFarmId] });
      toast({ title: 'Área removida' });
    },
  });

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione uma fazenda para gerenciar áreas.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Áreas</h1>
          <p className="text-muted-foreground">Talhões, pastos e demais áreas da fazenda</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Nova área'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar área</CardTitle>
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
                <Label>Tipo</Label>
                <Select
                  value={watch('type')}
                  onValueChange={(v) => setValue('type', v as AreaType)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(areaTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="hectares">Hectares</Label>
                <Input
                  id="hectares"
                  type="number"
                  step="0.01"
                  {...register('hectares', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" {...register('description')} />
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
      ) : areas.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-muted-foreground">Nenhuma área cadastrada.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Tipo</th>
                <th className="px-4 py-3 text-left font-medium">Hectares</th>
                <th className="px-4 py-3 text-left font-medium">Descrição</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {areas.map((area) => (
                <tr key={area.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{area.name}</td>
                  <td className="px-4 py-3">{areaTypeLabels[area.type]}</td>
                  <td className="px-4 py-3">{area.hectares ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{area.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(area.id)}
                    >
                      Excluir
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
