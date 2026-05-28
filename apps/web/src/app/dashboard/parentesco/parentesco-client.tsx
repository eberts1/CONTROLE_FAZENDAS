'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import type { KinshipTreeDto } from '@controle-fazendas/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KinshipSearch, type KinshipSelection } from '@/components/kinship/kinship-search';
import { KinshipAnchorCard } from '@/components/kinship/kinship-anchor-card';
import { KinshipRelationsTable } from '@/components/kinship/kinship-relations-table';
import { api } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { Button } from '@/components/ui/button';

export function ParentescoClient() {
  const { activeFarmId } = useFarmContext();
  const searchParams = useSearchParams();
  const initialAnimalId = searchParams.get('animalId');
  const [selection, setSelection] = useState<KinshipSelection | null>(
    initialAnimalId ? { kind: 'animal', animalId: initialAnimalId } : null,
  );

  useEffect(() => {
    if (initialAnimalId) {
      setSelection({ kind: 'animal', animalId: initialAnimalId });
    }
  }, [initialAnimalId]);

  const treeQuery = useQuery({
    queryKey: [
      'kinship-tree',
      activeFarmId,
      selection?.kind === 'animal' ? selection.animalId : selection?.genealogyKey,
    ],
    queryFn: async () => {
      const params =
        selection?.kind === 'animal'
          ? { animalId: selection.animalId, depth: 2 }
          : { genealogyKey: selection!.genealogyKey, depth: 2 };
      const { data } = await api.get<KinshipTreeDto>(`/farms/${activeFarmId}/kinship/tree`, {
        params,
      });
      return data;
    },
    enabled: !!activeFarmId && !!selection,
  });

  if (!activeFarmId) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">Selecione uma fazenda para consultar parentesco.</p>
      </div>
    );
  }

  const tree = treeQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relação de parentesco</h1>
        <p className="text-muted-foreground">
          Busque um animal ou ancestral e veja filhos e netos cadastrados na fazenda, vinculados por
          ABCZ ou cadastro manual.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Busca</CardTitle>
        </CardHeader>
        <CardContent>
          <KinshipSearch farmId={activeFarmId} selection={selection} onSelect={setSelection} />
        </CardContent>
      </Card>

      {selection && treeQuery.isLoading && (
        <p className="text-muted-foreground">Carregando relações...</p>
      )}

      {selection && treeQuery.isError && (
        <p className="text-destructive">Não foi possível carregar as relações de parentesco.</p>
      )}

      {tree && (
        <>
          <KinshipAnchorCard anchor={tree.anchor} />

          {tree.parents.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {tree.parents.map((parent, index) => (
                  <div
                    key={`${parent.relationship}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm"
                  >
                    <div>
                      <span className="text-xs text-muted-foreground">
                        {parent.relationship === 'PAI' ? 'Pai' : 'Mãe'}
                      </span>
                      <p className="font-medium">{parent.name}</p>
                      {parent.registration && (
                        <p className="text-xs text-muted-foreground">{parent.registration}</p>
                      )}
                    </div>
                    {parent.animalId ? (
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/dashboard/animais/${parent.animalId}`}>Abrir ficha</Link>
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">Não cadastrado na fazenda</span>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Filhos</CardTitle>
            </CardHeader>
            <CardContent>
              <KinshipRelationsTable
                rows={tree.children}
                emptyMessage="Nenhum filho encontrado. Sincronize o perfil ABCZ dos animais ou vincule pai/mãe manualmente no cadastro."
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Netos</CardTitle>
            </CardHeader>
            <CardContent>
              <KinshipRelationsTable
                rows={tree.grandchildren}
                showIntermediate
                emptyMessage="Nenhum neto encontrado para este animal."
              />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
