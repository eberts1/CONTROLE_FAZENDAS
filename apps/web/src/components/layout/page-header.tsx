import { ReactNode } from 'react';

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  backLink?: ReactNode;
};

export function PageHeader({ title, description, actions, backLink }: PageHeaderProps) {
  return (
    <div className="space-y-4">
      {backLink}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
          {description && (
            <p className="text-sm text-muted-foreground sm:text-base">{description}</p>
          )}
        </div>
        {actions && <div className="flex w-full shrink-0 flex-wrap gap-2 sm:w-auto">{actions}</div>}
      </div>
    </div>
  );
}
