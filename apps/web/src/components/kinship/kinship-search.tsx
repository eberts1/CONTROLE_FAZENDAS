'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type {
  KinshipSearchGenealogyResultDto,
  KinshipSearchResponseDto,
} from '@controle-fazendas/shared';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { animalSexLabels, cn } from '@/lib/utils';

export type KinshipSelection =
  | { kind: 'animal'; animalId: string }
  | { kind: 'genealogy'; genealogyKey: string };

interface KinshipSearchProps {
  farmId: string;
  selection: KinshipSelection | null;
  onSelect: (selection: KinshipSelection) => void;
}

export function KinshipSearch({ farmId, selection, onSelect }: KinshipSearchProps) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ['kinship-search', farmId, debounced],
    queryFn: async () => {
      const { data: result } = await api.get<KinshipSearchResponseDto>(
        `/farms/${farmId}/kinship/search`,
        { params: { q: debounced } },
      );
      return result;
    },
    enabled: !!farmId && debounced.length >= 2,
  });

  const isSelected = (item: KinshipSelection) => {
    if (!selection) return false;
    if (item.kind === 'animal' && selection.kind === 'animal') {
      return item.animalId === selection.animalId;
    }
    if (item.kind === 'genealogy' && selection.kind === 'genealogy') {
      return item.genealogyKey === selection.genealogyKey;
    }
    return false;
  };

  const renderGenealogyItem = (item: KinshipSearchGenealogyResultDto) => (
    <button
      key={item.genealogyKey}
      type="button"
      onClick={() => onSelect({ kind: 'genealogy', genealogyKey: item.genealogyKey })}
      className={cn(
        'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
        isSelected({ kind: 'genealogy', genealogyKey: item.genealogyKey }) && 'border-primary bg-primary/5',
      )}
    >
      <p className="font-medium">{item.name}</p>
      <p className="text-xs text-muted-foreground">
        {item.registration} · {item.relationship === 'PAI' ? 'Pai' : 'Mãe'} (genealogia ABCZ)
      </p>
    </button>
  );

  return (
    <div className="space-y-2">
      <Label htmlFor="kinship-search">Buscar animal ou ancestral</Label>
      <Input
        id="kinship-search"
        placeholder="Ex.: ILHEUS, GSCA 2490..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {debounced.length < 2 && (
        <p className="text-xs text-muted-foreground">Digite ao menos 2 caracteres para buscar.</p>
      )}
      {debounced.length >= 2 && (
        <div className="space-y-3 rounded-lg border p-3">
          {isFetching && <p className="text-sm text-muted-foreground">Buscando...</p>}
          {!isFetching && data && (
            <>
              {data.animals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Animais cadastrados
                  </p>
                  {data.animals.map((animal) => (
                    <button
                      key={animal.animalId}
                      type="button"
                      onClick={() => onSelect({ kind: 'animal', animalId: animal.animalId })}
                      className={cn(
                        'w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent',
                        isSelected({ kind: 'animal', animalId: animal.animalId }) &&
                          'border-primary bg-primary/5',
                      )}
                    >
                      <p className="font-medium">{animal.tag}</p>
                      <p className="text-xs text-muted-foreground">
                        {animal.name ?? 'Sem nome'} · {animalSexLabels[animal.sex]}
                        {animal.hasAbczProfile ? ' · ABCZ' : ''}
                      </p>
                    </button>
                  ))}
                </div>
              )}
              {data.genealogyAncestors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Ancestrais (genealogia ABCZ)
                  </p>
                  {data.genealogyAncestors.map(renderGenealogyItem)}
                </div>
              )}
              {data.animals.length === 0 && data.genealogyAncestors.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum resultado para esta busca.</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
