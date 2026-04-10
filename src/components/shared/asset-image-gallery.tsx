"use client";

import Image from "next/image";
import { useState } from "react";
import { Expand, ImageIcon } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { AssetImage } from "@/types/assets";

export function AssetImageGallery({
  assetName,
  images,
}: {
  assetName: string;
  images: AssetImage[];
}) {
  const { t } = useI18n();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState<Record<number, true>>({});

  if (images.length === 0) {
    return null;
  }

  const activeIndex = Math.min(selectedIndex, images.length - 1);
  const selectedImage = images[activeIndex];

  const markImageBroken = (imageId: number) => {
    setBrokenImageIds((current) => {
      if (current[imageId]) {
        return current;
      }

      return {
        ...current,
        [imageId]: true,
      };
    });
  };

  const renderFallback = ({
    compact = false,
    showDescription = false,
  }: {
    compact?: boolean;
    showDescription?: boolean;
  }) => (
    <div className="flex size-full flex-col items-center justify-center gap-2 bg-muted/35 px-4 text-center text-muted-foreground">
      <ImageIcon className={compact ? "size-4" : "size-10"} />
      <p className={compact ? "text-[11px] font-medium" : "text-sm font-medium"}>
        {t("assetGallery.unavailableTitle")}
      </p>
      {showDescription ? (
        <p className="max-w-md text-xs leading-5 text-muted-foreground">
          {t("assetGallery.unavailableDescription")}
        </p>
      ) : null}
    </div>
  );

  const renderThumbnails = (className: string) => (
    <div className={className}>
      {images.map((image, index) => (
        <button
          key={image.id}
          type="button"
          onClick={() => setSelectedIndex(index)}
          className={`overflow-hidden rounded-2xl border transition ${
            index === activeIndex
              ? "border-primary shadow-sm"
              : "border-border/80 opacity-85 hover:opacity-100"
          }`}
          aria-label={t("assetGallery.selectImage", { index: index + 1 })}
          aria-pressed={index === activeIndex}
        >
          <div className="relative aspect-square bg-muted/40">
            {brokenImageIds[image.id] ? (
              renderFallback({ compact: true })
            ) : (
              <Image
                src={image.url}
                alt={`${assetName} ${index + 1}`}
                fill
                sizes="(max-width: 640px) 20vw, 10vw"
                className="object-cover"
                onError={() => markImageBroken(image.id)}
              />
            )}
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="group block w-full overflow-hidden rounded-3xl border border-border/80 bg-muted/25 text-left transition hover:border-primary/50"
          aria-label={t("assetGallery.expandImage", { assetName })}
        >
          <div className="relative aspect-[4/3] bg-muted/40">
            {brokenImageIds[selectedImage.id] ? (
              renderFallback({ showDescription: true })
            ) : (
              <Image
                src={selectedImage.url}
                alt={assetName}
                fill
                sizes="(max-width: 1280px) 100vw, 50vw"
                className="object-cover transition duration-200 group-hover:scale-[1.01]"
                onError={() => markImageBroken(selectedImage.id)}
              />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between bg-gradient-to-t from-black/55 via-black/10 to-transparent p-4 text-white">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{assetName}</p>
                <p className="text-xs text-white/80">{t("assetGallery.clickToExpand")}</p>
              </div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-xs font-medium backdrop-blur-sm">
                <Expand className="size-3.5" />
                {t("assetGallery.expand")}
              </span>
            </div>
          </div>
        </button>
        {images.length > 1 ? renderThumbnails("grid grid-cols-5 gap-2") : null}
      </div>

      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent
          className="top-3 left-1/2 w-[calc(100%-1rem)] max-w-6xl -translate-x-1/2 translate-y-0 overflow-hidden border-border/80 bg-background/96 p-0 shadow-2xl sm:top-4 sm:w-[calc(100%-2rem)] sm:translate-y-0"
          showCloseButton
        >
          <DialogHeader className="border-b border-border/80 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ImageIcon className="size-4" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="truncate">{assetName}</DialogTitle>
                <DialogDescription>
                  {t("assetGallery.imageNumber", {
                    current: activeIndex + 1,
                    total: images.length,
                  })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 p-4 sm:p-6">
            <div className="overflow-hidden rounded-3xl border border-border/80 bg-muted/20">
              <div className="relative h-[78vh] min-h-[20rem] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_60%)]">
                {brokenImageIds[selectedImage.id] ? (
                  renderFallback({ showDescription: true })
                ) : (
                  <Image
                    src={selectedImage.url}
                    alt={assetName}
                    fill
                    sizes="100vw"
                    className="object-contain"
                    onError={() => markImageBroken(selectedImage.id)}
                  />
                )}
              </div>
            </div>
            {images.length > 1 ? renderThumbnails("grid grid-cols-4 gap-2 sm:grid-cols-6") : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
