'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  ProcessDto,
  ProcessCategory,
  createProcessSchema,
  CreateProcessInput,
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
import { processCategoryLabels } from '@/lib/utils';
import { useState } from 'react';

export default function ProcessosPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['processes', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<ProcessDto[]>(`/farms/${activeFarmId}/processes`);
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
  } = useForm<CreateProcessInput>({
    resolver: zodResolver(createProcessSchema),
    defaultValues: { category: ProcessCategory.MANEJO },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateProcessInput) => {
      const { data } = await api.post<ProcessDto>(`/farms/${activeFarmId}/processes`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes', activeFarmId] });
      queryClient.invalidateQueries({ queryKey: ['farm-stats', activeFarmId] });
      reset({ category: ProcessCategory.MANEJO });
      setShowForm(false);
      toast({ title: 'Processo criado', description: 'Processo cadastrado com sucesso.' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o processo.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/farms/${activeFarmId}/processes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes', activeFarmId] });
      toast({ title: 'Processo removido' });
    },
  });

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione uma fazenda para gerenciar processos.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Processos</h1>
          <p className="text-muted-foreground">Tipos de operação da fazenda</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Novo processo'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar processo</CardTitle>
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
                <Label>Categoria</Label>
                <Select
                  value={watch('category')}
                  onValueChange={(v) => setValue('category', v as ProcessCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(processCategoryLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
      ) : processes.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-muted-foreground">Nenhum processo cadastrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Nome</th>
                <th className="px-4 py-3 text-left font-medium">Categoria</th>
                <th className="px-4 py-3 text-left font-medium">Descrição</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {processes.map((process) => (
                <tr key={process.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{process.name}</td>
                  <td className="px-4 py-3">{processCategoryLabels[process.category]}</td>
                  <td className="px-4 py-3 text-muted-foreground">{process.description ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(process.id)}
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
