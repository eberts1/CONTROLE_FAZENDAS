import type { Metadata } from 'next';
import { Providers } from '@/components/providers/providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Controle Fazendas',
  description: 'Sistema de gestão de fazendas, áreas e processos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
