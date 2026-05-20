import { API_BASE_URL, parseApiError } from "./api";

export interface CertificateTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  title: string;
  subtitle: string;
  body: string;
  footer: string;
  color: string;
  uses: number;
  createdAt: string;
  updatedAt: string;
}

export type CertificateTemplateInput = Omit<
  CertificateTemplate,
  "id" | "uses" | "createdAt" | "updatedAt"
> & {
  id?: string;
  uses?: number;
};

interface TemplateResponse {
  template: CertificateTemplate;
}

interface TemplateListResponse {
  templates: CertificateTemplate[];
}

const requestJson = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  return response.json() as Promise<T>;
};

export const getCertificateTemplates = async (): Promise<CertificateTemplate[]> => {
  const payload = await requestJson<TemplateListResponse>("/templates");
  return payload.templates;
};

export const getCertificateTemplate = async (id: string): Promise<CertificateTemplate | null> => {
  try {
    const payload = await requestJson<TemplateResponse>(`/templates/${encodeURIComponent(id)}`);
    return payload.template;
  } catch (error) {
    if (error instanceof Error && error.message === "Template not found") {
      return null;
    }
    throw error;
  }
};

export const saveCertificateTemplate = async (
  input: CertificateTemplateInput,
): Promise<CertificateTemplate> => {
  const method = input.id ? "PUT" : "POST";
  const path = input.id ? `/templates/${encodeURIComponent(input.id)}` : "/templates";
  const payload = await requestJson<TemplateResponse>(path, {
    method,
    body: JSON.stringify(input),
  });
  return payload.template;
};

export const deleteCertificateTemplate = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/templates/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }
};

export const duplicateCertificateTemplate = async (
  id: string,
): Promise<CertificateTemplate | null> => {
  try {
    const payload = await requestJson<TemplateResponse>(
      `/templates/${encodeURIComponent(id)}/duplicate`,
      { method: "POST" },
    );
    return payload.template;
  } catch (error) {
    if (error instanceof Error && error.message === "Template not found") {
      return null;
    }
    throw error;
  }
};
