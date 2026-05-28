export type GenealogyPedigreeEntry = {
  relationship: string;
  registration: string;
  name: string;
  abczAnimalId?: string | null;
  generation?: number | null;
  slot?: number | null;
};

/** Rótulos de posição na árvore genealógica (coluna ABCZ → geração). */
export const PEDIGREE_POSITION_LABELS: Record<number, readonly string[]> = {
  0: ['Animal'],
  1: ['Pai', 'Mãe'],
  2: ['Avô paterno', 'Avó paterna', 'Avô materno', 'Avó materna'],
  3: [
    'Bisavô pat. (pai)',
    'Bisavó pat. (mãe)',
    'Bisavô pat. (pai)',
    'Bisavó pat. (mãe)',
    'Bisavô mat. (pai)',
    'Bisavó mat. (mãe)',
    'Bisavô mat. (pai)',
    'Bisavó mat. (mãe)',
  ],
};

export const PEDIGREE_GENERATION_LABELS = ['Animal', 'Pais', 'Avós', 'Bisavós'] as const;

export function getPedigreePositionLabel(generation: number, slot: number): string {
  return PEDIGREE_POSITION_LABELS[generation]?.[slot] ?? `G${generation}-${slot + 1}`;
}

export function mapGenealogyToPedigree(entries: GenealogyPedigreeEntry[]) {
  const positioned = entries.filter(
    (entry) => entry.generation != null && entry.slot != null,
  ) as Array<GenealogyPedigreeEntry & { generation: number; slot: number }>;

  if (positioned.length === 0) return null;

  const maxGeneration = Math.max(...positioned.map((entry) => entry.generation));
  const grid: Array<Array<GenealogyPedigreeEntry | null>> = [];

  for (let generation = 0; generation <= maxGeneration; generation += 1) {
    const count = 2 ** generation;
    const row: Array<GenealogyPedigreeEntry | null> = Array.from({ length: count }, () => null);
    for (const entry of positioned) {
      if (entry.generation === generation && entry.slot < count) {
        row[entry.slot] = entry;
      }
    }
    grid.push(row);
  }

  return { grid, maxGeneration };
}

export function canRenderPedigreeTree(entries: GenealogyPedigreeEntry[]): boolean {
  return mapGenealogyToPedigree(entries) !== null;
}
