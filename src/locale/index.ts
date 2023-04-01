import { zh_CN } from "./zh_CN";
import { en } from "./en";
import { vi_VN } from "./vi_VN";
import { es_ES } from "./es_ES";
import { pt_BR } from "./pt_BR";
import {
  alert as ualert,
  prompt as uprompt,
  formatString,
  getKey,
} from "../utils";

// https://stackoverflow.com/questions/67027081/how-to-assert-two-interfaces-contain-the-same-keys-in-typescript
type AssertKeysEqual<
  T1 extends Record<keyof T2, any>,
  T2 extends Record<keyof T1, any>
> = never;
type Assertion = AssertKeysEqual<typeof zh_CN, typeof en>;

export type LocaleTextKey = keyof typeof zh_CN;

export const locales = {
  zh_cn: zh_CN,
  en,
  vi_vn: vi_VN,
  es_es: es_ES,
  pt_br: pt_BR,
};

export async function createLocale() {
  let lang = "zh_cn";
  try {
    lang = (await getKey("config_uiLocale")).toLowerCase();
  } catch {
    lang = navigator.language.replaceAll("-", "_").toLowerCase();
    if (lang == "") {
      lang = "en";
    } else {
      lang = lang.split(".")[0];
    }
    // hacks
    if (lang.startsWith("en_")) {
      lang = "en";
    }
  }
  // @ts-ignore THIS IS A BUG
  const currentLanguage: keyof typeof locales = lang in locales ? lang : "en";
  let locale = locales[currentLanguage];

  function alert(
    title: LocaleTextKey,
    content: LocaleTextKey,
    intrp: string[] = []
  ) {
    return ualert(locale[title], formatString(locale[content], intrp));
  }

  function prompt(
    title: LocaleTextKey,
    content: LocaleTextKey,
    intrp: string[] = []
  ) {
    return uprompt(locale[title], formatString(locale[content], intrp));
  }

  function format(key: LocaleTextKey, intrp: string[]) {
    return formatString(locale[key], intrp);
  }

  function get(key: LocaleTextKey) {
    return locale[key];
  }

  return {
    alert,
    prompt,
    format,
    get,
    supportedLanguages: Object.entries(locales).map(
      ([id, { LANGUAGE_LOCALE_NAME }]) => {
        return {
          id,
          name: LANGUAGE_LOCALE_NAME,
        };
      }
    ),
    currentLanguage
  };
}

export type Locale = ReturnType<typeof createLocale> extends Promise<infer C>
  ? C
  : never;
