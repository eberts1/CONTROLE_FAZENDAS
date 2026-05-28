'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AreaDto,
  ProcessDto,
  ProcessRecordDto,
  createProcessRecordSchema,
  CreateProcessRecordInput,
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
import { formatDate } from '@/lib/utils';
import { useState } from 'react';

export default function RegistrosPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['records', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<ProcessRecordDto[]>(`/farms/${activeFarmId}/records`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  const { data: areas = [] } = useQuery({
    queryKey: ['areas', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<AreaDto[]>(`/farms/${activeFarmId}/areas`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  const { data: processes = [] } = useQuery({
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
  } = useForm<CreateProcessRecordInput>({
    resolver: zodResolver(createProcessRecordSchema),
    defaultValues: {
      performedAt: new Date().toISOString(),
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateProcessRecordInput) => {
      const { data } = await api.post<ProcessRecordDto>(`/farms/${activeFarmId}/records`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', activeFarmId] });
      queryClient.invalidateQueries({ queryKey: ['farm-stats', activeFarmId] });
      reset({ performedAt: new Date().toISOString() });
      setShowForm(false);
      toast({ title: 'Registro criado', description: 'Operação registrada com sucesso.' });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o registro.',
        variant: 'destructive',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/farms/${activeFarmId}/records/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['records', activeFarmId] });
      toast({ title: 'Registro removido' });
    },
  });

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione uma fazenda para ver registros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Registros</h1>
          <p className="text-muted-foreground">Histórico de processos executados nas áreas</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} disabled={!areas.length || !processes.length}>
          {showForm ? 'Cancelar' : 'Novo registro'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Registrar operação</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleSubmit((data) => createMutation.mutate(data))}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label>Processo</Label>
                <Select
                  value={watch('processId')}
                  onValueChange={(v) => setValue('processId', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o processo" />
                  </SelectTrigger>
                  <SelectContent>
                    {processes.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.processId && (
                  <p className="text-sm text-destructive">{errors.processId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={watch('areaId')} onValueChange={(v) => setValue('areaId', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a área" />
                  </SelectTrigger>
                  <SelectContent>
                    {areas.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.areaId && (
                  <p className="text-sm text-destructive">{errors.areaId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="performedAt">Data/hora</Label>
                <Input
                  id="performedAt"
                  type="datetime-local"
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    setValue('performedAt', date.toISOString());
                  }}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" {...register('notes')} />
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
      ) : records.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
          <p className="text-muted-foreground">Nenhum registro encontrado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Processo</th>
                <th className="px-4 py-3 text-left font-medium">Área</th>
                <th className="px-4 py-3 text-left font-medium">Data</th>
                <th className="px-4 py-3 text-left font-medium">Observações</th>
                <th className="px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{record.process?.name ?? '—'}</td>
                  <td className="px-4 py-3">{record.area?.name ?? '—'}</td>
                  <td className="px-4 py-3">{formatDate(record.performedAt)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{record.notes ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => deleteMutation.mutate(record.id)}
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
