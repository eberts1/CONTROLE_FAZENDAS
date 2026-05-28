'use client';

import { Fragment } from 'react';
import {
  GenealogyPedigreeEntry,
  PEDIGREE_GENERATION_LABELS,
  canRenderPedigreeTree,
  getPedigreePositionLabel,
  mapGenealogyToPedigree,
} from '@controle-fazendas/shared';
import { cn } from '@/lib/utils';

const ROWS = 8;

interface AbczGenealogyTreeProps {
  entries: GenealogyPedigreeEntry[];
  className?: string;
}

function getRowSpan(generation: number) {
  return ROWS / 2 ** generation;
}

function getRowStart(generation: number, slot: number) {
  return slot * getRowSpan(generation) + 1;
}

function PedigreeNode({
  entry,
  positionLabel,
  highlight,
}: {
  entry: GenealogyPedigreeEntry | null;
  positionLabel: string;
  highlight?: boolean;
}) {
  if (!entry) {
    return (
      <div className="flex h-full min-h-[40px] items-center rounded-md border border-dashed border-muted-foreground/20 bg-muted/10 px-2 py-1 opacity-40">
        <div>
          <p className="text-[10px] text-muted-foreground">{positionLabel}</p>
          <p className="text-xs text-muted-foreground">—</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex h-full min-h-[40px] flex-col justify-center rounded-md border px-2 py-1 shadow-sm',
        highlight
          ? 'border-primary bg-primary/10 ring-1 ring-primary/25'
          : 'border-border bg-background',
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {positionLabel}
      </p>
      <p className="truncate font-mono text-[11px]">{entry.registration}</p>
      <p className={cn('truncate text-xs font-semibold', highlight ? 'text-primary' : 'text-primary/90')}>
        {entry.name}
      </p>
    </div>
  );
}

function PedigreeConnector({ generation }: { generation: number }) {
  const pairs = 2 ** (generation - 1);

  return (
    <div className="grid h-full w-4 shrink-0 grid-rows-8 self-stretch">
      {Array.from({ length: pairs }).map((_, index) => {
        const span = ROWS / pairs;
        const rowStart = index * span + 1;
        return (
          <div
            key={index}
            className="relative flex items-center"
            style={{ gridRow: `${rowStart} / span ${span}` }}
          >
            <div className="absolute inset-y-2 right-0 w-2.5 rounded-l-sm border border-r-0 border-muted-foreground/40" />
            <div className="absolute right-0 top-1/2 h-px w-2.5 -translate-y-1/2 bg-muted-foreground/40" />
          </div>
        );
      })}
    </div>
  );
}

function PedigreeGenerationColumn({
  generation,
  nodes,
}: {
  generation: number;
  nodes: Array<GenealogyPedigreeEntry | null>;
}) {
  return (
    <div className="flex min-w-[148px] flex-col">
      <p className="mb-2 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {PEDIGREE_GENERATION_LABELS[generation] ?? `Geração ${generation}`}
      </p>
      <div className="grid flex-1 grid-rows-8 gap-y-1">
        {nodes.map((entry, slot) => (
          <div
            key={slot}
            className="flex items-center"
            style={{
              gridRow: `${getRowStart(generation, slot)} / span ${getRowSpan(generation)}`,
            }}
          >
            <PedigreeNode
              entry={entry}
              positionLabel={getPedigreePositionLabel(generation, slot)}
              highlight={generation === 0}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AbczGenealogyTree({ entries, className }: AbczGenealogyTreeProps) {
  const pedigree = mapGenealogyToPedigree(entries);

  if (!pedigree) {
    return (
      <p className="text-sm text-muted-foreground">
        Posicionamento genealógico indisponível. Faça uma nova consulta ABCZ para visualizar a árvore.
      </p>
    );
  }

  const { grid } = pedigree;

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-xs text-muted-foreground">
        Árvore genealógica — da esquerda (animal) para a direita (bisavós)
      </p>
      <div className="overflow-x-auto rounded-lg border bg-gradient-to-br from-muted/30 to-muted/10 p-4">
        <div className="flex min-h-[360px] min-w-max items-stretch gap-1">
          {grid.map((nodes, generation) => (
            <Fragment key={generation}>
              {generation > 0 && <PedigreeConnector generation={generation} />}
              <PedigreeGenerationColumn generation={generation} nodes={nodes} />
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

export function hasPedigreeTree(entries: GenealogyPedigreeEntry[]): boolean {
  return canRenderPedigreeTree(entries);
}
