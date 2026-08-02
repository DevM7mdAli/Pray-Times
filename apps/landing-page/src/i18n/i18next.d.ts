import type { DEFAULT_NAMESPACE, resources } from "./resources";

/**
 * Types every `t()` call against the English resources, so a misspelled or
 * missing key is a compile error rather than the key name rendered on screen.
 * English is the reference because the generator asserts both locales carry an
 * identical key set.
 */
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: typeof DEFAULT_NAMESPACE;
    resources: (typeof resources)["en"];
  }
}
