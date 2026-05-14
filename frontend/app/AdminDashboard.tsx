import { useEffect, useState } from "react";
import { Award, Download, ShieldCheck, Users, FileText, RefreshCcw } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Link } from "react-router";
import {
  getReadableError,
  getRegistryStats,
  RegistryStats,
} from "../lib/certificateRegistry";
import { downloadCsv } from "../lib/certificateArtifacts";
import {
  EmptyState,
  PageHeader,
  primaryActionClass,
  StatCard,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function AdminDashboard() {
  const [stats, setStats] = useState<RegistryStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  const loadStats = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      setStats(await getRegistryStats());
    } catch (error) {
      setStats(null);
      setLoadError(getReadableError(error));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadStats();
  }, []);

  const handleExport = () => {
    const rows = [
      ["Metric", "Value"],
      ["Total Certificates", String(stats?.totalCertificates ?? 0)],
      ["Active Certificates", String(stats?.activeCertificates ?? 0)],
      ["Revoked Certificates", String(stats?.revokedCertificates ?? 0)],
      ["Issued This Month", String(stats?.issuedThisMonth ?? 0)],
      [],
      ["Certificate ID", "Student", "Type", "Issue Date", "Status"],
      ...(stats?.recentCertificates || []).map((certificate) => [
        certificate.certificateId,
        certificate.studentName,
        certificate.certificateType,
        certificate.issueDate,
        certificate.revoked ? "Revoked" : "Valid",
      ]),
    ];

    downloadCsv("certificate-report.csv", rows);
  };

  const statCards = [
    {
      label: "On-chain Certificates",
      value: stats ? String(stats.totalCertificates) : "--",
      change: loadError || (isLoading ? "Loading data" : "Issued certificates"),
      icon: Award,
      tone: "blue" as const,
    },
    {
      label: "Active Certificates",
      value: stats ? String(stats.activeCertificates) : "--",
      change: "Not revoked",
      icon: ShieldCheck,
      tone: "green" as const,
    },
    {
      label: "Issued This Month",
      value: stats ? String(stats.issuedThisMonth) : "--",
      change: "Based on metadata issue date",
      icon: FileText,
      tone: "purple" as const,
    },
    {
      label: "Revoked",
      value: stats ? String(stats.revokedCertificates) : "--",
      change: "Marked invalid on-chain",
      icon: Users,
      tone: "amber" as const,
    },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin Dashboard"
        description="Monitor issuance activity and manage certificate operations."
        actions={
          <>
          <Button variant="outline" className="gap-2" onClick={() => void loadStats()} disabled={isLoading}>
            <RefreshCcw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" className="gap-2" onClick={handleExport}>
            <Download className="w-4 h-4" />
            Export Report
          </Button>
          <Link to="/admin/dashboard/issue-certificate">
            <Button className={`gap-2 ${primaryActionClass}`}>
              <Award className="w-4 h-4" />
              Issue Certificate
            </Button>
          </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <StatCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            note={stat.change}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      <Card className={cn("p-6", subtlePanelClass)}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl text-gray-900 mb-1">Server Issuer Status</h2>
            <p className="text-sm text-gray-600 mb-4">
              Certificate signing runs on the backend. Issuer key is never exposed in browser code.
            </p>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 min-h-12 flex items-center">
              <p className="text-sm text-gray-800 break-all font-mono">
                {loadError ? "Chain read unavailable" : "Active (server-managed)"}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className={cn("lg:col-span-2 p-6", subtlePanelClass)}>
          <h2 className="text-xl text-gray-900 mb-6">Recent Activity</h2>
          {!stats || stats.recentCertificates.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={isLoading ? "Loading activity" : "No activity yet"}
              description={isLoading ? "Fetching recent certificate activity from the chain." : "Issued certificates will appear here after the first successful transaction."}
            />
          ) : (
            <div className="space-y-4">
              {stats.recentCertificates.map((certificate) => (
                <div
                  key={certificate.tokenId}
                  className="flex items-start justify-between gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="text-gray-900 mb-1">Issued {certificate.certificateId}</p>
                    <p className="text-sm text-gray-600">
                      {certificate.studentName} - {certificate.certificateType}
                    </p>
                  </div>
                  <span className="text-sm text-gray-500 whitespace-nowrap">
                    {new Date(certificate.issueDate).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className={cn("p-6", subtlePanelClass)}>
          <h2 className="text-xl text-gray-900 mb-6">Quick Actions</h2>
          <div className="space-y-3">
            <Link to="/admin/dashboard/issue-certificate">
              <Button className={`w-full justify-start gap-3 ${primaryActionClass}`}>
                <Award className="w-5 h-5" />
                Issue Certificate
              </Button>
            </Link>
            <Link to="/admin/dashboard/bulk-issue">
              <Button variant="outline" className="w-full justify-start gap-3">
                <Users className="w-5 h-5" />
                Bulk Issue
              </Button>
            </Link>
            <Link to="/admin/dashboard/templates">
              <Button variant="outline" className="w-full justify-start gap-3">
                <FileText className="w-5 h-5" />
                Manage Templates
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
