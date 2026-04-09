export const ASSET_CODE_MAX_LENGTH = 30;
export const ASSET_NAME_MAX_LENGTH = 60;
export const ASSET_NAME_MAX_WORDS = 8;

const INTEGER_FORMATTER = new Intl.NumberFormat("en-US");

export function normalizeAssetCode(value: string) {
  return value.trim().replace(/\s+/g, "").toUpperCase();
}

export function normalizeAssetName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function getWordCount(value: string) {
  const normalized = normalizeAssetName(value);

  if (!normalized) {
    return 0;
  }

  return normalized.split(" ").length;
}

export function isAssetNameWithinStandard(value: string) {
  const normalized = normalizeAssetName(value);

  return (
    normalized.length > 0 &&
    normalized.length <= ASSET_NAME_MAX_LENGTH &&
    getWordCount(normalized) <= ASSET_NAME_MAX_WORDS
  );
}

export function formatAssetQuantity(value: number) {
  return INTEGER_FORMATTER.format(value);
}
