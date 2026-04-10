const dictionaries = {
  en: () => import("@/dictionaries/en.json").then((m) => m.default),
  "zh-CN": () => import("@/dictionaries/zh-CN.json").then((m) => m.default),
  ja: () => import("@/dictionaries/ja.json").then((m) => m.default),
  ko: () => import("@/dictionaries/ko.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;
export const locales = Object.keys(dictionaries) as Locale[];
export const defaultLocale: Locale = "en";

export const getDictionary = async (locale: Locale) => {
  if (!dictionaries[locale]) {
    return dictionaries[defaultLocale]();
  }
  return dictionaries[locale]();
};

export const localeNames: Record<Locale, string> = {
  en: "English",
  "zh-CN": "简体中文",
  ja: "日本語",
  ko: "한국어",
};
