import { lazy, type ComponentType } from "react";

type LazyModule<T extends ComponentType<any>> = {
  default: T;
};

const isDynamicImportError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(message);
};

export const lazyWithReload = <T extends ComponentType<any>>(
  key: string,
  loader: () => Promise<LazyModule<T>>,
) =>
  lazy(async () => {
    const storageKey = `certichain:chunk-reload:${key}`;

    try {
      const module = await loader();

      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(storageKey);
      }

      return module;
    } catch (error) {
      if (typeof window !== "undefined" && isDynamicImportError(error)) {
        const hasAlreadyReloaded = window.sessionStorage.getItem(storageKey);

        if (!hasAlreadyReloaded) {
          window.sessionStorage.setItem(storageKey, "1");
          window.location.reload();
          return new Promise<LazyModule<T>>(() => {});
        }
      }

      throw error;
    }
  });
