import { z } from 'zod';
import { AnimalSex } from './enums';
import type { AbczProfilePreviewDto } from './abcz-profile';

export const abczSerieLookupSchema = z.object({
  mode: z.literal('serie'),
  serie: z.string().min(1, 'Série obrigatória'),
  rgn: z.string().min(1, 'RGN obrigatório'),
  rgnFinal: z.string().optional(),
});

export const abczRgdLookupSchema = z.object({
  mode: z.literal('rgd'),
  breedId: z.coerce.number().int().positive('Raça obrigatória'),
  categoryId: z.coerce.number().int().positive('Categoria obrigatória'),
  sex: z.enum(['M', 'F']),
  rgd: z.string().min(1, 'RGD obrigatório'),
  rgdFinal: z.string().optional(),
});

export const abczLookupQuerySchema = z.discriminatedUnion('mode', [
  abczSerieLookupSchema,
  abczRgdLookupSchema,
]);

export type AbczLookupQuery = z.infer<typeof abczLookupQuerySchema>;

export interface AbczAnimalCandidate {
  abczAnimalId: string;
  name: string;
  nickname: string | null;
  registration: string;
  breed: string;
  category: string;
  sex: AnimalSex;
  birthDate: string | null;
  allowsDetail: boolean;
  /** Valor bruto da ABCZ: S, P, N, etc. */
  permiteConsulta?: string;
  serie: string;
  rgn: string;
  rgd: string;
  breedCode: number;
  categoryCode: number;
  ownerId: string;
}

export interface AbczAnimalDetail {
  coat: string | null;
  city: string | null;
  state: string | null;
  situation: string | null;
  owner: string | null;
  farm: string | null;
  breeder: string | null;
}

export interface AbczLookupResult {
  found: boolean;
  multiple: boolean;
  candidates: AbczAnimalCandidate[];
  detail: AbczAnimalDetail | null;
  profile: AbczProfilePreviewDto | null;
  permissions: string | null;
  fetchedAt: string;
  sourceUrl: string;
}

export type AbczSerieLookupInput = z.infer<typeof abczSerieLookupSchema>;
export type AbczRgdLookupInput = z.infer<typeof abczRgdLookupSchema>;

export const abczPreviewQuerySchema = z.object({
  abczAnimalId: z.string().min(1),
  serie: z.string().min(1),
  rgn: z.string().min(1),
  rgd: z.string().min(1),
  breedCode: z.coerce.number().int().positive(),
  categoryCode: z.coerce.number().int().positive(),
  sex: z.nativeEnum(AnimalSex),
  ownerId: z.string().min(1),
  allowsDetail: z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .optional()
    .transform((value) => value !== false && value !== 'false'),
});

export type AbczPreviewQuery = z.infer<typeof abczPreviewQuerySchema>;
