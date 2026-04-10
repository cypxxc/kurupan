"use client";

import { ImagePlus, Trash2 } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import {
  ASSET_IMAGE_MAX_COUNT,
  ASSET_IMAGE_MIN_COUNT,
  formatAssetImageFileSizeLimit,
} from "@/lib/asset-images";
import { cn } from "@/lib/utils";

import { Button, buttonVariants } from "../ui/button";

export type AssetImageDraft =
  | {
      kind: "existing";
      id: number;
      url: string;
    }
  | {
      kind: "new";
      tempId: string;
      url: string;
      file: File;
    };

export function AssetImagePicker({
  images,
  onSelectFiles,
  onRemoveImage,
  hasError = false,
}: {
  images: AssetImageDraft[];
  onSelectFiles: (files: FileList | null) => void;
  onRemoveImage: (index: number) => void;
  hasError?: boolean;
}) {
  const { t } = useI18n();
  const remainingSlots = Math.max(0, ASSET_IMAGE_MAX_COUNT - images.length);

  return (
    <div
      id="assetImagesField"
      tabIndex={-1}
      aria-invalid={hasError || undefined}
      className={cn(
        "space-y-4 md:col-span-2",
        hasError && "rounded-2xl border border-destructive/60 p-3 field-error-blink",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">{t("assetImagePicker.title")}</p>
          <p className="text-xs text-muted-foreground">
            {t("assetImagePicker.description", {
              min: ASSET_IMAGE_MIN_COUNT,
              max: ASSET_IMAGE_MAX_COUNT,
            })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {t("assetImagePicker.count", {
              current: images.length,
              max: ASSET_IMAGE_MAX_COUNT,
            })}
          </span>
          <label
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              "cursor-pointer gap-2",
              remainingSlots === 0 && "cursor-not-allowed opacity-50",
            )}
          >
            <ImagePlus className="size-4" />
            {t("assetImagePicker.add")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              disabled={remainingSlots === 0}
              onChange={(event) => {
                onSelectFiles(event.target.files);
                event.currentTarget.value = "";
              }}
            />
          </label>
        </div>
      </div>

      {images.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 bg-muted/30 px-5 py-8 text-center">
          <p className="font-medium">{t("assetImagePicker.emptyTitle")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("assetImagePicker.emptyDescription", {
              size: formatAssetImageFileSizeLimit(),
            })}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((image, index) => (
            <div
              key={image.kind === "existing" ? `existing-${image.id}` : image.tempId}
              className="overflow-hidden rounded-2xl border border-border/80 bg-muted/20"
            >
              <div className="relative aspect-square bg-muted/40">
                <img
                  src={image.url}
                  alt={t("assetImagePicker.previewAlt", { index: index + 1 })}
                  className="h-full w-full object-cover"
                />
                <div className="absolute left-3 top-3 rounded-full bg-background/90 px-2 py-1 text-[11px] font-medium shadow-sm">
                  {index === 0
                    ? t("assetImagePicker.cover")
                    : t("assetImagePicker.imageNumber", { index: index + 1 })}
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 px-3 py-3">
                <p className="min-w-0 truncate text-sm text-muted-foreground">
                  {image.kind === "existing" ? t("assetImagePicker.savedImage") : image.file.name}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-destructive hover:text-destructive"
                  onClick={() => onRemoveImage(index)}
                >
                  <Trash2 className="size-4" />
                  {t("assetImagePicker.remove")}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {t("assetImagePicker.footer", { remaining: remainingSlots })}
      </p>
    </div>
  );
}
