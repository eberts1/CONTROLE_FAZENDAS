'use client';

import { useQuery } from '@tanstack/react-query';
import { AnimalAbczProfileDto, AnimalDto } from '@controle-fazendas/shared';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api-client';
import { formatDateOnly } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { AbczProfileContent } from '@/components/abcz-profile-content';

interface AnimalAbczDrawerProps {
  farmId: string;
  animal: AnimalDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AnimalAbczDrawer({ farmId, animal, open, onOpenChange }: AnimalAbczDrawerProps) {
  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ['animal-abcz-profile', farmId, animal?.id],
    queryFn: async () => {
      const { data } = await api.get<AnimalAbczProfileDto>(
        `/farms/${farmId}/animals/${animal!.id}/abcz-profile`,
      );
      return data;
    },
    enabled: open && !!animal?.id && !!farmId,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Dados ABCZ</SheetTitle>
          <SheetDescription>
            {animal?.name ?? 'Animal'} ·{' '}
            {animal?.abczSerie && animal?.abczRgn
              ? `${animal.abczSerie} ${animal.abczRgn}`
              : 'Sem registro ABCZ'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 px-6 py-4">
          {isLoading && (
            <p className="text-sm text-muted-foreground">Carregando perfil sincronizado...</p>
          )}

          {isError && (
            <p className="text-sm text-destructive">
              Não foi possível carregar o perfil ABCZ. O animal pode ter sido cadastrado sem
              sincronização completa.
            </p>
          )}

          {profile && (
            <>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Consulta</h3>
                <p className="text-xs text-muted-foreground">
                  Sincronizado em {formatDateOnly(profile.fetchedAt)}
                </p>
                {profile.registration && (
                  <p className="text-sm">
                    <span className="text-muted-foreground">Registro: </span>
                    {profile.registration}
                  </p>
                )}
              </section>

              <AbczProfileContent
                profile={{
                  permissions: profile.permissions,
                  header: profile.header,
                  genealogy: profile.genealogy,
                  geneticEvaluations: profile.geneticEvaluations,
                  reproductiveMessage: profile.reproductiveMessage,
                  reproductiveData: profile.reproductiveData,
                  efficiencyMessage: profile.efficiencyMessage,
                }}
              />

              {profile.sourceUrl && (
                <Button variant="outline" size="sm" asChild>
                  <a href={profile.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Abrir consulta na ABCZ
                  </a>
                </Button>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
