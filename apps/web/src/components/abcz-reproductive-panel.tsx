'use client';

import { AbczProfilePreviewDto } from '@controle-fazendas/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AbczReproductivePanelProps {
  profile: AbczProfilePreviewDto;
}

export function AbczReproductivePanel({ profile }: AbczReproductivePanelProps) {
  const hasReproductive =
    Boolean(profile.reproductiveMessage) ||
    Boolean(profile.reproductiveData?.length) ||
    Boolean(profile.efficiencyMessage);

  if (!hasReproductive) return null;

  return (
    <Card>
      <CardHeader className="py-4 md:py-6">
        <CardTitle className="text-base">Dados reprodutivos ABCZ</CardTitle>
        <p className="text-xs text-muted-foreground">Somente leitura — importado do portal ABCZ</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {profile.reproductiveMessage && (
          <p className="text-sm text-muted-foreground">{profile.reproductiveMessage}</p>
        )}
        {profile.reproductiveData && profile.reproductiveData.length > 0 && (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {profile.reproductiveData.map((row, index) => (
              <div key={index} className="contents">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        )}
        {profile.efficiencyMessage && (
          <p className="rounded-md bg-muted/50 p-2 text-sm">{profile.efficiencyMessage}</p>
        )}
      </CardContent>
    </Card>
  );
}
