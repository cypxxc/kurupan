CREATE TABLE "asset_code_series" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "name" varchar(100) NOT NULL,
  "prefix" varchar(20) NOT NULL,
  "separator" varchar(5) NOT NULL DEFAULT '-',
  "pad_length" integer NOT NULL DEFAULT 4,
  "counter" integer NOT NULL DEFAULT 0,
  "description" varchar(255),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "assets"
  ADD COLUMN "asset_code_series_id" integer REFERENCES "asset_code_series"("id") ON DELETE SET NULL,
  ADD COLUMN "purchase_price" numeric(15, 2),
  ADD COLUMN "purchase_date" date,
  ADD COLUMN "useful_life_years" integer,
  ADD COLUMN "residual_value" numeric(15, 2) DEFAULT 0;
