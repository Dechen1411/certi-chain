import type { FancySelectOption } from "../app/ui/fancy-select";
import type { CertificateTemplate } from "./templateStore";

const getTemplateBadge = (template: CertificateTemplate): string => {
  const source = template.category || template.name || template.title || "Certificate Template";
  const parts = source.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase() || "CT";
};

export const CERTIFICATE_TYPE_OPTIONS = [
  {
    value: "Bachelor of Science in Computer Science",
    label: "BSCS",
    description: "Bachelor of Science in Computer Science",
    badge: "BS",
    tone: "blue",
  },
  {
    value: "School of Interactive Design",
    label: "SIDD",
    description: "School of Interactive Design",
    badge: "SD",
    tone: "purple",
  },
] satisfies FancySelectOption[];

export const getCertificateTemplateOptions = (
  templates: CertificateTemplate[],
): FancySelectOption[] => {
  return templates.map((template) => ({
    value: template.id,
    label: template.name || template.title,
    description: template.description || template.title || template.category || "Saved certificate template",
    badge: getTemplateBadge(template),
    tone: "blue",
  }));
};
