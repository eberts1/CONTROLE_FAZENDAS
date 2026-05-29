'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface CurrencyInputProps {
  id?: string;
  value: number | '';
  onChange: (value: number | '') => void;
  className?: string;
  placeholder?: string;
}

export function CurrencyInput({ id, value, onChange, className, placeholder }: CurrencyInputProps) {
  const displayValue =
    value === '' ? '' : new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2 }).format(value);

  return (
    <Input
      id={id}
      inputMode="decimal"
      className={cn(className)}
      placeholder={placeholder ?? '0,00'}
      value={displayValue}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d,]/g, '').replace(',', '.');
        if (!raw) {
          onChange('');
          return;
        }
        const parsed = Number.parseFloat(raw);
        onChange(Number.isNaN(parsed) ? '' : parsed);
      }}
    />
  );
}
