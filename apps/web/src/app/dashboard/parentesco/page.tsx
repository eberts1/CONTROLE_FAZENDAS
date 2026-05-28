import { Suspense } from 'react';
import { ParentescoClient } from './parentesco-client';

function ParentescoFallback() {
  return <p className="text-muted-foreground">Carregando parentesco...</p>;
}

export default function ParentescoPage() {
  return (
    <Suspense fallback={<ParentescoFallback />}>
      <ParentescoClient />
    </Suspense>
  );
}
