import { ShieldAlert } from "lucide-react";

import { useI18n } from "@/components/providers/i18n-provider";

export function ReturnPermissionDenied() {
  const { t } = useI18n();

  return (
    <div className="empty-state">
      <div className="mx-auto flex size-14 items-center justify-center rounded-sm border border-border bg-muted/55 text-muted-foreground">
        <ShieldAlert className="size-6" />
      </div>
      <h1 className="mt-4 text-xl font-semibold">{t("returnsNew.permissionTitle")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t("returnsNew.permissionDescription")}
      </p>
    </div>
  );
}
