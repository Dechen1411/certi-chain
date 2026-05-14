import { Award, FileText, Download, ShieldCheck, Users } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import {
  EmptyState,
  PageHeader,
  primaryActionClass,
  StatCard,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function Dashboard() {
  const stats = [
    {
      label: "Certificates Issued",
      value: "—",
      note: "Live blockchain data",
      icon: Award,
      tone: "blue" as const,
    },
    {
      label: "Recipients",
      value: "—",
      note: "Connected student wallets",
      icon: Users,
      tone: "purple" as const,
    },
    {
      label: "Template Library",
      value: "—",
      note: "Saved certificate designs",
      icon: FileText,
      tone: "green" as const,
    },
    {
      label: "Pending Reviews",
      value: "—",
      note: "Awaiting issuance",
      icon: ShieldCheck,
      tone: "amber" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Welcome back. Here is your certificate overview."
        actions={
          <>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Button className={`gap-2 ${primaryActionClass}`}>
            <Award className="w-4 h-4" />
            Award Certificate
          </Button>
          </>
        }
      />
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            note={stat.note}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Awards */}
        <Card className={cn("lg:col-span-2 p-6", subtlePanelClass)}>
          <h2 className="text-xl text-gray-900 mb-6">Recent Awards</h2>
          <EmptyState
            icon={Award}
            title="No awards yet"
            description="Issued awards will appear here after successful transactions."
          />
        </Card>

        {/* Quick Actions */}
        <Card className={cn("p-6", subtlePanelClass)}>
          <h2 className="text-xl text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Button className={`w-full justify-start gap-3 ${primaryActionClass}`}>
              <Award className="w-5 h-5" />
              Issue New Award
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3">
              <FileText className="w-5 h-5" />
              Create Certificate
            </Button>
            <Button variant="outline" className="w-full justify-start gap-3">
              <Users className="w-5 h-5" />
              Add Recipient
            </Button>
          </div>

          {/* Achievement Image */}
          <div className="mt-6 rounded-lg overflow-hidden">
            <ImageWithFallback
              src="/certificate-hero.svg"
              alt="Certificate achievement"
              className="w-full h-48 object-cover"
            />
          </div>
        </Card>
      </div>
    </div>
  );
}
