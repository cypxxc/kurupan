import { withTransactionContext } from "@/db/postgres";
import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type {
  AssetCreateInput,
  AssetListQuery,
  AssetUpdateInput,
} from "@/lib/validators/assets";
import type { ActorContext } from "@/types/auth";
import { AssetCodeSeriesRepository } from "@/modules/asset-code-series/repositories/AssetCodeSeriesRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";

import { AssetPolicy } from "../policies/AssetPolicy";
import { AssetImageRepository } from "../repositories/AssetImageRepository";
import { AssetRepository } from "../repositories/AssetRepository";

type AssetImageRecordInput = {
  storageKey: string;
  url: string;
};

export class AssetService {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly assetImageRepository: AssetImageRepository,
    private readonly assetCodeSeriesRepository: AssetCodeSeriesRepository,
    private readonly auditLogService: AuditLogService,
    private readonly assetPolicy: AssetPolicy,
  ) {}

  async listAssets(filters: AssetListQuery) {
    return this.assetRepository.findMany(filters);
  }

  async getAssetById(id: number) {
    const asset = await this.assetRepository.findById(id);

    if (!asset) {
      throw new NotFoundError("ไม่พบครุภัณฑ์", { assetId: id });
    }

    const [images, activity] = await Promise.all([
      this.assetImageRepository.findByAssetId(id),
      this.assetRepository.findActivityByAssetId(id),
    ]);

    return {
      ...asset,
      images,
      activity,
    };
  }

  async createAsset(actor: ActorContext, input: AssetCreateInput, images: AssetImageRecordInput[]) {
    this.assetPolicy.assertCanManage(actor);

    const availableQty = input.availableQty ?? input.totalQty;
    const status = input.status ?? "available";

    this.assertQuantities(input.totalQty, availableQty);
    this.assertImageCount(images.length);

    const seriesId = input.assetCodeSeriesId;

    return withTransactionContext(async (ctx) => {
      const assetCode =
        seriesId !== null
          ? await ctx.assetCodeSeriesRepo.claimNextCode(seriesId)
          : input.assetCode;

      if (seriesId === null) {
        const existingByCode = await ctx.assetRepo.findByAssetCode(assetCode);

        if (existingByCode) {
          throw new ConflictError("รหัสครุภัณฑ์นี้มีอยู่แล้ว", {
            assetCode,
          });
        }
      }

      const asset = await ctx.assetRepo.create({
        ...input,
        assetCode,
        availableQty,
        status,
      });

      await ctx.assetImageRepo.replaceForAsset(asset.id, this.toStoredImages(images));

      const createdAsset = await ctx.assetRepo.findById(asset.id);

      if (!createdAsset) {
        throw new NotFoundError("ไม่พบครุภัณฑ์", { assetId: asset.id });
      }

      await ctx.auditService.record({
        actor,
        action: "asset.create",
        entityType: "asset",
        entityId: asset.id,
        afterData: createdAsset,
      });

      return createdAsset;
    });
  }

  async updateAsset(
    actor: ActorContext,
    id: number,
    input: AssetUpdateInput,
    imageSync?: {
      keptImageIds: number[];
      newImages: AssetImageRecordInput[];
    },
  ) {
    this.assetPolicy.assertCanManage(actor);

    const existing = await this.getAssetById(id);

    if (input.assetCode && input.assetCode !== existing.assetCode) {
      const duplicate = await this.assetRepository.findByAssetCode(input.assetCode);

      if (duplicate && duplicate.id !== id) {
        throw new ConflictError("รหัสครุภัณฑ์นี้มีอยู่แล้ว", {
          assetCode: input.assetCode,
        });
      }
    }

    const nextTotalQty = input.totalQty ?? existing.totalQty;
    const nextAvailableQty = input.availableQty ?? existing.availableQty;

    this.assertQuantities(nextTotalQty, nextAvailableQty);

    const imageState = imageSync
      ? this.buildNextImageState(existing.images, imageSync.keptImageIds, imageSync.newImages)
      : null;

    return withTransactionContext(async (ctx) => {
      const updated = await ctx.assetRepo.updateById(id, input);

      if (!updated) {
        throw new NotFoundError("ไม่พบครุภัณฑ์", { assetId: id });
      }

      if (imageState) {
        await ctx.assetImageRepo.replaceForAsset(id, this.toStoredImages(imageState.nextImages));
      }

      const updatedAsset = await ctx.assetRepo.findById(id);

      if (!updatedAsset) {
        throw new NotFoundError("ไม่พบครุภัณฑ์", { assetId: id });
      }

      await ctx.auditService.record({
        actor,
        action: "asset.update",
        entityType: "asset",
        entityId: updatedAsset.id,
        beforeData: existing,
        afterData: updatedAsset,
      });

      return {
        asset: updatedAsset,
        removedImages: imageState?.removedImages ?? [],
      };
    });
  }

  async deleteAsset(actor: ActorContext, id: number) {
    this.assetPolicy.assertCanManage(actor);

    const existing = await this.getAssetById(id);

    return withTransactionContext(async (ctx) => {
      const borrowRequestItemCount = await ctx.assetRepo.countBorrowRequestItemsByAssetId(id);

      if (borrowRequestItemCount > 0) {
        throw new ConflictError(
          "Cannot delete this asset because it is already referenced by borrow or return records.",
          {
            assetId: id,
            borrowRequestItemCount,
          },
        );
      }

      const deletedAsset = await ctx.assetRepo.deleteById(id);

      if (!deletedAsset) {
        throw new NotFoundError("Asset not found", { assetId: id });
      }

      await ctx.auditService.record({
        actor,
        action: "asset.delete",
        entityType: "asset",
        entityId: id,
        beforeData: existing,
      });

      return {
        deletedAsset,
        removedImages: existing.images,
      };
    });
  }

  private buildNextImageState(
    existingImages: Awaited<ReturnType<AssetImageRepository["findByAssetId"]>>,
    keptImageIds: number[],
    newImages: AssetImageRecordInput[],
  ) {
    const keptImageIdSet = new Set(keptImageIds);

    if (keptImageIdSet.size !== keptImageIds.length) {
      throw new ValidationError("รายการรูปภาพซ้ำกันไม่ได้");
    }

    const keptImages = keptImageIds.map((imageId) => {
      const image = existingImages.find((candidate) => candidate.id === imageId);

      if (!image) {
        throw new ValidationError("มีรายการรูปภาพที่ไม่ถูกต้อง", {
          imageId,
        });
      }

      return {
        storageKey: image.storageKey,
        url: image.url,
      };
    });

    const removedImages = existingImages.filter((image) => !keptImageIdSet.has(image.id));
    const nextImages = [...keptImages, ...newImages];

    this.assertImageCount(nextImages.length);

    return {
      nextImages,
      removedImages,
    };
  }

  private assertQuantities(totalQty: number, availableQty: number) {
    if (availableQty > totalQty) {
      throw new ValidationError("จำนวนพร้อมใช้งานต้องไม่มากกว่าจำนวนทั้งหมด", {
        totalQty,
        availableQty,
      });
    }
  }

  private assertImageCount(imageCount: number) {
    if (imageCount < 1 || imageCount > 5) {
      throw new ValidationError("ครุภัณฑ์ต้องมีรูปภาพอย่างน้อย 1 รูป และมากสุด 5 รูป", {
        imageCount,
      });
    }
  }

  private toStoredImages(images: AssetImageRecordInput[]) {
    return images.map((image, index) => ({
      storageKey: image.storageKey,
      url: image.url,
      sortOrder: index,
    }));
  }
}
