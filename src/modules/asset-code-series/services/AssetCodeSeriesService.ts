import { ConflictError, NotFoundError } from "@/lib/errors";
import type {
  SeriesCreateInput,
  SeriesUpdateInput,
} from "@/lib/validators/asset-code-series";
import type { ActorContext } from "@/types/auth";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";

import { AssetCodeSeriesPolicy } from "../policies/AssetCodeSeriesPolicy";
import { AssetCodeSeriesRepository } from "../repositories/AssetCodeSeriesRepository";

export class AssetCodeSeriesService {
  constructor(
    private readonly assetCodeSeriesRepository: AssetCodeSeriesRepository,
    private readonly assetCodeSeriesPolicy: AssetCodeSeriesPolicy,
    private readonly auditLogService: AuditLogService,
  ) {}

  async listSeries(actor: ActorContext) {
    this.assetCodeSeriesPolicy.assertCanManage(actor);
    return this.assetCodeSeriesRepository.findMany();
  }

  async getSeriesById(actor: ActorContext, id: number) {
    this.assetCodeSeriesPolicy.assertCanManage(actor);

    const series = await this.assetCodeSeriesRepository.findById(id);

    if (!series) {
      throw new NotFoundError("ไม่พบชุดรหัสครุภัณฑ์", { seriesId: id });
    }

    return series;
  }

  async createSeries(actor: ActorContext, input: SeriesCreateInput) {
    this.assetCodeSeriesPolicy.assertCanManage(actor);

    const series = await this.assetCodeSeriesRepository.create(input);

    await this.auditLogService.record({
      actor,
      action: "asset_code_series.create",
      entityType: "asset_code_series",
      entityId: series.id,
      afterData: series,
    });

    return series;
  }

  async updateSeries(actor: ActorContext, id: number, input: SeriesUpdateInput) {
    this.assetCodeSeriesPolicy.assertCanManage(actor);

    const existing = await this.getSeriesById(actor, id);
    const updated = await this.assetCodeSeriesRepository.updateById(id, input);

    if (!updated) {
      throw new NotFoundError("ไม่พบชุดรหัสครุภัณฑ์", { seriesId: id });
    }

    await this.auditLogService.record({
      actor,
      action: "asset_code_series.update",
      entityType: "asset_code_series",
      entityId: updated.id,
      beforeData: existing,
      afterData: updated,
    });

    return updated;
  }

  async deleteSeries(actor: ActorContext, id: number) {
    this.assetCodeSeriesPolicy.assertCanManage(actor);

    const existing = await this.getSeriesById(actor, id);
    const assignedCount = await this.assetCodeSeriesRepository.countAssignedAssets(id);

    if (assignedCount > 0) {
      throw new ConflictError("ไม่สามารถลบชุดรหัสที่มีครุภัณฑ์อ้างอิงอยู่ได้", {
        seriesId: id,
        assignedCount,
      });
    }

    const deleted = await this.assetCodeSeriesRepository.deleteById(id);

    if (!deleted) {
      throw new NotFoundError("ไม่พบชุดรหัสครุภัณฑ์", { seriesId: id });
    }

    await this.auditLogService.record({
      actor,
      action: "asset_code_series.delete",
      entityType: "asset_code_series",
      entityId: deleted.id,
      beforeData: existing,
    });

    return deleted;
  }

  async previewNextCode(actor: ActorContext, id: number) {
    this.assetCodeSeriesPolicy.assertCanManage(actor);
    return this.assetCodeSeriesRepository.previewNextCode(id);
  }
}
