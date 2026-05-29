import { GenerateImageParams, GeneratedImage } from './gemini-image.client';

export interface ImageGenProvider {
  generateImage(params: GenerateImageParams): Promise<GeneratedImage>;
}
