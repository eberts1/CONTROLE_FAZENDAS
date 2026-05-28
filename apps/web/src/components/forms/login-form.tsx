'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { loginSchema, LoginInput } from '@controle-fazendas/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { login } from '@/lib/auth';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { isAxiosError } from 'axios';

function getLoginErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) {
      return 'Não foi possível conectar à API. Verifique NEXT_PUBLIC_API_URL no Vercel e se a API está no ar.';
    }
    if (error.response.status === 401) {
      return 'Credenciais inválidas. Use manager@controlefazendas.com / manager123 (após rodar o seed no banco de produção).';
    }
    if (error.response.status >= 500) {
      return 'Erro no servidor da API. Verifique DATABASE_URL, migrations e seed no ambiente da API.';
    }
  }
  return 'Não foi possível entrar. Tente novamente.';
}

export function LoginForm() {
  const router = useRouter();
  const { setSession } = useFarmContext();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: 'admin@controlefazendas.com', password: 'admin123' },
  });

  async function onSubmit(data: LoginInput) {
    setLoading(true);
    try {
      const result = await login(data.email, data.password);
      setSession(result.user, result.farms);
      toast({ title: 'Login realizado', description: `Bem-vindo, ${result.user.name}!` });
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Erro no login',
        description: getLoginErrorMessage(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse o painel de controle da fazenda</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
