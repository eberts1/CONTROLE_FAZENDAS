'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  adminCreateUserSchema,
  AdminCreateUserInput,
  ResetPasswordResultDto,
  Role,
  roleLabels,
  UserDto,
} from '@controle-fazendas/shared';
import { Ban, KeyRound, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ResponsiveDataList } from '@/components/ui/responsive-data-list';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { formatDateOnly } from '@/lib/utils';

export default function UsuariosPage() {
  const router = useRouter();
  const { user: currentUser } = useFarmContext();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ userName: string; password: string } | null>(
    null,
  );

  useEffect(() => {
    if (currentUser && currentUser.role !== Role.ADMIN) {
      router.replace('/dashboard');
    }
  }, [currentUser, router]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<UserDto[]>('/users');
      return data;
    },
    enabled: currentUser?.role === Role.ADMIN,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AdminCreateUserInput>({
    resolver: zodResolver(adminCreateUserSchema),
    defaultValues: { role: 'MANAGER' },
  });

  const createMutation = useMutation({
    mutationFn: async (input: AdminCreateUserInput) => {
      const { data } = await api.post<UserDto>('/users', input);
      return data;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      reset({ role: 'MANAGER' });
      setShowForm(false);
      toast({
        title: 'Usuário criado',
        description: `${created.name} (${created.email}) cadastrado com sucesso.`,
      });
    },
    onError: (error: unknown) => {
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast({
        title: 'Erro',
        description: message ?? 'Não foi possível criar o usuário.',
        variant: 'destructive',
      });
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ id, blocked }: { id: string; blocked: boolean }) => {
      const { data } = await api.patch<UserDto>(`/users/${id}/block`, { blocked });
      return data;
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: updated.blocked ? 'Usuário bloqueado' : 'Usuário desbloqueado',
        description: updated.email,
      });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível alterar o status.', variant: 'destructive' });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<ResetPasswordResultDto>(`/users/${id}/reset-password`);
      return data;
    },
    onSuccess: (result, userId) => {
      const target = users.find((u) => u.id === userId);
      setTempPassword({
        userName: target?.name ?? 'Usuário',
        password: result.temporaryPassword,
      });
    },
    onError: () => {
      toast({
        title: 'Erro',
        description: 'Não foi possível redefinir a senha.',
        variant: 'destructive',
      });
    },
  });

  if (currentUser?.role !== Role.ADMIN) {
    return null;
  }

  async function copyPassword() {
    if (!tempPassword) return;
    await navigator.clipboard.writeText(tempPassword.password);
    toast({ title: 'Senha copiada', description: 'Cole e envie ao usuário com segurança.' });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie contas da plataforma — criar, bloquear e redefinir senha
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : 'Novo usuário'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Criar usuário</CardTitle>
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
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input id="password" type="password" {...register('password')} />
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Papel</Label>
                <Select
                  value={watch('role') ?? 'MANAGER'}
                  onValueChange={(v) => setValue('role', v as 'MANAGER' | 'OPERATOR')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANAGER">{roleLabels.MANAGER}</SelectItem>
                    <SelectItem value="OPERATOR">{roleLabels.OPERATOR}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando...' : 'Criar conta'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tempPassword && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <KeyRound className="h-4 w-4" />
              Senha temporária — {tempPassword.userName}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
              {tempPassword.password}
            </code>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={copyPassword}>
                Copiar senha
              </Button>
              <Button type="button" variant="ghost" onClick={() => setTempPassword(null)}>
                Fechar
              </Button>
            </div>
            <p className="text-sm text-muted-foreground sm:basis-full">
              Envie esta senha ao usuário. Ela não será exibida novamente.
            </p>
          </CardContent>
        </Card>
      )}

      <ResponsiveDataList
        rows={users}
        keyExtractor={(row) => row.id}
        isLoading={isLoading}
        emptyMessage="Nenhum usuário cadastrado."
        mobileTitle={(row) => row.name}
        mobileSubtitle={(row) => row.email}
        columns={[
          {
            key: 'name',
            header: 'Nome',
            cell: (row) => <span className="font-medium">{row.name}</span>,
          },
          {
            key: 'email',
            header: 'E-mail',
            cell: (row) => row.email,
          },
          {
            key: 'role',
            header: 'Papel',
            cell: (row) => roleLabels[row.role],
            hideOnMobile: true,
          },
          {
            key: 'status',
            header: 'Status',
            cell: (row) => (
              <span
                className={
                  row.blocked
                    ? 'inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive'
                    : 'inline-flex rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400'
                }
              >
                {row.blocked ? 'Bloqueado' : 'Ativo'}
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'Cadastro',
            cell: (row) => formatDateOnly(row.createdAt),
            hideOnMobile: true,
          },
        ]}
        actions={(row) => {
          const isSelf = row.id === currentUser?.id;
          const isAdminUser = row.role === Role.ADMIN;

          return (
            <div className="flex flex-wrap justify-end gap-1">
              {!isSelf && !isAdminUser && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={blockMutation.isPending}
                    onClick={() =>
                      blockMutation.mutate({ id: row.id, blocked: !row.blocked })
                    }
                  >
                    {row.blocked ? (
                      <>
                        <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                        Desbloquear
                      </>
                    ) : (
                      <>
                        <Ban className="mr-1 h-3.5 w-3.5" />
                        Bloquear
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={resetPasswordMutation.isPending}
                    onClick={() => resetPasswordMutation.mutate(row.id)}
                  >
                    <KeyRound className="mr-1 h-3.5 w-3.5" />
                    Redefinir senha
                  </Button>
                </>
              )}
            </div>
          );
        }}
      />
    </div>
  );
}
