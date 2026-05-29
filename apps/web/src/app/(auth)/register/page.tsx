import Link from 'next/link';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { RegisterForm } from '@/components/forms/register-form';

export default function RegisterPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Controle Fazendas</h1>
          <p className="mt-2 text-muted-foreground">Crie sua conta e comece a gerenciar</p>
        </div>
        <RegisterForm />
        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground">
          Voltar para o login
        </Link>
      </div>
    </div>
  );
}
