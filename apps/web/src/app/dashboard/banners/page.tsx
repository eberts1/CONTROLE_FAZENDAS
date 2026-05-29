'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AdBannerContentType,
  AdBannerGenerateResultDto,
  AnimalDto,
  generateAdBannerSchema,
} from '@controle-fazendas/shared';
import { PageHeader } from '@/components/layout/page-header';
import {
  AdBannerForm,
  AdBannerFormValues,
  createInitialAdBannerFormValues,
} from '@/components/ad-banner/ad-banner-form';
import { AdBannerPreview } from '@/components/ad-banner/ad-banner-preview';
import { api, getAccessToken, getApiUrl } from '@/lib/api-client';
import { useFarmContext } from '@/hooks/use-farm-context';
import { useToast } from '@/components/ui/use-toast';

function buildFormData(values: AdBannerFormValues): FormData {
  const formData = new FormData();
  formData.append('contentType', values.contentType);
  if (values.damAnimalId) formData.append('damAnimalId', values.damAnimalId);
  if (values.sireAnimalId) formData.append('sireAnimalId', values.sireAnimalId);
  if (values.subtitle) formData.append('subtitle', values.subtitle);
  if (values.aspectRatio) formData.append('aspectRatio', values.aspectRatio);

  if (values.contentType === AdBannerContentType.EMBRIAO) {
    if (values.matrizPhoto) formData.append('photos', values.matrizPhoto);
    if (values.reprodutorPhoto) formData.append('photos', values.reprodutorPhoto);
  } else if (values.singlePhoto) {
    formData.append('photos', values.singlePhoto);
  }

  return formData;
}

function validateForm(values: AdBannerFormValues): string | null {
  const parsed = generateAdBannerSchema.safeParse({
    contentType: values.contentType,
    damAnimalId: values.damAnimalId,
    sireAnimalId: values.sireAnimalId,
    subtitle: values.subtitle,
    aspectRatio: values.aspectRatio,
  });

  if (!parsed.success) {
    return parsed.error.errors[0]?.message ?? 'Preencha os campos obrigatórios';
  }

  if (values.contentType === AdBannerContentType.EMBRIAO) {
    if (!values.matrizPhoto || !values.reprodutorPhoto) {
      return 'Envie as fotos da matriz e do reprodutor';
    }
  } else if (!values.singlePhoto) {
    return 'Envie a foto do animal';
  }

  return null;
}

export default function BannersPage() {
  const { activeFarmId } = useFarmContext();
  const { toast } = useToast();
  const [formValues, setFormValues] = useState<AdBannerFormValues>(createInitialAdBannerFormValues);
  const [result, setResult] = useState<AdBannerGenerateResultDto | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: animals = [] } = useQuery({
    queryKey: ['animals', activeFarmId],
    queryFn: async () => {
      const { data } = await api.get<AnimalDto[]>(`/farms/${activeFarmId}/animals`);
      return data;
    },
    enabled: !!activeFarmId,
  });

  async function handleGenerate() {
    if (!activeFarmId) return;

    const error = validateForm(formValues);
    if (error) {
      toast({ title: error, variant: 'destructive' });
      return;
    }

    setIsGenerating(true);
    setResult(null);

    try {
      const formData = buildFormData(formValues);
      const token = getAccessToken();
      const response = await fetch(`${getApiUrl()}/farms/${activeFarmId}/ad-banners/generate`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          typeof payload?.message === 'string'
            ? payload.message
            : Array.isArray(payload?.message)
              ? payload.message[0]
              : 'Falha ao gerar banner';
        throw new Error(message);
      }

      setResult(payload as AdBannerGenerateResultDto);
      toast({ title: 'Banner gerado com sucesso' });
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Falha ao gerar banner',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  }

  if (!activeFarmId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center rounded-lg border border-dashed p-8 text-muted-foreground">
        Selecione uma fazenda para gerar banners.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Banners Hub Fazendas"
        description="Gere artes publicitárias premium para anunciar embriões, sêmen e aspirações no marketplace."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <AdBannerForm
          animals={animals}
          values={formValues}
          onChange={setFormValues}
          onSubmit={handleGenerate}
          isGenerating={isGenerating}
        />

        {result ? (
          <AdBannerPreview
            imageBase64={result.imageBase64}
            mimeType={result.mimeType}
            contentType={result.contentType}
          />
        ) : (
          <div className="flex min-h-[320px] items-center justify-center rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            O preview do banner aparecerá aqui após a geração.
          </div>
        )}
      </div>
    </div>
  );
}
