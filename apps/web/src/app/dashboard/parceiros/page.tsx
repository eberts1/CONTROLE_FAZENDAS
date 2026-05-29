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
import { useState, Fragment } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { PartnerBuyerImport } from '@/components/partner-buyer-import';
import { PartnerSanitize } from '@/components/partner-sanitize';
import { PartnerDetailDrawer } from '@/components/partner-detail-drawer';
import { ChevronDown, ChevronUp, Info, Pencil, Trash2 } from 'lucide-react';

import { UseFormRegister } from 'react-hook-form';

function PartnerExtraFields({
  register,
  prefix,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register: UseFormRegister<any>;
  prefix?: string;
}) {
  const id = (field: string) => (prefix ? `${prefix}-${field}` : field);
  return (
    <>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={id('address')}>Endereço</Label>
        <Input id={id('address')} {...register('address')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('city')}>Cidade</Label>
        <Input id={id('city')} {...register('city')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('state')}>UF</Label>
        <Input id={id('state')} maxLength={2} {...register('state')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('zipCode')}>CEP</Label>
        <Input id={id('zipCode')} {...register('zipCode')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('phone2')}>Telefone 2</Label>
        <Input id={id('phone2')} {...register('phone2')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('phone3')}>Telefone 3</Label>
        <Input id={id('phone3')} {...register('phone3')} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={id('ranchName')}>Fazenda</Label>
        <Input id={id('ranchName')} {...register('ranchName')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('ranchCity')}>Cidade da fazenda</Label>
        <Input id={id('ranchCity')} {...register('ranchCity')} />
      </div>
      <div className="space-y-2">
        <Label htmlFor={id('ranchState')}>UF da fazenda</Label>
        <Input id={id('ranchState')} maxLength={2} {...register('ranchState')} />
      </div>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor={id('ranchRegistration')}>Inscrição / Estabelecimento</Label>
        <Input id={id('ranchRegistration')} {...register('ranchRegistration')} />
      </div>
    </>
  );
}

export default function PartnersPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [showExtraFields, setShowExtraFields] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailPartner, setDetailPartner] = useState<PartnerDto | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

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
      setShowExtraFields(false);
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

  const partnerToForm = (partner: PartnerDto): UpdatePartnerInput => ({
    name: partner.name,
    document: partner.document ?? undefined,
    email: partner.email ?? undefined,
    phone: partner.phone ?? undefined,
    phone2: partner.phone2 ?? undefined,
    phone3: partner.phone3 ?? undefined,
    address: partner.address ?? undefined,
    city: partner.city ?? undefined,
    state: partner.state ?? undefined,
    zipCode: partner.zipCode ?? undefined,
    ranchName: partner.ranchName ?? undefined,
    ranchCity: partner.ranchCity ?? undefined,
    ranchState: partner.ranchState ?? undefined,
    ranchRegistration: partner.ranchRegistration ?? undefined,
    notes: partner.notes ?? undefined,
  });

  const startEdit = (partner: PartnerDto) => {
    setEditingId(partner.id);
    editForm.reset(partnerToForm(partner));
  };

  const openDetail = (partner: PartnerDto) => {
    setDetailPartner(partner);
    setDetailOpen(true);
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
      <div>
        <h1 className="text-3xl font-bold">Parceiros</h1>
        <p className="text-muted-foreground">
          Compradores de leilão, sócios e contatos reutilizáveis na fazenda
        </p>
      </div>

      <Tabs defaultValue="cadastro">
        <TabsList>
          <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
          <TabsTrigger value="importar">Importar compradores</TabsTrigger>
          <TabsTrigger value="higienizar">Higienizar</TabsTrigger>
        </TabsList>

        <TabsContent value="cadastro">
          <div className="space-y-6">
            <div className="flex justify-end">
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
                    {showExtraFields && <PartnerExtraFields register={createForm.register} />}
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="notes">Observações</Label>
                      <Textarea id="notes" {...createForm.register('notes')} />
                    </div>
                    <div className="flex flex-wrap gap-2 md:col-span-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowExtraFields(!showExtraFields)}
                      >
                        {showExtraFields ? (
                          <>
                            <ChevronUp className="mr-2 h-4 w-4" /> Menos campos
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" /> Endereço e fazenda
                          </>
                        )}
                      </Button>
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
                <CardTitle>Parceiros cadastrados ({partners.length})</CardTitle>
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
                          <Fragment key={partner.id}>
                            <tr className="border-t">
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
                                    <PartnerExtraFields register={editForm.register} prefix="edit" />
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
                                  <td className="px-3 py-2">
                                    <button
                                      type="button"
                                      className="font-medium text-left hover:underline"
                                      onClick={() =>
                                        setExpandedId(expandedId === partner.id ? null : partner.id)
                                      }
                                    >
                                      {partner.name}
                                    </button>
                                  </td>
                                  <td className="px-3 py-2">{partner.document ?? '—'}</td>
                                  <td className="px-3 py-2">
                                    {[partner.email, partner.phone].filter(Boolean).join(' · ') || '—'}
                                  </td>
                                  <td className="px-3 py-2 text-right">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        title="Ver informações"
                                        onClick={() => openDetail(partner)}
                                      >
                                        <Info className="h-4 w-4" />
                                      </Button>
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
                            {expandedId === partner.id && editingId !== partner.id && (
                              <tr className="border-t bg-muted/20">
                                <td colSpan={4} className="px-3 py-2 text-xs text-muted-foreground">
                                  {[
                                    partner.address,
                                    partner.city && partner.state
                                      ? `${partner.city} - ${partner.state}`
                                      : partner.city,
                                    partner.zipCode,
                                    partner.ranchName ? `Fazenda: ${partner.ranchName}` : null,
                                    partner.ranchRegistration,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ') || 'Sem endereço ou fazenda cadastrados.'}
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="importar">
          <PartnerBuyerImport farmId={activeFarmId} />
        </TabsContent>

        <TabsContent value="higienizar">
          <PartnerSanitize farmId={activeFarmId} />
        </TabsContent>
      </Tabs>

      <PartnerDetailDrawer
        farmId={activeFarmId}
        partner={detailPartner}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
