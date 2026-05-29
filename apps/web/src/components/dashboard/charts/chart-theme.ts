export const CHART_COLORS = {
  revenue: 'hsl(142, 76%, 36%)',
  expense: 'hsl(0, 72%, 51%)',
  balance: 'hsl(221, 83%, 53%)',
  primary: 'hsl(var(--primary))',
  muted: 'hsl(var(--muted-foreground))',
  pie: [
    'hsl(221, 83%, 53%)',
    'hsl(142, 76%, 36%)',
    'hsl(262, 83%, 58%)',
    'hsl(32, 95%, 44%)',
    'hsl(0, 72%, 51%)',
    'hsl(189, 94%, 43%)',
    'hsl(280, 65%, 60%)',
  ],
};

export function formatMonthLabel(month: string) {
  const [y, m] = month.split('-');
  const names = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${names[Number(m) - 1]}/${y.slice(2)}`;
}
