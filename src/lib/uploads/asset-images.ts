import "server-only";

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { InsufficientStorageError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const ASSET_IMAGE_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "assets");

type StoredAssetImage = {
  storageKey: string;
  url: string;
};

type AssetImageCleanupResult = {
  failedStorageKeys: string[];
};

function getFileExtension(file: File) {
  switch (file.type) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    default:
      return "";
  }
}

async function ensureUploadDirectory(relativeDirectory: string) {
  const targetDirectory = path.join(ASSET_IMAGE_UPLOAD_ROOT, relativeDirectory);

  try {
    await mkdir(targetDirectory, { recursive: true });
  } catch (error) {
    throw mapStorageWriteError(error, {
      targetDirectory,
      operation: "mkdir",
    });
  }

  return targetDirectory;
}

function mapStorageWriteError(error: unknown, context: Record<string, unknown>) {
  if (
    error &&
    typeof error === "object" &&
    "code" in error &&
    (((error as { code?: unknown }).code === "ENOSPC") ||
      (error as { code?: unknown }).code === "EDQUOT")
  ) {
    return new InsufficientStorageError(undefined, context);
  }

  return error;
}

export async function saveAssetImageFiles(files: File[]): Promise<StoredAssetImage[]> {
  if (files.length === 0) {
    return [];
  }

  const now = new Date();
  const relativeDirectory = path.posix.join(
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
  );
  const uploadDirectory = await ensureUploadDirectory(relativeDirectory);
  const storedImages: StoredAssetImage[] = [];

  try {
    for (const file of files) {
      const extension = getFileExtension(file);
      const fileName = `${randomUUID()}${extension}`;
      const storageKey = path.posix.join("uploads", "assets", relativeDirectory, fileName);
      const filePath = path.join(uploadDirectory, fileName);
      const bytes = Buffer.from(await file.arrayBuffer());

      try {
        await writeFile(filePath, bytes);
      } catch (error) {
        throw mapStorageWriteError(error, {
          storageKey,
          fileName: file.name,
          operation: "writeFile",
        });
      }

      storedImages.push({
        storageKey,
        url: `/${storageKey}`,
      });
    }

    return storedImages;
  } catch (error) {
    const cleanupResult = await deleteAssetImageFiles(
      storedImages.map((image) => image.storageKey),
    );

    if (cleanupResult.failedStorageKeys.length > 0) {
      logger.warn("Failed to clean up partially uploaded asset images", cleanupResult);
    }

    throw error;
  }
}

export async function deleteAssetImageFiles(
  storageKeys: string[],
): Promise<AssetImageCleanupResult> {
  const results = await Promise.allSettled(
    storageKeys.map(async (storageKey) => {
      const filePath = path.join(process.cwd(), "public", storageKey);
      await rm(filePath, { force: true });
      return storageKey;
    }),
  );

  const failedStorageKeys = results.flatMap((result, index) =>
    result.status === "rejected" ? [storageKeys[index] ?? ""] : [],
  );

  if (failedStorageKeys.length > 0) {
    logger.warn("Failed to delete asset image files", { failedStorageKeys });
  }

  return {
    failedStorageKeys,
  };
}
