/** Remove pontuação de CPF/CNPJ para comparação e persistência. */
export function normalizeDocument(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 11 ? digits : null;
}

/** Formata CPF (11) ou CNPJ (14) para exibição. */
export function formatDocument(value: string | null | undefined): string | null {
  const digits = normalizeDocument(value);
  if (!digits) return value?.trim() || null;
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  }
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value?.trim() || null;
}
