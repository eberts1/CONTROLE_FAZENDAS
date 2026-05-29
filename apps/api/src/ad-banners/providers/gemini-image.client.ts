import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ImageReference {
  mimeType: string;
  data: Buffer;
}

export interface GenerateImageParams {
  prompt: string;
  referenceImages: ImageReference[];
  aspectRatio?: string;
}

export interface GeneratedImage {
  mimeType: string;
  data: Buffer;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiPart[];
    };
  }>;
  error?: { message?: string; code?: number; status?: string };
}

export class GeminiImageError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
    readonly kind: 'quota' | 'auth' | 'model' | 'timeout' | 'unknown' = 'unknown',
  ) {
    super(message);
    this.name = 'GeminiImageError';
  }
}

@Injectable()
export class GeminiImageClient {
  private readonly logger = new Logger(GeminiImageClient.name);
  private readonly timeoutMs: number;

  constructor(private config: ConfigService) {
    this.timeoutMs = Number(config.get<string>('IMAGE_GEN_TIMEOUT_MS') ?? 120_000);
  }

  async generateImage(params: GenerateImageParams): Promise<GeneratedImage> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      throw new GeminiImageError(
        'GEMINI_API_KEY não configurada. Adicione a chave em apps/api/.env',
        503,
        'auth',
      );
    }

    const model =
      this.config.get<string>('IMAGE_GEN_MODEL') ?? 'gemini-2.5-flash-image';

    const parts: GeminiPart[] = [
      { text: params.prompt },
      ...params.referenceImages.map((image) => ({
        inlineData: {
          mimeType: image.mimeType,
          data: image.data.toString('base64'),
        },
      })),
    ];

    const body: Record<string, unknown> = {
      contents: [{ parts }],
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE'],
      },
    };

    if (params.aspectRatio) {
      (body.generationConfig as Record<string, unknown>).imageConfig = {
        aspectRatio: params.aspectRatio,
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    this.logger.log(`Gerando imagem com modelo ${model}`);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      const payload = (await response.json()) as GeminiResponse;

      if (!response.ok) {
        const message = payload.error?.message ?? `Gemini API retornou ${response.status}`;
        throw this.toClientError(message, response.status, payload.error?.status);
      }

      const imagePart = payload.candidates
        ?.flatMap((candidate) => candidate.content?.parts ?? [])
        .find((part) => part.inlineData?.data);

      if (!imagePart?.inlineData?.data) {
        throw new GeminiImageError('Gemini não retornou imagem na resposta', 502, 'unknown');
      }

      return {
        mimeType: imagePart.inlineData.mimeType ?? 'image/png',
        data: Buffer.from(imagePart.inlineData.data, 'base64'),
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new GeminiImageError('Tempo limite excedido ao gerar banner', 504, 'timeout');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  private toClientError(message: string, httpStatus: number, apiStatus?: string): GeminiImageError {
    const normalized = message.toLowerCase();

    if (
      httpStatus === 429 ||
      normalized.includes('quota') ||
      normalized.includes('rate limit') ||
      normalized.includes('free_tier')
    ) {
      return new GeminiImageError(
        'Cota da API Gemini esgotada. Geração de imagens exige billing ativo no Google AI Studio (plano gratuito não inclui este recurso). Ative em aistudio.google.com → Configurações → Billing.',
        429,
        'quota',
      );
    }

    if (httpStatus === 401 || httpStatus === 403 || normalized.includes('api key')) {
      return new GeminiImageError(
        'Chave GEMINI_API_KEY inválida ou sem permissão. Verifique apps/api/.env',
        401,
        'auth',
      );
    }

    if (httpStatus === 404 || normalized.includes('not found') || normalized.includes('not supported')) {
      return new GeminiImageError(
        `Modelo Gemini indisponível (${this.config.get<string>('IMAGE_GEN_MODEL') ?? 'gemini-2.5-flash-image'}). Verifique IMAGE_GEN_MODEL no .env`,
        400,
        'model',
      );
    }

    return new GeminiImageError(message, httpStatus, 'unknown');
  }
}
