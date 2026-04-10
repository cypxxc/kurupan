import "server-only";

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { del, put } from "@vercel/blob";

import { AppError, InsufficientStorageError } from "@/lib/errors";
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

function isVercelEnvironment() {
  return process.env.VERCEL === "1";
}

function hasBlobReadWriteToken() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function shouldUseBlobStorage() {
  return isVercelEnvironment() && hasBlobReadWriteToken();
}

function assertUploadStorageConfigured() {
  if (isVercelEnvironment() && !hasBlobReadWriteToken()) {
    throw new AppError(
      "Asset upload storage is not configured for this deployment",
      "STORAGE_NOT_CONFIGURED",
      503,
      {
        provider: "vercel-blob",
        envVar: "BLOB_READ_WRITE_TOKEN",
      },
    );
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

async function saveToLocalFilesystem(
  files: File[],
  relativeDirectory: string,
): Promise<StoredAssetImage[]> {
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

async function saveToVercelBlob(
  files: File[],
  relativeDirectory: string,
): Promise<StoredAssetImage[]> {
  const storedImages: StoredAssetImage[] = [];

  try {
    for (const file of files) {
      const extension = getFileExtension(file);
      const fileName = `${randomUUID()}${extension}`;
      const storageKey = path.posix.join("uploads", "assets", relativeDirectory, fileName);
      const blob = await put(storageKey, file, {
        access: "public",
        addRandomSuffix: false,
      });

      storedImages.push({
        storageKey,
        url: blob.url,
      });
    }

    return storedImages;
  } catch (error) {
    const cleanupResult = await deleteAssetImageFiles(
      storedImages.map((image) => image.storageKey),
    );

    if (cleanupResult.failedStorageKeys.length > 0) {
      logger.warn("Failed to clean up partially uploaded asset blobs", cleanupResult);
    }

    throw mapStorageWriteError(error, {
      operation: "vercel-blob-put",
    });
  }
}

export async function saveAssetImageFiles(files: File[]): Promise<StoredAssetImage[]> {
  if (files.length === 0) {
    return [];
  }

  assertUploadStorageConfigured();

  const now = new Date();
  const relativeDirectory = path.posix.join(
    String(now.getUTCFullYear()),
    String(now.getUTCMonth() + 1).padStart(2, "0"),
  );

  if (shouldUseBlobStorage()) {
    return saveToVercelBlob(files, relativeDirectory);
  }

  return saveToLocalFilesystem(files, relativeDirectory);
}

async function deleteLocalAssetImageFiles(
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

  return { failedStorageKeys };
}

async function deleteBlobAssetImageFiles(
  storageKeys: string[],
): Promise<AssetImageCleanupResult> {
  const results = await Promise.allSettled(
    storageKeys.map(async (storageKey) => {
      await del(storageKey);
      return storageKey;
    }),
  );

  const failedStorageKeys = results.flatMap((result, index) =>
    result.status === "rejected" ? [storageKeys[index] ?? ""] : [],
  );

  return { failedStorageKeys };
}

export async function deleteAssetImageFiles(
  storageKeys: string[],
): Promise<AssetImageCleanupResult> {
  if (storageKeys.length === 0) {
    return { failedStorageKeys: [] };
  }

  const result = shouldUseBlobStorage()
    ? await deleteBlobAssetImageFiles(storageKeys)
    : await deleteLocalAssetImageFiles(storageKeys);

  if (result.failedStorageKeys.length > 0) {
    logger.warn("Failed to delete asset image files", {
      failedStorageKeys: result.failedStorageKeys,
      storageBackend: shouldUseBlobStorage() ? "vercel-blob" : "local-filesystem",
    });
  }

  return result;
}
