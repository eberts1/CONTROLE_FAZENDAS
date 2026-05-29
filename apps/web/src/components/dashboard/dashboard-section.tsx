'use client';

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface DashboardSectionProps {
  id: string;
  title: string;
  description?: string;
  detailHref: string;
  detailLabel?: string;
  children: ReactNode;
}

export function DashboardSection({
  id,
  title,
  description,
  detailHref,
  detailLabel = 'Ver detalhes',
  children,
}: DashboardSectionProps) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <Link
          href={detailHref}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {detailLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      {children}
    </section>
  );
}
