import type { Dictionary } from "./types";
import type { Locale } from "./config";
import { en } from "./dictionaries/en";
import { th } from "./dictionaries/th";

export const dictionaries: Record<Locale, Dictionary> = {
  th,
  en,
};
