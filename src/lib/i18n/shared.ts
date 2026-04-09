import type { Dictionary, TranslationValues } from "./types";

function resolveMessage(dictionary: Dictionary, key: string): string | null {
  const segments = key.split(".");
  let current: unknown = dictionary;

  for (const segment of segments) {
    if (!current || typeof current !== "object" || !(segment in current)) {
      return null;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === "string" ? current : null;
}

function interpolate(template: string, values?: TranslationValues): string {
  if (!values) {
    return template;
  }

  return template.replace(/\{(\w+)\}/g, (_, token: string) => {
    const value = values[token];
    return value === undefined ? `{${token}}` : String(value);
  });
}

export function translate(
  dictionary: Dictionary,
  key: string,
  values?: TranslationValues,
): string {
  const template = resolveMessage(dictionary, key);
  return interpolate(template ?? key, values);
}
