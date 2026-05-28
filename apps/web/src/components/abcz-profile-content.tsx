'use client';

import { AbczProfilePreviewDto } from '@controle-fazendas/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AbczGenealogyTree, hasPedigreeTree } from '@/components/abcz-genealogy-tree';

interface AbczProfileContentProps {
  profile: AbczProfilePreviewDto;
}

export function AbczProfileContent({ profile }: AbczProfileContentProps) {
  const hasGenealogy = profile.genealogy.length > 0;
  const showPedigree = hasPedigreeTree(profile.genealogy);
  const hasGenetic = profile.geneticEvaluations.length > 0;
  const hasReproductive =
    Boolean(profile.reproductiveMessage) ||
    Boolean(profile.reproductiveData?.length) ||
    Boolean(profile.efficiencyMessage);

  return (
    <Tabs defaultValue="geral">
      <TabsList>
        <TabsTrigger value="geral">Geral</TabsTrigger>
        <TabsTrigger value="genealogia" disabled={!hasGenealogy}>
          Genealogia{hasGenealogy ? ` (${profile.genealogy.length})` : ''}
        </TabsTrigger>
        <TabsTrigger value="genetica" disabled={!hasGenetic}>
          Avaliação genética
        </TabsTrigger>
        <TabsTrigger value="reprodutivo" disabled={!hasReproductive}>
          Reprodutivo
        </TabsTrigger>
      </TabsList>

      <TabsContent value="geral">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          {profile.header.situation && (
            <>
              <dt className="text-muted-foreground">Situação</dt>
              <dd>{profile.header.situation}</dd>
            </>
          )}
          {profile.header.coat && (
            <>
              <dt className="text-muted-foreground">Pelagem</dt>
              <dd>{profile.header.coat}</dd>
            </>
          )}
          {profile.header.owner && (
            <>
              <dt className="text-muted-foreground">Proprietário</dt>
              <dd>{profile.header.owner}</dd>
            </>
          )}
          {profile.header.farm && (
            <>
              <dt className="text-muted-foreground">Fazenda</dt>
              <dd>{profile.header.farm}</dd>
            </>
          )}
          {profile.header.breeder && (
            <>
              <dt className="text-muted-foreground">Criador</dt>
              <dd>{profile.header.breeder}</dd>
            </>
          )}
          {(profile.header.city || profile.header.state) && (
            <>
              <dt className="text-muted-foreground">Local</dt>
              <dd>
                {[profile.header.city, profile.header.state].filter(Boolean).join(' / ')}
              </dd>
            </>
          )}
        </dl>
      </TabsContent>

      <TabsContent value="genealogia">
        {hasGenealogy ? (
          <div className="space-y-4">
            {showPedigree && <AbczGenealogyTree entries={profile.genealogy} />}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Genealogia não disponível na ABCZ.</p>
        )}
      </TabsContent>

      <TabsContent value="genetica">
        {hasGenetic ? (
          <div className="space-y-3">
            {profile.geneticEvaluations.map((evaluation, index) => (
              <div key={index} className="space-y-2 rounded-md border p-3">
                <p className="text-xs text-muted-foreground">
                  {[evaluation.period, evaluation.evaluationKind].filter(Boolean).join(' · ')}
                </p>
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  {evaluation.iabcz && (
                    <div>
                      <dt className="text-xs text-muted-foreground">iABCZ</dt>
                      <dd className="font-medium">{evaluation.iabcz}</dd>
                    </div>
                  )}
                  {evaluation.deca && (
                    <div>
                      <dt className="text-xs text-muted-foreground">DECA</dt>
                      <dd className="font-medium">{evaluation.deca}</dd>
                    </div>
                  )}
                  {evaluation.inbreedingF && (
                    <div>
                      <dt className="text-xs text-muted-foreground">Endogamia (F)</dt>
                      <dd className="font-medium">{evaluation.inbreedingF}</dd>
                    </div>
                  )}
                </dl>
                {evaluation.deps.length > 0 && (
                  <div className="max-h-48 overflow-y-auto rounded border">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 py-1 text-left">DEP</th>
                          <th className="px-2 py-1 text-right">Valor</th>
                          <th className="px-2 py-1 text-right">AC%</th>
                          <th className="px-2 py-1 text-right">DECA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluation.deps.map((dep, depIndex) => (
                          <tr key={depIndex} className="border-t">
                            <td className="px-2 py-1">{dep.description}</td>
                            <td className="px-2 py-1 text-right font-mono">{dep.dep}</td>
                            <td className="px-2 py-1 text-right">{dep.accuracy ?? '—'}</td>
                            <td className="px-2 py-1 text-right">{dep.deca ?? '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sem avaliação genética disponível.</p>
        )}
      </TabsContent>

      <TabsContent value="reprodutivo">
        {profile.reproductiveMessage && (
          <p className="text-sm text-muted-foreground">{profile.reproductiveMessage}</p>
        )}
        {profile.reproductiveData && profile.reproductiveData.length > 0 ? (
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            {profile.reproductiveData.map((row, index) => (
              <div key={index} className="contents">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd>{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : (
          !profile.reproductiveMessage &&
          !profile.efficiencyMessage && (
            <p className="text-sm text-muted-foreground">Sem registros reprodutivos.</p>
          )
        )}
        {profile.efficiencyMessage && (
          <p className="rounded-md bg-muted/50 p-2 text-sm">{profile.efficiencyMessage}</p>
        )}
      </TabsContent>
    </Tabs>
  );
}
