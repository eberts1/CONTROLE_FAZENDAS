import { ThemeToggle } from '@/components/layout/theme-toggle';
import { LoginForm } from '@/components/forms/login-form';

export default function LoginPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-primary">Controle Fazendas</h1>
          <p className="mt-2 text-muted-foreground">Gestão de áreas e processos</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
