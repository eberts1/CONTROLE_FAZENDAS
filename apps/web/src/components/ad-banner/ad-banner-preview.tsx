'use client';

import { AdBannerContentType } from '@controle-fazendas/shared';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { adBannerContentTypeLabels } from '@/lib/utils';

interface AdBannerPreviewProps {
  imageBase64: string;
  mimeType: string;
  contentType: AdBannerContentType;
}

export function AdBannerPreview({ imageBase64, mimeType, contentType }: AdBannerPreviewProps) {
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  function handleDownload() {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `hub-fazendas-${contentType.toLowerCase()}-${Date.now()}.png`;
    link.click();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Preview — {adBannerContentTypeLabels[contentType]}</CardTitle>
        <Button type="button" variant="outline" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          Baixar PNG
        </Button>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border bg-muted/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt={`Banner ${adBannerContentTypeLabels[contentType]}`}
            className="mx-auto max-h-[70vh] w-full object-contain"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Revise textos e identificação dos animais antes de publicar no Hub Fazendas.
        </p>
      </CardContent>
    </Card>
  );
}
