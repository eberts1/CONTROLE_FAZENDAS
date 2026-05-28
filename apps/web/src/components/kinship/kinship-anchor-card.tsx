'use client';

import type { KinshipAnchorDto } from '@controle-fazendas/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { animalSexLabels } from '@/lib/utils';

interface KinshipAnchorCardProps {
  anchor: KinshipAnchorDto;
}

export function KinshipAnchorCard({ anchor }: KinshipAnchorCardProps) {
  const title =
    anchor.tag && anchor.name
      ? `${anchor.tag} — ${anchor.name}`
      : anchor.tag ?? anchor.name ?? anchor.registration ?? 'Ancestral';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Animal selecionado</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-xl font-semibold">{title}</p>
        {anchor.registration && anchor.kind === 'genealogy' && (
          <p>
            <span className="text-muted-foreground">Registro ABCZ: </span>
            {anchor.registration}
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
            {anchor.kind === 'animal' ? 'Cadastrado na fazenda' : 'Só na genealogia ABCZ'}
          </span>
          {anchor.sex && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {animalSexLabels[anchor.sex]}
            </span>
          )}
          {anchor.hasAbczProfile === false && anchor.kind === 'animal' && (
            <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs text-amber-800 dark:text-amber-200">
              Sem perfil ABCZ sincronizado
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
