'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  createPartnerSchema,
  CreatePartnerInput,
  PartnerDto,
  updatePartnerSchema,
  UpdatePartnerInput,
} from '@controle-fazendas/shared';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { Pencil, Trash2 } from 'lucide-react';

export default function PartnersPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: partners = [], isLoading } = useQuery({
    queryKey: ['partners', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<PartnerDto[]>(`/farms/${activeFarmId}/partners`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  const createForm = useForm<CreatePartnerInput>({
    resolver: zodResolver(createPartnerSchema),
  });

  const editForm = useForm<UpdatePartnerInput>({
    resolver: zodResolver(updatePartnerSchema),
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreatePartnerInput) => {
      const { data } = await api.post<PartnerDto>(`/farms/${activeFarmId}/partners`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', activeFarmId] });
      createForm.reset();
      setShowForm(false);
      toast({ title: 'Parceiro criado' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível criar o parceiro.', variant: 'destructive' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdatePartnerInput }) => {
      const { data } = await api.patch<PartnerDto>(`/farms/${activeFarmId}/partners/${id}`, input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', activeFarmId] });
      setEditingId(null);
      toast({ title: 'Parceiro atualizado' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/farms/${activeFarmId}/partners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partners', activeFarmId] });
      toast({ title: 'Parceiro removido' });
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string | string[] } } }).response?.data
          ?.message;
      toast({
        title: 'Erro',
        description: Array.isArray(message) ? message.join('. ') : message ?? 'Não foi possível remover.',
        variant: 'destructive',
      });
    },
  });

  const startEdit = (partner: PartnerDto) => {
    setEditingId(partner.id);
    editForm.reset({
      name: partner.name,
      document: partner.document ?? undefined,
      email: partner.email ?? undefined,
      phone: partner.phone ?? undefined,
      notes: partner.notes ?? undefined,
    });
  };

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione uma fazenda para gerenciar parceiros.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Parceiros</h1>
          <p className="text-muted-foreground">
            Contatos externos reutilizáveis como sócios e proprietários de animais
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Novo parceiro'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Cadastrar parceiro</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))}
              className="grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input id="name" {...createForm.register('name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="document">CPF/CNPJ</Label>
                <Input id="document" {...createForm.register('document')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...createForm.register('email')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" {...createForm.register('phone')} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" {...createForm.register('notes')} />
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  Salvar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Parceiros cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : partners.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum parceiro cadastrado.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-3 py-2 text-left">Nome</th>
                    <th className="px-3 py-2 text-left">Documento</th>
                    <th className="px-3 py-2 text-left">Contato</th>
                    <th className="px-3 py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {partners.map((partner) => (
                    <tr key={partner.id} className="border-t">
                      {editingId === partner.id ? (
                        <td colSpan={4} className="px-3 py-3">
                          <form
                            onSubmit={editForm.handleSubmit((data) =>
                              updateMutation.mutate({ id: partner.id, input: data }),
                            )}
                            className="grid gap-3 md:grid-cols-2"
                          >
                            <Input {...editForm.register('name')} placeholder="Nome" />
                            <Input {...editForm.register('document')} placeholder="CPF/CNPJ" />
                            <Input {...editForm.register('email')} placeholder="E-mail" />
                            <Input {...editForm.register('phone')} placeholder="Telefone" />
                            <Textarea
                              className="md:col-span-2"
                              {...editForm.register('notes')}
                              placeholder="Observações"
                            />
                            <div className="flex gap-2 md:col-span-2">
                              <Button type="submit" size="sm" disabled={updateMutation.isPending}>
                                Salvar
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingId(null)}
                              >
                                Cancelar
                              </Button>
                            </div>
                          </form>
                        </td>
                      ) : (
                        <>
                          <td className="px-3 py-2 font-medium">{partner.name}</td>
                          <td className="px-3 py-2">{partner.document ?? '—'}</td>
                          <td className="px-3 py-2">
                            {[partner.email, partner.phone].filter(Boolean).join(' · ') || '—'}
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="sm" onClick={() => startEdit(partner)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteMutation.mutate(partner.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
