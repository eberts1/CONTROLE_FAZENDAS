'use client';

import type { AnimalDto } from '@controle-fazendas/shared';
import { AnimalSex } from '@controle-fazendas/shared/enums';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const NONE = '__none__';

interface AnimalParentSelectsProps {
  animals: AnimalDto[];
  excludeAnimalId?: string;
  sireId: string | null | undefined;
  damId: string | null | undefined;
  onSireChange: (value: string | null) => void;
  onDamChange: (value: string | null) => void;
}

export function AnimalParentSelects({
  animals,
  excludeAnimalId,
  sireId,
  damId,
  onSireChange,
  onDamChange,
}: AnimalParentSelectsProps) {
  const sires = animals.filter(
    (a) => a.id !== excludeAnimalId && a.sex === AnimalSex.MACHO,
  );
  const dams = animals.filter(
    (a) => a.id !== excludeAnimalId && a.sex === AnimalSex.FEMEA,
  );

  return (
    <>
      <div className="space-y-2">
        <Label>Pai (cadastro manual)</Label>
        <Select
          value={sireId ?? NONE}
          onValueChange={(v) => onSireChange(v === NONE ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Nenhum</SelectItem>
            {sires.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tag}
                {a.name ? ` — ${a.name}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Mãe (cadastro manual)</Label>
        <Select
          value={damId ?? NONE}
          onValueChange={(v) => onDamChange(v === NONE ? null : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Nenhum" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>Nenhum</SelectItem>
            {dams.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.tag}
                {a.name ? ` — ${a.name}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </>
  );
}
