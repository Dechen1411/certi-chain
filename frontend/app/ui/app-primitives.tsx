import { ReactNode } from "react";
import { Link } from "react-router";
import { ArrowLeft, LucideIcon } from "lucide-react";
import { Button } from "./button";
import { Card } from "./card";
import { cn } from "./utils";

export const primaryActionClass = "bg-slate-900 text-white hover:bg-slate-800";
export const subtlePanelClass = "bg-white border border-gray-200 shadow-sm";
export const pageClass = "space-y-6";
export const pageTitleClass = "text-3xl font-semibold tracking-normal text-gray-950";
export const pageDescriptionClass = "mt-1 text-sm text-gray-600";

type Tone = "blue" | "green" | "amber" | "purple" | "slate" | "red";

const toneClasses: Record<Tone, string> = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  purple: "bg-violet-50 text-violet-700 border-violet-100",
  slate: "bg-slate-100 text-slate-700 border-slate-200",
  red: "bg-red-50 text-red-700 border-red-100",
};

export function IconBadge({
  icon: Icon,
  tone = "slate",
  className,
}: {
  icon: LucideIcon;
  tone?: Tone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border",
        toneClasses[tone],
        className,
      )}
    >
      <Icon className="h-5 w-5" />
    </div>
  );
}

export function PageHeader({
  title,
  description,
  backTo,
  actions,
}: {
  title: string;
  description?: string;
  backTo?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        {backTo && (
          <Link to={backTo} className="mt-1">
            <Button variant="outline" size="icon" aria-label="Back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
        )}
        <div className="min-w-0">
          <h1 className={pageTitleClass}>{title}</h1>
          {description && <p className={pageDescriptionClass}>{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-gray-50/60 p-8 text-center",
        className,
      )}
    >
      <IconBadge icon={icon} tone="slate" className="mb-4 h-12 w-12" />
      <h2 className="text-lg font-semibold text-gray-950">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-gray-600">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function StatCard({
  label,
  value,
  note,
  icon,
  tone = "blue",
}: {
  label: string;
  value: string | number;
  note?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card className={cn("p-5", subtlePanelClass)}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm text-gray-600">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-normal text-gray-950">{value}</p>
          {note && <p className="mt-1 text-sm text-gray-500">{note}</p>}
        </div>
        <IconBadge icon={icon} tone={tone} />
      </div>
    </Card>
  );
}

export function SearchPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Card className={cn("p-4", subtlePanelClass, className)}>{children}</Card>;
}
