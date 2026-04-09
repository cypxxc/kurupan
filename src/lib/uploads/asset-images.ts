import "server-only";

import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const ASSET_IMAGE_UPLOAD_ROOT = path.join(process.cwd(), "public", "uploads", "assets");

type StoredAssetImage = {
  storageKey: string;
  url: string;
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
  await mkdir(targetDirectory, { recursive: true });
  return targetDirectory;
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

  return Promise.all(
    files.map(async (file) => {
      const extension = getFileExtension(file);
      const fileName = `${randomUUID()}${extension}`;
      const storageKey = path.posix.join("uploads", "assets", relativeDirectory, fileName);
      const filePath = path.join(uploadDirectory, fileName);
      const bytes = Buffer.from(await file.arrayBuffer());

      await writeFile(filePath, bytes);

      return {
        storageKey,
        url: `/${storageKey}`,
      };
    }),
  );
}

export async function deleteAssetImageFiles(storageKeys: string[]) {
  await Promise.allSettled(
    storageKeys.map(async (storageKey) => {
      const filePath = path.join(process.cwd(), "public", storageKey);
      await rm(filePath, { force: true });
    }),
  );
}
