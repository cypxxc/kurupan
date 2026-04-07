import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import type {
  AssetCreateInput,
  AssetListQuery,
  AssetUpdateInput,
} from "@/lib/validators/assets";
import type { ActorContext } from "@/types/auth";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";

import { AssetPolicy } from "../policies/AssetPolicy";
import { AssetRepository } from "../repositories/AssetRepository";

export class AssetService {
  constructor(
    private readonly assetRepository: AssetRepository,
    private readonly auditLogService: AuditLogService,
    private readonly assetPolicy: AssetPolicy,
  ) {}

  async listAssets(filters: AssetListQuery) {
    return this.assetRepository.findMany(filters);
  }

  async getAssetById(id: number) {
    const asset = await this.assetRepository.findById(id);

    if (!asset) {
      throw new NotFoundError("Asset not found", { assetId: id });
    }

    const activity = await this.assetRepository.findActivityByAssetId(id);

    return {
      ...asset,
      activity,
    };
  }

  async createAsset(actor: ActorContext, input: AssetCreateInput) {
    this.assetPolicy.assertCanManage(actor);

    const availableQty = input.availableQty ?? input.totalQty;
    const status = input.status ?? "available";

    this.assertQuantities(input.totalQty, availableQty);

    const existingByCode = await this.assetRepository.findByAssetCode(input.assetCode);

    if (existingByCode) {
      throw new ConflictError("Asset code already exists", {
        assetCode: input.assetCode,
      });
    }

    const asset = await this.assetRepository.create({
      ...input,
      availableQty,
      status,
    });

    await this.auditLogService.record({
      actor,
      action: "asset.create",
      entityType: "asset",
      entityId: asset.id,
      afterData: asset,
    });

    return asset;
  }

  async updateAsset(actor: ActorContext, id: number, input: AssetUpdateInput) {
    this.assetPolicy.assertCanManage(actor);

    const existing = await this.getAssetById(id);

    if (input.assetCode && input.assetCode !== existing.assetCode) {
      const duplicate = await this.assetRepository.findByAssetCode(input.assetCode);

      if (duplicate && duplicate.id !== id) {
        throw new ConflictError("Asset code already exists", {
          assetCode: input.assetCode,
        });
      }
    }

    const nextTotalQty = input.totalQty ?? existing.totalQty;
    const nextAvailableQty = input.availableQty ?? existing.availableQty;

    this.assertQuantities(nextTotalQty, nextAvailableQty);

    const updated = await this.assetRepository.updateById(id, input);

    if (!updated) {
      throw new NotFoundError("Asset not found", { assetId: id });
    }

    await this.auditLogService.record({
      actor,
      action: "asset.update",
      entityType: "asset",
      entityId: updated.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  private assertQuantities(totalQty: number, availableQty: number) {
    if (availableQty > totalQty) {
      throw new ValidationError("Available quantity cannot exceed total quantity", {
        totalQty,
        availableQty,
      });
    }
  }
}
