'use client';

import { useMemo } from 'react';
import {
  AdBannerAspectRatio,
  AdBannerContentType,
  AnimalDto,
  AnimalSex,
  GenerateAdBannerInput,
} from '@controle-fazendas/shared';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  AD_BANNER_COMMERCIAL_CUSTOM,
  adBannerAspectRatioLabels,
  adBannerCommercialMessages,
  adBannerContentTypeLabels,
  adBannerDefaultCommercialMessage,
  resolveAdBannerCommercialSelection,
} from '@/lib/utils';

const NONE = '__none__';
const MAX_SUBTITLE_LENGTH = 1000;

export interface AdBannerFormValues extends GenerateAdBannerInput {
  matrizPhoto: File | null;
  reprodutorPhoto: File | null;
  singlePhoto: File | null;
}

interface AdBannerFormProps {
  animals: AnimalDto[];
  values: AdBannerFormValues;
  onChange: (values: AdBannerFormValues) => void;
  onSubmit: () => void;
  isGenerating: boolean;
}

function animalLabel(animal: AnimalDto) {
  return animal.name ? `${animal.tag} — ${animal.name}` : animal.tag;
}

export function AdBannerForm({
  animals,
  values,
  onChange,
  onSubmit,
  isGenerating,
}: AdBannerFormProps) {
  const matrizes = useMemo(
    () => animals.filter((a) => a.sex === AnimalSex.FEMEA),
    [animals],
  );
  const reprodutores = useMemo(
    () => animals.filter((a) => a.sex === AnimalSex.MACHO),
    [animals],
  );

  const needsMatriz =
    values.contentType === AdBannerContentType.EMBRIAO ||
    values.contentType === AdBannerContentType.ASPIRACAO;
  const needsReprodutor =
    values.contentType === AdBannerContentType.EMBRIAO ||
    values.contentType === AdBannerContentType.SEMEN;
  const isEmbriao = values.contentType === AdBannerContentType.EMBRIAO;
  const commercialSelection = resolveAdBannerCommercialSelection(values.subtitle);
  const isCustomCommercialMessage = commercialSelection === AD_BANNER_COMMERCIAL_CUSTOM;

  function update<K extends keyof AdBannerFormValues>(key: K, value: AdBannerFormValues[K]) {
    onChange({ ...values, [key]: value });
  }

  function handleContentTypeChange(contentType: AdBannerContentType) {
    onChange({
      ...values,
      contentType,
      damAnimalId: undefined,
      sireAnimalId: undefined,
      matrizPhoto: null,
      reprodutorPhoto: null,
      singlePhoto: null,
      subtitle: values.subtitle || adBannerDefaultCommercialMessage,
    });
  }

  function handleCommercialMessageChange(selection: string) {
    if (selection === AD_BANNER_COMMERCIAL_CUSTOM) {
      update('subtitle', values.subtitle?.trim() || '');
      return;
    }

    const preset = adBannerCommercialMessages.find((item) => item.value === selection);
    update('subtitle', preset?.text ?? adBannerDefaultCommercialMessage);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configurar banner</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Tipo de conteúdo</Label>
          <Select
            value={values.contentType}
            onValueChange={(v) => handleContentTypeChange(v as AdBannerContentType)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(AdBannerContentType).map((type) => (
                <SelectItem key={type} value={type}>
                  {adBannerContentTypeLabels[type]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {needsMatriz && (
            <div className="space-y-2">
              <Label>Matriz</Label>
              <Select
                value={values.damAnimalId ?? NONE}
                onValueChange={(v) =>
                  update('damAnimalId', v === NONE ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a matriz" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Selecione...</SelectItem>
                  {matrizes.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animalLabel(animal)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsReprodutor && (
            <div className="space-y-2">
              <Label>Reprodutor</Label>
              <Select
                value={values.sireAnimalId ?? NONE}
                onValueChange={(v) =>
                  update('sireAnimalId', v === NONE ? undefined : v)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o reprodutor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Selecione...</SelectItem>
                  {reprodutores.map((animal) => (
                    <SelectItem key={animal.id} value={animal.id}>
                      {animalLabel(animal)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Formato</Label>
          <Select
            value={values.aspectRatio}
            onValueChange={(v) => update('aspectRatio', v as AdBannerAspectRatio)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(AdBannerAspectRatio).map((ratio) => (
                <SelectItem key={ratio} value={ratio}>
                  {adBannerAspectRatioLabels[ratio]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Mensagem comercial</Label>
          <Select value={commercialSelection} onValueChange={handleCommercialMessageChange}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma frase" />
            </SelectTrigger>
            <SelectContent>
              {adBannerCommercialMessages.map((preset) => (
                <SelectItem key={preset.value} value={preset.value}>
                  {preset.label}
                </SelectItem>
              ))}
              <SelectItem value={AD_BANNER_COMMERCIAL_CUSTOM}>Personalizada</SelectItem>
            </SelectContent>
          </Select>

          {!isCustomCommercialMessage && values.subtitle && (
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {values.subtitle}
            </p>
          )}

          {isCustomCommercialMessage && (
            <>
              <Textarea
                value={values.subtitle ?? ''}
                onChange={(e) => update('subtitle', e.target.value)}
                placeholder="Digite sua frase comercial"
                maxLength={MAX_SUBTITLE_LENGTH}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">
                Frase curta exibida no banner. O estilo visual é aplicado automaticamente.{' '}
                {(values.subtitle ?? '').length}/{MAX_SUBTITLE_LENGTH}
              </p>
            </>
          )}
        </div>

        {isEmbriao ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Foto da matriz</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => update('matrizPhoto', e.target.files?.[0] ?? null)}
              />
              {values.matrizPhoto && (
                <p className="text-xs text-muted-foreground">{values.matrizPhoto.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Foto do reprodutor</Label>
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => update('reprodutorPhoto', e.target.files?.[0] ?? null)}
              />
              {values.reprodutorPhoto && (
                <p className="text-xs text-muted-foreground">{values.reprodutorPhoto.name}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>
              Foto do {values.contentType === AdBannerContentType.SEMEN ? 'reprodutor' : 'matriz'}
            </Label>
            <Input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => update('singlePhoto', e.target.files?.[0] ?? null)}
            />
            {values.singlePhoto && (
              <p className="text-xs text-muted-foreground">{values.singlePhoto.name}</p>
            )}
          </div>
        )}

        <Button type="button" onClick={onSubmit} disabled={isGenerating} className="w-full sm:w-auto">
          <Upload className="mr-2 h-4 w-4" />
          {isGenerating ? 'Gerando banner...' : 'Gerar banner'}
        </Button>

        {isGenerating && (
          <p className="text-sm text-muted-foreground">
            Gerando banner... pode levar até 60 segundos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function createInitialAdBannerFormValues(): AdBannerFormValues {
  return {
    contentType: AdBannerContentType.EMBRIAO,
    aspectRatio: AdBannerAspectRatio.RATIO_16_9,
    subtitle: adBannerDefaultCommercialMessage,
    matrizPhoto: null,
    reprodutorPhoto: null,
    singlePhoto: null,
  };
}
