import { z } from "zod";

import {
  ASSET_IMAGE_ACCEPTED_MIME_TYPES,
  ASSET_IMAGE_MAX_COUNT,
  ASSET_IMAGE_MAX_SIZE_BYTES,
} from "@/lib/asset-images";
import {
  ASSET_CODE_MAX_LENGTH,
  ASSET_NAME_MAX_LENGTH,
  ASSET_NAME_MAX_WORDS,
  getWordCount,
  normalizeAssetCode,
  normalizeAssetName,
} from "@/lib/asset-standards";
import { ValidationError } from "@/lib/errors";

import { dateStringSchema, positiveIntegerIdSchema } from "./http";

const assetStatusValues = ["available", "maintenance", "retired"] as const;
const assetStockValues = ["in_stock", "out_of_stock"] as const;

const emptyStringToNull = (value: unknown) =>
  typeof value === "string" && value.trim().length === 0 ? null : value;

const optionalNullablePositiveNumberSchema = z.preprocess(
  emptyStringToNull,
  z.union([z.coerce.number().positive(), z.null()]).optional(),
);

const optionalNullableMinOneNumberSchema = z.preprocess(
  emptyStringToNull,
  z.union([z.coerce.number().min(1), z.null()]).optional(),
);

const optionalNullablePositiveIntegerSchema = z.preprocess(
  emptyStringToNull,
  z.union([z.coerce.number().int().positive(), z.null()]).optional(),
);

const optionalNullableDateSchema = z.preprocess(
  emptyStringToNull,
  z.union([dateStringSchema, z.null()]).optional(),
);

export const assetListQuerySchema = z.object({
  search: z.string().trim().max(100).optional().default(""),
  category: z.string().trim().max(100).optional().default(""),
  location: z.string().trim().max(255).optional().default(""),
  status: z.enum(assetStatusValues).optional(),
  stock: z.enum(assetStockValues).optional(),
  borrowable: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export const assetCreateSchema = z
  .object({
    assetCode: z.string().trim().min(1).max(ASSET_CODE_MAX_LENGTH),
    name: z
      .string()
      .trim()
      .min(1)
      .max(ASSET_NAME_MAX_LENGTH)
      .refine((value) => getWordCount(value) <= ASSET_NAME_MAX_WORDS),
    category: z.string().trim().max(100).optional(),
    description: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(2000).optional(),
    totalQty: z.coerce.number().int().min(0),
    availableQty: z.coerce.number().int().min(0).optional(),
    status: z.enum(assetStatusValues).optional(),
    assetCodeSeriesId: optionalNullablePositiveIntegerSchema,
    purchasePrice: optionalNullablePositiveNumberSchema,
    purchaseDate: optionalNullableDateSchema,
    usefulLifeYears: optionalNullablePositiveIntegerSchema,
    residualValue: optionalNullableMinOneNumberSchema,
  })
  .superRefine((input, ctx) => {
    if (getWordCount(input.name) > ASSET_NAME_MAX_WORDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Asset name must not exceed ${ASSET_NAME_MAX_WORDS} words`,
        path: ["name"],
      });
    }

    if (
      input.purchasePrice !== undefined &&
      input.purchasePrice !== null &&
      input.residualValue !== undefined &&
      input.residualValue !== null &&
      input.residualValue > input.purchasePrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Residual value must not exceed purchase price",
        path: ["residualValue"],
      });
    }
  })
  .transform((input) => ({
    ...input,
    assetCode: normalizeAssetCode(input.assetCode),
    name: normalizeAssetName(input.name),
    category: input.category && input.category.length > 0 ? input.category : null,
    description: input.description && input.description.length > 0 ? input.description : null,
    location: input.location && input.location.length > 0 ? input.location : null,
    assetCodeSeriesId: input.assetCodeSeriesId ?? null,
    purchasePrice: input.purchasePrice ?? null,
    purchaseDate: input.purchaseDate ?? null,
    usefulLifeYears: input.usefulLifeYears ?? null,
    residualValue: input.residualValue ?? null,
  }));

export const assetUpdateSchema = z
  .object({
    assetCode: z.string().trim().min(1).max(ASSET_CODE_MAX_LENGTH).optional(),
    name: z
      .string()
      .trim()
      .min(1)
      .max(ASSET_NAME_MAX_LENGTH)
      .optional(),
    category: z.string().trim().max(100).nullable().optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    location: z.string().trim().max(2000).nullable().optional(),
    totalQty: z.coerce.number().int().min(0).optional(),
    availableQty: z.coerce.number().int().min(0).optional(),
    status: z.enum(assetStatusValues).optional(),
    assetCodeSeriesId: optionalNullablePositiveIntegerSchema,
    purchasePrice: optionalNullablePositiveNumberSchema,
    purchaseDate: optionalNullableDateSchema,
    usefulLifeYears: optionalNullablePositiveIntegerSchema,
    residualValue: optionalNullableMinOneNumberSchema,
  })
  .superRefine((input, ctx) => {
    if (input.name && getWordCount(input.name) > ASSET_NAME_MAX_WORDS) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Asset name must not exceed ${ASSET_NAME_MAX_WORDS} words`,
        path: ["name"],
      });
    }

    if (
      input.purchasePrice !== undefined &&
      input.purchasePrice !== null &&
      input.residualValue !== undefined &&
      input.residualValue !== null &&
      input.residualValue > input.purchasePrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Residual value must not exceed purchase price",
        path: ["residualValue"],
      });
    }
  })
  .transform((input) => ({
    ...input,
    assetCode: input.assetCode ? normalizeAssetCode(input.assetCode) : input.assetCode,
    name: input.name ? normalizeAssetName(input.name) : input.name,
    category:
      input.category === undefined
        ? undefined
        : input.category && input.category.length > 0
          ? input.category
          : null,
    description:
      input.description === undefined
        ? undefined
        : input.description && input.description.length > 0
          ? input.description
          : null,
    location:
      input.location === undefined
        ? undefined
        : input.location && input.location.length > 0
          ? input.location
          : null,
  }))
  .refine((input) => Object.keys(input).length > 0, {
    message: "At least one field must be provided",
  });

