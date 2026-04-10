"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";

import { useI18n } from "@/components/providers/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, getApiErrorMessage } from "@/lib/api-client";
import type { AssetCodeSeries } from "@/types/asset-code-series";

type AssetCodeSeriesFormValues = {
  name: string;
  prefix: string;
  separator: string;
  padLength: string;
  description: string;
};

const DEFAULT_VALUES: AssetCodeSeriesFormValues = {
  name: "",
  prefix: "",
  separator: "-",
  padLength: "4",
  description: "",
};

type AssetCodeSeriesFormProps = {
  mode: "create" | "edit";
  series?: AssetCodeSeries;
};

function toFormValues(series?: AssetCodeSeries): AssetCodeSeriesFormValues {
  if (!series) {
    return DEFAULT_VALUES;
  }

  return {
    name: series.name,
    prefix: series.prefix,
    separator: series.separator,
    padLength: String(series.padLength),
    description: series.description ?? "",
  };
}

export function AssetCodeSeriesForm({ mode, series }: AssetCodeSeriesFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState(() => toFormValues(series));
  const [submitting, setSubmitting] = useState(false);

  const nextCounter = (series?.counter ?? 0) + 1;
  const previewCode = useMemo(() => {
    const prefix = values.prefix.trim() || "NB";
    const separator = values.separator || "-";
    const padLength = Math.max(1, Number(values.padLength || 4));

    return `${prefix}${separator}${String(nextCounter).padStart(padLength, "0")}`;
  }, [nextCounter, values.padLength, values.prefix, values.separator]);

  const handleChange = <T extends keyof AssetCodeSeriesFormValues>(
    field: T,
    value: AssetCodeSeriesFormValues[T],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);

    const payload = {
      name: values.name.trim(),
      prefix: values.prefix.trim().toUpperCase(),
      separator: values.separator || "-",
      padLength: Number(values.padLength || 4),
      description: values.description.trim() || null,
    };

    try {
      await apiClient[mode === "create" ? "post" : "patch"]<AssetCodeSeries>(
        mode === "create" ? "/api/asset-code-series" : `/api/asset-code-series/${series?.id}`,
        {
          body: payload,
        },
      );

      toast.success(
        mode === "create"
          ? t("assetCodeSeries.form.created")
          : t("assetCodeSeries.form.updated"),
      );
      router.push("/assets/series");
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("assetCodeSeries.form.error")));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={handleSubmit} className="surface-panel surface-section">
        <div className="flex flex-col gap-2 border-b pb-5">
          <h1 className="text-2xl font-semibold">
            {mode === "create"
              ? t("assetCodeSeries.form.titleCreate")
              : t("assetCodeSeries.form.titleEdit")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("assetCodeSeries.form.description")}</p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="name">{t("assetCodeSeries.form.labels.name")}</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(event) => handleChange("name", event.target.value)}
              maxLength={100}
              required
              placeholder={t("assetCodeSeries.form.placeholders.name")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="prefix">{t("assetCodeSeries.form.labels.prefix")}</Label>
            <Input
              id="prefix"
              value={values.prefix}
              onChange={(event) => handleChange("prefix", event.target.value.toUpperCase())}
              maxLength={20}
              required
              placeholder={t("assetCodeSeries.form.placeholders.prefix")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="separator">{t("assetCodeSeries.form.labels.separator")}</Label>
            <Input
              id="separator"
              value={values.separator}
              onChange={(event) => handleChange("separator", event.target.value)}
              maxLength={5}
              required
              placeholder={t("assetCodeSeries.form.placeholders.separator")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="padLength">{t("assetCodeSeries.form.labels.padLength")}</Label>
            <Input
              id="padLength"
              type="number"
              min={1}
              max={12}
              value={values.padLength}
              onChange={(event) => handleChange("padLength", event.target.value)}
              required
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{t("assetCodeSeries.form.labels.description")}</Label>
            <Textarea
              id="description"
              rows={4}
              value={values.description}
              onChange={(event) => handleChange("description", event.target.value)}
              maxLength={255}
              placeholder={t("assetCodeSeries.form.placeholders.description")}
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/assets/series" className={buttonVariants({ variant: "outline" })}>
            {t("assetCodeSeries.form.actions.cancel")}
          </Link>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {submitting
              ? t("assetCodeSeries.form.actions.saving")
              : t("assetCodeSeries.form.actions.save")}
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="surface-panel surface-section">
          <p className="text-sm font-medium text-muted-foreground">
            {t("assetCodeSeries.form.labels.nextCode")}
          </p>
          <p className="mt-3 font-mono text-3xl font-semibold tracking-wide">{previewCode}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {t("assetCodeSeries.form.nextCodeDescription")}
          </p>
        </div>

        <div className="surface-panel surface-section">
          <p className="text-sm font-medium text-muted-foreground">
            {t("assetCodeSeries.form.labels.counter")}
          </p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">{series?.counter ?? 0}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("assetCodeSeries.form.counterDescription")}
          </p>
        </div>
      </aside>
    </div>
  );
}
