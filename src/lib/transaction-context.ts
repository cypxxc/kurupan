import type { DbExecutor } from "@/db/postgres";
import { UserAccessRepository } from "@/modules/access/repositories/UserAccessRepository";
import { AssetCodeSeriesRepository } from "@/modules/asset-code-series/repositories/AssetCodeSeriesRepository";
import { AssetImageRepository } from "@/modules/assets/repositories/AssetImageRepository";
import { AssetRepository } from "@/modules/assets/repositories/AssetRepository";
import { AuditLogRepository } from "@/modules/audit/repositories/AuditLogRepository";
import { AuditLogService } from "@/modules/audit/services/AuditLogService";
import { LocalAuthUserRepository } from "@/modules/auth/repositories/LocalAuthUserRepository";
import { BorrowRequestRepository } from "@/modules/borrow/repositories/BorrowRequestRepository";
import { ReturnRepository } from "@/modules/returns/repositories/ReturnRepository";

export class TransactionContext {
  private borrowRequestRepository?: BorrowRequestRepository;
  private assetCodeSeriesRepository?: AssetCodeSeriesRepository;
  private assetImageRepository?: AssetImageRepository;
  private assetRepository?: AssetRepository;
  private returnRepository?: ReturnRepository;
  private localAuthUserRepository?: LocalAuthUserRepository;
  private userAccessRepository?: UserAccessRepository;
  private auditLogServiceInstance?: AuditLogService;

  constructor(private readonly tx: DbExecutor) {}

  get borrowRequestRepo() {
    this.borrowRequestRepository ??= new BorrowRequestRepository(this.tx);
    return this.borrowRequestRepository;
  }

  get assetRepo() {
    this.assetRepository ??= new AssetRepository(this.tx);
    return this.assetRepository;
  }

  get assetImageRepo() {
    this.assetImageRepository ??= new AssetImageRepository(this.tx);
    return this.assetImageRepository;
  }

  get assetCodeSeriesRepo() {
    this.assetCodeSeriesRepository ??= new AssetCodeSeriesRepository(this.tx);
    return this.assetCodeSeriesRepository;
  }

  get returnRepo() {
    this.returnRepository ??= new ReturnRepository(this.tx);
    return this.returnRepository;
  }

  get localAuthUserRepo() {
    this.localAuthUserRepository ??= new LocalAuthUserRepository(this.tx);
    return this.localAuthUserRepository;
  }

  get userAccessRepo() {
    this.userAccessRepository ??= new UserAccessRepository(this.tx);
    return this.userAccessRepository;
  }

  get auditService() {
    this.auditLogServiceInstance ??= new AuditLogService(new AuditLogRepository(this.tx));
    return this.auditLogServiceInstance;
  }
}
