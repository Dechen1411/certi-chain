const trimTrailingSlash = (value: string): string => {
  return value.replace(/\/+$/, "");
};

export const getApiBaseUrl = (): string => {
  const configuredUrl = import.meta.env.VITE_API_BASE_URL?.trim();
  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  return import.meta.env.PROD ? "/api" : "http://localhost:4000/api";
};

export const API_BASE_URL = getApiBaseUrl();

export const parseApiError = async (response: Response): Promise<string> => {
  try {
    const payload = await response.json() as { message?: string };
    return payload.message || "Request failed";
  } catch {
    return "Request failed";
  }
};
