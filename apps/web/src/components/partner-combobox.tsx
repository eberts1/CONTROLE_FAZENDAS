'use client';

import { PartnerDto } from '@controle-fazendas/shared';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';

interface PartnerComboboxProps {
  partners: PartnerDto[];
  value: string;
  onChange: (partnerId: string) => void;
  excludeIds?: string[];
  disabled?: boolean;
}

export function PartnerCombobox({
  partners,
  value,
  onChange,
  excludeIds = [],
  disabled,
}: PartnerComboboxProps) {
  const available = partners.filter((p) => !excludeIds.includes(p.id));

  return (
    <div className="space-y-2">
      <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione um parceiro" />
        </SelectTrigger>
        <SelectContent>
          {available.map((partner) => (
            <SelectItem key={partner.id} value={partner.id}>
              {partner.name}
              {partner.document ? ` (${partner.document})` : ''}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button variant="link" className="h-auto p-0 text-xs" asChild>
        <Link href="/dashboard/parceiros">Gerenciar parceiros da fazenda</Link>
      </Button>
    </div>
  );
}
