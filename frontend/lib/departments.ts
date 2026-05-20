import type { FancySelectOption } from "../app/ui/fancy-select";

export const DEPARTMENT_OPTIONS = [
  {
    value: "Artificial Intelligence",
    label: "Artificial Intelligence",
    description: "AI systems and intelligent applications",
    badge: "AI",
    tone: "purple",
  },
  {
    value: "Fullstack Development",
    label: "Fullstack Development",
    description: "Frontend, backend, and product delivery",
    badge: "FS",
    tone: "green",
  },
  {
    value: "Blockchain Technology",
    label: "Blockchain Technology",
    description: "Smart contracts and decentralized systems",
    badge: "BC",
    tone: "amber",
  },
] satisfies FancySelectOption[];
