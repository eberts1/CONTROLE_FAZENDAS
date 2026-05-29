import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AdBannerAspectRatio,
  AdBannerContentType,
  AdBannerGenerateResultDto,
  AnimalSex,
} from '@controle-fazendas/shared';
import { AnimalsService } from '../animals/animals.service';
import { HubLogoLoader } from './hub-logo.loader';
import { buildAdBannerPrompt } from './prompts/prompt-builder';
import { GeminiImageClient, GeminiImageError, ImageReference } from './providers/gemini-image.client';

export interface UploadedBannerPhoto {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export interface GenerateAdBannerParams {
  farmId: string;
  contentType: AdBannerContentType;
  damAnimalId?: string;
  sireAnimalId?: string;
  subtitle?: string;
  aspectRatio?: AdBannerAspectRatio;
  photos: UploadedBannerPhoto[];
}

@Injectable()
export class AdBannersService {
  private readonly logger = new Logger(AdBannersService.name);

  constructor(
    private animalsService: AnimalsService,
    private geminiClient: GeminiImageClient,
    private hubLogoLoader: HubLogoLoader,
    private config: ConfigService,
  ) {}

  async generate(params: GenerateAdBannerParams): Promise<AdBannerGenerateResultDto> {
    const provider = this.config.get<string>('IMAGE_GEN_PROVIDER') ?? 'gemini';
    if (provider !== 'gemini') {
      throw new BadRequestException(`Provedor de imagem não suportado: ${provider}`);
    }

    this.validatePhotoCount(params.contentType, params.photos);
    this.validatePhotos(params.photos);

    const { matrizTag, reprodutorTag } = await this.resolveAnimalTags(params);

    const prompt = buildAdBannerPrompt({
      contentType: params.contentType,
      matrizTag,
      reprodutorTag,
      subtitle: params.subtitle,
    });

    const referenceImages: ImageReference[] = params.photos.map((photo) => ({
      mimeType: photo.mimetype,
      data: photo.buffer,
    }));

    const logo = this.hubLogoLoader.loadLogoReference();
    if (logo) {
      referenceImages.push(logo);
    }

    try {
      const generated = await this.geminiClient.generateImage({
        prompt,
        referenceImages,
        aspectRatio: params.aspectRatio ?? AdBannerAspectRatio.RATIO_16_9,
      });

      return {
        imageBase64: generated.data.toString('base64'),
        mimeType: generated.mimeType,
        contentType: params.contentType,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Falha ao gerar banner', error);

      if (error instanceof GeminiImageError) {
        throw new HttpException(error.message, error.statusCode);
      }

      const message = error instanceof Error ? error.message : 'Erro desconhecido';
      throw new InternalServerErrorException(`Falha ao gerar banner: ${message}`);
    }
  }

  private validatePhotoCount(contentType: AdBannerContentType, photos: UploadedBannerPhoto[]) {
    const expected = contentType === AdBannerContentType.EMBRIAO ? 2 : 1;
    if (photos.length !== expected) {
      throw new BadRequestException(
        contentType === AdBannerContentType.EMBRIAO
          ? 'Envie exatamente 2 fotos: matriz e reprodutor'
          : 'Envie exatamente 1 foto do animal',
      );
    }
  }

  private validatePhotos(photos: UploadedBannerPhoto[]) {
    for (const photo of photos) {
      if (!ALLOWED_MIME_TYPES.has(photo.mimetype)) {
        throw new BadRequestException(
          `Formato não suportado: ${photo.originalname}. Use JPEG, PNG ou WebP.`,
        );
      }
      if (photo.buffer.length > 7 * 1024 * 1024) {
        throw new BadRequestException(`Arquivo muito grande: ${photo.originalname} (máx. 7 MB)`);
      }
    }
  }

  private async resolveAnimalTags(params: GenerateAdBannerParams) {
    let matrizTag: string | undefined;
    let reprodutorTag: string | undefined;

    if (params.damAnimalId) {
      const dam = await this.animalsService.findOne(params.farmId, params.damAnimalId);
      if (dam.sex !== AnimalSex.FEMEA) {
        throw new BadRequestException('Animal selecionado como matriz deve ser fêmea');
      }
      matrizTag = dam.name ? `${dam.tag} ${dam.name}`.trim() : dam.tag;
    }

    if (params.sireAnimalId) {
      const sire = await this.animalsService.findOne(params.farmId, params.sireAnimalId);
      if (sire.sex !== AnimalSex.MACHO) {
        throw new BadRequestException('Animal selecionado como reprodutor deve ser macho');
      }
      reprodutorTag = sire.name ? `${sire.tag} ${sire.name}`.trim() : sire.tag;
    }

    return { matrizTag, reprodutorTag };
  }
}
