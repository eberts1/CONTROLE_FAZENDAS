'use client';

import {
  AbczProfilePreviewDto,
  AnimalAbczProfileDto,
  AnimalDto,
  AnimalSex,
  AnimalStatus,
  CreateAnimalInput,
  GenealogyPedigreeEntry,
  UpdateAnimalInput,
  parseAbczRegistration,
} from '@controle-fazendas/shared';
import { AbczLookupPanel } from '@/components/abcz-lookup-panel';
import { AbczGenealogyTree, hasPedigreeTree } from '@/components/abcz-genealogy-tree';
import { AnimalFinanceSection } from '@/components/animal-finance-section';
import { AnimalOwnershipSection } from '@/components/animal-ownership-section';
import { UseFormReturn, UseFormSetValue } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { animalSexLabels, animalStatusLabels, formatDateOnly } from '@/lib/utils';
import Link from 'next/link';
import { ExternalLink, GitBranch } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AnimalParentSelects } from '@/components/animal-parent-selects';

interface AnimalDetailSectionsProps {
  animal: AnimalDto;
  animals: AnimalDto[];
  profile: AnimalAbczProfileDto | null | undefined;
  profileLoading?: boolean;
  missingProfileSnapshot?: boolean;
  editing: boolean;
  form: UseFormReturn<UpdateAnimalInput>;
  farmId: string;
  onAbczProfileChange?: (profile: AbczProfilePreviewDto | null) => void;
}

function birthDateToInput(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value ?? '—'}</dd>
    </div>
  );
}

function GenealogyList({ entries }: { entries: GenealogyPedigreeEntry[] }) {
  return (
    <ul className="divide-y rounded-md border text-sm">
      {entries.map((entry, index) => (
        <li key={index} className="grid gap-1 px-3 py-2 sm:grid-cols-3">
          <span className="font-medium text-muted-foreground">{entry.relationship}</span>
          <span>{entry.registration || '—'}</span>
          <span>{entry.name || '—'}</span>
        </li>
      ))}
    </ul>
  );
}

