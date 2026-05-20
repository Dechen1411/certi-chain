import type { FancySelectOption } from "../app/ui/fancy-select";

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
