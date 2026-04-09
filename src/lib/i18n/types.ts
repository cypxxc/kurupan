import type { th } from "./dictionaries/th";

type DeepDictionaryShape<T> =
  T extends string ? string : { [K in keyof T]: DeepDictionaryShape<T[K]> };

export type Dictionary = DeepDictionaryShape<typeof th>;

export type TranslationValues = Record<string, string | number>;