function EvaluationSection({ profile }: { profile: AnimalAbczProfileDto }) {
  const evaluations = profile.geneticEvaluations;

  if (evaluations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Sem avaliação genética disponível na ABCZ para este animal.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {evaluations.map((evaluation) => (
        <div key={evaluation.id} className="space-y-2 rounded-md border p-4">
          <p className="text-xs text-muted-foreground">
            {[evaluation.period, evaluation.evaluationKind].filter(Boolean).join(' · ') ||
              'Avaliação genética'}
          </p>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
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
            <div className="max-h-64 overflow-x-auto overflow-y-auto rounded border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-2 py-1.5 text-left">DEP</th>
                    <th className="px-2 py-1.5 text-right">Valor</th>
                    <th className="px-2 py-1.5 text-right">AC%</th>
                    <th className="px-2 py-1.5 text-right">DECA</th>
                  </tr>
                </thead>
                <tbody>
                  {evaluation.deps.map((dep, depIndex) => (
                    <tr key={depIndex} className="border-t">
                      <td className="max-w-[200px] break-words px-2 py-1 sm:max-w-none">
                        {dep.description}
                      </td>
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
  );
}

export function AnimalDetailSections({
  animal,
  animals,
  profile,
  profileLoading,
  missingProfileSnapshot,
  editing,
  form,
  farmId,
  onAbczProfileChange,
}: AnimalDetailSectionsProps) {
  const { register, watch, setValue, getValues, formState: { errors } } = form;

  const parsedTag = parseAbczRegistration(animal.tag);
  const abczInitialSerie = animal.abczSerie ?? parsedTag?.serie ?? '';
  const abczInitialRgn = animal.abczRgn ?? parsedTag?.rgn ?? '';

  const genealogyEntries = profile?.genealogy ?? [];
  const showPedigree = genealogyEntries.length > 0 && hasPedigreeTree(genealogyEntries);
  const ownership = animal.ownership ?? [];

  return (
    <Tabs defaultValue="cadastro" className="space-y-6">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
        <TabsTrigger value="cadastro">Cadastro</TabsTrigger>
        <TabsTrigger value="socios">Sócios</TabsTrigger>
        <TabsTrigger value="financeiro">Financeiro</TabsTrigger>
        <TabsTrigger value="genetica">Genética</TabsTrigger>
      </TabsList>

      <TabsContent value="cadastro" className="space-y-6">
      <Card>
        <CardHeader className="py-4 md:py-6">
          <CardTitle className="text-lg">Dados do animal</CardTitle>
        </CardHeader>
        <CardContent>
          {editing ? (
            <form className="grid gap-4 md:grid-cols-2" id="animal-edit-form">
              <AbczLookupPanel
                setValue={setValue as UseFormSetValue<CreateAnimalInput>}
                fillEmptyOnly
                initialSerie={abczInitialSerie}
                initialRgn={abczInitialRgn}
                getValues={() => {
                  const v = getValues();
                  return {
                    tag: v.tag ?? animal.tag,
                    name: v.name ?? animal.name ?? undefined,
                    breed: v.breed ?? animal.breed ?? undefined,
                    pelagem: v.pelagem ?? animal.pelagem ?? undefined,
                    birthDate: v.birthDate ?? birthDateToInput(animal.birthDate),
                    notes: v.notes ?? animal.notes ?? undefined,
                    sex: v.sex ?? animal.sex,
                    abczAnimalId: v.abczAnimalId ?? animal.abczAnimalId ?? undefined,
                    abczSerie: v.abczSerie ?? animal.abczSerie ?? undefined,
                    abczRgn: v.abczRgn ?? animal.abczRgn ?? undefined,
                    abczRgd: v.abczRgd ?? animal.abczRgd ?? undefined,
                    abczBreedCode: v.abczBreedCode ?? animal.abczBreedCode ?? undefined,
                    abczCategoryCode:
                      v.abczCategoryCode ?? animal.abczCategoryCode ?? undefined,
                    abczOwnerId: v.abczOwnerId ?? animal.abczOwnerId ?? undefined,
                    abczSourceUrl: v.abczSourceUrl ?? animal.abczSourceUrl ?? undefined,
                  };
                }}
                onProfileChange={onAbczProfileChange}
              />
              <div className="space-y-2">
                <Label htmlFor="tag">Identificação (brinco)</Label>
                <Input id="tag" {...register('tag')} />
                {errors.tag && <p className="text-sm text-destructive">{errors.tag.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nome / apelido</Label>
                <Input id="name" {...register('name')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="breed">Raça</Label>
                <Input id="breed" {...register('breed')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pelagem">Pelagem</Label>
                <Input id="pelagem" {...register('pelagem')} />
              </div>
              <div className="space-y-2">
                <Label>Sexo</Label>
                <Select
                  value={watch('sex') ?? animal.sex}
                  onValueChange={(v) => setValue('sex', v as AnimalSex)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(animalSexLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de nascimento</Label>
                <Input id="birthDate" type="date" {...register('birthDate')} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={watch('status') ?? animal.status}
                  onValueChange={(v) => setValue('status', v as AnimalStatus)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(animalStatusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea id="notes" {...register('notes')} />
              </div>
            </form>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <DetailField label="Identificação (brinco)" value={animal.tag} />
              <DetailField label="Nome / apelido" value={animal.name} />
              <DetailField label="Raça" value={animal.breed} />
              <DetailField
                label="Pelagem"
                value={animal.pelagem ?? profile?.header.coat ?? null}
              />
              <DetailField label="Sexo" value={animalSexLabels[animal.sex]} />
              <DetailField label="Status" value={animalStatusLabels[animal.status]} />
              <DetailField
                label="Data de nascimento"
                value={animal.birthDate ? formatDateOnly(animal.birthDate) : null}
              />
              <DetailField
                label="Registro ABCZ"
                value={
                  animal.abczSerie && animal.abczRgn
                    ? `${animal.abczSerie} ${animal.abczRgn}`
                    : null
                }
              />
              {animal.abczRgd && <DetailField label="RGD" value={animal.abczRgd} />}
              {animal.abczSyncedAt && (
                <DetailField
                  label="Sincronizado ABCZ em"
                  value={formatDateOnly(animal.abczSyncedAt)}
                />
              )}
              <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                <dt className="text-xs font-medium text-muted-foreground">Observações</dt>
                <dd className="text-sm whitespace-pre-wrap">{animal.notes || '—'}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between md:py-6">
          <CardTitle className="text-lg">Parentesco na fazenda</CardTitle>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link href={`/dashboard/parentesco?animalId=${animal.id}`}>
              <GitBranch className="mr-2 h-4 w-4" />
              Ver filhos e netos
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {editing ? (
            <AnimalParentSelects
              animals={animals}
              excludeAnimalId={animal.id}
              sireId={watch('sireId')}
              damId={watch('damId')}
              onSireChange={(v) => setValue('sireId', v)}
              onDamChange={(v) => setValue('damId', v)}
            />
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <DetailField
                label="Pai"
                value={
                  animal.sire ? (
                    <Link href={`/dashboard/animais/${animal.sire.id}`} className="text-primary hover:underline">
                      {animal.sire.tag}
                      {animal.sire.name ? ` — ${animal.sire.name}` : ''}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
              <DetailField
                label="Mãe"
                value={
                  animal.dam ? (
                    <Link href={`/dashboard/animais/${animal.dam.id}`} className="text-primary hover:underline">
                      {animal.dam.tag}
                      {animal.dam.name ? ` — ${animal.dam.name}` : ''}
                    </Link>
                  ) : (
                    '—'
                  )
                }
              />
            </dl>
          )}
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="socios">
        <AnimalOwnershipSection
          farmId={farmId}
          animalId={animal.id}
          initialOwnership={ownership}
        />
      </TabsContent>

      <TabsContent value="financeiro">
        <AnimalFinanceSection
          farmId={farmId}
          animalId={animal.id}
          ownership={ownership}
        />
      </TabsContent>

      <TabsContent value="genetica" className="space-y-6">
      <Card>
        <CardHeader className="py-4 md:py-6">
          <CardTitle className="text-lg">Genealogia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading && (
            <p className="text-sm text-muted-foreground">Carregando genealogia...</p>
          )}
          {!profileLoading && !animal.hasAbczProfile && (
            <p className="text-sm text-muted-foreground">
              {missingProfileSnapshot
                ? 'A genealogia exibida na consulta ABCZ não foi gravada no banco desta aplicação. Use o botão acima para buscar na ABCZ e salvar localmente — os detalhes passam a ler só do banco, sem nova consulta.'
                : 'Nenhuma genealogia salva no banco. Vincule um registro ABCZ no cadastro do animal.'}
            </p>
          )}
          {!profileLoading && animal.hasAbczProfile && !profile && (
            <p className="text-sm text-destructive">
              Não foi possível carregar a genealogia. Tente sincronizar novamente pela ABCZ.
            </p>
          )}
          {profile && genealogyEntries.length === 0 && (
            <p className="text-sm text-muted-foreground">Genealogia não disponível na ABCZ.</p>
          )}
          {profile && (
            <p className="text-xs text-muted-foreground">
              Dados do banco local
              {profile.fetchedAt ? ` · consulta gravada em ${formatDateOnly(profile.fetchedAt)}` : ''}
            </p>
          )}
          {profile && genealogyEntries.length > 0 && (
            <>
              {(animal.pelagem || profile.header.coat) && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Pelagem: </span>
                  {animal.pelagem ?? profile.header.coat}
                </p>
              )}
              {profile.header.breeder && (
                <p className="text-sm">
                  <span className="text-muted-foreground">Criador: </span>
                  {profile.header.breeder}
                </p>
              )}
              {showPedigree ? (
                <AbczGenealogyTree entries={genealogyEntries} />
              ) : (
                <GenealogyList entries={genealogyEntries} />
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="py-4 md:py-6">
          <CardTitle className="text-lg">Avaliação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {profileLoading && (
            <p className="text-sm text-muted-foreground">Carregando avaliação genética...</p>
          )}
          {!profileLoading && !animal.hasAbczProfile && (
            <p className="text-sm text-muted-foreground">
              {missingProfileSnapshot
                ? 'A avaliação genética da consulta ainda não está no banco local. Salve o perfil ABCZ com o botão acima.'
                : 'Nenhuma avaliação genética salva no banco para este animal.'}
            </p>
          )}
          {!profileLoading && animal.hasAbczProfile && !profile && (
            <p className="text-sm text-destructive">Não foi possível carregar a avaliação.</p>
          )}
          {profile && <EvaluationSection profile={profile} />}
          {profile?.sourceUrl && (
            <Button variant="outline" size="sm" asChild>
              <a href={profile.sourceUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir consulta na ABCZ
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
      </TabsContent>
    </Tabs>
  );
}
