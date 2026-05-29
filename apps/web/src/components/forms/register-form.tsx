'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { registerSchema, RegisterInput } from '@controle-fazendas/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { register as registerAccount } from '@/lib/auth';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { isAxiosError } from 'axios';

function getRegisterErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível conectar à API. Verifique se o servidor está no ar.';
    }
    const message = error.response.data?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
    if (error.response.status === 409) {
      return 'Este e-mail já está cadastrado.';
    }
  }
  return 'Não foi possível criar a conta. Tente novamente.';
}

export function RegisterForm() {
  const router = useRouter();
  const { setSession } = useFarmContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterInput) {
    setLoading(true);
    try {
      const result = await registerAccount(data);
      setSession(result.user, result.farms);
      toast({
        title: 'Conta criada',
        description: `Bem-vindo, ${result.user.name}! Sua fazenda "${data.farmName}" foi criada.`,
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Erro no cadastro',
        description: getRegisterErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Cadastre-se e configure sua primeira fazenda</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome completo</Label>
            <Input id="name" autoComplete="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" {...register('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="border-t pt-4">
            <p className="mb-3 text-sm font-medium text-muted-foreground">Sua fazenda</p>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="farmName">Nome da fazenda</Label>
                <Input id="farmName" {...register('farmName')} />
                {errors.farmName && (
                  <p className="text-sm text-destructive">{errors.farmName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="farmLocation">Localização (opcional)</Label>
                <Input id="farmLocation" placeholder="Ex.: Goiás, Brasil" {...register('farmLocation')} />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Criando conta…' : 'Criar conta'}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            Já tem conta?{' '}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
