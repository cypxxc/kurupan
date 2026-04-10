"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, LoaderCircle, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  AssetImagePicker,
  type AssetImageDraft,
} from "@/components/forms/asset-image-picker";
import { useI18n } from "@/components/providers/i18n-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient, ApiClientError } from "@/lib/api-client";
import {
  ASSET_IMAGE_ACCEPTED_MIME_TYPES,
  ASSET_IMAGE_MAX_COUNT,
  ASSET_IMAGE_MAX_SIZE_BYTES,
  ASSET_IMAGE_MIN_COUNT,
} from "@/lib/asset-images";
import {
  ASSET_CODE_MAX_LENGTH,
  ASSET_NAME_MAX_LENGTH,
  ASSET_NAME_MAX_WORDS,
  formatAssetQuantity,
  getWordCount,
  normalizeAssetCode,
  normalizeAssetName,
} from "@/lib/asset-standards";
import type { AssetCodeSeries } from "@/types/asset-code-series";
import type { Asset, AssetDetail, AssetFormValues } from "@/types/assets";

const BAHT_FORMATTER = new Intl.NumberFormat("th-TH", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

type AssetFormProps = {
  mode: "create" | "edit";
  asset?: AssetDetail;
  initialValues: AssetFormValues;
};

type AssetFieldKey = keyof AssetFormValues | "images";

const FIELD_LABELS: Record<AssetFieldKey, string> = {
  seriesId: "Series",
  assetCode: "Asset code",
  name: "Asset name",
  category: "Category",
  description: "Description",
  location: "Location",
  totalQty: "Total quantity",
  status: "Status",
  purchasePrice: "Purchase price",
  purchaseDate: "Purchase date",
  usefulLifeYears: "Useful life years",
  residualValue: "Residual value",
  images: "Asset images",
};

const FIELD_ELEMENT_IDS: Record<AssetFieldKey, string> = {
  seriesId: "seriesId",
  assetCode: "assetCode",
  name: "name",
  category: "category",
  description: "description",
  location: "location",
  totalQty: "totalQty",
  status: "status",
  purchasePrice: "purchasePrice",
  purchaseDate: "purchaseDate",
  usefulLifeYears: "usefulLifeYears",
  residualValue: "residualValue",
  images: "assetImagesField",
};

function toImageDrafts(asset?: AssetDetail): AssetImageDraft[] {
  if (!asset) {
    return [];
  }

  return asset.images.map((image) => ({
    kind: "existing",
    id: image.id,
    url: image.url,
  }));
}

function revokeDraftImageUrl(image: AssetImageDraft) {
  if (image.kind === "new") {
    URL.revokeObjectURL(image.url);
  }
}

function hasFinancialInput(values: AssetFormValues) {
  return Boolean(
    values.purchasePrice ||
      values.purchaseDate ||
      values.usefulLifeYears ||
      (values.residualValue && Number(values.residualValue) > 0),
  );
}

function getCreateMissingRequiredFields(values: AssetFormValues): AssetFieldKey[] {
  const missingFields: AssetFieldKey[] = [];

  if (normalizeAssetCode(values.assetCode).length === 0) {
    missingFields.push("assetCode");
  }

  if (normalizeAssetName(values.name).length === 0) {
    missingFields.push("name");
  }

  if (values.totalQty.trim().length === 0) {
    missingFields.push("totalQty");
  }

  return missingFields;
}

function getValidationIssueFieldKeys(details: unknown): AssetFieldKey[] {
  if (!details || typeof details !== "object" || !("issues" in details)) {
    return [];
  }

  const maybeIssues = (details as { issues?: unknown }).issues;
  if (!Array.isArray(maybeIssues)) {
    return [];
  }

  const keys = maybeIssues.flatMap((issue) => {
    if (!issue || typeof issue !== "object" || !("path" in issue)) {
      return [];
    }

    const pathValue = String((issue as { path?: unknown }).path ?? "");
    const pathSegments = pathValue.split(".").filter(Boolean);
    const candidates = [pathSegments[0], pathSegments.at(-1)].filter(Boolean) as string[];

    const matchedKey = candidates.find(
      (candidate): candidate is AssetFieldKey => candidate in FIELD_LABELS,
    );

    return matchedKey ? [matchedKey] : [];
  });

  return Array.from(new Set(keys));
}

function normalizeErrorMessage(message: string | undefined, fallback: string) {
  if (!message || message === "Request body validation failed") {
    return fallback;
  }

  return message;
}

export function AssetForm({ mode, asset, initialValues }: AssetFormProps) {
  const { t } = useI18n();
  const router = useRouter();
  const [values, setValues] = useState(initialValues);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<AssetFieldKey, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [imageDrafts, setImageDrafts] = useState<AssetImageDraft[]>(() => toImageDrafts(asset));
  const [showFinancialSection, setShowFinancialSection] = useState(() =>
    hasFinancialInput(initialValues),
  );
  const [fieldOptions, setFieldOptions] = useState<{ categories: string[]; locations: string[] }>(
    {
      categories: [],
      locations: [],
    },
  );
  const [seriesOptions, setSeriesOptions] = useState<AssetCodeSeries[]>([]);
  const imageDraftsRef = useRef(imageDrafts);

  useEffect(() => {
    imageDraftsRef.current = imageDrafts;
  }, [imageDrafts]);

  useEffect(
    () => () => {
      imageDraftsRef.current.forEach(revokeDraftImageUrl);
    },
    [],
  );

  useEffect(() => {
    void Promise.all([
      apiClient.get<{ categories: string[]; locations: string[] }>("/api/assets/field-options"),
      apiClient.get<AssetCodeSeries[]>("/api/asset-code-series"),
    ])
      .then(
        ([fieldOptionsResult, seriesResult]) => {
          setFieldOptions(fieldOptionsResult);
          setSeriesOptions(seriesResult);
        },
      )
      .catch(() => {
        toast.error(t("errors.codes.internalServerError"));
      });
  }, [t]);

  const stockSummary = useMemo(() => {
    if (!asset) {
      const nextTotalQty = Number(values.totalQty || 0);
      return {
        availableQty: nextTotalQty,
        hint: t("assetForm.stockHintCreate"),
      };
    }

    return {
      availableQty: asset.availableQty,
      hint: t("assetForm.stockHintEdit"),
    };
  }, [asset, t, values.totalQty]);

  const normalizedName = useMemo(() => normalizeAssetName(values.name), [values.name]);
  const nameWordCount = useMemo(() => getWordCount(values.name), [values.name]);
  const totalQty = Number(values.totalQty || 0);
  const isAssetCodeLocked = mode === "create" && values.seriesId.length > 0;

  const annualDepreciationPreview = useMemo(() => {
    const purchasePrice = Number(values.purchasePrice || 0);
    const usefulLifeYears = Number(values.usefulLifeYears || 0);
    const residualValue = Number(values.residualValue || 0);

    if (
      purchasePrice <= 0 ||
      usefulLifeYears <= 0 ||
      residualValue < 1 ||
      residualValue > purchasePrice
    ) {
      return null;
    }

    return ((purchasePrice - residualValue) / usefulLifeYears).toFixed(2);
  }, [values.purchasePrice, values.residualValue, values.usefulLifeYears]);

  const seriesComboboxOptions = useMemo(
    () => [
      {
        value: "",
        label: t("assetForm.seriesManual"),
        searchLabel: t("assetForm.seriesManual"),
      },
      ...seriesOptions.map((series) => ({
        value: String(series.id),
        label: `${series.name} (${series.prefix})`,
        searchLabel: `${series.name} ${series.prefix}`,
      })),
    ],
    [seriesOptions, t],
  );

  const clearFieldError = (field: AssetFieldKey) => {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  };

  const handleChange = <T extends keyof AssetFormValues>(
    field: T,
    value: AssetFormValues[T],
  ) => {
    clearFieldError(field);

    setValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const focusFirstInvalidField = (fields: AssetFieldKey[]) => {
    const firstField = fields[0];
    if (!firstField) {
      return;
    }

    const elementId = FIELD_ELEMENT_IDS[firstField];
    const element = document.getElementById(elementId);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });

    window.setTimeout(() => {
      if ("focus" in element && typeof element.focus === "function") {
        element.focus();
      }
    }, 80);
  };

  const showFieldErrors = (fields: AssetFieldKey[]) => {
    const uniqueFields = Array.from(new Set(fields));
    if (uniqueFields.length === 0) {
      return;
    }

    const nextErrors = uniqueFields.reduce<Partial<Record<AssetFieldKey, string>>>(
      (acc, field) => {
        acc[field] = "invalid";
        return acc;
      },
      {},
    );

    setFieldErrors(nextErrors);
    focusFirstInvalidField(uniqueFields);
  };

  const handleSeriesChange = async (seriesId: string) => {
    clearFieldError("seriesId");

    setValues((current) => ({
      ...current,
      seriesId,
      assetCode: mode === "create" ? "" : current.assetCode,
    }));

    if (mode !== "create" || !seriesId) {
      return;
    }

    try {
      const nextCode = await apiClient.get<string>(
        `/api/asset-code-series/${seriesId}/preview-code`,
      );

      clearFieldError("assetCode");
      setValues((current) => ({
        ...current,
        seriesId,
        assetCode: nextCode,
      }));
    } catch (error) {
      if (error instanceof ApiClientError) {
        const issueFields = getValidationIssueFieldKeys(error.details);

        if (issueFields.length > 0) {
          showFieldErrors(issueFields);
          toast.error(t("assetForm.validationFix"));
          return;
        }

        toast.error(
          normalizeErrorMessage(
            error.message,
            t("assetForm.validationFix"),
          ),
        );
        return;
      }

      toast.error(t("assetForm.previewCodeError"));
    }
  };

  const handleSelectImageFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const remainingSlots = ASSET_IMAGE_MAX_COUNT - imageDrafts.length;
    if (remainingSlots <= 0) {
      toast.error(t("assetForm.uploadTooMany", { count: ASSET_IMAGE_MAX_COUNT }));
      return;
    }

    const nextDrafts: AssetImageDraft[] = [];

    for (const file of Array.from(files).slice(0, remainingSlots)) {
      if (
        !ASSET_IMAGE_ACCEPTED_MIME_TYPES.includes(
          file.type as (typeof ASSET_IMAGE_ACCEPTED_MIME_TYPES)[number],
        )
      ) {
        toast.error(t("assetForm.unsupportedImageFormat", { fileName: file.name }));
        continue;
      }

      if (file.size > ASSET_IMAGE_MAX_SIZE_BYTES) {
        toast.error(t("assetForm.imageTooLarge", { fileName: file.name }));
        continue;
      }

      nextDrafts.push({
        kind: "new",
        tempId: crypto.randomUUID(),
        file,
        url: URL.createObjectURL(file),
      });
    }

    if (files.length > remainingSlots) {
      toast.error(t("assetForm.remainingSlots", { count: remainingSlots }));
    }

    if (nextDrafts.length === 0) {
      return;
    }

    clearFieldError("images");
    setImageDrafts((current) => [...current, ...nextDrafts]);
  };

  const handleRemoveImage = (index: number) => {
    setImageDrafts((current) => {
      const target = current[index];
      if (!target) {
        return current;
      }

      revokeDraftImageUrl(target);
      return current.filter((_, currentIndex) => currentIndex !== index);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFieldErrors({});

    if (mode === "create") {
      const missingFields = getCreateMissingRequiredFields(values);

      if (missingFields.length > 0) {
        showFieldErrors(missingFields);
        toast.error(t("assetForm.createMissingFields"));
        return;
      }
    }

    if (imageDrafts.length < ASSET_IMAGE_MIN_COUNT || imageDrafts.length > ASSET_IMAGE_MAX_COUNT) {
      showFieldErrors(["images"]);
      toast.error(
        t("assetForm.imageCountRange", {
          min: ASSET_IMAGE_MIN_COUNT,
          max: ASSET_IMAGE_MAX_COUNT,
        }),
      );
      return;
    }

    setSubmitting(true);

    const payload = {
      assetCodeSeriesId: values.seriesId ? Number(values.seriesId) : null,
      assetCode: normalizeAssetCode(values.assetCode),
      name: normalizeAssetName(values.name),
      category: values.category.trim() || null,
      description: values.description.trim() || null,
      location: values.location.trim() || null,
      totalQty,
      status: values.status,
      purchasePrice: values.purchasePrice.trim() ? Number(values.purchasePrice) : null,
      purchaseDate: values.purchaseDate || null,
      usefulLifeYears: values.usefulLifeYears.trim() ? Number(values.usefulLifeYears) : null,
      residualValue: values.residualValue.trim() ? Number(values.residualValue) : null,
    };

    const formData = new FormData();
    formData.set("payload", JSON.stringify(payload));
    formData.set(
      "keptImageIds",
      JSON.stringify(
        imageDrafts.flatMap((image) => (image.kind === "existing" ? [image.id] : [])),
      ),
    );

    for (const image of imageDrafts) {
      if (image.kind === "new") {
        formData.append("newImages", image.file);
      }
    }

    try {
      const data = await apiClient[mode === "create" ? "post" : "patch"]<Asset>(
        mode === "create" ? "/api/assets" : `/api/assets/${asset?.id}`,
        {
          body: formData,
        },
      );
      toast.success(mode === "create" ? t("assetForm.created") : t("assetForm.updated"));
      router.push(`/assets/${data.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiClientError) {
        const issueFields = getValidationIssueFieldKeys(error.details);

        if (issueFields.length > 0) {
          showFieldErrors(issueFields);
          toast.error(t("assetForm.validationFix"));
        } else {
          toast.error(
            normalizeErrorMessage(
              error.message,
              t("assetForm.validationFix"),
            ),
          );
        }

        return;
      }

      toast.error(t("assetForm.saveError"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
      <form onSubmit={handleSubmit} className="surface-panel surface-section">
        <div className="flex flex-col gap-2 border-b pb-5">
          <h1 className="text-2xl font-semibold">
            {mode === "create" ? t("assetForm.title.create") : t("assetForm.title.edit")}
          </h1>
          <p className="text-sm text-muted-foreground">{t("assetForm.description")}</p>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="seriesId">{t("assetForm.labels.seriesId")}</Label>
            <Combobox
              id="seriesId"
              value={values.seriesId}
              onChange={(value) => void handleSeriesChange(value)}
              options={seriesComboboxOptions}
              ariaInvalid={Boolean(fieldErrors.seriesId)}
              placeholder={t("assetForm.placeholders.seriesId")}
            />
            <p className="text-xs text-muted-foreground">
              {t("assetForm.help.seriesId")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assetCode">{t("assetForm.labels.assetCode")}</Label>
            <Input
              id="assetCode"
              value={values.assetCode}
              onChange={(event) => handleChange("assetCode", event.target.value)}
              onBlur={(event) => handleChange("assetCode", normalizeAssetCode(event.target.value))}
              required
              disabled={isAssetCodeLocked}
              maxLength={ASSET_CODE_MAX_LENGTH}
              placeholder={
                isAssetCodeLocked
                  ? t("assetForm.placeholders.assetCodeGenerated")
                  : t("assetForm.placeholders.assetCodeManual")
              }
              aria-invalid={fieldErrors.assetCode ? "true" : undefined}
              className={fieldErrors.assetCode ? "field-error-blink" : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {isAssetCodeLocked
                ? t("assetForm.help.assetCodeGenerated")
                : t("assetForm.help.assetCodeManual")}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t("assetForm.labels.name")}</Label>
            <Input
              id="name"
              value={values.name}
              onChange={(event) => handleChange("name", event.target.value)}
              onBlur={(event) => handleChange("name", normalizeAssetName(event.target.value))}
              required
              maxLength={ASSET_NAME_MAX_LENGTH}
              placeholder={t("assetForm.placeholders.name")}
              aria-invalid={fieldErrors.name ? "true" : undefined}
              className={fieldErrors.name ? "field-error-blink" : undefined}
            />
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <p>
                {t("assetForm.help.nameRecommended", {
                  words: ASSET_NAME_MAX_WORDS,
                  characters: ASSET_NAME_MAX_LENGTH,
                })}
              </p>
              <span
                className={
                  nameWordCount > ASSET_NAME_MAX_WORDS || normalizedName.length > ASSET_NAME_MAX_LENGTH
                    ? "font-medium text-destructive"
                    : ""
                }
              >
                {nameWordCount}/{ASSET_NAME_MAX_WORDS} words
              </span>
            </div>
            <div className="rounded-sm border border-border/80 bg-muted/25 px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium tracking-wide text-muted-foreground">
                  {t("assetForm.help.detailTitlePreview")}
                </p>
                <span className="text-xs text-muted-foreground">{t("assetForm.help.twoLinesMax")}</span>
              </div>
              <div
                title={normalizedName || t("assetForm.placeholders.namePreviewTitle")}
                className={
                  normalizedName
                    ? "asset-title-clamp mt-3 text-lg font-semibold leading-tight text-foreground"
                    : "mt-3 text-sm text-muted-foreground"
                }
              >
                {normalizedName || t("assetForm.placeholders.namePreviewEmpty")}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {t("assetForm.help.longNamesClamp")}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">{t("assetForm.labels.category")}</Label>
            <CreatableCombobox
              id="category"
              options={fieldOptions.categories}
              value={values.category}
              onChange={(value) => handleChange("category", value)}
              maxLength={100}
              placeholder={t("assetForm.placeholders.category")}
              ariaInvalid={Boolean(fieldErrors.category)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">{t("assetForm.labels.location")}</Label>
            <CreatableCombobox
              id="location"
              options={fieldOptions.locations}
              value={values.location}
              onChange={(value) => handleChange("location", value)}
              maxLength={255}
              placeholder={t("assetForm.placeholders.location")}
              ariaInvalid={Boolean(fieldErrors.location)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalQty">{t("assetForm.labels.totalQty")}</Label>
            <Input
              id="totalQty"
              type="number"
              min={0}
              value={values.totalQty}
              onChange={(event) => handleChange("totalQty", event.target.value)}
              required
              aria-invalid={fieldErrors.totalQty ? "true" : undefined}
              className={fieldErrors.totalQty ? "field-error-blink" : undefined}
            />
            <p className="text-xs text-muted-foreground">
              {t("assetForm.help.quantityFormat", {
                value: formatAssetQuantity(totalQty),
              })}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">{t("assetForm.labels.status")}</Label>
            <Combobox
              id="status"
              value={values.status}
              onChange={(value) =>
                handleChange("status", (value || "available") as AssetFormValues["status"])
              }
              options={[
                {
                  value: "available",
                  label: <StatusBadge type="asset" value="available" />,
                  searchLabel: t("common.statuses.asset.available"),
                },
                {
                  value: "maintenance",
                  label: <StatusBadge type="asset" value="maintenance" />,
                  searchLabel: t("common.statuses.asset.maintenance"),
                },
                {
                  value: "retired",
                  label: <StatusBadge type="asset" value="retired" />,
                  searchLabel: t("common.statuses.asset.retired"),
                },
              ]}
              ariaInvalid={Boolean(fieldErrors.status)}
              placeholder={t("assetForm.placeholders.status")}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">{t("assetForm.labels.description")}</Label>
            <Textarea
              id="description"
              rows={5}
              value={values.description}
              onChange={(event) => handleChange("description", event.target.value)}
              maxLength={2000}
              placeholder={t("assetForm.placeholders.description")}
              aria-invalid={fieldErrors.description ? "true" : undefined}
              className={fieldErrors.description ? "field-error-blink" : undefined}
            />
          </div>

          <AssetImagePicker
            images={imageDrafts}
            onSelectFiles={handleSelectImageFiles}
            onRemoveImage={handleRemoveImage}
            hasError={Boolean(fieldErrors.images)}
          />
        </div>

        <div className="mt-6 rounded-2xl border border-border/80 bg-muted/35 p-4">
          <button
            type="button"
            onClick={() => setShowFinancialSection((current) => !current)}
            className="flex w-full items-center justify-between gap-3 text-left"
          >
            <div>
              <p className="font-medium">{t("assetForm.labels.financialInfo")}</p>
              <p className="text-sm text-muted-foreground">
                {t("assetForm.help.financialInfo")}
              </p>
            </div>
            {showFinancialSection ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {showFinancialSection ? (
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="purchasePrice">{t("assetForm.labels.purchasePrice")}</Label>
                <Input
                  id="purchasePrice"
                  type="number"
                  min={0}
                  step="0.01"
                  value={values.purchasePrice}
                  onChange={(event) => handleChange("purchasePrice", event.target.value)}
                  placeholder={t("assetForm.placeholders.purchasePrice")}
                  aria-invalid={fieldErrors.purchasePrice ? "true" : undefined}
                  className={fieldErrors.purchasePrice ? "field-error-blink" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="purchaseDate">{t("assetForm.labels.purchaseDate")}</Label>
                <Input
                  id="purchaseDate"
                  type="date"
                  value={values.purchaseDate}
                  onChange={(event) => handleChange("purchaseDate", event.target.value)}
                  aria-invalid={fieldErrors.purchaseDate ? "true" : undefined}
                  className={fieldErrors.purchaseDate ? "field-error-blink" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usefulLifeYears">{t("assetForm.labels.usefulLifeYears")}</Label>
                <Input
                  id="usefulLifeYears"
                  type="number"
                  min={1}
                  step="1"
                  value={values.usefulLifeYears}
                  onChange={(event) => handleChange("usefulLifeYears", event.target.value)}
                  placeholder={t("assetForm.placeholders.usefulLifeYears")}
                  aria-invalid={fieldErrors.usefulLifeYears ? "true" : undefined}
                  className={fieldErrors.usefulLifeYears ? "field-error-blink" : undefined}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="residualValue">{t("assetForm.labels.residualValue")}</Label>
                <Input
                  id="residualValue"
                  type="number"
                  min={1}
                  step="0.01"
                  value={values.residualValue}
                  onChange={(event) => handleChange("residualValue", event.target.value)}
                  placeholder={t("assetForm.placeholders.residualValue")}
                  aria-invalid={fieldErrors.residualValue ? "true" : undefined}
                  className={fieldErrors.residualValue ? "field-error-blink" : undefined}
                />
              </div>

              <div className="rounded-2xl border border-border/80 bg-background px-4 py-4 md:col-span-2">
                <p className="text-sm font-medium text-muted-foreground">
                  {t("assetForm.labels.annualDepreciation")}
                </p>
                <p className="mt-2 text-2xl font-semibold">
                  {annualDepreciationPreview
                    ? `${BAHT_FORMATTER.format(Number(annualDepreciationPreview))} THB`
                    : "-"}
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={asset ? `/assets/${asset.id}` : "/assets"}
            className={buttonVariants({ variant: "outline" })}
          >
            {t("assetForm.actions.cancel")}
          </Link>
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            {submitting ? t("assetForm.actions.saving") : t("assetForm.actions.save")}
          </Button>
        </div>
      </form>

      <aside className="space-y-4">
        <div className="surface-panel surface-section">
          <p className="text-sm font-medium text-muted-foreground">{t("assetForm.labels.currentStatus")}</p>
          <div className="mt-3">
            <StatusBadge type="asset" value={values.status} />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">{stockSummary.hint}</p>
        </div>

        <div className="surface-panel surface-section">
          <p className="text-sm font-medium text-muted-foreground">{t("assetForm.labels.quantitySummary")}</p>
          <div className="mt-4 grid gap-3">
            <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("assetForm.labels.available")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatAssetQuantity(stockSummary.availableQty)}
              </p>
            </div>
            <div className="rounded-sm border border-border/80 bg-muted/55 px-4 py-3">
              <p className="text-xs text-muted-foreground">{t("assetForm.labels.totalAfterSave")}</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {formatAssetQuantity(totalQty)}
              </p>
            </div>
          </div>
        </div>

        <div className="surface-panel surface-section">
          <p className="text-sm font-medium text-muted-foreground">{t("assetForm.labels.financialPreview")}</p>
          <p className="mt-3 text-2xl font-semibold">
            {annualDepreciationPreview
              ? `${BAHT_FORMATTER.format(Number(annualDepreciationPreview))} THB/year`
              : "-"}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("assetForm.help.saveAvailableHint")}
          </p>
        </div>
      </aside>
    </div>
  );
}
