'use client';

import Link from 'next/link';
import type { KinshipRelationNodeDto } from '@controle-fazendas/shared';
import { Button } from '@/components/ui/button';
import { animalSexLabels } from '@/lib/utils';

const matchedViaLabels = {
  manual: 'Manual',
  abcz: 'ABCZ',
  both: 'Manual + ABCZ',
} as const;

interface KinshipRelationsTableProps {
  rows: KinshipRelationNodeDto[];
  showIntermediate?: boolean;
  emptyMessage: string;
}

export function KinshipRelationsTable({
  rows,
  showIntermediate = false,
  emptyMessage,
}: KinshipRelationsTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Identificação</th>
            <th className="px-4 py-2 text-left font-medium">Nome</th>
            <th className="px-4 py-2 text-left font-medium">Sexo</th>
            <th className="px-4 py-2 text-left font-medium">Vínculo</th>
            {showIntermediate && (
              <th className="px-4 py-2 text-left font-medium">Filho intermediário</th>
            )}
            <th className="px-4 py-2 text-right font-medium">Ações</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.animalId} className="border-t">
              <td className="px-4 py-2 font-mono">{row.tag}</td>
              <td className="px-4 py-2">{row.name ?? '—'}</td>
              <td className="px-4 py-2">{animalSexLabels[row.sex]}</td>
              <td className="px-4 py-2">{matchedViaLabels[row.matchedVia]}</td>
              {showIntermediate && (
                <td className="px-4 py-2">
                  {row.intermediateParent ? (
                    <Link
                      href={`/dashboard/animais/${row.intermediateParent.id}`}
                      className="text-primary hover:underline"
                    >
                      {row.intermediateParent.tag}
                      {row.intermediateParent.name ? ` — ${row.intermediateParent.name}` : ''}
                    </Link>
                  ) : (
                    '—'
                  )}
                </td>
              )}
              <td className="px-4 py-2 text-right">
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/dashboard/animais/${row.animalId}`}>Abrir ficha</Link>
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
