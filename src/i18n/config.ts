export const locales = ["en", "he"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "he";
export const dirOf = (locale: Locale) => (locale === "he" ? "rtl" : "ltr");
