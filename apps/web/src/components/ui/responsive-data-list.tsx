import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  hideOnMobile?: boolean;
  mobileFullWidth?: boolean;
  align?: 'left' | 'right';
};

export type ResponsiveDataListProps<T> = {
  rows: T[];
  columns: Column<T>[];
  keyExtractor: (row: T) => string;
  mobileTitle: (row: T) => ReactNode;
  mobileSubtitle?: (row: T) => ReactNode;
  actions?: (row: T) => ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
  loadingMessage?: string;
  getRowClassName?: (row: T) => string | undefined;
};

function MobileField({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="text-sm break-words">{value}</div>
    </div>
  );
}

export function ResponsiveDataList<T>({
  rows,
  columns,
  keyExtractor,
  mobileTitle,
  mobileSubtitle,
  actions,
  emptyMessage = 'Nenhum registro encontrado.',
  isLoading,
  loadingMessage = 'Carregando...',
  getRowClassName,
}: ResponsiveDataListProps<T>) {
  if (isLoading) {
    return <p className="text-muted-foreground">{loadingMessage}</p>;
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed">
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  const mobileColumns = columns.filter((col) => !col.hideOnMobile);
  const gridColumns = mobileColumns.filter((col) => !col.mobileFullWidth);
  const fullWidthColumns = mobileColumns.filter((col) => col.mobileFullWidth);
  const desktopColumns = actions
    ? [...columns, { key: '__actions', header: 'Ações', cell: () => null, align: 'right' as const }]
    : columns;

  return (
    <>
      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <Card key={keyExtractor(row)} className={cn(getRowClassName?.(row))}>
            <CardContent className="space-y-3 p-4">
              <div className="min-w-0 space-y-1">
                <p className="font-semibold">{mobileTitle(row)}</p>
                {mobileSubtitle && (
                  <p className="text-sm text-muted-foreground break-words">{mobileSubtitle(row)}</p>
                )}
              </div>

              {gridColumns.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  {gridColumns.map((col) => (
                    <MobileField key={col.key} label={col.header} value={col.cell(row)} />
                  ))}
                </div>
              )}

              {fullWidthColumns.map((col) => (
                <MobileField key={col.key} label={col.header} value={col.cell(row)} />
              ))}

              {actions && (
                <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">{actions(row)}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              {desktopColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-4 py-3 font-medium',
                    col.align === 'right' ? 'text-right' : 'text-left',
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={keyExtractor(row)}
                className={cn('border-b last:border-0', getRowClassName?.(row))}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-4 py-3',
                      col.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-1">{actions(row)}</div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
