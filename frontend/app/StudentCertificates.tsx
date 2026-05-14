import { useEffect, useState } from "react";
import { Award, Copy, Download, Eye, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import {
  getReadableError,
  getStudentCertificates,
  StudentCertificateRecord,
} from "../lib/certificateRegistry";
import { toast } from "sonner";
import {
  buildCertificateVerificationUrl,
  downloadCertificateHtml,
  openCertificatePrintView,
} from "../lib/certificateArtifacts";
import {
  EmptyState,
  IconBadge,
  PageHeader,
  primaryActionClass,
  subtlePanelClass,
} from "./ui/app-primitives";
import { cn } from "./ui/utils";

export function StudentCertificates() {
  const [certificates, setCertificates] = useState<StudentCertificateRecord[]>([]);
  const [walletAddress, setWalletAddress] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const savedWallet = localStorage.getItem("certifypro_student_wallet") || "";
    setWalletAddress(savedWallet);
  }, []);

  useEffect(() => {
    if (!walletAddress) {
      setCertificates([]);
      return;
    }

    const loadCertificates = async () => {
      setIsLoading(true);
      try {
        const items = await getStudentCertificates(walletAddress);
        setCertificates(items);
      } catch (error) {
        toast.error(getReadableError(error));
      } finally {
        setIsLoading(false);
      }
    };

    void loadCertificates();
  }, [walletAddress]);

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

  const handleCopyVerificationLink = async (certificate: StudentCertificateRecord) => {
    await navigator.clipboard.writeText(buildCertificateVerificationUrl(certificate.certificateId));
    toast.success("Verification link copied");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Certificates"
        description="View, share, and download your blockchain-verified certificates."
      />

      <div className="grid grid-cols-1 gap-6">
        {certificates.length === 0 ? (
          <Card className={cn("p-8", subtlePanelClass)}>
            <EmptyState
              icon={Award}
              title={isLoading ? "Loading certificates" : "No certificates yet"}
              description={
                !walletAddress
                  ? "Create your student wallet first in the dashboard, then share it with admin."
                  : isLoading
                  ? "Fetching your certificate records from the blockchain."
                  : "Certificates issued to your wallet will appear here."
              }
            />
          </Card>
        ) : certificates.map((cert) => (
          <Card key={cert.tokenId} className={cn("transition-shadow hover:shadow-md", subtlePanelClass)}>
            <div className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start gap-4">
                      <IconBadge icon={Award} tone="blue" className="h-14 w-14" />
                      <div>
                        <h3 className="text-lg text-gray-900 mb-1">{cert.certificateType}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                          <span className="px-2 py-1 bg-gray-100 rounded">ID: {cert.certificateId}</span>
                          <span className={`px-2 py-1 rounded ${cert.revoked ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                            {cert.revoked ? "Revoked" : "Valid"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-sm text-gray-600">Recipient</label>
                        <p className="text-gray-900">{cert.studentName || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Department</label>
                        <p className="text-gray-900">{cert.department || "N/A"}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Issue Date</label>
                        <p className="text-gray-900">
                          {new Date(cert.issueDate).toLocaleDateString()}
                        </p>
                      </div>
                      {cert.grade && cert.grade !== "N/A" && (
                        <div>
                          <label className="text-sm text-gray-600">Grade</label>
                          <p className="text-gray-900">{cert.grade}</p>
                        </div>
                      )}
                      <div className="md:col-span-2">
                        <label className="text-sm text-gray-600">NFT Hash</label>
                        <p className="text-gray-900 font-mono text-xs break-all">
                          {cert.nftHash}
                        </p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Description</label>
                      <p className="text-gray-900">{cert.description || "N/A"}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleCopyVerificationLink(cert)}
                    >
                      <Copy className="w-4 h-4" />
                      Copy Verify Link
                    </Button>

                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => handleViewCertificate(cert)}
                    >
                      <Eye className="w-4 h-4" />
                      View Certificate
                    </Button>

                    <Button
                      className={`gap-2 ${primaryActionClass}`}
                      onClick={() => handleDownloadCertificate(cert)}
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-lg lg:w-64">
                  <div className="mb-3 w-[160px] h-[160px] rounded-lg border border-gray-200 bg-white flex items-center justify-center p-3">
                    <QRCodeSVG
                      value={buildCertificateVerificationUrl(cert.certificateId)}
                      size={132}
                      level="M"
                      includeMargin
                    />
                  </div>
                  <p className="text-xs text-gray-600 text-center break-all">
                    {cert.certificateId}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-6 bg-blue-50 border-blue-100">
        <div className="flex items-start gap-4">
          <IconBadge icon={QrCode} tone="blue" className="h-12 w-12" />
          <div>
            <h3 className="text-lg text-gray-900 mb-2">How to Share Your Certificate</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">-</span>
                <span>Share the QR code with employers for instant verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">-</span>
                <span>Provide the Certificate ID for manual verification</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">-</span>
                <span>Download the certificate file for offline access</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-1">-</span>
                <span>All certificates are secured on the blockchain</span>
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
}