export const assetIdParamsSchema = z.object({
  id: positiveIntegerIdSchema,
});

export const assetDetailQuerySchema = z.object({
  includeActivity: z.coerce.boolean().optional().default(true),
});

const assetKeptImageIdsSchema = z.array(positiveIntegerIdSchema).max(ASSET_IMAGE_MAX_COUNT);

function parseJsonFormField<T>(value: FormDataEntryValue | null, fallback: T, schema: z.ZodType<T>) {
  if (value === null) {
    return fallback;
  }

  if (typeof value !== "string") {
    throw new ValidationError("Multipart field payload is invalid");
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new ValidationError("Multipart field payload must be valid JSON");
  }

  const result = schema.safeParse(parsed);

  if (!result.success) {
    throw new ValidationError("Request body validation failed", {
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
        code: issue.code,
      })),
    });
  }

  return result.data;
}

function isFormDataFile(value: FormDataEntryValue): value is File {
  return typeof File !== "undefined" && value instanceof File;
}

function validateAssetImageFile(file: File) {
  if (!ASSET_IMAGE_ACCEPTED_MIME_TYPES.includes(file.type as (typeof ASSET_IMAGE_ACCEPTED_MIME_TYPES)[number])) {
    throw new ValidationError("Asset images must be JPG, PNG, or WebP");
  }

  if (file.size > ASSET_IMAGE_MAX_SIZE_BYTES) {
    throw new ValidationError("Each asset image must be 5 MB or smaller", {
      fileName: file.name,
      fileSize: file.size,
    });
  }
}

export async function parseAssetMultipartRequest<T>(
  request: Request,
  schema: z.ZodType<T>,
) {
  const formData = await request.formData();
  const input = parseJsonFormField(formData.get("payload"), {} as T, schema);
  const keptImageIds = parseJsonFormField(
    formData.get("keptImageIds"),
    [],
    assetKeptImageIdsSchema,
  );
  const newImages = formData.getAll("newImages").flatMap((value) => {
    if (!isFormDataFile(value)) {
      return [];
    }

    if (value.size === 0) {
      return [];
    }

    validateAssetImageFile(value);
    return [value];
  });

  if (newImages.length > ASSET_IMAGE_MAX_COUNT) {
    throw new ValidationError("You can upload at most 5 images per asset");
  }

  return {
    input,
    keptImageIds,
    newImages,
  };
}

export type AssetListQuery = z.infer<typeof assetListQuerySchema>;
export type AssetCreateInput = z.infer<typeof assetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof assetUpdateSchema>;
export type AssetDetailQuery = z.infer<typeof assetDetailQuerySchema>;
