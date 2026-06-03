import { useEffect, useState } from "react";
import { Award, Copy, Download, Eye, FileText } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Link } from "react-router";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
  getReadableError,
  getStudentCertificates,
  StudentCertificateRecord,
} from "../lib/certificateRegistry";
import {
  downloadCertificateHtml,
  openCertificatePrintView,
} from "../lib/certificateArtifacts";
import {
  EmptyState,
  IconBadge,
  PageHeader,
  primaryActionClass,
  StatCard,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function StudentDashboard() {
  const { user } = useAuth();
  const accountWalletAddress = user?.walletAddress || "";
  const [recentCertificates, setRecentCertificates] = useState<StudentCertificateRecord[]>([]);
  const [totalCertificates, setTotalCertificates] = useState(0);
  const [isLoadingCertificates, setIsLoadingCertificates] = useState(false);

  useEffect(() => {
    if (!accountWalletAddress) {
      setRecentCertificates([]);
      setTotalCertificates(0);
      return;
    }

    const loadCertificates = async () => {
      setIsLoadingCertificates(true);
      try {
        const certificates = await getStudentCertificates(accountWalletAddress);
        setTotalCertificates(certificates.length);
        setRecentCertificates(certificates.slice(0, 3));
      } catch (error) {
        toast.error(getReadableError(error));
      } finally {
        setIsLoadingCertificates(false);
      }
    };

    void loadCertificates();
  }, [accountWalletAddress]);

  const handleCopyWallet = async () => {
    if (!accountWalletAddress) {
      toast.error("Wallet address is still being prepared");
      return;
    }

    await navigator.clipboard.writeText(accountWalletAddress);
    toast.success("Wallet address copied");
  };

  const handleViewCertificate = (certificate: StudentCertificateRecord) => {
    try {
      openCertificatePrintView(certificate);
    } catch (error) {
      toast.error(getReadableError(error));
    }
  };

  const handleDownloadCertificate = (certificate: StudentCertificateRecord) => {
    downloadCertificateHtml(certificate);
    toast.success("Certificate file downloaded");
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${user?.name || "Student"}`}
        description="Your certificate address is assigned to your account and cannot be changed."
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
        <StatCard
          label="Total Certificates"
          value={totalCertificates}
          note="Available in your account"
          icon={FileText}
          tone="blue"
        />
        <StatCard
          label="Recent Certificates"
          value={recentCertificates.length}
          note="Latest issued certificates"
          icon={Award}
          tone="green"
        />
      </div>

      {/* Wallet Section */}
      <Card className={cn("p-6", subtlePanelClass)}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl text-gray-900 mb-1">Wallet Address</h2>
            <p className="text-sm text-gray-600 mb-4">
              CertiChain assigns this address from your verified email, so certificates stay tied to this account.
            </p>

            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200 min-h-12 flex items-center">
              <p className="text-sm text-gray-800 break-all font-mono">
                {accountWalletAddress || "Preparing account wallet"}
              </p>
            </div>

            {accountWalletAddress && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                Address locked and ready to receive certificates.
              </div>
            )}
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[160px]">
            <Button variant="outline" className="gap-2" onClick={() => void handleCopyWallet()} disabled={!accountWalletAddress}>
              <Copy className="w-4 h-4" />
              Copy Address
            </Button>
          </div>
        </div>
      </Card>

      {/* Recent Certificates */}
      <Card className={cn("p-6", subtlePanelClass)}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl text-gray-900">Recent Certificates</h2>
          <Link to="/student/certificates">
            <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700">
              View All
            </Button>
          </Link>
        </div>

        <div className="space-y-4">
          {recentCertificates.length === 0 ? (
            <EmptyState
              icon={Award}
              title={isLoadingCertificates ? "Loading certificates" : "No certificates yet"}
              description={
                isLoadingCertificates
                  ? "Loading your certificate records."
                  : "Certificates issued to your wallet will appear here."
              }
            />
          ) : (
            recentCertificates.map((cert) => (
              <div
                key={cert.tokenId}
                className="flex flex-col gap-4 rounded-lg bg-gray-50 p-4 transition-colors hover:bg-gray-100 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <IconBadge icon={Award} tone="blue" className="h-12 w-12" />
                  <div className="min-w-0">
                    <p className="text-gray-900 mb-1">{cert.certificateType}</p>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                      <span className="break-all">ID: {cert.certificateId}</span>
                      <span>-</span>
                      <span>{new Date(cert.issueDate).toLocaleDateString()}</span>
                    </div>
                    {cert.grade && cert.grade !== "N/A" && (
                      <p className="text-sm text-gray-600 mt-1">Grade: {cert.grade}</p>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleViewCertificate(cert)}
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => handleDownloadCertificate(cert)}
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Info Box */}
      <Card className="p-6 bg-blue-50 border-blue-100">
        <div className="flex items-start gap-4">
          <IconBadge icon={Award} tone="blue" className="h-12 w-12" />
          <div>
            <h3 className="text-lg text-gray-900 mb-2">Verified Certificates</h3>
            <p className="text-gray-600 mb-4">
              Each certificate includes a unique ID and QR code so employers can confirm its authenticity.
            </p>
            <Link to="/student/certificates">
              <Button className={primaryActionClass}>
                View All Certificates
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
