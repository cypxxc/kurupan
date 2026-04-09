export const ASSET_IMAGE_MIN_COUNT = 1;
export const ASSET_IMAGE_MAX_COUNT = 5;
export const ASSET_IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const ASSET_IMAGE_ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ASSET_IMAGE_ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

export function formatAssetImageFileSizeLimit() {
  return `${Math.round(ASSET_IMAGE_MAX_SIZE_BYTES / (1024 * 1024))} MB`;
}
