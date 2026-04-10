import type { Locale } from "@/lib/i18n/config";
import { dictionaries } from "@/lib/i18n/messages";
import { translate } from "@/lib/i18n/shared";

type ErrorLike = {
  code: string;
  message: string;
};

type TranslationValues = Record<string, string | number>;

const CODE_FALLBACK_KEYS: Record<string, string> = {
  UNAUTHENTICATED: "errors.codes.unauthenticated",
  FORBIDDEN: "errors.codes.forbidden",
  NOT_FOUND: "errors.codes.notFound",
  VALIDATION_ERROR: "errors.codes.validation",
  CONFLICT: "errors.codes.conflict",
  INSUFFICIENT_STORAGE: "errors.codes.insufficientStorage",
  INSUFFICIENT_STOCK: "errors.codes.insufficientStock",
  RETURN_EXCEEDS_APPROVED: "errors.codes.returnExceedsApproved",
  TOO_MANY_REQUESTS: "errors.codes.tooManyRequests",
  INTERNAL_SERVER_ERROR: "errors.codes.internalServerError",
};

const EXACT_MESSAGE_KEYS = new Map<string, string>([
  ["Request body must be valid JSON", "errors.validation.requestBodyMustBeValidJson"],
  ["Request body validation failed", "errors.validation.requestBodyValidationFailed"],
  ["Query string validation failed", "errors.validation.queryStringValidationFailed"],
  ["Route parameter validation failed", "errors.validation.routeParameterValidationFailed"],
  ["Multipart field payload is invalid", "errors.validation.multipartFieldPayloadInvalid"],
  ["Multipart field payload must be valid JSON", "errors.validation.multipartFieldPayloadMustBeValidJson"],
  ["Asset images must be JPG, PNG, or WebP", "errors.validation.assetImagesMustBeJpgPngOrWebp"],
  ["Each asset image must be 5 MB or smaller", "errors.validation.eachAssetImageMustBeFiveMbOrSmaller"],
  ["Useful life years must be greater than zero", "errors.validation.usefulLifeYearsMustBeGreaterThanZero"],
  ["Residual value must not exceed purchase price", "errors.validation.residualValueMustNotExceedPurchasePrice"],
  ["At least one field must be provided", "errors.validation.atLeastOneFieldMustBeProvided"],
  ["Date must be in YYYY-MM-DD format", "errors.validation.dateMustBeInYyyyMmDdFormat"],
  ["Invalid date", "errors.validation.invalidDate"],
  ["Notification not found", "errors.notifications.notFound"],
  ["An unexpected error occurred", "errors.codes.internalServerError"],
]);

function t(locale: Locale, key: string, values?: TranslationValues) {
  return translate(dictionaries[locale], key, values);
}

function isMostlyAscii(value: string) {
  return /^[\u0000-\u007F\s]*$/.test(value);
}

function resolveKnownMessage(
  message: string,
  locale: Locale,
): string | null {
  const exactKey = EXACT_MESSAGE_KEYS.get(message);

  if (exactKey) {
    return t(locale, exactKey);
  }

  const assetNameMaxWordsMatch = message.match(/^Asset name must not exceed (\d+) words$/);

  if (assetNameMaxWordsMatch) {
    return t(locale, "errors.validation.assetNameMustNotExceedWords", {
      count: Number(assetNameMaxWordsMatch[1]),
    });
  }

  const maxImagesMatch = message.match(/^You can upload at most (\d+) images per asset$/);

  if (maxImagesMatch) {
    return t(locale, "errors.validation.youCanUploadAtMostImagesPerAsset", {
      count: Number(maxImagesMatch[1]),
    });
  }

  return null;
}

function localizeIssueEntry(issue: unknown, locale: Locale) {
  if (!issue || typeof issue !== "object" || !("message" in issue)) {
    return issue;
  }

  const currentMessage = (issue as { message?: unknown }).message;

  if (typeof currentMessage !== "string") {
    return issue;
  }

  const localizedMessage =
    resolveKnownMessage(currentMessage, locale) ??
    (locale === "en" && isMostlyAscii(currentMessage) ? currentMessage : currentMessage);

  return {
    ...(issue as Record<string, unknown>),
    message: localizedMessage,
  };
}

export function localizeErrorMessage(error: ErrorLike, locale: Locale) {
  const localizedMessage = resolveKnownMessage(error.message, locale);

  if (localizedMessage) {
    return localizedMessage;
  }

  if (locale === "en" && error.message && isMostlyAscii(error.message)) {
    return error.message;
  }

  const fallbackKey = CODE_FALLBACK_KEYS[error.code];

  if (fallbackKey) {
    return t(locale, fallbackKey);
  }

  return error.message || t(locale, "errors.codes.internalServerError");
}

export function localizeErrorDetails(details: unknown, locale: Locale) {
  if (!details || typeof details !== "object" || !("issues" in details)) {
    return details;
  }

  const issues = (details as { issues?: unknown }).issues;

  if (!Array.isArray(issues)) {
    return details;
  }

  return {
    ...(details as Record<string, unknown>),
    issues: issues.map((issue) => localizeIssueEntry(issue, locale)),
  };
}
