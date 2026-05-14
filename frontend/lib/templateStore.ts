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

const STORAGE_KEY = "certifypro_certificate_templates";

const createId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `template-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getCertificateTemplates = (): CertificateTemplate[] => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as CertificateTemplate[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    return [];
  }
};

const persistTemplates = (templates: CertificateTemplate[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
};

export const getCertificateTemplate = (id: string): CertificateTemplate | null => {
  return getCertificateTemplates().find((template) => template.id === id) || null;
};

export const saveCertificateTemplate = (
  input: CertificateTemplateInput,
): CertificateTemplate => {
  const templates = getCertificateTemplates();
  const existing = input.id ? templates.find((template) => template.id === input.id) : null;
  const now = new Date().toISOString();

  const template: CertificateTemplate = {
    id: input.id || createId(),
    name: input.name.trim(),
    category: input.category.trim(),
    description: input.description.trim(),
    title: input.title.trim(),
    subtitle: input.subtitle.trim(),
    body: input.body.trim(),
    footer: input.footer.trim(),
    color: input.color,
    uses: input.uses ?? existing?.uses ?? 0,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  const nextTemplates = existing
    ? templates.map((item) => (item.id === template.id ? template : item))
    : [template, ...templates];

  persistTemplates(nextTemplates);
  return template;
};

export const deleteCertificateTemplate = (id: string): void => {
  persistTemplates(getCertificateTemplates().filter((template) => template.id !== id));
};

export const duplicateCertificateTemplate = (id: string): CertificateTemplate | null => {
  const template = getCertificateTemplate(id);
  if (!template) {
    return null;
  }

  return saveCertificateTemplate({
    ...template,
    id: undefined,
    name: `${template.name} Copy`,
    uses: 0,
  });
};
